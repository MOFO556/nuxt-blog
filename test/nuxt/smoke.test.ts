import { describe, expect, it } from 'vitest'

describe('nuxt project smoke', () => {
  it('has Nuxt app context', () => {
    expect(useNuxtApp()).toBeTruthy()
  })
})
