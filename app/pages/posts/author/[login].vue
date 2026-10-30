<script setup lang="ts">
  import { z } from 'zod';

  const route = useRoute();
  const login = computed(() => z.string().min(1).parse(route.params.login));
  const params = computed(() => ({ author: login.value }));

  useHead({
    title: `Posts by ${login.value}`,
    meta: [{ name: 'description', content: `All blog posts written by ${login.value}` }],
    link: [{ rel: 'canonical', href: `/posts/author/${login.value}` }],
  });  
</script>
<template>
  <posts-list class="mt-4"
    :params="params"
    :empty-title='`No posts "by ${login}"`'
    empty-description="This author hasn't published anything yet" />
</template>