<script setup lang="ts">
  import type { Post, PostImageMeta } from '~/types/posts';
  const { post, imageSrcs = [] } = defineProps<{
      post: Post,
      imageSrcs?: PostImageMeta[]
    }>();
  
  useHead({
    title: `Post${post.title ? post.title + ' ' : '' } editing`,
    meta: [
      { name: 'description', content: `Edit your blog post${post.title ? post.title + ' ' : '' }` },
    ]
  });
</script>

<template>
  <posts-form 
    :id="post.id" 
    :title="post.title" 
    :content="post.content"
    :content-html="post.contentHtml"
    :description="post.description"
    :mode="post.mode"
    :url="post.url" 
    :tags="post.tags"
    :images="imageSrcs"
    ></posts-form>
</template>
