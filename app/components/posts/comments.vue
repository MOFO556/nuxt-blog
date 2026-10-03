<script setup lang="ts">
  import type { Comment } from '~/types/comments';
  import type { ImageMeta } from '~/types/core';
  import type { Post } from '~/types/posts';
  import { buildCommentTree, flattenCommentTree } from '~/utils/comment-tree';

  const { post } = defineProps<{post: Post }>();
  const { $api } = useNuxtApp();
  const { loggedIn } = useUserStore();
  const imagePreviewModal = reactive<{ open: boolean, picture?: string, description?: string, comment?: Comment; }>({
    open: false,
    picture: undefined,
    description: undefined,
    comment: undefined
  });
  const { user } = useUserStore();

  const { data: comments} = await useAsyncData<Comment[]>(
    `comments-post${post.id}`, $api.comments.getToPost.bind(null, post.id));

  const flatComments = computed(() =>
    flattenCommentTree(buildCommentTree(comments.value ?? [])));

  const { on } = useRealtime();

  const upsertComment = (comment: Comment) => {
    const list = comments.value ?? [];
    const idx = list.findIndex(c => c.id === comment.id);
    if (idx === -1) {
      comments.value = [comment, ...list];
      return;
    }
    const next = [...list];
    const prev = next[idx]!;
    next[idx] = {
      ...prev,
      ...comment,
      user: comment.user ?? prev.user,
      attachments: comment.attachments ?? (comment.deletedAt ? [] : prev.attachments),
      text: comment.deletedAt ? '' : (comment.text ?? prev.text),
    };
    comments.value = next;
  };

  const patchAttachmentDescriptions = (
    commentId: number,
    updates: { path: string, description?: string }[],
  ) => {
    const list = comments.value ?? [];
    const idx = list.findIndex(c => c.id === commentId);
    if (idx === -1)
      return;

    const prev = list[idx]!;
    const byPath = new Map(updates.map(u => [u.path, u.description]));
    const attachments = (prev.attachments ?? []).map(att =>
      att.path && byPath.has(att.path)
        ? { ...att, description: byPath.get(att.path) }
        : att,
    );

    const next = [...list];
    next[idx] = { ...prev, attachments };
    comments.value = next;

    if (
      imagePreviewModal.comment?.id === commentId
      && imagePreviewModal.picture
      && byPath.has(imagePreviewModal.picture)
    ) {
      imagePreviewModal.description = byPath.get(imagePreviewModal.picture);
      if (imagePreviewModal.comment.attachments) {
        imagePreviewModal.comment = {
          ...imagePreviewModal.comment,
          attachments,
        };
      }
    }
  };

  const off = on(`post:${post.id}`, (payload) => {
    if (payload.type === 'comment:created') {
      const { comment } = payload;
      if (comments.value?.some(c => c.id === comment.id))
        return;
      comments.value = [comment, ...(comments.value ?? [])];
    }
    else if (payload.type === 'comment:updated') {
      refreshNuxtData(`comments-post${post.id}`);
    }
    else if (payload.type === 'comment:deleted') {
      upsertComment({
        ...payload.comment,
        text: '',
        attachments: [],
      });
    }
    else if (payload.type === 'comment:attachment-updated') {
      patchAttachmentDescriptions(payload.commentId, payload.attachments ?? []);
    }
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
    <template v-if="!!flatComments.length">
      <h2 class="mt-5">Comments</h2>
      <posts-comment-item v-for="comment in flatComments"
        :key="comment.id"
        :comment="comment"
        :post-id="post.id"
        :depth="comment.depth"
        @open-image="onModalToOpen" />
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
