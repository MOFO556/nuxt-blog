import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  chatRequestWantsStream,
  forceChatCompletionNonStreaming,
  openAiChatCompletionToSse,
} from '#server-utils/assistant/openAiSse';

const execFileAsync = promisify(execFile);

const CHAT_FALLBACK_TIMEOUT_MS = 180_000;
const DEFAULT_RESILIENT_FETCH_TIMEOUT_MS = 60_000;

type HttpFetchInit = {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
};

export function normalizeHttpHeaders(
  ...parts: Array<Record<string, string> | undefined>
): Record<string, string> {
  const byLower = new Map<string, { name: string; value: string }>();
  for (const part of parts) {
    if (!part)
      continue;
    for (const [name, value] of Object.entries(part)) {
      byLower.set(name.toLowerCase(), { name, value });
    }
  }
  const out: Record<string, string> = {};
  for (const { name, value } of byLower.values())
    out[name] = value;
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function readRetryAfterMs(headers: Headers, body: string): number | null {
  const raw = headers.get('retry-after')?.trim();
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0)
      return Math.min(Math.ceil(seconds * 1000), 60_000);
    const at = Date.parse(raw);
    if (Number.isFinite(at))
      return Math.min(Math.max(0, at - Date.now()), 60_000);
  }
  const match = body.match(/try again in\s+(\d+(?:\.\d+)?)\s*s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0)
      return Math.min(Math.ceil(seconds * 1000) + 250, 60_000);
  }
  return null;
}

function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error))
    return false;
  const cause = 'cause' in err ? err.cause : undefined;
  const code = cause && typeof cause === 'object' && 'code' in cause
    ? String((cause as { code?: string }).code ?? '')
    : '';
  const message = `${err.message} ${code}`.toLowerCase();
  return message.includes('fetch failed')
    || message.includes('econnreset')
    || message.includes('etimedout')
    || message.includes('und_err_connect_timeout')
    || message.includes('und_err_socket')
    || message.includes('enotfound');
}

function isCloudflareSecurityPolicyDenial(body: string): boolean {
  return /access denied by security policy/i.test(body);
}

export function shouldRetryForbiddenViaPowerShell(status: number, body: string): boolean {
  if (status !== 403)
    return false;
  if (/<\s*html|<\s*head|403 Forbidden/i.test(body))
    return true;
  if (isCloudflareSecurityPolicyDenial(body))
    return true;
  const trimmed = body.trim();
  if (trimmed === 'Forbidden')
    return true;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object')
      return false;
    const error = (parsed as { error?: unknown }).error;
    if (typeof error === 'string')
      return error.toLowerCase() === 'forbidden';
    if (error && typeof error === 'object') {
      const message = (error as { message?: unknown }).message;
      return typeof message === 'string' && message.toLowerCase() === 'forbidden';
    }
  }
  catch {
    /* not JSON */
  }
  return false;
}

export function resilientFetchTimeoutMs(url: string): number {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '');
    if (/\/chat\/completions$/i.test(pathname))
      return CHAT_FALLBACK_TIMEOUT_MS;
  }
  catch {
    /* not an absolute URL */
  }
  return DEFAULT_RESILIENT_FETCH_TIMEOUT_MS;
}

export function synthesizeStreamedChatResponse(
  wantsStream: boolean,
  result: { ok: boolean; status: number; body: string },
): { ok: boolean; status: number; body: string } {
  if (!wantsStream || !result.ok)
    return result;
  const sse = openAiChatCompletionToSse(result.body);
  if (sse == null)
    return { ok: false, status: 502, body: result.body };
  return { ok: true, status: result.status, body: sse };
}

