import { useAuthTokenCookie } from '~/utils/auth-cookie';

export function buildAppFetchHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const value = token !== undefined
    ? token
    : useAuthTokenCookie().value;

  if (value)
    headers.Authorization = `Bearer ${value}`;

  return headers;
}
