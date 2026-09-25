import type { Post } from "~/types/posts";

export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore();
  const id = to.params.id as string;
  if (!id) 
    return;
  
  const post = await useUserPostFetch(id);
    if (!post)
      throw abortNavigation(createError({ statusCode: 404, statusText: "No post found!" }));
    else if (post.value?.userId !== userStore.user?.id)
      throw abortNavigation(createError({ statusCode: 401, statusText: "Not allowed! Foreigner post" }));

});