async function fetchViaPowerShellResilient(
  url: string,
  init: Required<Pick<HttpFetchInit, 'method' | 'headers'>> & {
    body?: string;
    timeoutMs: number;
  },
): Promise<{ ok: boolean; status: number; body: string }> {
  const wantsStream = chatRequestWantsStream(init.body);
  const body = wantsStream && init.body
    ? forceChatCompletionNonStreaming(init.body)
    : init.body;
  const timeoutMs = wantsStream
    ? Math.max(init.timeoutMs, CHAT_FALLBACK_TIMEOUT_MS)
    : init.timeoutMs;

  if (wantsStream) {
    console.warn(
      '[assistant] PowerShell chat fallback using non-streaming completion (avoids SSE timeout)',
      url,
    );
  }

  let viaPs = await fetchTextViaPowerShell(url, {
    method: init.method,
    headers: init.headers,
    body,
    timeoutMs,
  });
  if (viaPs.status === 429) {
    const waitMs = readRetryAfterMs(viaPs.headers, viaPs.body) ?? 7_000;
    console.warn(`[assistant] PowerShell rate limited; waiting ${waitMs}ms`, url);
    await sleep(waitMs);
    viaPs = await fetchTextViaPowerShell(url, {
      method: init.method,
      headers: init.headers,
      body,
      timeoutMs,
    });
  }

  const synthesized = synthesizeStreamedChatResponse(wantsStream, {
    ok: viaPs.ok,
    status: viaPs.status,
    body: viaPs.body,
  });
  if (wantsStream && viaPs.ok && !synthesized.ok) {
    console.warn(
      '[assistant] PowerShell chat fallback returned a non-completion body',
      url,
    );
  }
  return synthesized;
}

/**
 * Fetch text with a Windows PowerShell/Schannel fallback when Node TLS fails
 * or a CDN/provider returns a Forbidden that Node alone cannot pass.
 */
