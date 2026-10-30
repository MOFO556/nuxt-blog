import { describe, expect, it } from 'vitest'
import type { PostImageMeta } from '~/types/posts'
import {
  applyAttachmentDescription,
  buildAttachmentDescriptionPayload,
} from '~/utils/postAttachmentDescriptions'

describe('postAttachmentDescriptions', () => {
  it('builds a full keep-set payload and mutates the source attachment description', () => {
    const cover: PostImageMeta = {
      id: 1,
      path: 'images/cover.jpg',
      name: 'cover.jpg',
      postCover: true,
      description: 'cover',
    }
    const slide: PostImageMeta = {
      id: 2,
      path: 'images/a.jpg',
      name: 'a.jpg',
      description: 'old',
    }
    const keep = [cover, slide]

    applyAttachmentDescription([keep, [slide]], slide.path!, 'new desc')

    expect(buildAttachmentDescriptionPayload(keep, slide.path!, 'new desc')).toEqual([
      { existingPath: 'images/cover.jpg', description: 'cover' },
      { existingPath: 'images/a.jpg', description: 'new desc' },
    ])
    expect(slide.description).toBe('new desc')
    expect(cover.description).toBe('cover')
  })
})