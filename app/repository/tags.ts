import type { Tag } from "~/types/posts";

export function createTagsRepository(appFetch: typeof $fetch) {
  return {
    async all() {
      return appFetch<Tag[]>(`tags/`);
    },
    async popular(limit = 10) {
      return appFetch<(Tag & { count: number })[]>(`tags/popular`, {
        query: { limit },
      });
    },
  }
}