export async function fetchTextResilient(
  url: string,
  init: HttpFetchInit = {},
): Promise<{ ok: boolean; status: number; body: string }> {
  const method = init.method ?? 'GET';
  const headers = normalizeHttpHeaders(
    { 'User-Agent': 'Mozilla/5.0 (compatible; NuxtBlogAssistant/1.0)' },
    init.headers,
  );
  const timeoutMs = init.timeoutMs ?? 20_000;
  const canUsePowerShell = process.platform === 'win32';

  try {
    let res = await fetch(url, {
      method,
      headers,
      body: init.body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    let body = await res.text();

    if (res.status === 429) {
      const waitMs = readRetryAfterMs(res.headers, body) ?? 7_000;
      console.warn(`[assistant] rate limited; waiting ${waitMs}ms then retrying`, url);
      await sleep(waitMs);
      res = await fetch(url, {
        method,
        headers,
        body: init.body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      body = await res.text();
      if (res.status === 429 && canUsePowerShell) {
        await sleep(readRetryAfterMs(res.headers, body) ?? 7_000);
        return await fetchViaPowerShellResilient(url, {
          method,
          headers,
          body: init.body,
          timeoutMs,
        });
      }
    }

    if (canUsePowerShell && shouldRetryForbiddenViaPowerShell(res.status, body)) {
      console.warn(
        '[assistant] Node fetch got Forbidden; retrying via PowerShell',
        url,
      );
      return await fetchViaPowerShellResilient(url, {
        method,
        headers,
        body: init.body,
        timeoutMs,
      });
    }
    return { ok: res.ok, status: res.status, body };
  }
  catch (err) {
    if (!isNetworkFetchError(err) || !canUsePowerShell)
      throw err;

    console.warn(
      '[assistant] Node fetch failed; retrying via PowerShell',
      err instanceof Error ? (err.cause ?? err.message) : err,
    );
    return await fetchViaPowerShellResilient(url, {
      method,
      headers,
      body: init.body,
      timeoutMs,
    });
  }
}

/**
 * `fetch`-compatible wrapper for AI SDK providers (`createOpenAI({ fetch })`).
 */
export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

  const methodRaw = (init?.method ?? 'GET').toUpperCase();
  const method = methodRaw === 'POST' ? 'POST' : 'GET';

  const headers: Record<string, string> = {};
  if (init?.headers) {
    const h = new Headers(init.headers);
    h.forEach((value, key) => {
      headers[key] = value;
    });
  }

  let body: string | undefined;
  if (init?.body != null) {
    if (typeof init.body === 'string')
      body = init.body;
    else if (init.body instanceof Uint8Array)
      body = new TextDecoder().decode(init.body);
    else if (init.body instanceof ArrayBuffer)
      body = new TextDecoder().decode(init.body);
    else
      throw new Error('resilientFetch only supports string/Uint8Array bodies');
  }

  const timeoutMs = resilientFetchTimeoutMs(url);
  const result = await fetchTextResilient(url, { method, headers, body, timeoutMs });
  if (!result.ok) {
    const preview = result.body.replace(/\s+/g, ' ').trim().slice(0, 400);
    console.warn(`[assistant] provider HTTP ${result.status}`, url, preview);
  }
  const contentType = result.body.trimStart().startsWith('data:')
    ? 'text/event-stream; charset=utf-8'
    : 'application/json';
  return new Response(result.body, {
    status: result.status,
    headers: { 'content-type': contentType },
  });
}

export async function fetchJsonResilient<T>(
  url: string,
  init: HttpFetchInit = {},
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const result = await fetchTextResilient(url, init);
  if (!result.body.trim())
    return { ok: result.ok, status: result.status, data: null, raw: result.body };
  try {
    return {
      ok: result.ok,
      status: result.status,
      data: JSON.parse(result.body) as T,
      raw: result.body,
    };
  }
  catch {
    return { ok: result.ok, status: result.status, data: null, raw: result.body };
  }
}

async function resolveHttpFetchScriptPath(): Promise<string> {
  const candidate = join(
    process.cwd(),
    'server',
    'utils',
    'assistant',
    'scripts',
    'httpFetch.ps1',
  );
  await access(candidate);
  return candidate;
}

type PowerShellHttpPayload = {
  status: number;
  body: string;
  retryAfter?: string | null;
};

function isPowerShellHttpPayload(value: unknown): value is PowerShellHttpPayload {
  if (typeof value !== 'object' || value === null)
    return false;
  if (!('status' in value) || typeof value.status !== 'number')
    return false;
  if (!('body' in value) || typeof value.body !== 'string')
    return false;
  if (!('retryAfter' in value) || value.retryAfter == null)
    return true;
  return typeof value.retryAfter === 'string';
}

export function parsePowerShellHttpPayload(payload: unknown): {
  ok: boolean;
  status: number;
  body: string;
  headers: Headers;
} {
  if (!isPowerShellHttpPayload(payload))
    throw new Error('PowerShell HTTP fallback returned an unexpected payload');
  const headers = new Headers();
  if (payload.retryAfter)
    headers.set('retry-after', payload.retryAfter.trim());
  return {
    ok: payload.status >= 200 && payload.status < 300,
    status: payload.status,
    body: payload.body,
    headers,
  };
}

async function fetchTextViaPowerShell(
  url: string,
  init: Required<Pick<HttpFetchInit, 'method' | 'headers'>> & {
    body?: string;
    timeoutMs: number;
  },
): Promise<{ ok: boolean; status: number; body: string; headers: Headers }> {
  /**
   * Windows PowerShell 5.1 strips Authorization from Invoke-WebRequest -Headers.
   * HttpClient (in the .ps1) sends Bearer tokens and other auth headers correctly.
   */
  const headers = normalizeHttpHeaders(init.headers);
  const contentType = Object.entries(headers)
    .find(([k]) => k.toLowerCase() === 'content-type')?.[1]
    ?? 'application/json';

  const headersForScript: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-type')
      continue;
    headersForScript[key] = value;
  }

  const scriptPath = await resolveHttpFetchScriptPath();
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-File', scriptPath],
    {
      timeout: init.timeoutMs + 10_000,
      windowsHide: true,
      env: {
        ...process.env,
        ASSISTANT_HTTP_URL: url,
        ASSISTANT_HTTP_METHOD: init.method,
        ASSISTANT_HTTP_TIMEOUT_MS: String(init.timeoutMs),
        ASSISTANT_HTTP_BODY: init.body ?? '',
        ASSISTANT_HTTP_CONTENT_TYPE: contentType,
        ASSISTANT_HTTP_HEADERS_JSON: JSON.stringify(headersForScript),
      },
      maxBuffer: 8 * 1024 * 1024,
      encoding: 'utf8',
    },
  );

  const decoded = Buffer.from(stdout.replace(/\s+/g, ''), 'base64').toString('utf8');
  return parsePowerShellHttpPayload(JSON.parse(decoded));
}