<script setup lang="ts">
const { toggleChat, chatOpen } = useAssistantOverlay();
const { theme } = useMascotTheme();
const btnBackgrouns = computed(() => (theme.value === 'dark' ? 'bg-violet-700' : 'bg-orange-500'))
</script>

<template>
  <ClientOnly>
    <span class="fixed bottom-4 right-4 z-40 inline-flex" data-mascot-hotspot="assistant">
    <UButton class="size-11 overflow-hidden rounded-full p-0 shadow-lg" 
      :class="[`${btnBackgrouns}`, 
        `hover:${btnBackgrouns} hover:opacity-60 hover:cursor-pointer`, 
        `active:${btnBackgrouns} active:opacity-70`
      ]"
      size="md"
      color="primary"
      :aria-label="chatOpen ? 'Close assistant' : 'Open assistant'"
      @click="toggleChat">
      <mascot-portrait class="size-11"/>
    </UButton>
    </span>
  </ClientOnly>
</template>