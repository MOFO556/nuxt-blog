import { describe, expect, it } from 'vitest'
import { normalizeHtmlStyles } from '#shared/utils/normalizeHtmlStyles'

describe('normalizeHtmlStyles', () => {
  it('strips single quotes around CSS values', () => {
    expect(normalizeHtmlStyles(`<h1 style="color: 'red'">Hi</h1>`))
      .toBe('<h1 style="color: red">Hi</h1>')
  })

  it('strips double quotes around CSS values', () => {
    expect(normalizeHtmlStyles(`<p style="color: "green"; font-weight: '700'">x</p>`))
      .toBe('<p style="color: green; font-weight: 700">x</p>')
  })
})
