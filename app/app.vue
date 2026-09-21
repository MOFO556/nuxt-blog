<script setup lang="ts">
const userStore = useUserStore();

const isHydrating = ref(false)
onNuxtReady(() => { isHydrating.value = true })
const isReadySetLayout = computed(() => isHydrating.value);

const currentLayout = computed(() => {
  if (!isReadySetLayout.value)
    return 'default';
  else
    return userStore.loggedIn ? 'admin' : 'default'
});
</script>

<template>
  <NuxtLayout :name="currentLayout">
    <NuxtPage />
  </NuxtLayout>
</template>
