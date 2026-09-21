import { comments } from '~~/server/database/schema';
import { requireAuth } from '~~/server/utils/auth';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const item = getRouterParam(event, 'item');
  const id = getRouterParam(event, 'id');
  const userId = event.context.user.id;
  // const input = await readValidatedBody(event, postInsertSchema.parse);
  // const input = await useSafeReadValidateBody(event, postInsertSchema);
  const body = await readBody(event);

  try {
    const [created] = await useDb()
      .insert(comments)
      .values({
        text: body.text,
        postId: Number(id), 
        userId})
      .returning()

    setResponseStatus(event, 201)
    return created
  }
  catch (error: any) {
    if (String(error?.code).includes('SQLITE_CONSTRAINT_UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: 'Already saved' })
    }
    throw error
  }
})