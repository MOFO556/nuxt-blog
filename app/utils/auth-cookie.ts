import { AUTH_SESSION_LIFETIME_SEC } from '~~/shared/auth';

export function useAuthTokenCookie() {
  return useCookie<string | null>('token', {
    default: () => null,
    maxAge: AUTH_SESSION_LIFETIME_SEC,
    sameSite: 'lax',
    path: '/',
  });
}
