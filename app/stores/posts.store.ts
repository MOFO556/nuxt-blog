import { defineStore } from "pinia";
import type { IPostsState, Post } from "~/types/posts";

export const usePostsStore = defineStore('PostsStore', {
  state(): IPostsState {
    return {
      posts: []
    }
  },
  getters: {
    nextPostId: (state: any) => (id: number): number => {
      const currIndex = state.posts.findIndex((p: Post) => p.id === id);
      return state.posts[currIndex + 1]?.id ?? 0;
    },
    prevPostId: (state: any) => (id: number): number => {
      const currIndex = state.posts.findIndex((p: Post) => p.id === id);
      return state.posts[currIndex - 1]?.id ?? 0;
    }
  },
  actions: {
    addPosts(posts: Post[]) {
      this.posts = posts;
    },
  }
})