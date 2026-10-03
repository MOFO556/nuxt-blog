import type { Comment } from '~/types/comments';

export type CommentNode = Comment & {
  depth: number
  replies?: CommentNode[]
};

const byCreatedDesc = (a: Comment, b: Comment) =>
  (b.createdAt || '').localeCompare(a.createdAt || '');

const byCreatedAsc = (a: Comment, b: Comment) =>
  (a.createdAt || '').localeCompare(b.createdAt || '');

export function buildCommentTree(flat: Comment[]): CommentNode[] {
  const byId = new Map<number, CommentNode>();

  for (const comment of flat) {
    byId.set(comment.id, { ...comment, depth: 0, replies: [] });
  }

  const roots: CommentNode[] = [];

  for (const comment of byId.values()) {
    if (comment.parentId != null && byId.has(comment.parentId)) {
      byId.get(comment.parentId)!.replies!.push(comment);
    }
    else {
      roots.push(comment);
    }
  }

  for (const comment of byId.values()) {
    comment.replies?.sort(byCreatedAsc);
  }

  return roots.sort(byCreatedDesc);
}

/** Depth-first flatten so UI can render nesting without recursive SFCs (Nuxt/hints safe). */
export function flattenCommentTree(nodes: CommentNode[], depth = 0): CommentNode[] {
  const result: CommentNode[] = [];

  for (const node of nodes) {
    result.push({ ...node, depth, replies: undefined });
    if (node.replies?.length)
      result.push(...flattenCommentTree(node.replies, depth + 1));
  }

  return result;
}