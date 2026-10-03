import type { Comment, CommentInsert, CommentUpdate, PostComment } from "~/types/comments"

function toImageRefs(images: unknown): { id: number }[] | undefined {
  if (!Array.isArray(images))
    return undefined;

  return images
    .map((item) => {
      if (typeof item !== 'object' || item === null)
        return null;
      const record = item as { id?: unknown; fileId?: unknown };
      const id = typeof record.id === 'number'
        ? record.id
        : typeof record.fileId === 'number'
          ? record.fileId
          : null;
      return id != null ? { id } : null;
    })
    .filter((item): item is { id: number } => item !== null);
}

export function createCommentsRepository(appFetch: typeof $fetch) {
  return {
    async getToPost(postId: number) {
      return appFetch<Comment[]>(`comments/post/${postId}`);
    },
    async postToPost(payload: CommentInsert<PostComment>) {
      return appFetch<Comment>(`comments/post/${payload.postId}`, {
        method: "POST",
        body: {
          text: payload.text,
          images: toImageRefs(payload.images),
          parentId: payload.parentId ?? null,
        }
      });
    },
    async edit(payload: CommentUpdate) {
      return appFetch<Comment>(`comments/${payload.id}`, {
        method: "PUT",
        body: {
          text: payload.text,
          images: toImageRefs(payload.images),
        }
      });
    },
    async remove(id: number) {
      return appFetch<Comment>(`comments/${id}`, {
        method: "DELETE",
      });
    },
  }
}