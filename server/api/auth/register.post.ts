import { useSafeReadValidateBody } from "~~/server/composable/useSafeReadValidateBody";
import { users } from "~~/server/database/schema";
import { userInsertSchema } from "~~/server/database/users.validators";
import { createSession } from "~~/server/utils/session";

export default defineEventHandler(async event => {
  
  const input = await useSafeReadValidateBody(event, userInsertSchema);

  const user = useDb().insert(users).values(input).returning().get();
  
  if (!user)
    throw createError({ statusCode: 422, statusMessage: 'Could not create user' });

  if (input.authMethod === 'password') {
    const sessionId = await createSession(event, {
      userId: user.id,
      loginMethod: 'password',
      passwordSnapshot: user.password,
    });
    return { user: user, token: signToken(user.id, sessionId), passkey: null };
  }

    return user;
})