<script setup lang="ts">
  import type { Post } from '~/types/posts';

  const { params } = useRoute();
  const id = computed(() => params.id as string);
  const { $api } = useNuxtApp();
  const { user } = useUserStore();

  const data = await useAsyncDataCatch<Post>(
    () => `post${id.value}`,
    () => $api.posts.post(id.value)
  );

  useHead({
    title: `Post ${data.value ? ' - ' + data.value?.title : ''}`,
    meta: [
      { name: 'description', content: `Blog post${data.value ? ' about ' + data.value?.title : ''}`  },
    ]
  });
</script>

<template>
  <UPageBody>
    <h1 v-if="!data">Error</h1>
    <UContainer v-else>
      <posts-detail base-path="/posts" back-path="/posts"
        :post="data"
        :show-authors="true"
        :showEdit="user?.id === data.userId"/>
    </UContainer>
  </UPageBody>
</template>