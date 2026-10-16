import { describe, expect, it } from 'vitest'
import type { Comment } from '#app-types/comments'
import { buildCommentTree, flattenCommentTree } from '#app-utils/comment-tree'

function comment(partial: Partial<Comment> & Pick<Comment, 'id'>): Comment {
  return {
    text: `comment-${partial.id}`,
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

describe('buildCommentTree', () => {
  it('nests replies under their parent', () => {
    const tree = buildCommentTree([
      comment({ id: 1, createdAt: '2026-01-02T00:00:00.000Z' }),
      comment({ id: 2, parentId: 1, createdAt: '2026-01-03T00:00:00.000Z' }),
      comment({ id: 3, parentId: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
    ])

    expect(tree).toHaveLength(1)
    expect(tree[0]?.id).toBe(1)
    expect(tree[0]?.replies?.map(r => r.id)).toEqual([3, 2])
  })

  it('treats orphan parent ids as roots', () => {
    const tree = buildCommentTree([
      comment({ id: 10, parentId: 999 }),
    ])

    expect(tree).toHaveLength(1)
    expect(tree[0]?.id).toBe(10)
    expect(tree[0]?.replies).toEqual([])
  })

  it('sorts root comments newest first', () => {
    const tree = buildCommentTree([
      comment({ id: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
      comment({ id: 2, createdAt: '2026-01-03T00:00:00.000Z' }),
    ])

    expect(tree.map(n => n.id)).toEqual([2, 1])
  })
})

describe('flattenCommentTree', () => {
  it('flattens depth-first with increasing depth', () => {
    const tree = buildCommentTree([
      comment({ id: 1 }),
      comment({ id: 2, parentId: 1 }),
      comment({ id: 3, parentId: 2 }),
    ])

    const flat = flattenCommentTree(tree)
    expect(flat.map(n => ({ id: n.id, depth: n.depth }))).toEqual([
      { id: 1, depth: 0 },
      { id: 2, depth: 1 },
      { id: 3, depth: 2 },
    ])
    expect(flat.every(n => n.replies === undefined)).toBe(true)
  })
})
