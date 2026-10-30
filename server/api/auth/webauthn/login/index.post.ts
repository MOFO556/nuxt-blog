import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { users, credentials, webauthnAttempts } from '~~/server/database/schema'
import { useWebAuthnExpectations } from '~~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const { login } = await readBody<{ login: string }>(event);

  if (!login)
    throw createError({ statusCode: 422, statusMessage: 'Login required' });

  const user = await useDb().query.users.findFirst({ where: eq(users.login, login) });

  if (!user || (user.authMethod !== 'passkey' && user.authMethod !== 'both'))
    throw createError({ statusCode: 422, statusMessage: 'Wrong credentials' });

  const creds = await useDb().query.credentials.findMany({
    where: eq(credentials.userId, user.id),
  });

  if (!creds.length)
    throw createError({ statusCode: 422, statusMessage: 'No passkeys registered' });

  const { rpID } = useWebAuthnExpectations();
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map(c => ({
      id: c.id,
      transports: c.transports as any,
    })),
    userVerification: 'preferred',
  });

  const attemptId = randomUUID()
  await useDb().insert(webauthnAttempts).values({
    id: attemptId,
    challenge: options.challenge,
    userId: user.id,
    type: 'authenticate',
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return { ...options, attemptId };
})