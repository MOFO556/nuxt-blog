import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { validateBodyWithSchema } from '#server-composable/useSafeReadValidateBody'

describe('validateBodyWithSchema (nuxt env)', () => {
  it('throws a Nitro createError-shaped 422', () => {
    const schema = z.object({ title: z.string().min(5) })

    try {
      validateBodyWithSchema({ title: 'x' }, schema)
      expect.unreachable('should throw')
    }
    catch (err: unknown) {
      const error = err as { statusCode: number, statusMessage: string, data: [string, string][] }
      expect(error.statusCode).toBe(422)
      expect(error.statusMessage).toBe('Invalid data')
      expect(error.data).toEqual([
        ['title', expect.any(String)],
      ])
    }
  })
})
