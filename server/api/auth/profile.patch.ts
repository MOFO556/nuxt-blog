import { and, eq } from 'drizzle-orm';
import { compare, hash } from 'bcrypt';
import { users, images, credentials, InsertUser, sessions } from '~~/server/database/schema';
import { userSchema } from '~~/server/database/users.validators';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;

  const body = await readBody<{
    avatar?: number | null;
    newPassword?: string;
    currentPassword?: string;
    removePassword?: boolean;
  }>(event);

  if (body.newPassword !== undefined && body.removePassword)
    throw createError({ statusCode: 422, statusMessage: 'Conflicting password operations' });

  const user = await useDb().query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) 
    throw createError({ statusCode: 401, statusMessage: 'Not authorized' });

  const passkeys = await useDb().query.credentials.findMany({
    where: eq(credentials.userId, userId),
    columns: { id: true },
  });

  const updates: Partial<InsertUser> = {};

  if (body.avatar !== undefined) {
    if (body.avatar === null)
      updates.avatar = null;
    else {
      const img = await useDb().query.images.findFirst({
        where: eq(images.id, body.avatar),
        columns: { id: true },
      });
      if (!img) 
        throw createError({ statusCode: 422, statusMessage: 'Image not found' });
      updates.avatar = body.avatar;
    }
  }

  if (body.removePassword)
    updates.password = null;
  else if (body.newPassword !== undefined) {
    let password: string;
    try {
      const{ password: newPassword } = await userSchema.parse({ password: body.newPassword, login: user.login });
      password = newPassword;
    } catch (error: any) {
      const errorsObj =  error.issues.reduce(
        (errors: Record<string, string>, err: any) => 
          { return { ...errors, ...{ [err.path[0]]: err.message } } }, 
        {});
      throw createError({ statusCode: 422, statusMessage: 'Invalid data', data: errorsObj  });
    }
    if (user.password) {
      if (!body.currentPassword)
        throw createError({ statusCode: 422, statusMessage: 'Current password required' });
      const ok = await compare(body.currentPassword, user.password);
      if (!ok) 
        throw createError({ statusCode: 422, statusMessage: 'Invalid data' });
    } 
    if (password){
      updates.password = await hash(password, 12);}
  }

  const willHavePassword =
    updates.password !== undefined ? updates.password !== null : !!user.password;
  const willHavePasskey = passkeys.length > 0;

  if (!willHavePassword && !willHavePasskey)
    throw createError({ statusCode: 422, statusMessage: 'Cannot remove your only sign-in method' });

  updates.authMethod = willHavePassword && willHavePasskey
    ? 'both'
    : willHavePasskey
      ? 'passkey'
      : 'password';

  await useDb().transaction(tx => {
    tx.update(users).set(updates).where(eq(users.id, userId)).run();

    if (updates.password !== undefined)
      tx.update(sessions)
        .set({
          invalidated: true,
          invalidReason: updates.password === null ? "passkey removed" : "password changed",
        })
        .where(and(
          eq(sessions.userId, userId),
          eq(sessions.loginMethod, 'password'),
          eq(sessions.invalidated, false),
        )).run();
  })

  return { ok: true };
});