import { describe, expect, it } from 'vitest'
import { asVecPrimaryKey } from '~~/server/utils/assistant/vecPrimaryKey'

describe('asVecPrimaryKey', () => {
  it('converts positive integers to bigint', () => {
    expect(asVecPrimaryKey(12)).toBe(12n)
    expect(asVecPrimaryKey('34')).toBe(34n)
    expect(asVecPrimaryKey(56n)).toBe(56n)
  })

  it('rejects non-integers', () => {
    expect(() => asVecPrimaryKey(1.5)).toThrow()
    expect(() => asVecPrimaryKey(0)).toThrow()
    expect(() => asVecPrimaryKey('x')).toThrow()
  })
})
