<script setup lang="ts">
import type { Post } from '~/types/posts';

  const { params } = useRoute();
  const id = computed(() => params.id as string);
  const { $api } = useNuxtApp();

  const data = await useAsyncDataCatch<Post>
    (() => `office-post${id.value}`, () => $api.posts.post(id.value), /*{ watch: [ () => useRoute().fullPath]}*/);
</script>

<template>
    <NuxtPage 
      :id="Number(id)" 
      :title="data?.title" 
      :url="data?.url" 
      :content="data?.content"
      :imageSrcs="data?.attachments"
      :post="data"/>
</template>
