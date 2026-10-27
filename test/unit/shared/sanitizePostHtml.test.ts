import { describe, expect, it } from 'vitest'
import { sanitizePostHtml } from '#shared/utils/sanitizePostHtml'

describe('sanitizePostHtml', () => {
  it('strips script tags and event handlers', () => {
    const dirty = '<p onclick="alert(1)">Hi</p><script>alert(2)</script>'
    expect(sanitizePostHtml(dirty)).toBe('<p>Hi</p>')
  })

  it('keeps carousel marker divs with image ids', () => {
    const html = '<p>Intro</p><div data-carousel="true" data-image-ids="1,2,3"></div>'
    expect(sanitizePostHtml(html)).toBe(html)
  })

  it('strips javascript URLs from links', () => {
    const dirty = '<a href="javascript:alert(1)">Click</a>'
    expect(sanitizePostHtml(dirty)).toBe('<a>Click</a>')
  })

  it('keeps class and style attributes', () => {
    const html = '<p class="lead" style="text-align:center;line-height:1.6">Hi</p>'
    expect(sanitizePostHtml(html)).toBe(html)
  })

  it('keeps wrapper div classes and normalizes quoted CSS colors', () => {
    const dirty = `<div class="flex gap-3"><p style="color: 'green'">Hi</p></div>`
    const out = sanitizePostHtml(dirty)
    expect(out).toContain('class="flex gap-3"')
    expect(out).toMatch(/style="color:\s*green"/)
    expect(out).toContain('<p')
  })

  it('keeps data-image-id on images', () => {
    const html = '<img src="/images/a.webp" alt="1" data-image-id="1">'
    expect(sanitizePostHtml(html)).toContain('data-image-id="1"')
  })

  it('strips blob and data image sources', () => {
    const dirty = '<img src="blob:http://localhost/x" alt="1"><img src="data:image/png;base64,xx" alt="2">'
    const out = sanitizePostHtml(dirty)
    expect(out).not.toContain('blob:')
    expect(out).not.toContain('data:image')
  })
})
