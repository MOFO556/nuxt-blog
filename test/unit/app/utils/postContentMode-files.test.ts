import { describe, expect, it } from 'vitest'
import { PostMode } from '~~/shared/types/posts'
import { resolveModeSwitchFiles } from '~/utils/postContentMode'
import type { StagedUploadFile } from '~/types/posts'

function fakeFile(name: string, extras: Partial<StagedUploadFile> = {}): StagedUploadFile {
  return Object.assign(new File(['x'], name, { type: 'image/png' }), extras)
}

describe('resolveModeSwitchFiles', () => {
  it('moves legacy images into contentImages when switching to formatted', () => {
    const images = [fakeFile('a.png'), fakeFile('b.png')]

    const result = resolveModeSwitchFiles({
      next: PostMode.Formatted,
      previous: PostMode.Legacy,
      images,
      cover: [],
      contentImages: [],
    })

    expect(result.contentImages).toEqual(images)
    expect(result.cover).toEqual([])
    expect(result.images).toEqual([])
    expect(result.coverIndex).toBeNull()
  })

  it('merges cover and contentImages into images when switching to legacy', () => {
    const cover = [fakeFile('cover.png', { postCover: true })]
    const contentImages = [fakeFile('body.png')]

    const result = resolveModeSwitchFiles({
      next: PostMode.Legacy,
      previous: PostMode.Formatted,
      images: [],
      cover,
      contentImages,
    })

    expect(result.images.map(f => f.name)).toEqual(['cover.png', 'body.png'])
    expect(result.images[0]?.postCover).toBe(true)
    expect(result.images[1]?.postCover).toBe(false)
    expect(result.cover).toEqual([])
    expect(result.contentImages).toEqual([])
    expect(result.coverIndex).toBe(0)
  })

  it('leaves bags unchanged when mode does not change', () => {
    const images = [fakeFile('a.png')]
    const result = resolveModeSwitchFiles({
      next: PostMode.Legacy,
      previous: PostMode.Legacy,
      images,
      cover: [],
      contentImages: [],
      coverIndex: 1,
    })

    expect(result.images).toBe(images)
    expect(result.coverIndex).toBe(1)
  })
})
