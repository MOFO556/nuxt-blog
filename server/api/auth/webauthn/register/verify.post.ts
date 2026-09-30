import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { and, eq, gt } from 'drizzle-orm';
import { useLookUpIp } from '~~/server/composable/useLookUpIp';
import { users, credentials, webauthnAttempts, images, Credentials } from '~~/server/database/schema';
import { createSession } from '~~/server/utils/session';

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

  if (!attempt || attempt.type !== 'register' || !attempt.pending)
    throw createError({ statusCode: 400, statusMessage: 'Challenge expired' });

  const pending = JSON.parse(attempt.pending) as {
    login: string;
    password: string | null;
    avatar?: number;
    authMethod: 'passkey' | 'both';
  };

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

  const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
  const publicKeyB64 = Buffer.from(credential.publicKey).toString('base64');

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  const userAgent = getRequestHeader(event, 'user-agent') || 'unknown';
  let city: string, country: string;

  console.log(ip)
  if (ip !== 'unknown') {
    try {
      const res = await useLookUpIp(ip);
      city = res.city;
      country = res.country;
    } catch (e) {
      console.error('Unable to locate ip info', e);
    }
  }

  let avatar: string | undefined, credentialRow: Credentials | undefined;
  const newUser = await useDb().transaction((tx) => {
    const u = tx.insert(users).values({
      login: pending.login,
      password: pending.password,
      avatar: pending.avatar,
      authMethod: pending.authMethod,
    }).returning().get();

    if (!u) 
      throw createError({ statusCode: 422, statusMessage: 'Could not create user' });

    credentialRow = tx.insert(credentials).values({
      id: credential.id,
      userId: u.id,
      publicKey: publicKeyB64,
      counter: credential.counter,
      backedUp: credentialBackedUp,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      city,
      country,
      userAgent,
    }).returning().get();

    tx.delete(webauthnAttempts).where(eq(webauthnAttempts.id, body.attemptId));

    if (u.avatar)
      avatar = tx.select().from(images).where(eq(images.id, u.avatar)).get()?.path;

    return u;
  });

  const sessionId = await createSession(event, {
    userId: newUser.id,
    loginMethod: 'passkey',
    credentialId: credentialRow?.id,
  });

  return {
    user: { id: newUser.id, login: newUser.login, avatar: avatar },
    token: signToken(newUser.id, sessionId),
  };
})