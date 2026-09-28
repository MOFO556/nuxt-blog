<script setup lang="ts">
  definePageMeta({
    middleware: ['post-owner'],
  });

  const { params } = useRoute();
  const id = computed(() => params.id as string);
  const data = await useUserPostFetch(id.value);
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
