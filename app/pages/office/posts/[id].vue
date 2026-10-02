<script setup lang="ts">
  definePageMeta({
    middleware: ['post-owner'],
    validate: (route) => /^\d+$/.test(String(route.params.id ?? '')),
  });

  const { params } = useRoute();
  const id = computed(() => params.id as string);
  const data = await useUserPostFetch(id.value);

  useHead({
    title: `User's post${data.value ? ' - ' + data.value?.title : ''}`,
    meta: [
      { name: 'description', content: `User's blog post${data.value ? ' about ' + data.value?.title : ''}`  },
    ]
  });
</script>

<template>
    <NuxtPage
      :imageSrcs="data?.attachments"
      :post="data"/>
</template>
