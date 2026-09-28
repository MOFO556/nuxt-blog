<script setup lang="ts">
  import type { PostImageMeta } from '~/types/posts';

  const { params } = useRoute();
  const id = computed(() => Number(params.id as string));
  const { title = '', content = '', url = '', imageSrcs = [] } = defineProps<{
      url?: string,
      title?: string,
      content?: string,
      imageSrcs?: PostImageMeta[]
    }>();
</script>

<template>
  <posts-form :id="id" :title="title" :content="content" :url="url" :images="imageSrcs"></posts-form>
</template>
