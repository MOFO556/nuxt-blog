import { describe, expect, it } from 'vitest'
import { buildAppFetchHeaders } from '#app-utils/fetch-headers'

describe('buildAppFetchHeaders', () => {
  it('always sets Accept json', () => {
    expect(buildAppFetchHeaders(null)).toEqual({ Accept: 'application/json' })
  })

  it('adds Bearer when token is provided', () => {
    expect(buildAppFetchHeaders('abc')).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer abc',
    })
  })

  it('omits Authorization for empty string token', () => {
    expect(buildAppFetchHeaders('')).toEqual({ Accept: 'application/json' })
  })
})
