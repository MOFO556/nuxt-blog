import { createError, readBody, type H3Event } from 'h3'
import type * as z from 'zod'

/** Pure validation seam: maps Zod failures to the API 422 field-tuple shape. */
export function validateBodyWithSchema<T extends z.ZodType>(
  body: unknown,
  schema: T,
): z.output<T> {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid data',
      data: result.error.issues.map(i => [i.path.join('.'), i.message]),
    })
  }

  return result.data
}

export const useSafeReadValidateBody =
  async <T extends z.ZodType>(
    event: H3Event,
    schema: T,
  ): Promise<z.output<T>> => {
    return validateBodyWithSchema(await readBody(event), schema)
  }
