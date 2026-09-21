import { until } from '@vueuse/core';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const userStore = useUserStore();

  if (import.meta.browser)
    await until(() => userStore.inited).toBeTruthy();

  const isAuthenticated = userStore.loggedIn;

  if (to.matched.some(rec => rec.meta.auth) && !isAuthenticated)
    return navigateTo('/auth/login');
  if (to.matched.some(rec => rec.meta.guest) && isAuthenticated) {
    return navigateTo('/');
  }
  else
    return;
});