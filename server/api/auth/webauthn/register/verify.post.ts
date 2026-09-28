import { and, eq, gt } from 'drizzle-orm'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { users, credentials, webauthnAttempts, images } from '~~/server/database/schema'
import { hash } from 'bcrypt';

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    attemptId: string
    pending: { login: string; avatar?: number; password?: string; authMethod: 'passkey' | 'both' }
    response: unknown
  }>(event);

  const attempt = await useDb().query.webauthnAttempts.findFirst({
    where: and(
      eq(webauthnAttempts.id, body.attemptId),
      gt(webauthnAttempts.expiresAt, Date.now()),
    ),
  });

  if (!attempt || attempt.type !== 'register')
    throw createError({ statusCode: 400, statusMessage: 'Challenge expired' });

  const cfg = useRuntimeConfig(event).webauthn;
  const verification = await verifyRegistrationResponse({
    response: body.response as any,
    expectedChallenge: attempt.challenge,
    expectedOrigin: cfg.origin,
    expectedRPID: cfg.rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo)
    throw createError({ statusCode: 422, statusMessage: 'Registration failed' });

  const { credential, credentialBackedUp } = verification.registrationInfo;
  const publicKeyB64 = Buffer.from(credential.publicKey).toString('base64');

  const pass = !body.pending.password ? null : await hash("password", 12);
  let avatar;
  const newUser = await useDb().transaction((tx) => {
    const u = tx.insert(users).values({
      login: body.pending.login,
      password: pass,
      avatar: body.pending.avatar,
      authMethod: body.pending.authMethod,
    }).returning().get();

    if (!u) 
      throw createError({ statusCode: 422, statusMessage: 'Could not create user' });

    tx.insert(credentials).values({
      id: credential.id,
      userId: u.id,
      publicKey: publicKeyB64,
      counter: credential.counter,
      backedUp: credentialBackedUp,
      transports: credential.transports ?? [],
    }).run();

    tx.delete(webauthnAttempts).where(eq(webauthnAttempts.id, body.attemptId));

    if (u.avatar)
      avatar = tx.select().from(images).where(eq(images.id, u.avatar)).get()?.path;

    return u;
  });

  return {
    user: { id: newUser.id, login: newUser.login, avatar: avatar },
    token: signToken(newUser.id),
  };
})