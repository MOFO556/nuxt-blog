import { describe, expect, it } from 'vitest'
import { rewriteContentImageIds } from '#shared/utils/rewriteContentImageIds'

describe('rewriteContentImageIds', () => {
  it('replaces client temp ids with real image ids in JSON and HTML', () => {
    const tempId = 'client:abc-123'
    const content = JSON.stringify({
      type: 'doc',
      content: [{
        type: 'carousel',
        attrs: { imageIds: [tempId, 'client:def-456'] },
      }],
    })
    const contentHtml = `<div data-carousel="true" data-image-ids="${tempId},client:def-456"></div>`

    const result = rewriteContentImageIds({
      content,
      contentHtml,
      idMap: {
        'client:abc-123': 10,
        'client:def-456': 20,
      },
    })

    expect(JSON.parse(result.content)).toEqual({
      type: 'doc',
      content: [{
        type: 'carousel',
        attrs: { imageIds: [10, 20] },
      }],
    })
    expect(result.contentHtml).toBe(
      '<div data-carousel="true" data-image-ids="10,20"></div>',
    )
  })

  it('does not rewrite unrelated TipTap text or HTML body text that match a temp id', () => {
    const tempId = 'client:abc-123'
    const content = JSON.stringify({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: tempId }],
      }],
    })

    const result = rewriteContentImageIds({
      content,
      contentHtml: `<p>${tempId}</p>`,
      idMap: { [tempId]: 10 },
    })

    expect(JSON.parse(result.content)).toEqual({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: tempId }],
      }],
    })
    expect(result.contentHtml).toBe(`<p>${tempId}</p>`)
  })

  it('rewrites image attrs and blob src to durable paths', () => {
    const tempId = 'client:img-1'
    const blobSrc = 'blob:http://localhost/preview-1'
    const content = JSON.stringify({
      type: 'doc',
      content: [{
        type: 'image',
        attrs: { src: blobSrc, alt: tempId, imageId: tempId },
      }],
    })
    const contentHtml = `<img src="${blobSrc}" alt="${tempId}" data-image-id="${tempId}">`

    const result = rewriteContentImageIds({
      content,
      contentHtml,
      idMap: { [tempId]: 42 },
      pathMap: { [tempId]: '/images/photo.webp' },
      blobSrcMap: { [blobSrc]: '/images/photo.webp' },
    })

    expect(JSON.parse(result.content)).toEqual({
      type: 'doc',
      content: [{
        type: 'image',
        attrs: { src: '/images/photo.webp', alt: '42', imageId: 42 },
      }],
    })
    expect(result.contentHtml).toBe(
      '<img src="/images/photo.webp" alt="42" data-image-id="42">',
    )
  })

  it('keeps original content and still rewrites HTML when content is not JSON', () => {
    const tempId = 'client:img-1'
    const result = rewriteContentImageIds({
      content: 'not-json-plain-text',
      contentHtml: `<p data-image-id="${tempId}">hi</p>`,
      idMap: { [tempId]: 7 },
    })

    expect(result.content).toBe('not-json-plain-text')
    expect(result.contentHtml).toBe('<p data-image-id="7">hi</p>')
  })
})
