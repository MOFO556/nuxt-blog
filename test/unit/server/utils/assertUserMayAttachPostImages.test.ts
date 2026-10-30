import { describe, expect, it, afterEach } from 'vitest'
import { assertUserMayAttachPostImages } from '~~/server/utils/assertUserMayAttachPostImages'
import { commentAttachments, comments, images, postAttachments, posts, users } from '#server-db/schema'
import { withTempDb } from '#test-helpers/db'
import { PostMode } from '~~/shared/types/posts'

describe('assertUserMayAttachPostImages', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  function seed() {
    const ctx = withTempDb()
    cleanup = ctx.cleanup
    const { db } = ctx

    const owner = db.insert(users).values({
      login: 'owner1',
      password: 'secret12',
      authMethod: 'password',
    }).returning().get()

    const other = db.insert(users).values({
      login: 'other1',
      password: 'secret12',
      authMethod: 'password',
    }).returning().get()

    const ownImage = db.insert(images).values({
      name: 'mine.webp',
      path: 'images/mine.webp',
      uploadedBy: owner.id,
    }).returning().get()

    const foreignImage = db.insert(images).values({
      name: 'theirs.webp',
      path: 'images/theirs.webp',
      uploadedBy: other.id,
    }).returning().get()

    const orphanImage = db.insert(images).values({
      name: 'orphan.webp',
      path: 'images/orphan.webp',
    }).returning().get()

    const post = db.insert(posts).values({
      title: 'Owner post title',
      content: 'y'.repeat(40),
      mode: PostMode.Legacy,
      userId: owner.id,
    }).returning().get()

    return { db, owner, other, ownImage, foreignImage, orphanImage, post }
  }

  it('allows images uploaded by the same user', () => {
    const { db, owner, ownImage } = seed()
    expect(() => assertUserMayAttachPostImages(db, {
      userId: owner.id,
      imageIds: [ownImage.id],
    })).not.toThrow()
  })

  it('rejects images uploaded by another user', () => {
    const { db, owner, foreignImage } = seed()
    expect(() => assertUserMayAttachPostImages(db, {
      userId: owner.id,
      imageIds: [foreignImage.id],
    })).toThrow(/Not allowed to attach image/)
  })

  it('rejects legacy images with no uploader', () => {
    const { db, owner, orphanImage } = seed()
    expect(() => assertUserMayAttachPostImages(db, {
      userId: owner.id,
      imageIds: [orphanImage.id],
    })).toThrow(/Not allowed to attach image/)
  })

  it('allows images already attached to the post even without matching uploader', () => {
    const { db, owner, foreignImage, post } = seed()
    db.insert(postAttachments).values({
      postId: post.id,
      imageId: foreignImage.id,
      postCover: true,
    }).run()

    expect(() => assertUserMayAttachPostImages(db, {
      userId: owner.id,
      imageIds: [foreignImage.id],
      postId: post.id,
    })).not.toThrow()
  })

  it('rejects unknown image ids', () => {
    const { db, owner } = seed()
    expect(() => assertUserMayAttachPostImages(db, {
      userId: owner.id,
      imageIds: [999_999],
    })).toThrow(/Unknown image/)
  })

  it('allows images already attached to the comment even without matching uploader', () => {
    const { db, owner, foreignImage, post } = seed()
    const comment = db.insert(comments).values({
      text: 'with foreign image',
      postId: post.id,
      userId: owner.id,
    }).returning().get()

    db.insert(commentAttachments).values({
      commentId: comment.id,
      imageId: foreignImage.id,
    }).run()

    expect(() => assertUserMayAttachPostImages(db, {
      userId: owner.id,
      imageIds: [foreignImage.id],
      commentId: comment.id,
    })).not.toThrow()
  })

  it('rejects foreign images on comment attach when not already linked', () => {
    const { db, owner, foreignImage } = seed()
    expect(() => assertUserMayAttachPostImages(db, {
      userId: owner.id,
      imageIds: [foreignImage.id],
      commentId: 1,
    })).toThrow(/Not allowed to attach image/)
  })
})
