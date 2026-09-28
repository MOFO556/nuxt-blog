export default defineNuxtPlugin({
  dependsOn: ['fetch'],
  parallel: true,
  async setup(){
    const { resolveInit, resetInit } = useUserStore();
    resetInit();
    const { $api } = useNuxtApp();
    if (import.meta.server || !useNuxtApp().payload.serverRendered)
      $api.auth.check();
    else
      resolveInit()
  }
});