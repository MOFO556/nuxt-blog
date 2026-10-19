import type { Pagination } from "~/types/core";
import type { Post, PostInsert } from "~/types/posts"

export function createPostsRepository(appFetch: typeof $fetch) {
  const postsStore = usePostsStore();
  return {
    async all(query: Record<string, any> = {}) {
      return appFetch<Pagination<Post[]>>(`posts/`, { query })
        .then(res => {
          postsStore.addPosts(res.data);
          return res;
        })
    },
    async my() {
      return appFetch<Post[]>(`posts/my`)
        .then(res => {
          postsStore.addPosts(res);
          return res;
        })
    },
    async post(id: string) {
      return appFetch<Post>(`posts/${id}`);
    },
    async add(payload: PostInsert) {
      return appFetch<Post>(`posts/`, { 
        method: 'POST',
        body: payload
      })      
    },
    async edit(payload: Post) {
      return appFetch<Post>(`posts/${payload.id}`, { 
        method: 'PUT',
        body: payload
      })      
    },
    async remove(id: number | string) {
      return appFetch<Post>(`posts/${id}`, {
        method: 'DELETE',
      })
    },
  }
}