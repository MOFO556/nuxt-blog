import { describe, expect, it } from 'vitest'
import { slugify } from '~~/shared/utils/slugify'

describe('slugify', () => {
  it('lowercases, trims, and replaces spaces with dashes', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world')
  })

  it('strips non-word characters except dashes', () => {
    expect(slugify('C++ & Nuxt!')).toBe('c--nuxt')
  })
})
