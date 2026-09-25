export default defineNuxtRouteMiddleware((to, from) => {
  const userStore = useUserStore();  
  setPageLayout(userStore.loggedIn ? 'admin' : 'default');
});
