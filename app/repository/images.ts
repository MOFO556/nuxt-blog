import type { UploadItem } from "~/types/core";

export function createImagesRepository(appFetch: typeof $fetch) {
  return {
    async uploadToPost(postId: number, payload: UploadItem[] ) {
      const fd = new FormData();
      const manifest: { existing?: string; isCover: boolean }[] = [];

      for (const item of payload) {
        if (item.existingPath) {
          manifest.push({ existing: item.existingPath, isCover: !!item.isCover });
        } else {
          fd.append('files', item);
          manifest.push({ isCover: !!item.isCover });
        }
      }
      fd.append('manifest', JSON.stringify(manifest));

      return appFetch<any>(`/images/posts/${postId}`, {
        method: "POST",
        body: fd,
      });
    },
    async uploadToComment(commentId: number, payload: (File & { existingPath?: string })[]) {
      const fd = new FormData();
      const manifest: { existing?: string }[] = [];

      for (const item of payload) {
        if (item.existingPath) {
          manifest.push({ existing: item.existingPath });
        } else {
          manifest.push({});
          fd.append('files', item);
        }
      }
      fd.append('manifest', JSON.stringify(manifest));

      return appFetch<any>(`/images/comments/${commentId}`, {
        method: "POST",
        body: fd,
      });
    },
    async getToPost(postId: number) {
      return appFetch<any>(`/api/images/posts/${postId}`);
    },
  }
}