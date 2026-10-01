<script setup lang="ts">
  import type { Post } from '~/types/posts';

  const props = defineProps<{
    post: Post;
    basePath: string;
    backPath: string;
    showAuthors?: boolean;
    showEdit?: boolean;
    navGap?: string;
  }>();

  const { user } = useUserStore();
  const canEdit = computed(() => props.post.userId === user?.id);
</script>

<template>
  <UBlogPost :title="post.title"
    :description="post.content"
    :date="post.updatedAt || post.createdAt"
    :authors="showAuthors ? [{ name: post.user.login }] : undefined">    
    <template #badge>
      <posts-tags :tags="post.tags ?? []":inline="3" class="ml-auto" />
    </template>
  </UBlogPost>
  <posts-attachments v-if="post.attachments"
    :attachments="post.attachments"
    :canEdit="canEdit"/>
  <posts-comments :post="post" />
  <posts-navigation :postId="post.id"
    :basePath="basePath"
    :backPath="backPath"
    :showEdit="showEdit"/>
</template>