import { until } from '@vueuse/core';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const userStore = useUserStore();

  if (import.meta.browser) {
    await until(() => userStore.inited).toBeTruthy();
    /**
     * BAD-BAD workaround the hydration fails
     */
    if (!userStore.loggedIn) {
      userStore.clearUser();
      const { $api } = useNuxtApp();
      onNuxtReady(() =>  $api.auth.check())
    }
  }

  const isAuthenticated = userStore.loggedIn;
  
  if (to.matched.some(rec => rec.meta.auth) && !isAuthenticated)
    return navigateTo('/auth/login');
  else if (to.matched.some(rec => rec.meta.guest) && isAuthenticated) {
    return navigateTo('/');
  }
  else
    return;
});