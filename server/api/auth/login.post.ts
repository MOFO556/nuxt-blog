import { compare } from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { AUTH_JWT_SECRET, AUTH_JWT_ALG, AUTH_JWT_LIFETIME } from "~~/server/config/auth";
import { users } from "~~/server/database/schema";
import { userSchema } from "~~/server/database/users.validators";

export default defineEventHandler(async event => {  
  const body = await readBody(event);
  try {
    userSchema.parse(body);
  } catch (error: any) {
    const errorsObj =  error.issues.reduce(
      (errors: Record<string, string>, err: any) => 
        { return { ...errors, ...{ [err.path[0]]: err.message } } }, 
      {});
    throw createError({ statusCode: 422, statusMessage: 'Invalid data', data: errorsObj  });
  }

  const user = await useDb().query.users.findFirst({
      where: eq(users.login, body.login),
    });

  if (!user 
    || (
      (user.authMethod === "password" || user.authMethod === "both") 
        && user.password !== null && !(await compare(body.password, user.password))))
      throw createError({ statusCode: 422, statusMessage: 'Wrong credentials' });
  else {
    const token = jwt.sign({
				id: user.id
			}, AUTH_JWT_SECRET, { algorithm: AUTH_JWT_ALG, expiresIn: AUTH_JWT_LIFETIME }
    );
    return { user: { id: user.id, login: user.login }, token};
  }
})