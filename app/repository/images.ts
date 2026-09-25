import type { ItemUploadMeta } from "~/types/core";
import type { PostImageMeta } from "~/types/posts";

export function createImagesRepository(appFetch: typeof $fetch) {
  const createImagesFd = function (payload: Partial<ItemUploadMeta>[] ) {
      const fd = new FormData();
      const manifest: { existing?: string, description?: string, newFileName?: string }[] = [];

      for (const item of payload) {
        if (item.existingPath) {
          manifest.push({ existing: item.existingPath, description: item.description });
        } else {
          if (item.description)
            manifest.push({ newFileName: item.name, description: item.description });
          if (item.size && typeof item.size === "number")
            fd.append('files', item as File);
        }
      }
      fd.append('manifest', JSON.stringify(manifest));
      return fd;
    }
  return {
    async uploadToPost(postId: number | null, payload: Partial<ItemUploadMeta>[] ) {
      const fd = createImagesFd(payload);
      return appFetch<{ id: number, name: string, path: string}[]>(`/images/posts/${postId}`, {
        method: "POST",
        body: fd,
      });
    },
    async uploadToComment(commentId: number | null, payload: Partial<ItemUploadMeta>[]) {
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