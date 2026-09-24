import type { Comment, CommentInsert, PostComment } from "~/types/comments"

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
          images: payload.images
        }
      });
    },
  }
}