import { describe, expect, it } from 'vitest'
import { resolveWebAuthnExpectations } from '#server-utils/webauthn'

describe('resolveWebAuthnExpectations', () => {
  it('uses the public app origin and its hostname when the relying party id is still localhost', () => {
    expect(resolveWebAuthnExpectations({
      rpID: 'localhost',
      rpName: 'MOFONuxt',
      appOrigin: 'https://blog.example.com',
    })).toEqual({
      rpID: 'blog.example.com',
      rpName: 'MOFONuxt',
      origin: 'https://blog.example.com',
    })
  })

  it('keeps an explicit relying party id', () => {
    expect(resolveWebAuthnExpectations({
      rpID: 'passkeys.example.com',
      rpName: 'MOFONuxt',
      appOrigin: 'https://blog.example.com/',
    })).toEqual({
      rpID: 'passkeys.example.com',
      rpName: 'MOFONuxt',
      origin: 'https://blog.example.com',
    })
  })

  it('keeps localhost for local dev', () => {
    expect(resolveWebAuthnExpectations({
      rpID: 'localhost',
      rpName: 'MOFONuxt',
      appOrigin: 'http://localhost:3000',
    })).toEqual({
      rpID: 'localhost',
      rpName: 'MOFONuxt',
      origin: 'http://localhost:3000',
    })
  })

  it('turns a full URL relying party id into a hostname', () => {
    expect(resolveWebAuthnExpectations({
      rpID: 'https://blog.example.com',
      rpName: 'MOFONuxt',
      appOrigin: 'https://blog.example.com/',
    }).rpID).toBe('blog.example.com')
  })
})