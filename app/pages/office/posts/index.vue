<script setup lang="ts">
  import type { Post } from '~/types/posts';
  const { $api } = useNuxtApp();

  const { data: posts, error } = await useAsyncData<Post[]>
    ("office-posts", $api.posts.my)
      .then(async res => {
        const dataWithImages = res.data.value
        return { data: res.data, error: res?.error }
      })
      .catch(e => {
        return { data: ref([]), error: e }
      });
  const blogPost = computed(() => {
    return posts?.value?.map(p => {
      return {
        ...p,
        date: p.updatedAt || p.createdAt
      }
    })
  });
</script>

<template>
  <nav class="my-4 px-4">
    <ULink class="flex gap-0.5 items-center w-fit"
      to="/office/posts/create">
      <UIcon name="i-lucide-file-plus" size="15" />
      Create
    </ULink>
  </nav>
  <UPageBody>
    <UContainer>
      <UBlogPosts v-if="posts">
        <UBlogPost
          v-for="post in blogPost"
          :key="post.id" 
          :to="`/office/posts/${post.id}`"
          :image="post.attachments?.find(i => i.postCover)?.path"
          v-bind="post" />
      </UBlogPosts>
      <h2 v-else>{{error?.message}}</h2>        
    </UContainer>
  </UPageBody>
</template>