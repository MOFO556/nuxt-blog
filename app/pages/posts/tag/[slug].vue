<script setup lang="ts">
  import { z } from 'zod';

  const route = useRoute();
  const slug = computed(() => z.string().min(1).parse(route.params.slug));
  const params = computed(() => ({ tags: slug.value }));

  useHead({
    title: `Posts tagged "${slug.value}"`,
    meta: [{ name: 'description', content: `All blog posts tagged with ${slug.value}` }],
    link: [{ rel: 'canonical', href: `/posts/tag/${slug.value}` }],
  });
</script>
<template>
  <posts-list class="mt-4"
    :params="params"
    :empty-title='`No posts tagged "${slug}"`'
    empty-description="Try another tag or browse all posts" />
</template>