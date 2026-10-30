/**
 * Override with ASSISTANT_SPLIT_TURNS=true|false
 */
export function isTightRateLimitProvider(
  aiBaseUrl: string,
  envOverride?: string | null,
): boolean {
  const raw = (envOverride ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes')
    return true;
  if (raw === '0' || raw === 'false' || raw === 'no')
    return false;

  const base = aiBaseUrl.trim();
  if (!base)
    return true;

  try {
    const host = new URL(base).hostname.toLowerCase();
    return host !== 'localhost'
      && host !== '127.0.0.1'
      && host !== '[::1]'
      && host !== '::1';
  }
  catch {
    return !/^https?:\/\/(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?(\/|$)/i.test(base);
  }
}