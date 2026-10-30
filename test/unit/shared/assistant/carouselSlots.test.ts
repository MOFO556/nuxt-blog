import { describe, expect, it } from 'vitest'
import {
  appendToCarouselsInOrder,
  carouselSlotMarker,
  fillAllCarouselSlotsInHtml,
  fillCarouselSlotInHtml,
  fillEmptyCarouselsInOrder,
  groupIdsByCarouselSlot,
  mergeImageIds,
  placeCarouselImagesInHtml,
} from '~~/shared/assistant/carouselSlots'

describe('carouselSlots', () => {
  it('builds an empty slot marker', () => {
    expect(carouselSlotMarker('event-1')).toContain('data-carousel-slot="event-1"')
    expect(carouselSlotMarker('event-1')).toContain('data-image-ids=""')
  })

  it('sanitizes unsafe characters in carousel slot markers', () => {
    expect(carouselSlotMarker('evil"onclick="x')).toContain(
      'data-carousel-slot="evil-onclick-x"',
    )
  })

  it('fills markers even when the requested slot needed sanitization', () => {
    const html = carouselSlotMarker('dish "1"')
    const next = fillCarouselSlotInHtml(html, 'dish "1"', ['tmp-a'])
    expect(next).toContain('data-carousel-slot="dish-1"')
    expect(next).toContain('data-image-ids="tmp-a"')
  })

  it('appends to an existing slot instead of replacing', () => {
    const html = '<div data-carousel="true" data-carousel-slot="event-1" data-image-ids="old-1,old-2" class="post-carousel-marker">&nbsp;</div>'
    const next = fillCarouselSlotInHtml(html, 'event-1', ['new-3', 'old-1'])
    expect(next).toContain('data-image-ids="old-1,old-2,new-3"')
  })

  it('fills a matching slot and leaves others alone', () => {
    const html = [
      '<h2>One</h2>',
      carouselSlotMarker('event-1'),
      '<h2>Two</h2>',
      carouselSlotMarker('event-2'),
    ].join('')

    const next = fillCarouselSlotInHtml(html, 'event-1', ['tmp-a', 'tmp-b'])
    expect(next).toContain('data-carousel-slot="event-1"')
    expect(next).toContain('data-image-ids="tmp-a,tmp-b"')
    expect(next).toContain('data-carousel-slot="event-2" data-image-ids=""')
  })

  it('fills when TipTap reorders attributes', () => {
    const html = '<div class="post-carousel-marker" data-image-ids="" data-carousel-slot="event-3" data-carousel="true">&nbsp;</div>'
    const next = fillCarouselSlotInHtml(html, 'event-3', ['x'])
    expect(next).toContain('data-image-ids="x"')
    expect(next).toContain('data-carousel-slot="event-3"')
  })

  it('returns null when the slot is missing (no bottom carousel invent)', () => {
    expect(fillCarouselSlotInHtml('<p>x</p>', 'missing', ['1'])).toBeNull()
  })

  it('fills every slot in one pass', () => {
    const html = [
      carouselSlotMarker('event-1'),
      carouselSlotMarker('event-2'),
      carouselSlotMarker('event-3'),
    ].join('')
    const next = fillAllCarouselSlotsInHtml(html, [
      { slot: 'event-1', imageIds: ['a'] },
      { slot: 'event-2', imageIds: ['b', 'c'] },
      { slot: 'event-3', imageIds: ['d'] },
    ])
    expect(next).toContain('data-image-ids="a"')
    expect(next).toContain('data-image-ids="b,c"')
    expect(next).toContain('data-image-ids="d"')
  })

  it('appends new markers for missing slots instead of merging into existing carousels', () => {
    const html = [
      '<div data-carousel="true" data-carousel-slot="event-1" data-image-ids="keep-a" class="post-carousel-marker">&nbsp;</div>',
      '<div data-carousel="true" data-image-ids="keep-b" class="post-carousel-marker">&nbsp;</div>',
    ].join('')
    const next = placeCarouselImagesInHtml(html, [
      { slot: 'gallery-1', imageIds: ['new-1'] },
      { slot: 'dish-2', imageIds: ['new-2'] },
    ])
    expect(next).toContain('data-carousel-slot="event-1"')
    expect(next).toContain('data-image-ids="keep-a"')
    expect(next).toContain('data-image-ids="keep-b"')
    expect(next).toContain('data-carousel-slot="gallery-1"')
    expect(next).toContain('data-image-ids="new-1"')
    expect(next).toContain('data-carousel-slot="dish-2"')
    expect(next).toContain('data-image-ids="new-2"')
  })

  it('appends new slot markers when no carousel exists yet', () => {
    const next = placeCarouselImagesInHtml('<p>Intro</p>', [
      { slot: 'gallery-1', imageIds: ['tmp-a', 'tmp-b'] },
    ])
    expect(next).toContain('<p>Intro</p>')
    expect(next).toContain('data-carousel-slot="gallery-1"')
    expect(next).toContain('data-image-ids="tmp-a,tmp-b"')
  })

  it('does not overwrite already-filled carousels when filling empties only', () => {
    const html = [
      '<div data-carousel="true" data-image-ids="keep" class="post-carousel-marker">&nbsp;</div>',
      '<div data-carousel="true" data-image-ids="" class="post-carousel-marker">&nbsp;</div>',
    ].join('')
    const next = fillEmptyCarouselsInOrder(html, [['x']])
    expect(next).toContain('data-image-ids="keep"')
    expect(next).toContain('data-image-ids="x"')
  })

  it('mergeImageIds keeps order and dedupes', () => {
    expect(mergeImageIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('appendToCarouselsInOrder merges onto each carousel', () => {
    const html = [
      '<div data-carousel="true" data-image-ids="1" class="post-carousel-marker">&nbsp;</div>',
      '<div data-carousel="true" data-image-ids="" class="post-carousel-marker">&nbsp;</div>',
    ].join('')
    const next = appendToCarouselsInOrder(html, [['2'], ['3']])
    expect(next).toContain('data-image-ids="1,2"')
    expect(next).toContain('data-image-ids="3"')
  })

  it('groups ids by slot', () => {
    const groups = groupIdsByCarouselSlot([
      { id: 'a', carouselSlot: 'event-1' },
      { id: 'b', carouselSlot: 'event-1' },
      { id: 'c', carouselSlot: 'event-2' },
      { id: 'd', carouselSlot: null },
    ])
    expect(groups.get('event-1')).toEqual(['a', 'b'])
    expect(groups.get('event-2')).toEqual(['c'])
    expect(groups.has('')).toBe(false)
  })
})