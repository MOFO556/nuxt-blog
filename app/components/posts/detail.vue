<script setup lang="ts">
  import type { Post } from '~/types/posts';
  import { PostMode } from '~~/shared/types/posts';

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
  const isFormatted = computed(() => props.post.mode === PostMode.Formatted);
</script>

<template>
  <UBlogPost :title="post.title"
    :date="post.updatedAt || post.createdAt"
    :authors="showAuthors ? [{ name: post.user.login }] : undefined">
    <template #badge>
      <posts-tags :tags="post.tags ?? []" :inline="3" class="ml-auto" />
    </template>
    <template #description>
      <posts-formatted-body v-if="isFormatted"
        :content-html="post.contentHtml || ''"
        :attachments="post.attachments ?? []"
        :canEdit="canEdit"
        :postId="post.id"/>
      <div v-else
        class="post-legacy-body whitespace-pre-wrap text-default">
        {{ post.content }}
      </div>
    </template>
  </UBlogPost>
  <posts-attachments v-if="!isFormatted && post.attachments?.length"
    :attachments="post.attachments"
    :canEdit="canEdit"
    :postId="post.id"/>
  <posts-comments :post="post" />
  <posts-navigation :postId="post.id"
    :basePath="basePath"
    :backPath="backPath"
    :showEdit="showEdit"/>
</template>