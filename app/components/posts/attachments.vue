<script setup lang="ts">
  import type { PostImageMeta } from '~/types/posts';

  const props = defineProps<{
    attachments: PostImageMeta[];
    canEdit: boolean;
  }>();
</script>

<template>
  <LazyUCarousel v-if="attachments?.length"
    class="mt-2 w-full mx-auto"
    v-slot="{ item, index }"
    loop
    arrows
    :items="attachments"
    :ui="{ item: 'basis-1/3', container: 'justify-center' }">
    <div class="flex flex-col gap-0.5">
      <NuxtImg class="rounded-lg"
        :src="item.path.startsWith('/') ? item.path : `/${item.path}`"
        :alt="item.description ? item.description : `post image ${index}`"
        sizes="100vw sm:50vw md:400px"
        loading="lazy" />
      <lazy-images-description v-if="item?.description"
        class="w-full mt-2"
        v-model="item.description"
        :canEdit="canEdit" />        
    </div>
  </LazyUCarousel>
</template>