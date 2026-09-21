import { posts } from '~~/server/database/schema';
import { postInsertSchema } from '~~/server/database/posts.validators';
import { useSafeReadValidateBody } from '../composable/useSafeReadValidateBody';
import { requireAuth } from '~~/server/utils/auth';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const input = await readValidatedBody(event, postInsertSchema.parse);
  // const input = await useSafeReadValidateBody(event, postInsertSchema)

  try {
    const [created] = await useDb()
      .insert(posts)
      .values({...input, userId})
      .returning();

    setResponseStatus(event, 201);
    return created;
  }
  catch (error: any) {
    if (String(error?.code).includes('SQLITE_CONSTRAINT_UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: 'Already saved' });
    }
    throw error;
  }
})