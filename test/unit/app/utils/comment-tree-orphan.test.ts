import { describe, expect, it } from 'vitest'
import type { Comment } from '#app-types/comments'
import { buildCommentTree, flattenCommentTree } from '#app-utils/comment-tree'

function comment(partial: Partial<Comment> & Pick<Comment, 'id'>): Comment {
  return {
    text: `c-${partial.id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    deletedAt: null,
    userId: 1,
    postId: 1,
    parentId: null,
    user: { id: 1, login: 'author' },
    ...partial,
  }
}

describe('comment tree multi-root', () => {
  it('keeps sibling roots and flattens independently', () => {
    const tree = buildCommentTree([
      comment({ id: 1, createdAt: '2026-01-02T00:00:00.000Z' }),
      comment({ id: 2, createdAt: '2026-01-01T00:00:00.000Z' }),
      comment({ id: 3, parentId: 2 }),
    ])

    expect(tree.map(n => n.id)).toEqual([1, 2])
    expect(flattenCommentTree(tree).map(n => n.id)).toEqual([1, 2, 3])
  })
})
