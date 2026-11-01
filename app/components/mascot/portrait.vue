<script setup lang="ts">
const { portraitSrc, theme } = useMascotTheme();
const failed = ref(false);

watch(portraitSrc, () => failed.value = false);
</script>

<template>
  <span class="inline-block overflow-hidden rounded-full align-middle"
    :class="failed ? (theme === 'dark' ? 'bg-violet-700' : 'bg-orange-500') : ''">
    <img v-show="!failed"
      class="size-full object-cover"
      :src="portraitSrc"
      alt="mascot face"
      @error="failed = true">
  </span>
</template>