import { randomUUID } from "crypto";
import { H3Event } from "h3";
import { useLookUpIp } from "../composable/useLookUpIp";
import { sessions } from "../database/schema/auth/sessions";
import { AUTH_SESSION_LIFETIME_MS } from "~~/shared/auth";

export async function createSession(event: H3Event, opts: {
    userId: number;
    loginMethod: 'password' | 'passkey';
    credentialId?: string;
    passwordSnapshot?: string | null;
  }) {
  const id = randomUUID();
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  const userAgent = getRequestHeader(event, 'user-agent') || 'unknown';
  const geo = await useLookUpIp(ip);

  await useDb().insert(sessions).values({
    id,
    userId: opts.userId,
    loginMethod: opts.loginMethod,
    credentialId: opts.credentialId ?? null,
    passwordSnapshot: opts.passwordSnapshot ?? null,
    ip, userAgent,
    city: geo?.city, country: geo?.country,
    expiresAt: Date.now() + AUTH_SESSION_LIFETIME_MS,
  });

  return id;
}