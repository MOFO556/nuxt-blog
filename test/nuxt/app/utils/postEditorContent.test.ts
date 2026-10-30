import { describe, expect, it } from 'vitest'
import { contentJsonFromHtml } from '~/utils/postEditorContent'

describe('contentJsonFromHtml', () => {
  it('builds tip tap json with paragraphs and image ids', () => {
    const json = JSON.parse(contentJsonFromHtml(
      '<p>Hello</p><p><img src="blob:a" alt="client:1" data-image-id="client:1" /></p>',
    ))

    expect(json.type).toBe('doc')
    expect(json.content?.[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello' }],
    })
    expect(json.content?.some((node: { type?: string; attrs?: { imageId?: string } }) =>
      node.type === 'image' && node.attrs?.imageId === 'client:1',
    )).toBe(true)
  })

  it('keeps carousel markers in the json tree', () => {
    const json = JSON.parse(contentJsonFromHtml(
      '<div data-carousel="true" data-carousel-slot="gallery-1" data-image-ids="client:a,client:b" class="post-carousel-marker">&nbsp;</div>',
    ))

    expect(json.content?.some((node: {
      type?: string
      attrs?: { imageIds?: unknown; carouselSlot?: string | null }
    }) =>
      node.type === 'carousel'
      && node.attrs?.carouselSlot === 'gallery-1'
      && Array.isArray(node.attrs?.imageIds)
      && node.attrs.imageIds.join(',') === 'client:a,client:b',
    )).toBe(true)
  })
})