<script setup lang="ts">
  import type { Post } from '~/types/posts';

  const { post } = defineProps<{ post: Post }>();
</script>

<template>
  <UPageBody>
    <UContainer>
      <posts-detail  base-path="/office/posts"
        :post="post"
        :showEdit="true"/>
    </UContainer>
  </UPageBody>
</template>