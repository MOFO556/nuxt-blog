import { H3Event } from "h3";
import * as z from "zod";

export const useSafeReadValidateBody = 
async(
    event: H3Event<EventHandlerRequest>, 
    schema: z.ZodObject 
  ): Promise<Record<string, unknown>> => {
  const result = schema.safeParse(await readBody(event as any));
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid data',
      data: { fields: result.error.issues.map(i => i.path.join('.')) },
    })
  }
  const input = result.data
  return input;
}