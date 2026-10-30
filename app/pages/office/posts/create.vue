<script setup lang="ts">
  definePageMeta({
    assistantDocked: true,
  });

  useHead({
    title: 'Blog post creation',
    meta: [
      { name: 'description', content: 'Create your blog post' },
    ]
  });
</script>

<template>
  <div class="flex min-h-[calc(100dvh-4.5rem)] flex-col gap-4 
    px-3 py-4 sm:px-4 lg:flex-row lg:items-stretch lg:px-6">
    <div class="min-w-0 flex-1">
      <posts-form wide/>
    </div>
    <aside class="flex w-full shrink-0 flex-col 
      lg:sticky lg:top-16 lg:h-[calc(100dvh-5rem)] lg:w-[22rem] xl:w-96">
      <assistant-panel docked class="h-full min-h-[24rem] lg:min-h-0"/>
    </aside>
  </div>
</template>
