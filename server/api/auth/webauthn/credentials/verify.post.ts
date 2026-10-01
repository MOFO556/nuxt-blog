import { and, eq, gt } from 'drizzle-orm';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { credentials, users, webauthnAttempts } from '~~/server/database/schema';
import { useLookUpIp } from '~~/server/composable/useLookUpIp';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const body = await readBody<{ attemptId: string; response: unknown }>(event);

  const attempt = await useDb().query.webauthnAttempts.findFirst({
    where: and(
      eq(webauthnAttempts.id, body.attemptId),
      eq(webauthnAttempts.userId, userId),
      gt(webauthnAttempts.expiresAt, Date.now()),
    ),
  });

  if (!attempt || attempt.type !== 'add_credential')
    throw createError({ statusCode: 400, statusMessage: 'Challenge expired' });

  const cfg = useRuntimeConfig(event).webauthn;
  const verification = await verifyRegistrationResponse({
    response: body.response as any,
    expectedChallenge: attempt.challenge,
    expectedOrigin: cfg.origin,
    expectedRPID: cfg.rpID,
    requireUserVerification: false
  });

  if (!verification.verified || !verification.registrationInfo)
    throw createError({ statusCode: 422, statusMessage: 'Registration failed' });

  const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  const userAgent = getRequestHeader(event, 'user-agent') || 'unknown';
  let city: string, country: string;

  if (ip !== 'unknown') {
    try {
      const res = await useLookUpIp(ip);
      city = res.city;
      country = res.country;
    } catch (e) {
      console.error('Unable to locate ip info', e);
    }
  }

  await useDb().transaction((tx) => {
    tx.insert(credentials).values({
      id: credential.id,
      userId,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      backedUp: credentialBackedUp,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      city,
      country,
      userAgent,
    }).run();

    tx.update(users).set({ authMethod: "both" }).where(
      and(eq(users.id, userId), eq(users.authMethod, "password"))
    ).run();

    tx.delete(webauthnAttempts).where(eq(webauthnAttempts.id, body.attemptId)).run();
  });

  broadcast(`user:${userId}`, { type: 'credentials:added' });

  return { ok: true };
});