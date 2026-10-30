import { describe, expect, it } from 'vitest'
import {
  collectContentImageIds,
  collectHtmlImageIds,
  collectHtmlTempImageIds,
} from '#shared/utils/collectContentImageIds'

describe('collectContentImageIds', () => {
  it('collects image and carousel ids from tip-tap JSON', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: { imageId: 3, src: '/images/a.webp' },
        },
        {
          type: 'carousel',
          attrs: { imageIds: [4, '5'] },
        },
      ],
    })
    expect(collectContentImageIds(json).sort()).toEqual([3, 4, 5])
  })

  it('returns an empty list for invalid JSON', () => {
    expect(collectContentImageIds('{')).toEqual([])
  })
})

describe('collectHtmlImageIds', () => {
  it('collects data-image-id and data-image-ids from HTML', () => {
    const html = [
      '<p><img src="/a.webp" data-image-id="11"></p>',
      `<div data-carousel="true" data-image-ids='12,13'></div>`,
      '<div data-carousel="true" data-image-ids="14"></div>',
    ].join('')
    expect(collectHtmlImageIds(html).sort()).toEqual([11, 12, 13, 14])
  })

  it('ignores non-numeric ids', () => {
    expect(collectHtmlImageIds('<div data-image-ids="client:tmp,15"></div>')).toEqual([15])
  })
})

describe('collectHtmlTempImageIds', () => {
  it('collects client temp ids from image attributes', () => {
    expect(collectHtmlTempImageIds(
      '<img data-image-id="client:a"><div data-image-ids="client:b,16,client:c"></div>',
    ).sort()).toEqual(['client:a', 'client:b', 'client:c'])
  })
})