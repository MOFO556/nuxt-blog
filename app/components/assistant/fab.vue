<script setup lang="ts">
  const { toggleChat, chatOpen } = useAssistantOverlay();
</script>

<template>
  <ClientOnly>
    <UButton class="fixed bottom-4 right-4 z-40 shadow-lg"
      :icon="chatOpen ? 'i-lucide-x' : 'i-lucide-bot-message-square'"
      size="md"
      color="primary"
      :aria-label="chatOpen ? 'Close assistant' : 'Open assistant'"
      @click="toggleChat"/>
  </ClientOnly>
</template>