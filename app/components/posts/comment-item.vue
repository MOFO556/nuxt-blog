<script setup lang="ts">
  import type { Comment } from '~/types/comments';
  import { CommentState } from '~/types/comments.enum';
  import type { ImageMeta } from '~/types/core';

  const props = defineProps<{ comment: Comment, postId: number, depth?: number }>();
  const emit = defineEmits<{ openImage: [img: Partial<ImageMeta>, comment: Comment] }>();

  const { $api } = useNuxtApp();
  const { user, loggedIn } = useUserStore();

  const mode = ref<CommentState>(CommentState.display);
  const deleting = ref(false);
  const avatarProvider = computed(() => 
    (isUserAvatar: boolean) =>
      !isUserAvatar
        ? 'none'
        : 'nuxtHubBlobIpx'
  );

  const isOwner = computed(() => user?.id === props.comment.userId);
  const isDeleted = computed(() => !!props.comment.deletedAt);
  const ownerName = computed(() => props.comment.user?.login || 'User');
  const indentStyle = computed(() => ({
    marginLeft: `${Math.min(props.depth ?? 0, 8)}rem`,
  }));

  function startEdit() {
    mode.value = CommentState.edit;
  }

  function startReply() {
    mode.value = CommentState.reply;
  }

  function resetMode() {
    mode.value = CommentState.display;
  }

  async function onDelete() {
    if (deleting.value || !isOwner.value || isDeleted.value)
      return;
    deleting.value = true;
    try {
      await $api.comments.remove(props.comment.id);
      await refreshNuxtData(`comments-post${props.postId}`);
    }
    finally {
      deleting.value = false;
    }
  }
</script>

<template>
  <div class="comment-item" :style="indentStyle">
    <UCard
      class="m-2"
      variant="soft"
      :ui="{
        header: 'p-2 sm:px-2',
        body: isDeleted && mode !== CommentState.edit ? 'hidden p-0' : 'relative',
        footer: 'p-2 sm:px-2',
      }">
      <template #header>
        <UContainer class="flex gap-2 px-0 sm:px-0 lg:px-0 items-center justify-between text-xs">
          <UContainer v-if="isDeleted" class="flex gap-2 items-center justify-start">
            <pre class="opacity-70 italic">Comment deleted by {{ ownerName }}</pre>
          </UContainer>
          <ClientOnly v-else>
            <UContainer class="flex gap-2 items-center justify-start">
              <UAvatar :provider="avatarProvider(!!comment.user?.avatar)"
                :src="comment.user.avatar || '/images/default-avatar.png'"
                :alt="`${ownerName} icon`"
                size="xs" />
              <pre>{{ ownerName }}</pre>
            </UContainer>
          </ClientOnly>
          <UContainer class="flex max-w-fit gap-2 justify-end items-center px-0 sm:px-0 lg:px-0">
            <pre>{{ comment.createdAt }}</pre>
            <ClientOnly>
              <UContainer v-if="loggedIn && mode === CommentState.display"
                class="flex max-w-fit gap-1 items-center px-0 sm:px-0 lg:px-0">
                <UButton class="icon-btn"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-reply"
                  @click="startReply" />
                <UButton v-if="isOwner && !isDeleted"
                  class="icon-btn"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-pencil"
                  @click="startEdit" />
                <UButton v-if="isOwner && !isDeleted"
                  class="icon-btn"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-trash"
                  :loading="deleting"
                  @click="onDelete" />
              </UContainer>
            </ClientOnly>
          </UContainer>
        </UContainer>
      </template>

      <template v-if="mode === CommentState.edit || (!isDeleted && !!comment.text)" #default>
        <comment-form v-if="mode === CommentState.edit"
          :post-id="postId"
          :comment="comment"
          @success="resetMode"
          @cancel="resetMode" />
        <pre v-else>{{ comment.text }}</pre>
      </template>

      <template #footer v-if="!isDeleted && mode !== CommentState.edit && comment.attachments?.length">
        <LazyUCarousel class="mt-2 w-full mx-auto"
          v-slot="{ item, index }"
          :items="comment.attachments"
          :ui="{ item: 'basis-1/3', container: 'justify-center' }">
          <NuxtImg class="expandable"
            :src="item.path?.startsWith('/') ? `${item.path}` : `/${item.path}`"
            :alt="item.description ? item.description : `comment image ${comment.id}-${index}`"
            sizes="200px sm:50px md:150px"
            loading="lazy"
            @click="emit('openImage', item, comment)" />
        </LazyUCarousel>
      </template>
    </UCard>

    <div v-if="mode === 'reply'" class="ml-6 my-2">
      <comment-form :post-id="postId"
        :parent-id="comment.id"
        @success="resetMode"
        @cancel="resetMode" />
    </div>
  </div>
</template>

<style scoped>
  .icon-btn:not(:disabled) {
    cursor: pointer;
  }
</style>
