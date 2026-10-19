<script setup lang="ts">
  const props = defineProps<{ tags: any[]; inline?: number }>();
  const inline = computed(() => props.inline ?? 2);
  const visible = computed(() => props.tags.slice(0, inline.value));
  const rest    = computed(() => props.tags.slice(inline.value));

  const open = ref(false);
  const root = ref<HTMLElement>();

  function onScroll() { open.value = false; }
  function onDocClick(e: MouseEvent) {
    if (!root.value?.contains(e.target as Node)) open.value = false;
  }
  onMounted(() => {
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('click', onDocClick);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('click', onDocClick);
  });
</script>

<template>
  <div v-if="tags.length" ref="root"
       class="relative inline-flex items-center gap-1 min-w-0 max-w-[30%]">
    <div class="flex gap-1 overflow-hidden flex-nowrap min-w-0 truncate">
      <LazyUBadge v-for="t in visible" :key="t.slug"
        class="no-text-selection truncate max-w-[10rem]"
        color="info" 
        variant="soft" 
        size="sm">
        {{ t.name }}
      </LazyUBadge>
    </div>

    <UButton v-if="rest.length"
      class="shrink-0"
      size="xs" 
      color="info" 
      variant="outline" @click.stop="open = !open">
      +{{ rest.length }}
    </UButton>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0 scale-95">
      <div v-if="open"
        class="absolute top-full right-0 mt-2 z-30 p-2 rounded-lg
               bg-default ring ring-default shadow-lg
               flex flex-wrap gap-1 max-w-xs">
        <LazyUBadge v-for="t in tags" :key="t.slug" 
          color="neutral" 
          variant="soft" 
          size="sm">
          {{ t.name }}
        </LazyUBadge>
      </div>
    </Transition>
  </div>
</template>