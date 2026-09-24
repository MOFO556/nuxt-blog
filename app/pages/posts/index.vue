<script setup lang="ts">
  import type { Post } from '~/types/posts';
  const { $api } = useNuxtApp();

  const { data: posts, error } = await useAsyncData<Post[]>
    ("posts", $api.posts.all);
  const blogPost = computed(() => {
    console.log(posts)
    return posts.value?.map(p => {
      return {
        ...p,
        date: p.updatedAt || p.createdAt,
        authors: [{
          name: p.user.login
        }]
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
            :to="`/posts/${post.id}`"
            :image="post.attachments?.find(i => i.postCover)?.path "
            v-bind="post" />
        </UBlogPosts>
        <h2 v-else>{{error?.message}}</h2>        
      </UContainer>
    </UPageBody>
</template>