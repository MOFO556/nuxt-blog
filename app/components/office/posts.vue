<script setup lang="ts">
  import type { Post } from '~/types/posts';
  import { LazyConfirmDialog } from '#components';

  const { $api } = useNuxtApp();
  const toast = useToast();
  const overlay = useOverlay();
  const confirm = overlay.create(LazyConfirmDialog);

  const { data: posts, error, refresh } = await useAsyncData<Post[]>(
    'office-posts',
    $api.posts.my,
  );

  const blogPost = computed(() =>
    posts.value?.map(p => ({ ...p, date: p.updatedAt || p.createdAt })) ?? [],
  );

  async function onDeletePost(post: Post, event: MouseEvent) {
    preventBubbling(event);
    const confirmInstance = confirm.open({
      description: `Delete “${post.title}”? This cannot be undone.`,
      acceptButton: 'Delete',
    });
    const confirmed = await confirmInstance.result;
    if (!confirmed)
      return;

    try {
      await $api.posts.remove(post.id);
      await refresh();
    }
    catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      toast.add({
        title: 'Error',
        color: 'error',
        description: `Unable to delete post.${message ? ` ${message}` : ''}`,
      });
    }
  }
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
        :title="post.title"
        :description="post.description || post.excerpt || undefined"
        :image="post.attachments?.find(i => i.postCover)?.path"
        :date="post.date"
        :ui="{ meta: 'flex w-full flex-row-reverse items-center justify-between gap-2' }">
        <template #badge>
          <div class="relative z-10 flex items-center gap-1"
            @click.stop>
            <UButton
              :to="`/office/posts/${post.id}/edit`"
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              aria-label="Edit post"
              @click.stop />
            <UButton
              icon="i-lucide-trash"
              size="xs"
              color="error"
              variant="ghost"
              aria-label="Delete post"
              @click="onDeletePost(post, $event)" />
          </div>
        </template>
      </LazyUBlogPost>
    </LazyUBlogPosts>

    <LazyUAlert v-else-if="error" color="error"
      :title="error.message"/>

    <UEmpty v-else
      icon="i-lucide-file-text"
      title="No posts yet"
      description="Your posts will appear here"/>
  </UContainer>
</template>