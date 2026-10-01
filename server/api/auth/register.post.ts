import { hash } from "bcrypt";
import { useSafeReadValidateBody } from "~~/server/composable/useSafeReadValidateBody";
import { User, users } from "~~/server/database/schema";
import { userInsertSchema } from "~~/server/database/users.validators";
import { createSession } from "~~/server/utils/session";

export default defineEventHandler(async event => {
  
  const input = await useSafeReadValidateBody(event, userInsertSchema);
  let user: User | undefined;
  try {
    const hashedPassword = input.password ? await hash(input.password, 12) : null;
    if (hashedPassword)
      user = useDb().insert(users).values({...input, password: hashedPassword})
      .returning().get();
  }
  catch {    
    throw createError({ statusCode: 422, statusMessage: 'Could not create user', data: [
      ["login", "Unable to create user"],
      ["password", "Unable to create user"]
    ]});
  }
  
  if (!user)
    throw createError({ statusCode: 422, statusMessage: 'Could not create user', data: [
      ["login", "Unable to create user"],
      ["password", "Unable to create user"]
    ]});

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