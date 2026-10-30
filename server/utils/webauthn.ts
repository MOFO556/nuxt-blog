const LOCAL_ORIGIN = 'http://localhost:3000'

export type WebAuthnExpectationsInput = {
  rpID?: string
  rpName?: string
  appOrigin?: string
}

export type WebAuthnExpectations = {
  rpID: string
  rpName: string
  origin: string
}

function normalizeOrigin(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed)
    return LOCAL_ORIGIN
  try {
    return new URL(trimmed).origin
  }
  catch {
    return LOCAL_ORIGIN
  }
}

function normalizeRpId(rpID: string | undefined, origin: string): string {
  const originHost = new URL(origin).hostname || 'localhost'
  const trimmed = rpID?.trim() ?? ''
  if (!trimmed || trimmed === 'localhost' || trimmed === '127.0.0.1')
    return originHost

  try {
    const asUrl = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    const host = new URL(asUrl).hostname
    if (host)
      return host
  }
  catch {
    return originHost
  }
  return originHost
}

export function resolveWebAuthnExpectations(input: WebAuthnExpectationsInput): WebAuthnExpectations {
  const origin = normalizeOrigin(input.appOrigin)
  return {
    rpID: normalizeRpId(input.rpID, origin),
    rpName: input.rpName?.trim() || 'MOFONuxt',
    origin,
  }
}

export function useWebAuthnExpectations(): WebAuthnExpectations {
  const config = useRuntimeConfig()
  return resolveWebAuthnExpectations({
    rpID: config.webauthn.rpID,
    rpName: config.webauthn.rpName,
    appOrigin: config.public.appOrigin,
  })
}