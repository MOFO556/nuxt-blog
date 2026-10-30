<script setup lang="ts">
  import type { PostImageMeta } from '~/types/posts';
  import { parseFormattedBody } from '~~/shared/utils/parseFormattedBody';

  const props = defineProps<{
    contentHtml: string;
    attachments: PostImageMeta[];
    canEdit?: boolean;
    postId?: number;
  }>();

  type BodyPart =
    | { type: 'html'; html: string }
    | { type: 'carousel'; items: PostImageMeta[] };

  const parts = computed((): BodyPart[] => {
    const source = props.attachments ?? [];
    const parsed = parseFormattedBody(
      props.contentHtml,
      source
        .filter((a): a is PostImageMeta & { id: number | string; path: string } =>
          (typeof a.id === 'number' || typeof a.id === 'string')
          && typeof a.path === 'string')
        .map(a => ({
          id: a.id,
          path: a.path,
          name: a.name,
          postCover: a.postCover,
          description: a.description ?? undefined,
        })),
    );

    return parsed.map((part): BodyPart => {
      if (part.type === 'html')
        return part;

      const items = part.items
        .map(item => source.find(a => a.id === item.id || String(a.id) === String(item.id)))
        .filter((a): a is PostImageMeta => a !== undefined);

      return { type: 'carousel', items };
    });
  });
</script>

<template>
  <div class="formatted-body prose dark:prose-invert max-w-none mt-4 space-y-4">
    <template v-for="(part, index) in parts" :key="index">
      <div v-if="part.type === 'html' && part.html.trim()" v-html="part.html" />
      <posts-attachments v-else-if="part.type === 'carousel' && part.items.length"
        :attachments="part.items"
        :allAttachments="attachments"
        :canEdit="!!canEdit"
        :postId="postId"/>
      <p v-else-if="part.type === 'carousel'"
        class="text-muted text-sm italic">
        Carousel images unavailable
      </p>
    </template>
  </div>
</template>