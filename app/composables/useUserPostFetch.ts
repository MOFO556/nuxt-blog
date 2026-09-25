import type { Post } from "~/types/posts";

export const useUserPostFetch = (id: MaybeRefOrGetter<string>) => {
  const postId = computed(() => toValue(id));
  const { $api } = useNuxtApp();
  
  return useAsyncDataCatch<Post>(
    () => `office-post-${postId.value}`,
    () => $api.posts.post(postId.value),
  );
};