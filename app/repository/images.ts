import type { ItemUploadMeta } from "~/types/core";
import type { PostImageMeta } from "~/types/posts";

export function createImagesRepository(appFetch: typeof $fetch) {
  const createImagesFd = function (payload: ItemUploadMeta[] ) {
      const fd = new FormData();
      const manifest: { existing?: string }[] = [];

      for (const item of payload) {
        if (item.existingPath) {
          manifest.push({ existing: item.existingPath });
        } else {
          fd.append('files', item);
        }
      }
      fd.append('manifest', JSON.stringify(manifest));
      return fd;
    }
  return {
    async uploadToPost(postId: number | null, payload: ItemUploadMeta[] ) {
      const fd = createImagesFd(payload);
      return appFetch<{ id: number, name: string, path: string}[]>(`/images/posts/${postId}`, {
        method: "POST",
        body: fd,
      });
    },
    async uploadToComment(commentId: number | null, payload: ItemUploadMeta[]) {
      const fd = createImagesFd(payload);
      return appFetch<{ id: number, name: string, path: string}[]>(`/images/comments/${commentId}`, {
        method: "POST",
        body: fd,
      });
    },
    async getToPost(postId: number) {
      return appFetch<PostImageMeta[]>(`/api/images/posts/${postId}`);
    },
  }
}