import { describe, expect, it } from 'vitest'
import {
  buildFormattedAttachmentPayload,
  filterContentImagesReferencedInBody,
  toStagedUploadFile,
} from '~/utils/postUploadIds'

describe('buildFormattedAttachmentPayload', () => {
  it('attaches only body-referenced images plus cover, not orphan staged files', () => {
    const referenced = toStagedUploadFile(
      new File(['x'], 'in-body.jpg', { type: 'image/jpeg' }),
      { clientTempId: 'client:keep', fileId: 10 },
    )
    const orphan = toStagedUploadFile(
      new File(['x'], 'orphan.jpg', { type: 'image/jpeg' }),
      { clientTempId: 'client:drop', fileId: 11 },
    )
    const cover = toStagedUploadFile(
      new File(['x'], 'cover.jpg', { type: 'image/jpeg' }),
      { clientTempId: 'client:cover', fileId: 12 },
    )

    const payload = buildFormattedAttachmentPayload({
      contentJson: JSON.stringify({ type: 'doc', content: [] }),
      contentHtml: '<div data-carousel="true" data-image-ids="10"></div>',
      contentImages: [referenced, orphan],
      cover,
    })

    expect(payload).toEqual([
      { id: 10, postCover: false },
      { id: 12, postCover: true },
    ])
  })

  it('resolves client temp ids still present in contentHtml', () => {
    const stagedImage = toStagedUploadFile(
      new File(['x'], 'temp.jpg', { type: 'image/jpeg' }),
      { clientTempId: 'client:tmp-1', fileId: 21 },
    )

    const payload = buildFormattedAttachmentPayload({
      contentJson: '{}',
      contentHtml: '<img data-image-id="client:tmp-1">',
      contentImages: [stagedImage],
      cover: undefined,
    })

    expect(payload).toEqual([{ id: 21, postCover: false }])
  })
})

describe('filterContentImagesReferencedInBody', () => {
  it('keeps only staged files referenced by body html/json', () => {
    const keep = toStagedUploadFile(
      new File(['x'], 'keep.jpg', { type: 'image/jpeg' }),
      { clientTempId: 'client:keep' },
    )
    const drop = toStagedUploadFile(
      new File(['x'], 'drop.jpg', { type: 'image/jpeg' }),
      { clientTempId: 'client:drop' },
    )

    expect(filterContentImagesReferencedInBody({
      contentJson: '{}',
      contentHtml: '<div data-carousel="true" data-image-ids="client:keep"></div>',
      contentImages: [keep, drop],
    })).toEqual([keep])
  })
})