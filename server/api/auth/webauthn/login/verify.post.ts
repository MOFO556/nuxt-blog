import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { and, eq, gt } from 'drizzle-orm';
import { users, credentials, webauthnAttempts } from '~~/server/database/schema'

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

  const user = await useDb().transaction(tx => {
  const { newCounter } = verification.authenticationInfo;
    tx.update(credentials)
      .set({ counter: newCounter })
      .where(eq(credentials.id, credentialRow.id));

    tx.delete(webauthnAttempts).where(eq(webauthnAttempts.id, body.attemptId));

    return tx.select().from(users).where(eq(users.id, <number>attempt.userId)).get();
  })

  if (!user)
    throw createError({ statusCode: 422, statusMessage: 'Wrong credentials' });

  return {
    user: { id: user.id, login: user.login },
    token: signToken(user.id),
  }
})