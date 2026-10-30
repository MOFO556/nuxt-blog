import { describe, expect, it } from 'vitest'
import { chunkPost } from '#server-utils/assistant/chunkPost'
import { PostMode } from '~~/shared/types/posts';

describe('chunkPost', () => {
  it('returns a single chunk for short posts', () => {
    const chunks = chunkPost({
      title: 'Hello',
      content: 'World',
      mode: PostMode.Legacy,
      tagNames: ['news'],
    })

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.chunkIndex).toBe(0)
    expect(chunks[0]?.content).toContain('Title: Hello')
    expect(chunks[0]?.content).toContain('Tags: news')
    expect(chunks[0]?.content).toContain('World')
  })

  it('splits long plain text into multiple chunks', () => {
    const body = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ${'x'.repeat(80)}`).join('\n\n')
    const chunks = chunkPost({
      title: 'Long',
      content: body,
      mode: PostMode.Legacy,
    }, 300)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c, i) => c.chunkIndex === i)).toBe(true)
    expect(chunks.every(c => c.content.length <= 300 || c.content.startsWith('Paragraph'))).toBe(true)
  })

  it('strips html for formatted posts', () => {
    const chunks = chunkPost({
      title: 'Fmt',
      content: '{}',
      contentHtml: '<p>Hello <strong>world</strong></p>',
      mode: PostMode.Formatted,
    })

    expect(chunks[0]?.content).toContain('Hello world')
    expect(chunks[0]?.content).not.toContain('<strong>')
  })
})
