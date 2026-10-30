import { describe, expect, it } from 'vitest'
import { applyAssistantFormPatch } from '~~/shared/assistant/formPatch'
import { PostMode } from '~~/shared/types/posts'

describe('applyAssistantFormPatch', () => {
  const base = {
    mode: PostMode.Legacy,
    title: 'Old',
    description: 'Desc',
    url: 'old-url',
    content: 'body',
    contentHtml: '',
    tags: ['a'],
  }

  it('applies only provided fields and never changes mode', () => {
    const next = applyAssistantFormPatch(base, {
      title: 'New',
      tags: ['b', 'c'],
    })

    expect(next).toEqual({
      mode: PostMode.Legacy,
      title: 'New',
      description: 'Desc',
      url: 'old-url',
      content: 'body',
      contentHtml: '',
      tags: ['b', 'c'],
    })
  })

  it('leaves snapshot unchanged when patch is empty', () => {
    expect(applyAssistantFormPatch(base, {})).toEqual(base)
  })

  it('preserves tip-tap JSON content for formatted snapshots', () => {
    const tipTap = JSON.stringify({ type: 'doc', content: [] })
    const formatted = {
      ...base,
      mode: PostMode.Formatted,
      content: tipTap,
      contentHtml: '<p>Old</p>',
    }

    const next = applyAssistantFormPatch(formatted, {
      content: 'plain summary from model',
      contentHtml: '<p>New</p>',
    })

    expect(next.content).toBe(tipTap)
    expect(next.contentHtml).toBe('<p>New</p>')
  })
})
