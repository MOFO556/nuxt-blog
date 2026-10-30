import { randomUUID } from 'node:crypto';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { users, webauthnAttempts } from '~~/server/database/schema';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { userInsertSchema } from '~~/server/database/users.validators';
import { useWebAuthnExpectations } from '~~/server/utils/webauthn';

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
    throw createError({ statusCode: 422, statusMessage: 'Invalid data' });

  const { rpName, rpID } = useWebAuthnExpectations()
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: login,
    userDisplayName: login,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  const hashedPassword = password ? await hash(password, 12) : null;
  const attemptId = randomUUID();
  await useDb().insert(webauthnAttempts).values({
    id: attemptId,
    challenge: options.challenge,
    type: 'register',
    expiresAt: Date.now() + 5 * 60 * 1000,
    pending: JSON.stringify({ login, password: hashedPassword, avatar, authMethod })
  });

  return { ...options, attemptId };
})