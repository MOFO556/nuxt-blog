export default defineNuxtPlugin({
  dependsOn: ['fetch'],
  parallel: true,
  setup() {
    const userStore = useUserStore();
    userStore.resetInit();
    const nuxtApp = useNuxtApp();
    const router = useRouter();

    if (import.meta.server) {
      return;
    }

    onNuxtReady(() => {
      void ensureAuthChecked().then(() => nuxtApp.runWithContext(async () => {
        const route = router.currentRoute.value;
        if (userStore.loggedIn && route.matched.some(rec => rec.meta.guest)) {
          await navigateTo('/');
          return;
        }
        if (!userStore.loggedIn && route.matched.some(rec => rec.meta.auth)) {
          await navigateTo('/auth/login');
        }
      }));
    });
  },
});
