let pending: Promise<void> | null = null;

export function ensureAuthChecked(): Promise<void> {
  const userStore = useUserStore();
  if (userStore.inited)
    return Promise.resolve();

  if (!pending) {
    const { $api } = useNuxtApp();
    pending = $api.auth.check()
      .then(() => undefined)
      .finally(() => {
        pending = null;
      });
  }

  return pending;
}
