export default defineNuxtRouteMiddleware(async (to) => {
  const userStore = useUserStore();
  const token = useCookie<string | null>('token', { default: () => null });
  const id = String(to.params.id ?? '');
  if (!id || !/^\d+$/.test(id))
    throw abortNavigation(createError({ statusCode: 404, statusText: 'No post found!' }));

  if (!userStore.loggedIn && !token.value)
    return navigateTo('/auth/login');

  await ensureAuthChecked();

  if (!userStore.loggedIn)
    return navigateTo('/auth/login');

  const post = await useUserPostFetch(id);
  if (!post?.value)
    throw abortNavigation(createError({ statusCode: 404, statusText: 'No post found!' }));

  if (post.value.userId !== userStore.user?.id)
    throw abortNavigation(createError({ statusCode: 403, statusText: 'Not allowed! Foreigner post' }));
});
