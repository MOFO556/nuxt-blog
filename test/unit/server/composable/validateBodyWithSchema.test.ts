import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { validateBodyWithSchema } from '#server-composable/useSafeReadValidateBody'

describe('validateBodyWithSchema', () => {
  it('returns parsed data for a valid body', () => {
    const schema = z.object({ login: z.string().min(5) })
    expect(validateBodyWithSchema({ login: 'alice1' }, schema)).toEqual({ login: 'alice1' })
  })

  it('throws 422 with field tuples for invalid body', () => {
    const schema = z.object({ login: z.string().min(5) })

    try {
      validateBodyWithSchema({ login: 'ab' }, schema)
      expect.unreachable('should throw')
    }
    catch (err: unknown) {
      const error = err as { statusCode: number, data: [string, string][] }
      expect(error.statusCode).toBe(422)
      expect(error.data[0]?.[0]).toBe('login')
      expect(typeof error.data[0]?.[1]).toBe('string')
    }
  })
})
