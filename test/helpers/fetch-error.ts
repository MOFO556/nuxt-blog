export function getFetchStatus(err: unknown): number | undefined {
  const error = err as {
    statusCode?: number
    status?: number
    data?: { statusCode?: number }
    response?: { status?: number }
  }
  return error.statusCode
    ?? error.status
    ?? error.data?.statusCode
    ?? error.response?.status
}

export function getFetchErrorData<T = unknown>(err: unknown): T | undefined {
  const error = err as {
    data?: T | { data?: T }
  }
  if (error.data && typeof error.data === 'object' && error.data !== null && 'data' in error.data) {
    return (error.data as { data?: T }).data
  }
  return error.data as T | undefined
}
