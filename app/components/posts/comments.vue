<script setup lang="ts">
import type { Comment } from '~/types/comments';
import type { Post } from '~/types/posts';

const { post } = defineProps<{post: Post }>();
const { $api } = useNuxtApp();
const { loggedIn } = useUserStore();

const { data: comments} = await useAsyncData<Comment[]>(
  `comments-post${post.id}`, $api.comments.getToPost.bind(null, post.id));
</script>

<template>
  <UContainer>
    <ClientOnly>      
      <comment-form v-if="loggedIn" class="my-5" :postId="post.id"></comment-form>
    </ClientOnly>
    <template v-if="!!comments?.length">
      <h1 class="mt-5">Comments</h1>
      <UCard v-for="comment in comments" :key="comment.id"
        variant="soft"
        :ui="{
          header: 'p-2 sm:px-2'
        }"
        class="m-2">
        <template #header>
          <UContainer class="flex gap-2 px-0 sm:px-0 lg:px-0 items-center justify-between text-xs">
            <ClientOnly>
              <UContainer class="flex gap-2 items-center justify-start">              
                <UAvatar src="images/pwa-icon-d05ca427.png" size="xs"></UAvatar>
                <pre>{{ comment.user.login }}</pre>
              </UContainer>              
            </ClientOnly>
            <pre>{{ comment.createdAt }}</pre>
          </UContainer>
        </template>

        <template #default  v-if="!!comment.text">
          <pre>{{ comment.text }}</pre>
        </template>

        <template #footer v-if="comment.attachments?.length">
          <UCarousel class="mt-2 w-full mx-auto"
            v-slot="{ item }"
            :items="comment.attachments"
            :ui="{ item: 'basis-1/3', container: 'justify-center' }">
            <NuxtImg class="expandable p-2"
            :src="item.path.startsWith('/') ? `${item.path}` : `/${item.path}`" 
              sizes="200px sm:50px md:150px"
              loading="lazy"></NuxtImg>
          </UCarousel>
        </template>
      </UCard>
    </template>
  </UContainer>
</template>
