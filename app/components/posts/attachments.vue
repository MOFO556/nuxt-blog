<script setup lang="ts">
  import type { PostImageMeta } from '~/types/posts';
  import {
    applyAttachmentDescription,
    buildAttachmentDescriptionPayload,
  } from '~/utils/postAttachmentDescriptions';

  const props = defineProps<{
    attachments: PostImageMeta[];
    allAttachments?: PostImageMeta[];
    canEdit: boolean;
    postId?: number;
  }>();

  const { $api } = useNuxtApp();
  const toast = useToast();

  const canLoop = computed(() => (props.attachments?.length ?? 0) > 3);

  const carouselUi = {
    viewport: 'overflow-hidden',
    container: '-ms-3',
    item: 'min-w-0 basis-full ps-3 sm:basis-1/2 md:basis-1/3',
  };

  function applyLocalDescription(path: string, next: string) {
    applyAttachmentDescription(
      [props.allAttachments ?? props.attachments, props.attachments],
      path,
      next,
    );
  }

  async function saveDescription(item: PostImageMeta, description: string | undefined) {
    if (!props.canEdit || !props.postId || !item.path)
      return;

    const keep = props.allAttachments ?? props.attachments;
    const next = description ?? '';
    const previous = item.description;
    applyLocalDescription(item.path, next);

    const payload = buildAttachmentDescriptionPayload(keep, item.path, next);
    if (!payload.length)
      return;

    try {
      await $api.images.uploadToPost(props.postId, payload);
    }
    catch (err) {
      applyLocalDescription(item.path, previous ?? '');
      toast.add({
        title: 'Could not save image description',
        description: err instanceof Error ? err.message : 'Unknown error',
        color: 'error',
      });
    }
  }
</script>

<template>
  <LazyUCarousel v-if="attachments?.length"
    class="mt-2 w-full max-w-full"
    v-slot="{ item, index }"
    :loop="canLoop"
    arrows
    :items="attachments"
    :ui="carouselUi">
    <div class="flex min-w-0 w-full flex-col gap-1 overflow-hidden">
      <div class="w-full overflow-hidden rounded-lg bg-elevated">
        <NuxtImg class="rounded-lg"
          :src="item.path.startsWith('/') ? item.path : `/${item.path}`"
          :alt="item.description ? item.description : `post image ${index}`"
          sizes="100vw sm:50vw md:33vw"
          loading="lazy"/>
      </div>
      <lazy-images-description v-if="canEdit || item?.description"
        class="mt-1 w-full min-w-0 text-sm [&_div]:line-clamp-3 [&_*]:min-w-0 [&_*]:max-w-full [&_*]:break-words"
        :model-value="item.description"
        :canEdit="canEdit"
        @editStopped="saveDescription(item, $event)"/>
    </div>
  </LazyUCarousel>
</template>