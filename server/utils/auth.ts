import { eq, SQL } from 'drizzle-orm';
import jwt, { JwtPayload } from 'jsonwebtoken'
import { H3Event } from "h3";
import { AUTH_JWT_ALG, AUTH_JWT_SECRET } from '../config/auth';
import { publicUserColumns, users } from '../database/schema/users';

export async function requireAuth(event: H3Event) {
  const { auth, user } = await checkAuth(event);  
  if (!auth)
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  else
    event.context.user = user;
}

export async function checkAuth(
    event: H3Event
  ): Promise<{ auth: boolean, user?: typeof publicUserColumns }> {
	const header = getHeader(event, 'Authorization') ?? '';
	const [ _, token ] = header.split(' ');

  const tokenData = !token ? false : verifyToken(token);
  if (!tokenData)
    return {
      auth: false
    }
  else {    
    const user = await getUserByToken(tokenData);
    return { auth: true, user: user};
  }
}

export async function getUserByFilter(
    filter: SQL
  ): Promise<typeof publicUserColumns | undefined> {
  return await useDb().query.users.findFirst({
    where: filter,
    columns: publicUserColumns
  }) as typeof publicUserColumns | undefined;
}

function verifyToken(token: string): JwtPayload | false {
  try { 
    return <JwtPayload>jwt.verify(token, AUTH_JWT_SECRET, { algorithms: [ AUTH_JWT_ALG ] })
  }
  catch {
    return false;
  }
}

async function getUserByToken(
    token: JwtPayload
  ): Promise<typeof publicUserColumns | undefined> {
  return await getUserByFilter(eq(users.id, token.id));
}