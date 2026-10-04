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
  <div class="comment-item min-w-0" :style="indentStyle">
    <UCard
      class="m-2 min-w-0"
      variant="soft"
      :ui="{
        header: 'p-2 sm:px-2',
        body: isDeleted && mode !== CommentState.edit ? 'hidden p-0' : 'relative min-w-0 overflow-hidden',
        footer: 'p-2 sm:px-2',
      }">
      <template #header>
        <div class="comment-header text-xs">
          <div v-if="isDeleted" class="comment-author-wrap">
            <pre class="comment-author opacity-70 italic">Comment deleted by {{ ownerName }}</pre>
          </div>
          <div v-else class="comment-author-wrap">
            <span class="comment-avatar">
              <ClientOnly>
                <UAvatar
                  :provider="avatarProvider(!!comment.user?.avatar)"
                  :src="comment.user.avatar || '/images/default-avatar.png'"
                  :alt="`${ownerName} icon`"
                  size="xs" />
              </ClientOnly>
            </span>
            <pre class="comment-author">{{ ownerName }}</pre>
          </div>
          <div class="comment-meta">
            <pre class="comment-date">{{ comment.createdAt }}</pre>
            <ClientOnly>
              <div v-if="loggedIn && mode === CommentState.display" class="comment-actions">
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
              </div>
            </ClientOnly>
          </div>
        </div>
      </template>

      <template v-if="mode === CommentState.edit || (!isDeleted && !!comment.text)" #default>
        <comment-form v-if="mode === CommentState.edit"
          :post-id="postId"
          :comment="comment"
          @success="resetMode"
          @cancel="resetMode" />
        <pre class="comment-body">{{ comment.text }}</pre>
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

  .comment-header {
    container-type: inline-size;
    container-name: comment-hdr;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
  }

  .comment-author-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
  }

  .comment-avatar {
    display: inline-flex;
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
  }

  .comment-avatar :deep(*) {
    width: 100%;
    height: 100%;
  }

  .comment-author {
    margin: 0;
    flex: 1 1 auto;
    min-width: 0;
    white-space: normal;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow-wrap: anywhere;
    word-break: break-all;
  }

  .comment-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    column-gap: 0.5rem;
    row-gap: 0.25rem;
    flex: 0 0 auto;
    width: max-content;
    max-width: 100%;
  }
  
  @container comment-hdr (max-width: 26rem) {
    .comment-meta {
      flex-direction: column;
      align-items: flex-end;
    }
  }

  .comment-date {
    margin: 0;
    white-space: nowrap;
  }

  .comment-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
  }

  .comment-body {
    margin: 0;
    max-width: 100%;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
</style>
