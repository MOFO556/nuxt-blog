import { describe, expect, it } from 'vitest'
import { normalizeFormPatchForMode } from '~~/shared/assistant/normalizeFormPatch'
import { PostMode } from '~~/shared/types/posts'

describe('normalizeFormPatchForMode', () => {
  it('derives contentHtml from plain content for formatted mode without storing plain text as TipTap JSON', () => {
    expect(normalizeFormPatchForMode(PostMode.Formatted, {
      title: 'F1',
      content: 'Line one\n\nLine two',
    })).toEqual({
      title: 'F1',
      content: undefined,
      contentHtml: '<p>Line one</p><p>Line two</p>',
    })
  })

  it('escapes HTML-looking plain content instead of passing it through', () => {
    expect(normalizeFormPatchForMode(PostMode.Formatted, {
      content: '<img src=x onerror=alert(1)>',
    }).contentHtml).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>')
  })

  it('keeps existing contentHtml for formatted mode', () => {
    expect(normalizeFormPatchForMode(PostMode.Formatted, {
      contentHtml: '<p>Hello</p>',
      content: 'Hello',
    }).contentHtml).toBe('<p>Hello</p>')
  })

  it('does not copy contentHtml into content for HTML-only formatted patches', () => {
    expect(normalizeFormPatchForMode(PostMode.Formatted, {
      contentHtml: '<p>Hello</p>',
    })).toEqual({
      contentHtml: '<p>Hello</p>',
      content: undefined,
    })
  })

  it('keeps TipTap JSON content when provided for formatted mode', () => {
    const tipTap = JSON.stringify({ type: 'doc', content: [] })
    expect(normalizeFormPatchForMode(PostMode.Formatted, {
      content: tipTap,
      contentHtml: '<p></p>',
    }).content).toBe(tipTap)
  })

  it('leaves legacy patches as plain content', () => {
    expect(normalizeFormPatchForMode(PostMode.Legacy, {
      content: 'plain body',
    })).toEqual({
      content: 'plain body',
    })
  })
})
