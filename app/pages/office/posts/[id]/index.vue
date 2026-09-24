<script setup lang="ts">
import type { Post } from '~/types/posts';

  const { post } = defineProps<{post: Post}>();

  const { nextPostId, prevPostId } = usePostsStore();
  const nextId = computed(() => nextPostId(post.id));
  const prevId = computed(() => prevPostId(post.id));

</script>
<template>
  <UPageBody>
    <UContainer>
      <UBlogPost 
        :title="post.title" 
        :description="post.content"
        :date="post.updatedAt || post.createdAt"/>

      <UCarousel class="mt-2 w-full mx-auto"
        v-if="post?.attachments"
        v-slot="{ item }"
        loop
        arrows
        :items="post.attachments"
        :ui="{ item: 'basis-1/3', container: 'justify-center' }">
        <NuxtImg :src="item.path.startsWith('/') ? `${item.path}` : `/${item.path}`" 
          class="rounded-lg"
          sizes="100vw sm:50vw md:400px"
          loading="lazy"></NuxtImg>
      </UCarousel>

      <posts-comments :post="post"></posts-comments>

      <nav class="mt-4 flex gap-2 items-center justify-center">
        <ULink class="flex gap-0.5 items-center w-fit"
          to="/office/posts/">
          <UIcon name="i-lucide-arrow-left-from-line" size="15" />
          Back to list
        </ULink>
        <template v-if="!(nextId === 0 && prevId === 0)"> | 
          <ULink class="flex gap-0.5 items-center w-fit" v-if="prevId !== 0" 
            :to="`/office/posts/${prevId}`">
            <UIcon name="i-lucide-move-left" size="15" />
            Prev post
          </ULink> | 
          <ULink class="flex gap-0.5 items-center w-fit" v-if="nextId !== 0" 
            :to="`/office/posts/${nextId}`">
            <UIcon name="i-lucide-move-right" size="15" />
            Next post
          </ULink>
        </template> | 
        <ULink class="flex gap-0.5 items-center w-fit" 
          :to="{ name: 'office-posts-id-edit', params: { id: post.id }}">
          <UIcon name="i-lucide-file-pen-line" size="15" />
          Edit
        </ULink>
      </nav>
    </UContainer>
  </UPageBody>  
</template>
