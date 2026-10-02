<script setup lang="ts">
  import type { Post } from '~/types/posts';

  const { $api } = useNuxtApp();
  const { data: posts, error } = await useAsyncData<Post[]>( 'office-posts', $api.posts.my);
  const blogPost = computed(() =>
    posts.value?.map(p => ({ ...p, date: p.updatedAt || p.createdAt })) ?? [],
  );
</script>

<template>
  <UContainer class="flex flex-col w-full max-w-full">
    <div class="flex justify-start mb-2">
      <UButton to="/office/posts/create"
        icon="i-lucide-file-plus"
        variant="outline">Create</UButton>
    </div>

    <LazyUBlogPosts v-if="posts?.length">
      <LazyUBlogPost
        v-for="post in blogPost"
        :key="post.id"
        :to="`/office/posts/${post.id}`"
        :image="post.attachments?.find(i => i.postCover)?.path"
        v-bind="post"
      />
    </LazyUBlogPosts>

    <LazyUAlert v-else-if="error" color="error"
      :title="error.message"/>

    <UEmpty v-else
      icon="i-lucide-file-text"
      title="No posts yet"
      description="Your posts will appear here"/>
  </UContainer>
</template>