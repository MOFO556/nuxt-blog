import { eq, sql, SQL } from 'drizzle-orm';
import jwt from 'jsonwebtoken'
import { H3Event } from "h3";
import { AUTH_JWT_ALG, AUTH_JWT_SECRET } from '../config/auth';
import { publicUserColumns, User, users } from '../database/schema/auth/users';
import { images, sessions } from '../database/schema';
import { AUTH_SESSION_LIFETIME_MS, AUTH_SESSION_LIFETIME_SEC, AUTH_SESSION_TOUCH_INTERVAL_MS } from '~~/shared/auth';

export async function requireAuth(event: H3Event) {
  const ctx = await loadSession(event);
  if (!ctx) 
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  
  const age = Date.now() - new Date(ctx.session.lastSeenAt).getTime();
  if (age > AUTH_SESSION_TOUCH_INTERVAL_MS) {
    const expiresAt = Date.now() + AUTH_SESSION_LIFETIME_MS;
    await useDb().update(sessions)
      .set({
        lastSeenAt: sql`CURRENT_TIMESTAMP`,
        expiresAt,
      })
      .where(eq(sessions.id, ctx.session.id));

    const token = signToken(ctx.user.id, ctx.session.id);
    setCookie(event, 'token', token, {
      maxAge: AUTH_SESSION_LIFETIME_SEC,
      sameSite: 'lax',
      path: '/',
    });
    setHeader(event, 'x-auth-token', token);
  }

  event.context.user = ctx.user;
  event.context.session = ctx.session;
  return ctx;
}

function getRequestToken(event: H3Event): string | null {
  const cookie = getCookie(event, 'token');
  if (cookie)
    return cookie;

  const header = getHeader(event, 'Authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token)
    return token;

  return null;
}

export async function loadSession(event: H3Event) {
  const token = getRequestToken(event);
  if (!token) 
    return null;

  const payload: { id: number; sid: string } | null = verifyToken(token);  
  if (!payload)
    return payload;

  const userData = await useDb().transaction(tx => {
    const row = tx.select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, payload.sid))
      .get();
    
    if (!row?.session 
      || row.session.revoked
      || row.session.expiresAt < Date.now()
      || !row.user
    )
      return null;

    let avatar: string | undefined;
    if (row.user.avatar)
      avatar = tx.select().from(images).where(eq(images.id, row.user?.avatar)).get()?.path;

    return { session: row.session, user: { id: row.user.id, login: row.user.login, avatar }};
  });

  return userData;
}

export async function getUserByFilter(
    filter: SQL
  ): Promise<{[K in keyof typeof publicUserColumns]: User[K]} & { avatar?: string } | undefined> {
   const user = await useDb().query.users.findFirst({
    where: filter,
    columns: publicUserColumns,
    with: {
      avatar: {
        columns: { path: true }
      }
    }
  });
  return user?.id ? { id: user.id, login: user.login, avatar: user.avatar?.path } : undefined;
}

function verifyToken(token: string): { id: number; sid: string } | null {
  try { 
    return <{ id: number; sid: string }>jwt.verify(token, AUTH_JWT_SECRET, { algorithms: [ AUTH_JWT_ALG ] })
  }
  catch {
    return null;
  }
}

export function signToken(userId: number, sessionId: string): string {
  return jwt.sign({ id: userId, sid: sessionId }, AUTH_JWT_SECRET, {
    algorithm: AUTH_JWT_ALG,
    expiresIn: AUTH_SESSION_LIFETIME_SEC,
  });
}