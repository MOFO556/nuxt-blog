<script setup lang="ts">
  import type { PostImageMeta } from '~/types/posts';
  import { parseFormattedBody } from '~~/shared/utils/parseFormattedBody';

  const props = defineProps<{
    contentHtml: string;
    attachments: PostImageMeta[];
    canEdit?: boolean;
  }>();

  const parts = computed(() =>
    parseFormattedBody(
      props.contentHtml,
      (props.attachments ?? [])
        .filter((a): a is PostImageMeta & { id: number; path: string } =>
          typeof a.id === 'number' && typeof a.path === 'string')
        .map(a => ({
          id: a.id,
          path: a.path,
          name: a.name,
          postCover: a.postCover,
          description: a.description ?? undefined,
        })),
    ),
  );

  function toPostImages(items: { id: number; path: string; name?: string; postCover?: boolean; description?: string }[]): PostImageMeta[] {
    return items.map(i => ({
      id: i.id,
      path: i.path,
      name: i.name,
      postCover: i.postCover,
      description: i.description,
    }));
  }
</script>

<template>
  <div class="formatted-body prose dark:prose-invert max-w-none mt-4 space-y-4">
    <template v-for="(part, index) in parts" :key="index">
      <div v-if="part.type === 'html' && part.html.trim()" v-html="part.html" />
      <posts-attachments v-else-if="part.type === 'carousel' && part.items.length"
        :attachments="toPostImages(part.items)"
        :can-edit="!!canEdit"/>
      <p v-else-if="part.type === 'carousel'"
        class="text-muted text-sm italic">
        Carousel images unavailable
      </p>
    </template>
  </div>
</template>