import { describe, expect, it } from 'vitest'
import { parseFormattedBody } from '#shared/utils/parseFormattedBody'

describe('parseFormattedBody', () => {
  it('splits HTML around carousel markers and resolves attachment paths by id', () => {
    const html = '<p>Before</p><div data-carousel="true" data-image-ids="1,2"></div><p>After</p>'
    const parts = parseFormattedBody(html, [
      { id: 1, path: 'images/a.jpg', postCover: false },
      { id: 2, path: 'images/b.jpg', postCover: false },
      { id: 3, path: 'images/c.jpg', postCover: true },
    ])

    expect(parts).toEqual([
      { type: 'html', html: '<p>Before</p>' },
      {
        type: 'carousel',
        items: [
          { id: 1, path: 'images/a.jpg', postCover: false },
          { id: 2, path: 'images/b.jpg', postCover: false },
        ],
      },
      { type: 'html', html: '<p>After</p>' },
    ])
  })

  it('matches carousel markers when data-image-ids appears before data-carousel', () => {
    const html = '<p>Before</p><div data-image-ids="10" data-carousel="true">&nbsp;</div><p>After</p>'
    const parts = parseFormattedBody(html, [
      { id: 10, path: 'images/z.jpg' },
    ])
    expect(parts).toHaveLength(3)
    expect(parts[1]).toEqual({
      type: 'carousel',
      items: [{ id: 10, path: 'images/z.jpg' }],
    })
    expect(parts[2]).toEqual({ type: 'html', html: '<p>After</p>' })
  })
})
