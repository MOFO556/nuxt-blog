export function buildAppFetchHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const value = token !== undefined
    ? token
    : useCookie<string | null>('token').value;

  if (value)
    headers.Authorization = `Bearer ${value}`;

  return headers;
}
