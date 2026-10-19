import type { Tag } from "~/types/posts";

export function createTagsRepository(appFetch: typeof $fetch) {
  return {
    async all() {
      return appFetch<Tag[]>(`tags/`);
    }
  }
}