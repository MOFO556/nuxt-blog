import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CAROUSEL_SLOT } from '~~/shared/assistant/carouselSlots'
import {
  appendInlineImageInHtml,
  carouselSlotOrDefault,
  fetchRemoteImageAsFile,
  groupCarouselSlotEntries,
  prependInlineImageInHtml,
  remoteImageCaption,
  resolvePatchTags,
  shouldPlaceRemoteImageInBody,
} from '~/utils/postFormAssistant'

describe('postFormAssistant helpers', () => {
  it('resolves patch tags from existing names or slugs', () => {
    expect(resolvePatchTags(
      ['F1', 'new tag', 'race'],
      [
        { name: 'F1', slug: 'f1' },
        { name: 'Race', slug: 'race' },
      ],
    )).toEqual([
      { name: 'F1', slug: 'f1' },
      { name: 'new tag', slug: 'new-tag' },
      { name: 'Race', slug: 'race' },
    ])
  })

  it('groups carousel entries by slot preserving order', () => {
    expect(groupCarouselSlotEntries([
      { slot: 'a', id: '1' },
      { slot: 'b', id: '2' },
      { slot: 'a', id: '3' },
    ])).toEqual([
      { slot: 'a', imageIds: ['1', '3'] },
      { slot: 'b', imageIds: ['2'] },
    ])
  })

  it('falls back to the default carousel slot', () => {
    expect(carouselSlotOrDefault(null)).toBe(DEFAULT_CAROUSEL_SLOT)
    expect(carouselSlotOrDefault('  hero  ')).toBe('hero')
  })

  it('only keeps remote captions when descriptions are requested', () => {
    expect(remoteImageCaption({
      includeImageDescriptions: true,
      alt: '  pit lane  ',
    })).toBe('pit lane')
    expect(remoteImageCaption({
      includeImageDescriptions: false,
      alt: 'pit lane',
    })).toBeUndefined()
  })

  it('places cover-only remote images out of the body', () => {
    expect(shouldPlaceRemoteImageInBody({ asCover: true })).toBe(false)
    expect(shouldPlaceRemoteImageInBody({ asCover: true, alsoInContent: true })).toBe(true)
    expect(shouldPlaceRemoteImageInBody({ asCover: true, forCarousel: true })).toBe(true)
    expect(shouldPlaceRemoteImageInBody({})).toBe(true)
  })

  it('downloads a remote image into a File', async () => {
    const blob = new Blob(['img'], { type: 'image/png' })
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    })

    const file = await fetchRemoteImageAsFile('https://images.example/a.png', fetchImpl as typeof fetch)

    expect(fetchImpl).toHaveBeenCalledWith('https://images.example/a.png')
    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('image/png')
    expect(file.name).toMatch(/^unsplash-/)
  })

  it('prepends an inline image into authored html', () => {
    expect(prependInlineImageInHtml('<p></p><p>Body</p>', 'blob:a', 'client:1')).toBe(
      '<p><img src="blob:a" alt="client:1" data-image-id="client:1" /></p><p>Body</p>',
    )
  })

  it('appends an inline image into authored html', () => {
    expect(appendInlineImageInHtml('<p>Body</p><p></p>', 'blob:a', 'client:1')).toBe(
      '<p>Body</p><img src="blob:a" alt="client:1" data-image-id="client:1" /><p></p>',
    )
  })
})