export default defineNuxtPlugin({
  dependsOn: ['fetch'],
  parallel: true,
  async setup(){
    const { resolveInit, resetInit } = useUserStore();
    resetInit();
    const { $api } = useNuxtApp();
    if (import.meta.browser)
      $api.auth.check()
        .then(u => console.log(u));
    else
      resolveInit()
  }
});