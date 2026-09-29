<script setup lang="ts">
  import type { Comment } from '~/types/comments';
  import type { ImageMeta } from '~/types/core';
  import type { Post } from '~/types/posts';

  const { post } = defineProps<{post: Post }>();
  const { $api } = useNuxtApp();
  const { loggedIn } = useUserStore();
  const imagePreviewModal = reactive<{
        open: boolean;
        picture?: string;
        description?: string;
        comment?: Comment;
    }>({
      open: false,
      picture: undefined,
      description: undefined,
      comment: undefined
    });
  const { user } = useUserStore();

  const { data: comments} = await useAsyncData<Comment[]>(
    `comments-post${post.id}`, $api.comments.getToPost.bind(null, post.id));

  const { on } = useRealtime();

  const off = on(`post:${post.id}`, (payload) => {
    if (payload.type === 'comment:created') {
      const { comment } = payload;
      if (comments.value?.some(c => c.id === comment.id)) 
        return;

      comments.value = [comment, ...(comments.value ?? [])];
    };
  });
  
  onBeforeUnmount(off);

  const onModalToOpen = (img: Partial<ImageMeta>, comment: Comment) => {
    imagePreviewModal.open = true;
    imagePreviewModal.picture = img.path;
    imagePreviewModal.description = img.description;
    imagePreviewModal.comment = comment;
  }

  const onModalClose = () => {
    imagePreviewModal.description = undefined;
    imagePreviewModal.picture = undefined;
    imagePreviewModal.comment = undefined;
  }

  const updateImgDescription = (description: string) => {
    const meta = {
      currComId: imagePreviewModal.comment?.id,
      currComPath: imagePreviewModal.picture
    }
    if (imagePreviewModal.comment?.id && imagePreviewModal.picture)
      $api.images.uploadToComment(imagePreviewModal.comment?.id, [{
        existingPath: imagePreviewModal.picture,
        description
      }]).then(() => {
        const comment = comments.value?.find(c => c.id === meta.currComId);
        if (comment) {
          const attachment = comment.attachments?.find(a => a.path === meta.currComPath);
          if (attachment)
            attachment.description = description;
        }
      });
  }
  const debounceFunc = debounce(updateImgDescription, 200);

</script>

<template>
  <UContainer>
    <ClientOnly>
      <comment-form v-if="loggedIn" class="my-5" :postId="post.id"></comment-form>
    </ClientOnly>
    <template v-if="!!comments?.length">
      <h1 class="mt-5">Comments</h1>
      <LazyUCard v-for="comment in comments" :key="comment.id"
        class="m-2"
        variant="soft"
        :ui="{ header: 'p-2 sm:px-2' }">
        <template #header>
          <UContainer class="flex gap-2 px-0 sm:px-0 lg:px-0 items-center justify-between text-xs">
            <ClientOnly>
              <UContainer class="flex gap-2 items-center justify-start">              
                <UAvatar 
                  :src="comment.user.avatar || '/images/default-avatar.png'"
                  :alt="`${comment.user?.login ? comment.user.login : 'User'} icon`"
                  provider="none" 
                  size="xs"></UAvatar>
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
          <LazyUCarousel class="mt-2 w-full mx-auto"
            v-slot="{ item, index }"
            :items="comment.attachments"
            :ui="{ item: 'basis-1/3', container: 'justify-center' }">
            <LazyNuxtImg class="expandable"
              :src="item.path?.startsWith('/') ? `${item.path}` : `/${item.path}`" 
              :alt="item.description ? item.description : `comment image ${comment.id}-${index}`" 
              sizes="200px sm:50px md:150px"
              loading="lazy"
              @click="onModalToOpen(item, comment)"></LazyNuxtImg>
          </LazyUCarousel>
        </template>
      </LazyUCard>
    </template>
    <UModal v-model:open="imagePreviewModal.open"
        :ui="{
          header: 'sm:py-0 sm:px-3 min-h-[2rem] border-none justify-end',
          body: 'px-2 pt-0 pb-4 sm:px-4 sm:pt-0 sm:pb-4',
          close: 'top-2 end-2'
        }"
        @after:leave="onModalClose()">
      <template #body>
        <lazy-images-view :canEditDescription="imagePreviewModal.comment?.userId === user?.id"
          :imgSrc="imagePreviewModal.picture"
          :description="imagePreviewModal.description"
          @descriptionEditStopped="debounceFunc($event)"></lazy-images-view>
      </template>
    </UModal>
  </UContainer>
</template>
