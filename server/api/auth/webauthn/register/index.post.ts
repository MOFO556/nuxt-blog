import { randomUUID } from 'node:crypto'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { eq } from 'drizzle-orm'
import { users, webauthnAttempts } from '~~/server/database/schema'
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody'
import { userInsertSchema } from '~~/server/database/users.validators'

export default defineEventHandler(async (event) => {
  const { login, password, avatar, authMethod} = await useSafeReadValidateBody(event, userInsertSchema);

  if (!login)
    throw createError({ statusCode: 422, statusMessage: 'Login required' });
  if (authMethod !== 'passkey' && authMethod !== 'both')
    throw createError({ statusCode: 422, statusMessage: 'Invalid auth method' });

  const existing = await useDb().query.users.findFirst({
    where: eq(users.login, login),
    columns: { id: true },
  });

  if (existing)
    throw createError({ statusCode: 409, statusMessage: 'Login already taken' });

  const cfg = useRuntimeConfig(event).webauthn
  const options = await generateRegistrationOptions({
    rpName: cfg.rpName,
    rpID: cfg.rpID,
    userName: login,
    userDisplayName: login,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  const attemptId = randomUUID();
  await useDb().insert(webauthnAttempts).values({
    id: attemptId,
    challenge: options.challenge,
    type: 'register',
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return { ...options, attemptId, pending: { login, password, avatar, authMethod } };
})