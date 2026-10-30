import type { AssistantNavigationProposal } from '~~/shared/types/assistant';
import { buildPostsFilterPath, normalizeAssistantNavigation } from '~~/shared/assistant/navigation';

type ResolveNavigationInput = {
  path?: string;
  queryEntries?: { key: string; value: string }[];
  tags?: string | string[];
  author?: string;
  q?: string;
  from?: string;
  to?: string;
  reason?: string;
};

export function resolveNavigationProposal(input: ResolveNavigationInput): {
  status: 'awaiting_user_confirm';
  path: string;
  query: Record<string, string>;
  reason: string | null;
} | {
  status: 'invalid';
  error: string;
} {
  const queryFromEntries = Object.fromEntries(
    (input.queryEntries ?? []).map(entry => [entry.key, entry.value]),
  );

  const hasFilterFields = Boolean(input.tags
    || input.author
    || input.q
    || input.from
    || input.to
    || Object.keys(queryFromEntries).length);

  let built: AssistantNavigationProposal;

  if (hasFilterFields) {
    const fromFilters = buildPostsFilterPath({
      tags: input.tags,
      author: input.author,
      q: input.q,
      from: input.from,
      to: input.to,
    });
    built = {
      path: fromFilters.path,
      query: {
        ...(fromFilters.query ?? {}),
        ...queryFromEntries,
      },
      reason: input.reason ?? fromFilters.reason,
    };
  }
  else if (input.path)
    built = {
      path: input.path,
      query: queryFromEntries,
      reason: input.reason,
    };
  else
    built = buildPostsFilterPath({});

  const normalized = normalizeAssistantNavigation({
    ...built,
    reason: input.reason ?? built.reason,
  });

  if (!normalized.ok)
    return { status: 'invalid', error: normalized.error };

  return {
    status: 'awaiting_user_confirm',
    path: normalized.path,
    query: normalized.query,
    reason: input.reason ?? built.reason ?? null,
  };
}