import type { AssistantNavigationProposal } from '~~/shared/types/assistant';

export function normalizeAssistantNavigation(
  proposal: AssistantNavigationProposal,
): { ok: true; path: string; query: Record<string, string> } | { ok: false; error: string } {
  const raw = proposal.path.trim();
  if (!raw.startsWith('/') || raw.startsWith('//'))
    return { ok: false, error: 'Path must be an absolute app path' };

  const pathOnly = raw.split('?')[0] ?? raw;
  const okPath =
    pathOnly === '/'
    || pathOnly.startsWith('/posts')
    || pathOnly.startsWith('/office')
    || pathOnly.startsWith('/auth');

  if (!okPath)
    return { ok: false, error: 'Path is outside the blog sitemap' };

  const query: Record<string, string> = {};
  if (proposal.query) {
    for (const [k, v] of Object.entries(proposal.query)) {
      if (typeof v === 'string' && v.length)
        query[k] = v;
    }
  }

  return { ok: true, path: pathOnly, query };
}

export function buildPostsFilterPath(filters: {
  tags?: string | string[];
  author?: string;
  q?: string;
  from?: string;
  to?: string;
}): AssistantNavigationProposal {
  const tags = Array.isArray(filters.tags)
    ? filters.tags.filter(Boolean)
    : filters.tags
      ? [filters.tags]
      : [];

  if (tags.length === 1 
    && !filters.author 
    && !filters.q 
    && !filters.from 
    && !filters.to
  ) {
    return {
      path: `/posts/tag/${encodeURIComponent(tags[0]!)}`,
      reason: `Show posts tagged ${tags[0]}`,
    };
  }

  if (filters.author && !tags.length && !filters.q && !filters.from && !filters.to) {
    return {
      path: `/posts/author/${encodeURIComponent(filters.author)}`,
      reason: `Show posts by ${filters.author}`,
    };
  }

  const query: Record<string, string> = {};
  if (filters.q)
    query.q = filters.q;
  if (filters.from)
    query.from = filters.from;
  if (filters.to)
    query.to = filters.to;
  if (filters.author)
    query.author = filters.author;
  if (tags.length)
    query.tags = tags.join(',');

  return {
    path: '/posts',
    query,
    reason: 'Apply post list filters',
  };
}

export function formatNavigationHref(
  path: string,
  query: Record<string, string>,
): string {
  const params = new URLSearchParams(query).toString();
  return params ? `${path}?${params}` : path;
}