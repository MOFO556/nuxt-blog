import type { Comment } from "~/types/comments"

export function createCommentsRepository(appFetch: typeof $fetch) {
  return {
    async getToPost(postId: number) {
      return appFetch<Comment[]>(`comments/post/${postId}`);
    },
    async postToPost(postId: number, text: string) {
      return appFetch<Comment>(`comments/post/${postId}`, {
        method: "POST",
        body: {
          text
        }
      });
    },
  }
}