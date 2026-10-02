export default defineNuxtPlugin(() => {
  if (!import.meta.dev || !import.meta.client)
    return;

  if (!('serviceWorker' in navigator))
    return;

  void navigator.serviceWorker.getRegistrations().then(async (regs) => {
    await Promise.all(regs.map(reg => reg.unregister()));
    if (!('caches' in window))
      return;
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  });
});
