import { H3Event } from "h3";
import * as z from "zod";

export const useSafeReadValidateBody = 
async<T extends Record<string, unknown>>(
    event: H3Event<EventHandlerRequest>, 
    schema: z.ZodObject
  ): Promise<T> => {
  const result = schema.safeParse(await readBody<T>(event as any));
  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid data',
      data: 
        result.error.issues.map(i => {
          return [i.path.join('.'), i.message ]
        })
    })
  }
  const input = result.data as T
  return input;
}