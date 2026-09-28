import type { ItemUploadMeta } from "~/types/core";
import type { UploadPayload } from "~/types/forms";
import type { PostImageMeta } from "~/types/posts";

export function createImagesRepository(appFetch: typeof $fetch) {
  const toArray = (p: UploadPayload): Partial<ItemUploadMeta>[] =>
    Array.isArray(p) ? p : [p as Partial<ItemUploadMeta>];
  
  const createImagesFd = function (payload: UploadPayload) {
    const items = toArray(payload);
      const fd = new FormData();
      const manifest: { existing?: string, description?: string, newFileName?: string }[] = [];

      for (const item of items) {
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
    async uploadToPost(postId: number | null, payload: UploadPayload ) {
      const fd = createImagesFd(payload);
      return appFetch<{ id: number, name: string, path: string}[]>(`/images/posts/${postId}`, {
        method: "POST",
        body: fd,
      });
    },
    async uploadToComment(commentId: number | null, payload: UploadPayload) {
      const fd = createImagesFd(payload);
      return appFetch<{ id: number, name: string, path: string}[]>(`/images/comments/${commentId}`, {
        method: "POST",
        body: fd,
      });
    },
    async getToPost(postId: number) {
      return appFetch<PostImageMeta[]>(`/api/images/posts/${postId}`);
    },
    async uploadAvatar(payload: File) {
      const fd = new FormData();
      fd.append('file', payload)
      return appFetch<PostImageMeta>(`/api/images/avatar/`,{
        method: "POST",
        body: fd,
      });
    },
  }
}