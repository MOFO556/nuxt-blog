<script setup lang="ts">
  const props = defineProps<{
    postId: number;
    backPath: string;
    basePath: string;
    showEdit?: boolean;
  }>();

  const { nextPostId, prevPostId } = usePostsStore();
  const nextId = computed(() => nextPostId(props.postId));
  const prevId = computed(() => prevPostId(props.postId));
</script>

<template>
  <nav class="mt-4 flex items-center justify-center gap-2">
    <ULink class="flex gap-0.5 items-center w-fit" :to="`${backPath}`">
      <UIcon name="i-lucide-arrow-left-from-line" size="15" />
      Back to list
    </ULink>
    <template v-if="!(nextId === 0 && prevId === 0)"> | 
      <ULink v-if="prevId !== 0" class="flex gap-0.5 items-center w-fit" :to="`${basePath}/${prevId}`">
        <UIcon name="i-lucide-move-left" size="15" />
        Prev post
      </ULink> | 
      <ULink v-if="nextId !== 0" class="flex gap-0.5 items-center w-fit" :to="`${basePath}/${nextId}`">
        <UIcon name="i-lucide-move-right" size="15" />
        Next post
      </ULink>
    </template>
      <template v-if="showEdit"> | 
        <ULink class="flex gap-0.5 items-center w-fit" 
          :to="{ name: 'office-posts-id-edit', params: { id: postId }}">
          <UIcon name="i-lucide-file-pen-line" size="15" />
          Edit
        </ULink>
      </template>
  </nav>
</template>