<script setup lang="ts">
import type { Post } from '~/types/posts';

  const { params } = useRoute();
  const id = computed(() => params.id as string);
  const { $api } = useNuxtApp();
  const { user } = useUserStore();

  const data = await useAsyncDataCatch<Post>
    (() => `post${id.value}`, () => $api.posts.post(id.value));

  const { nextPostId, prevPostId } = usePostsStore();
  const nextId = computed(() => nextPostId(Number(id.value)));
  const prevId = computed(() => prevPostId(Number(id.value)));
</script>
<template>
  <UPageBody>
    <h1 v-if="!data">Error</h1>
    <UContainer v-else>
      <UBlogPost 
        :title="data.title" 
        :description="data.content"
        :date="data.updatedAt || data.createdAt"
        :authors="[{name: data.user.login}]"/>

      <UCarousel class="mt-2 w-full mx-auto"
        v-if="data?.attachments?.length"
        v-slot="{ item }"
        loop
        arrows
        :items="data.attachments"
        :ui="{ item: 'basis-1/3', container: 'justify-center' }">
        <NuxtImg :src="item.path.startsWith('/') ? `${item.path}` : `/${item.path}`" 
          class="rounded-lg"
          sizes="100vw sm:50vw md:400px"
          loading="lazy"></NuxtImg>
      </UCarousel>


      <posts-comments :post="data"></posts-comments>

      <nav class="mt-4 flex gap-1 items-center justify-center">
        <ULink class="flex gap-0.5 items-center w-fit"
          to="/posts/">
          <UIcon name="i-lucide-arrow-left-from-line" size="15" />
          Back to list
        </ULink>
        <template v-if="!(nextId === 0 && prevId === 0)"> | 
          <ULink class="flex gap-0.5 items-center w-fit" v-if="prevId !== 0" 
            :to="`/posts/${prevId}`">
            <UIcon name="i-lucide-move-left" size="15" />
            Prev post
          </ULink> | 
          <ULink class="flex gap-0.5 items-center w-fit" v-if="nextId !== 0" 
            :to="`/posts/${nextId}`">
            <UIcon name="i-lucide-move-right" size="15" />
            Next post
          </ULink>
        </template>
        <client-only v-if="user?.id === data.userId"> | 
          <ULink class="flex gap-0.5 items-center w-fit" 
            :to="{ name: 'office-posts-id-edit', params: { id: data.id }}">
            <UIcon name="i-lucide-file-pen-line" size="15" />
            Edit
          </ULink>          
        </client-only>
      </nav>

    </UContainer>
  </UPageBody>  
</template>
