import { fetchJsonResilient } from '#server-utils/assistant/httpFetch';

type WebSearchHit = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | null;
};

type WebSearchResult = {
  provider: string;
  query: string;
  hits: WebSearchHit[];
  error?: string;
};

type WebSearchProvider = 'tavily' | 'brave';

type WebSearchMapOptions = {
  compact?: boolean;
};

const COMPACT_TITLE_MAX = 120;
const COMPACT_SNIPPET_MAX = 220;

function readProviderConfig(): {
    provider: WebSearchProvider;
    apiKey: string;
  } | null {
  const config = useRuntimeConfig();
  const apiKey = String(config.webSearchApiKey || '').trim();
  if (!apiKey)
    return null;
  const raw = String(config.webSearchProvider || 'tavily').trim().toLowerCase();
  const provider: WebSearchProvider = raw === 'brave' ? 'brave' : 'tavily';
  return { provider, apiKey };
}

function cropText(value: string, max: number): string {
  if (value.length <= max)
    return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function asHit(
    input: {
      title?: unknown;
      url?: unknown;
      snippet?: unknown;
      publishedAt?: unknown;
    },
    options: WebSearchMapOptions = {},
  ): WebSearchHit | null {
  if (typeof input.title !== 'string' || typeof input.url !== 'string')
    return null;
  const titleRaw = input.title.trim();
  const url = input.url.trim();
  if (!titleRaw || !url)
    return null;
  const snippetRaw = typeof input.snippet === 'string' ? input.snippet.trim() : '';
  const compact = options.compact === true;
  return {
    title: compact ? cropText(titleRaw, COMPACT_TITLE_MAX) : titleRaw,
    url,
    snippet: compact ? cropText(snippetRaw, COMPACT_SNIPPET_MAX) : snippetRaw,
    publishedAt: typeof input.publishedAt === 'string' ? input.publishedAt : null,
  };
}

export function mapTavilyResults(
    body: unknown,
    limit: number,
    options: WebSearchMapOptions = {},
  ): WebSearchHit[] {
  if (!body
    || typeof body !== 'object'
    || !('results' in body)
  )
    return [];
  const results = body.results;
  if (!Array.isArray(results))
    return [];
  const hits: WebSearchHit[] = [];
  const rowsGuard = (hit: object): hit is {
    title: unknown;
    url: unknown;
    content?: unknown;
    snippet?: unknown;
  } => {
    return 'title' in hit && 'url' in hit
      && ('content' in hit || 'snippet' in hit);
  };
  for (const row of results) {
    if (!row || typeof row !== 'object' || !rowsGuard(row))
      continue;
    const hit = asHit({
      title: row.title,
      url: row.url,
      snippet: row.content ?? row.snippet
    }, options);
    if (hit)
      hits.push(hit);
    if (hits.length >= limit)
      break;
  }
  return hits;
}

export function mapBraveResults(
    body: unknown,
    limit: number,
    options: WebSearchMapOptions = {},
  ): WebSearchHit[] {
  if (!body
    || typeof body !== 'object'
    || !('web' in body)
    || typeof body.web !== 'object'
    || !body?.web
    || !('results' in body.web)
  )
    return [];
  const web = body.web;
  const results = web?.results;
  if (!Array.isArray(results))
    return [];
  const hits: WebSearchHit[] = [];
  const rowsGuard = (hit: object): hit is {
    title: unknown;
    url: unknown;
    age: unknown;
    description: unknown;
  } => {
    return 'title' in hit && 'url' in hit && 'age' in hit && 'description' in hit;
  };
  for (const row of results) {
    if (!row
      || typeof row !== 'object'
      || !rowsGuard(row)
    )
      continue;
    const hit = asHit({
      title: row.title,
      url: row.url,
      snippet: row.description,
      publishedAt: row.age,
    }, options);
    if (hit)
      hits.push(hit);
    if (hits.length >= limit)
      break;
  }
  return hits;
}

async function searchTavily(
    query: string,
    apiKey: string,
    limit: number,
    options: WebSearchMapOptions,
  ): Promise<WebSearchHit[]> {
  const { ok, status, data, raw } = await fetchJsonResilient<{ results?: unknown[] }>(
    'https://api.tavily.com/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: limit,
        search_depth: 'basic',
        include_answer: false,
      }),
    },
  );
  if (!ok) {
    const hint = /<!DOCTYPE|<html/i.test(raw)
      ? ' (CDN/HTML 403 - check Authorization Bearer auth and API key)'
      : '';
    throw new Error(`Tavily search failed (${status})${hint}: ${raw.slice(0, 160)}`);
  }
  return mapTavilyResults(data, limit, options);
}

async function searchBrave(
    query: string,
    apiKey: string,
    limit: number,
    options: WebSearchMapOptions,
  ): Promise<WebSearchHit[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(limit));
  const { ok, status, data, raw } = await fetchJsonResilient<{ web?: { results?: unknown[] } }>(
    url.toString(),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
    },
  );
  if (!ok)
    throw new Error(`Brave search failed (${status}): ${raw.slice(0, 160)}`);
  return mapBraveResults(data, limit, options);
}

/**
 * Requires WEB_SEARCH_API_KEY (+ optional WEB_SEARCH_PROVIDER=tavily|brave).
 */
export async function searchWeb(
  query: string,
  limit = 4,
  options: WebSearchMapOptions = {},
): Promise<WebSearchResult> {
  const capped = Math.min(Math.max(limit, 1), 5);
  const cfg = readProviderConfig();
  if (!cfg) {
    return {
      provider: 'none',
      query,
      hits: [],
      error:
        'Web search is not configured. Set WEB_SEARCH_API_KEY',
    };
  }

  try {
    const hits = cfg.provider === 'brave'
      ? await searchBrave(query, cfg.apiKey, capped, options)
      : await searchTavily(query, cfg.apiKey, capped, options);
    return {
      provider: cfg.provider,
      query,
      hits,
      ...(hits.length
        ? {}
        : { error: 'No web results for that query; try a shorter, more specific search.' }),
    };
  }
  catch (err) {
    return {
      provider: cfg.provider,
      query,
      hits: [],
      error: err instanceof Error ? err.message : 'Web search failed',
    };
  }
}