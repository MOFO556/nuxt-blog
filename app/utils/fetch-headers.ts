export function buildAppFetchHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  }
  const token = useCookie("token");
  if (token.value)
    headers.Authorization = `Bearer ${token.value}`

  return headers;
}