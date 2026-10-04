import { useAuthTokenCookie } from '~/utils/auth-cookie';

const AUTH_REQUIRED_REDIRECT = '/auth/login';

export default defineNuxtRouteMiddleware((to) => {
  const userStore = useUserStore();
  const token = useAuthTokenCookie();

  const requiresAuth = to.matched.some(rec => rec.meta.auth);
  const requiresGuest = to.matched.some(rec => rec.meta.guest);

  const hasSession = userStore.loggedIn || Boolean(token.value);

  if (requiresAuth && !hasSession)
    return navigateTo(AUTH_REQUIRED_REDIRECT);

  if (requiresGuest && userStore.inited && userStore.loggedIn)
    return navigateTo('/');
});
