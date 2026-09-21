<script setup lang="ts">
const { imgSrc } = defineProps<{ imgSrc?: string }>();
</script>

<template>
  <UContainer>
    <NuxtImg class="p-4"
      :src="imgSrc"></NuxtImg>
    <!-- <comment-form></comment-form> -->
  </UContainer>
</template>