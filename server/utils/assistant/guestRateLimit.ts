import { createSlidingWindowRateLimiter } from '#server-utils/assistant/rateLimit';

const g = globalThis as typeof globalThis & {
  __assistantGuestLimiter?: ReturnType<typeof createSlidingWindowRateLimiter>;
};

export function useAssistantGuestRateLimiter() {
  const config = useRuntimeConfig();
  const maxRequests = Number(config.assistantGuestRpm) || 10;
  const windowMs = 60_000;

  if (!g.__assistantGuestLimiter)
    g.__assistantGuestLimiter = createSlidingWindowRateLimiter({
      maxRequests,
      windowMs,
    });

  return g.__assistantGuestLimiter;
}

export function assistantGuestKey(event: Parameters<typeof getRequestIP>[0]) {
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
}