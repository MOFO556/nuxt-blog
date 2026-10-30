import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type UnsplashImageCandidate = {
  id: string;
  description: string | null;
  alt: string | null;
  thumbUrl: string;
  regularUrl: string;
  downloadLocation: string | null;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
};

type UnsplashSearchBody = {
  results?: {
    id: string;
    description: string | null;
    alt_description: string | null;
    urls: { thumb: string; regular: string };
    links: { html: string; download_location?: string };
    user: { name: string; links: { html: string } };
  }[];
};

function mapResults(body: UnsplashSearchBody): UnsplashImageCandidate[] {
  return (body.results ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    alt: r.alt_description,
    thumbUrl: r.urls.thumb,
    regularUrl: r.urls.regular,
    downloadLocation: r.links.download_location ?? null,
    photographer: r.user.name,
    photographerUrl: r.user.links.html,
    pageUrl: r.links.html,
  }));
}

function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error))
    return false;
  const cause = 'cause' in err ? err.cause : undefined;
  const code = cause && typeof cause === 'object' && 'code' in cause
    ? String((cause as { code?: string }).code ?? '')
    : '';
  const message = `${err.message} ${code}`.toLowerCase();
  return  message.includes('fetch failed')
    || message.includes('econnreset')
    || message.includes('etimedout')
    || message.includes('und_err_connect_timeout')
    || message.includes('und_err_socket')
    || message.includes('enotfound');
}

function parseJsonPayload(raw: string): UnsplashSearchBody {
  const trimmed = raw.replace(/^\uFEFF/, '').trim();
  const start = trimmed.indexOf('{');
  const json = start >= 0 ? trimmed.slice(start) : trimmed;
  return JSON.parse(json) as UnsplashSearchBody;
}

async function fetchUnsplashJson(url: string, key: string): Promise<UnsplashSearchBody> {
  const headers = {
    Authorization: `Client-ID ${key}`,
    'Accept-Version': 'v1',
    Accept: 'application/json',
    'User-Agent': 'nuxt-blog-assistant/1.0',
  };

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw createError({
        statusCode: 502,
        statusMessage: `Unsplash search failed (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
      });
    }
    return await res.json() as UnsplashSearchBody;
  }
  catch (err) {
    if (!isNetworkFetchError(err) || process.platform !== 'win32')
      throw err;

    console.warn(
      '[assistant] Unsplash Node fetch failed; retrying via PowerShell (Windows TLS fallback)',
      err instanceof Error ? (err.cause ?? err.message) : err,
    );
    return await fetchUnsplashJsonViaPowerShell(url, key);
  }
}

/**
 * Fetch via PowerShell/Schannel, then base64 the raw body so Windows console
 * encoding cannot corrupt UTF-8. Do not ConvertTo-Json
 */
async function fetchUnsplashJsonViaPowerShell(url: string, key: string): Promise<UnsplashSearchBody> {
  const script = `
    $ErrorActionPreference = 'Stop'
    $headers = @{
      Authorization = "Client-ID $env:UNSPLASH_ACCESS_KEY"
      'Accept-Version' = 'v1'
      Accept = 'application/json'
    }
    $res = Invoke-WebRequest -Uri $env:UNSPLASH_REQUEST_URL -Headers $headers -TimeoutSec 20 -UseBasicParsing
    $bytes = [Text.Encoding]::UTF8.GetBytes($res.Content)
    [Convert]::ToBase64String($bytes)
  `.trim();

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      {
        timeout: 30_000,
        windowsHide: true,
        env: {
          ...process.env,
          UNSPLASH_ACCESS_KEY: key,
          UNSPLASH_REQUEST_URL: url,
        },
        maxBuffer: 8 * 1024 * 1024,
        encoding: 'utf8',
      },
    );
    const b64 = stdout.replace(/\s+/g, '');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return parseJsonPayload(json);
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw createError({
      statusCode: 502,
      statusMessage: `Unsplash unreachable from Node and PowerShell fallback failed (${message.slice(0, 180)}). 
        Check firewall/antivirus TLS inspection for api.unsplash.com.`
    });
  }
}

export async function searchUnsplashImages(
  query: string,
  perPage = 6,
): Promise<UnsplashImageCandidate[]> {
  const config = useRuntimeConfig();
  const key = String(config.unsplashAccessKey || '').trim();
  if (!key) {
    console.warn('[assistant] Unsplash key missing - set UNSPLASH_ACCESS_KEY');
    throw createError({
      statusCode: 503,
      statusMessage: 'Unsplash is not configured (UNSPLASH_ACCESS_KEY)',
    });
  }

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(Math.min(Math.max(perPage, 1), 12)));
  url.searchParams.set('orientation', 'landscape');

  const body = await fetchUnsplashJson(url.toString(), key);
  return mapResults(body);
}

export async function trackUnsplashDownload(downloadLocation: string | null) {
  if (!downloadLocation)
    return;
  const config = useRuntimeConfig();
  const key = String(config.unsplashAccessKey || '').trim();
  if (!key)
    return;
  try {
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${key}`,
        'User-Agent': 'nuxt-blog-assistant/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    });
  }
  catch {
    // non-fatal - staging the image still works without download ping
  }
}
