<script setup lang="ts">
  import type { Pagination } from '~/types/core';
  import type { Post } from '~/types/posts';
  import { PostMode } from '~~/shared/types/posts';

  const props = defineProps<{
    params?: Record<string, any>;
    emptyTitle?: string;
    emptyDescription?: string;
  }>();

  const route = useRoute();
  const router = useRouter();
  const { $api } = useNuxtApp();

  const page = computed({
    get: () => Number(route.query.page) || 1,
    set: (v) =>
      router.push({
        query: { ...route.query, page: v === 1 ? undefined : v },
      }),
  });

  const apiParams = computed(() => ({
    ...(props.params ?? {}),
    page: page.value,
  }));

  const { data: posts, error } = await useAsyncData<Pagination<Post[]>>(
    () => `posts-${route.path}-${JSON.stringify(apiParams.value)}`,
    () => $api.posts.all(apiParams.value),
    { watch: [apiParams] },
  );

  const blogPosts = computed(() =>
    posts.value?.data.map(p => ({
      ...p,
      date: p.updatedAt || p.createdAt,
      authors: [{ name: p.user.login }],
      cardDescription: p.description
        || (p.mode === PostMode.Formatted ? (p.excerpt || '') : p.content),
    })),
  );
</script>

<template>
  <UContainer>
    <div v-if="posts" class="flex flex-col gap-5 items-center">
      <UBlogPosts>
        <UBlogPost
          v-for="post in blogPosts"
          :key="post.id"
          :to="`/posts/${post.id}`"
          :title="post.title"
          :description="post.cardDescription"
          :date="post.date"
          :authors="post.authors"
          :image="post.attachments?.find(i => i.postCover)?.path">
          <template #badge>
            <posts-tags :tags="post.tags ?? []" />
          </template>
        </UBlogPost>
      </UBlogPosts>

      <UPagination
        v-model:page="page"
        :total="posts.pagination.total"
        :items-per-page="posts.pagination.limit"
        :to="(p: number) => ({ query: { ...route.query, page: p === 1 ? undefined : p } })" />
    </div>

    <h2 v-else-if="error?.message" class="text-center">{{ error.message }}</h2>

    <LazyUEmpty v-else
      icon="i-lucide-file-text"
      :title="emptyTitle ?? 'No posts yet'"
      :description="emptyDescription ?? 'Posts will appear here'" />
  </UContainer>
</template>