<script setup lang="ts">
  useHead({
    title: 'Public blog',
    meta: [
      { name: 'description', content: 'Public blog posts' },
    ]
  });
  const route = useRoute();
  const { loggedIn } = useUserStore();
  const { filtersOpen } = useAssistantOverlay();

  const filterParams = computed(() => {
    const { page: _page, ...rest } = route.query;
    return rest;
  });

  const activeCount = computed(
    () => Object.values(filterParams.value).filter(Boolean).length,
  );
</script>

<template>
  <nav class="my-2 px-4">
    <UButton icon="i-lucide-sliders-horizontal"
      color="neutral"
      variant="outline"
      @click="filtersOpen = true">
      Filters
      <LazyUBadge v-if="activeCount" color="primary" variant="solid" size="xs">
        {{ activeCount }}
      </LazyUBadge>
    </UButton>
    <ClientOnly>
      <UButton v-if="loggedIn"
        class="ml-2"
        to="/office/posts/create"
        icon="i-lucide-file-plus"
        variant="outline">Create</UButton>
    </ClientOnly>
  </nav>

  <posts-list :params="filterParams" />
  <posts-filters-drawer v-model:open="filtersOpen" />
</template>