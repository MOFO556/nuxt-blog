import { compare } from "bcrypt";
import { eq } from "drizzle-orm";
import { images, users } from "~~/server/database/schema";
import { userSchema } from "~~/server/database/users.validators";
import { createSession } from "~~/server/utils/session";

export default defineEventHandler(async event => {  
  const body = await readBody(event);
  try {
    userSchema.parse(body);
  } catch (error: any) {
      const errorsObj =  error.issues.reduce(
        (errors: [string, string][], err: any) => {
          errors.push([err.path[0], err.message]);
          return errors;
        }, []);
    throw createError({ statusCode: 422, statusMessage: 'Invalid data', data: errorsObj  });
  }

  let avatar: string | undefined;
  const user = await useDb().transaction(tx => {    
    const user = tx.select().from(users).where(eq(users.login, body.login)).get();
    
    if (user?.avatar)
      avatar = tx.select().from(images).where(eq(images.id, user.avatar)).get()?.path;
    
    return user;
  })

  if (!user 
    || (
      (user.authMethod === "password" || user.authMethod === "both") 
        && user.password !== null && !(await compare(body.password, user.password))))
      throw createError({ statusCode: 422, statusMessage: 'Wrong credentials', data: [
        ["login", "Wrong credentials"],
        ["password", "Wrong credentials"]
      ]});
  else {
    const sessionId = await createSession(event, {
        userId: user.id,
        loginMethod: 'password',
        passwordSnapshot: user.password,
      });
    broadcast(`user:${user.id}`, { type: 'sessions:added' });
    
    const token = signToken(user.id, sessionId);
    return { user: { id: user.id, login: user.login, avatar }, token};
  }
})