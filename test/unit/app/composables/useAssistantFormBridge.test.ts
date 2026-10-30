import { describe, expect, it } from 'vitest'
import { applyAssistantFormPatch } from '~~/shared/assistant/formPatch'
import { snapshotFromPostForm } from '~/composables/useAssistantFormBridge'
import { PostMode } from '~~/shared/types/posts'

describe('assistant form bridge helpers', () => {
  it('snapshots post form fields for the assistant', () => {
    expect(snapshotFromPostForm({
      mode: PostMode.Legacy,
      title: 'Hello',
      description: 'desc',
      url: 'hello',
      content: 'body',
      contentHtml: '',
      tags: [{ name: 'f1' }, 'race'],
    })).toEqual({
      mode: PostMode.Legacy,
      title: 'Hello',
      description: 'desc',
      url: 'hello',
      content: 'body',
      contentHtml: '',
      tags: ['f1', 'race'],
    })
  })

  it('snapshots formatted html fields', () => {
    expect(snapshotFromPostForm({
      mode: PostMode.Formatted,
      title: 'Rich',
      url: 'rich',
      content: '{"type":"doc"}',
      contentHtml: '<p>Hi</p>',
      tags: [],
    })).toMatchObject({
      mode: PostMode.Formatted,
      contentHtml: '<p>Hi</p>',
    })
  })

  it('applies a title/content patch without touching mode', () => {
    const next = applyAssistantFormPatch({
      mode: PostMode.Legacy,
      title: '',
      description: '',
      url: '',
      content: '',
      contentHtml: '',
      tags: [],
    }, {
      title: 'Latest F1',
      content: 'Highlights…',
      tags: ['f1'],
    })

    expect(next.mode).toBe(PostMode.Legacy)
    expect(next.title).toBe('Latest F1')
    expect(next.content).toBe('Highlights…')
    expect(next.tags).toEqual(['f1'])
  })
})
