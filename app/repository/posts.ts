import type { Post, PostInsert } from "~/types/posts"

export function createPostsRepository(appFetch: typeof $fetch) {
  return {
    async all() {
      const postsStore = usePostsStore();
      return appFetch<Post[]>(`posts/`)
        .then(res => {
          postsStore.addPosts(res);
          return res;
        })
    },
    async my() {
      const postsStore = usePostsStore();
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
    }
  }
}