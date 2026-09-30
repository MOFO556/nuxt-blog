import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { users, credentials, webauthnAttempts } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const user = await useDb().query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) 
    throw createError({ statusCode: 401, statusMessage: 'Not authorized' });

  const existing = await useDb().query.credentials.findMany({
    where: eq(credentials.userId, userId),
  });

  const cfg = useRuntimeConfig(event).webauthn;
  const options = await generateRegistrationOptions({
    rpName: cfg.rpName,
    rpID: cfg.rpID,
    userName: user.login,
    userDisplayName: user.login,
    attestationType: 'none',
    excludeCredentials: existing.map(c => ({ id: c.id, transports: c.transports as any })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  const attemptId = randomUUID();
  await useDb().insert(webauthnAttempts).values({
    id: attemptId,
    challenge: options.challenge,
    userId,
    type: 'add_credential',
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  return { ...options, attemptId };
});