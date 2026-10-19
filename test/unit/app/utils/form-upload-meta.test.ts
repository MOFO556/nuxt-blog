import { describe, expect, it } from 'vitest'

/** Mirrors useForm single-file post-upload enrichment (must not mutate File). */
function enrichUploadedFile(
  file: File,
  resp: { name: string; path: string; id: number },
) {
  return {
    ...file,
    existingPath: resp.path,
    originalName: resp.name,
    fileId: resp.id,
  }
}

describe('avatar upload meta enrichment', () => {
  it('adds fileId without assigning onto File.name', () => {
    const file = new File(['x'], 'avatar.png', { type: 'image/png' })
    const resp = { name: 'avatar.png', path: 'images/avatar-abc.png', id: 42 }

    expect(() => Object.assign(file, { name: resp.name, fileId: resp.id })).toThrow()

    const enriched = enrichUploadedFile(file, resp)
    expect(enriched.fileId).toBe(42)
    expect(enriched.existingPath).toBe(resp.path)
    expect(file.name).toBe('avatar.png')
  })
})
