import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { and, eq, gt, sql } from 'drizzle-orm';
import { users, credentials, webauthnAttempts, images } from '~~/server/database/schema'
import { createSession } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ attemptId: string; response: unknown }>(event);

  const attempt = await useDb().query.webauthnAttempts.findFirst({
    where: and(
      eq(webauthnAttempts.id, body.attemptId),
      gt(webauthnAttempts.expiresAt, Date.now()),
    ),
  });

  if (!attempt || attempt.type !== 'authenticate' || !attempt.userId)
    throw createError({ statusCode: 400, statusMessage: 'Challenge expired' });

  const creds = await useDb().query.credentials.findMany({
    where: eq(credentials.userId, attempt.userId),
  });
  const credentialRow = creds.find(c => c.id === (body.response as any).id);

  if (!credentialRow)
    throw createError({ statusCode: 422, statusMessage: 'Credential not found' });

  const cfg = useRuntimeConfig(event).webauthn;
  const verification = await verifyAuthenticationResponse({
    response: body.response as any,
    expectedChallenge: attempt.challenge,
    expectedOrigin: cfg.origin,
    expectedRPID: cfg.rpID,
    credential: {
      id: credentialRow.id,
      publicKey: new Uint8Array(Buffer.from(credentialRow.publicKey, 'base64')),
      counter: credentialRow.counter,
      transports: credentialRow.transports as any,
    },
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.authenticationInfo)
    throw createError({ statusCode: 422, statusMessage: 'Authentication failed' });

  let avatar: string | undefined;
  const user = await useDb().transaction(tx => {
  const { newCounter } = verification.authenticationInfo;
    tx.update(credentials)
      .set({ counter: newCounter, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(credentials.id, credentialRow.id));

    tx.delete(webauthnAttempts).where(eq(webauthnAttempts.id, body.attemptId));

    const user = tx.select().from(users).where(eq(users.id, <number>attempt.userId)).get();

    if (user?.avatar)
      avatar = tx.select().from(images).where(eq(images.id, user.avatar)).get()?.path;
    
    return user;
  })

  if (!user)
    throw createError({ statusCode: 422, statusMessage: 'Wrong credentials' });

  const sessionId = await createSession(event, {
    userId: user.id,
    loginMethod: 'passkey',
    credentialId: credentialRow.id,
  });

  broadcast(`user:${user.id}`, { type: 'sessions:added' });

  return {
    user: { id: user.id, login: user.login, avatar },
    token: signToken(user.id, sessionId),
  }
})