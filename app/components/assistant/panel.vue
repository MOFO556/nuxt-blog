<script setup lang="ts">
  import type {
    AssistantThreadOption,
    AssistantThreadSummary,
  } from '~/types/assistant';

  const props = withDefaults(defineProps<{
    docked?: boolean;
  }>(), { docked: false });

  const { chatOpen } = useAssistantOverlay();
  const store = useAssistantStore();
  const userStore = useUserStore();
  const {
    messages,
    status,
    error,
    input,
    sendMessage,
    editUserMessage,
    regenerateLast,
    stop,
    loadThread,
    resetChat,
  } = useAssistantChat();
  const { $api } = useNuxtApp();

  const threads = ref<AssistantThreadSummary[]>([]);
  const selectedThread = ref<AssistantThreadOption | undefined>();

  const threadOptions = computed<AssistantThreadOption[]>(() =>
    threads.value.map(t => ({ label: t.title, value: t.id })),
  );

  async function refreshThreads() {
    if (!userStore.loggedIn)
      return;
    try {
      threads.value = await $api.assistant.listThreads();
    }
    catch {
      threads.value = [];
    }
  }

  watch(chatOpen, (open) => {
    if (open)
      refreshThreads();
  });

  watch(() => props.docked, (docked) => {
    if (docked)
      refreshThreads();
  }, { immediate: true });

  async function onNewChat() {
    resetChat();
    selectedThread.value = undefined;
    if (userStore.loggedIn) {
      const thread = await $api.assistant.createThread();
      store.setActiveThreadId(thread.id);
      await refreshThreads();
    }
  }

  async function onSelectThread(option: AssistantThreadOption | undefined | null) {
    selectedThread.value = option ?? undefined;
    if (!option)
      return;
    store.clearPendingProposals();
    await loadThread(option.value);
  }

  async function onDeleteThread(id: string) {
    await $api.assistant.deleteThread(id);
    if (store.activeThreadId === id)
      resetChat();
    selectedThread.value = undefined;
    await refreshThreads();
  }

  async function onSubmit() {
    store.clearPendingProposals();
    await sendMessage();
    await refreshThreads();
  }

  async function onEditMessage(messageId: string, text: string) {
    await editUserMessage(messageId, text);
    await refreshThreads();
  }

  async function onRegenerate() {
    await regenerateLast();
    await refreshThreads();
  }
</script>

<template>
  <ClientOnly v-if="!docked">
    <div v-show="chatOpen"
      class="fixed bottom-15 right-4 z-40 flex 
        h-[min(70vh,36rem)] w-[min(100vw-2rem,24rem)] 
        flex-col overflow-hidden rounded-xl 
        border border-default bg-default shadow-xl">
      <div class="shrink-0 flex items-center justify-between 
        border-b border-default px-3 py-2">
        <p class="text-sm font-medium">Blog assistant</p>
        <UButton size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          aria-label="Close assistant"
          @click="chatOpen = false"/>
      </div>

      <div v-if="userStore.loggedIn" 
        class="shrink-0 flex items-center gap-2 border-b border-default px-3 py-2">
        <UButton size="xs"
          class="shrink-0"
          variant="soft" icon="i-lucide-plus" 
          @click="onNewChat">
          New
        </UButton>
        <LazyUSelectMenu v-if="threadOptions.length"
          class="min-w-0 flex-1"
          v-model="selectedThread"
          :items="threadOptions"
          placeholder="History"
          @update:model-value="onSelectThread"/>
        <UButton v-if="store.activeThreadId"
          class="shrink-0"
          size="xs"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="store.activeThreadId && onDeleteThread(store.activeThreadId)"/>
      </div>

      <UChatPalette class="min-h-0 flex-1">
        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <assistant-message-list
            :messages="messages"
            :status="status"
            @edit="onEditMessage"
            @regenerate="onRegenerate"/>
        </div>

        <template #prompt>
          <div class="shrink-0 relative z-10 bg-default">
            <assistant-proposals/>
            <div class="p-2">
              <UChatPrompt v-model="input"
                :error="error"
                @submit="onSubmit">
                <UChatPromptSubmit :status="status"
                  @stop="stop"
                  @reload="onRegenerate"/>
              </UChatPrompt>
            </div>
          </div>
        </template>
      </UChatPalette>
    </div>
  </ClientOnly>

  <div v-else
    class="flex h-full min-h-0 w-full flex-col 
      overflow-hidden rounded-lg border border-default bg-default">
    <div class="shrink-0 flex items-center justify-between border-b border-default px-3 py-2">
      <p class="text-sm font-medium">Blog assistant</p>
      <div class="flex gap-1">
        <UButton size="xs" variant="ghost" icon="i-lucide-plus" @click="onNewChat"/>
        <UButton v-if="store.activeThreadId && userStore.loggedIn"
          size="xs"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="store.activeThreadId && onDeleteThread(store.activeThreadId)"/>
      </div>
    </div>

    <div v-if="userStore.loggedIn && threadOptions.length" class="shrink-0 border-b border-default px-3 py-2">
      <LazyUSelectMenu v-model="selectedThread"
        :items="threadOptions"
        placeholder="History"
        class="w-full"
        @update:model-value="onSelectThread"/>
    </div>

    <UChatPalette class="min-h-0 flex-1">
      <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <assistant-message-list :messages="messages"
          :status="status"
          @edit="onEditMessage"
          @regenerate="onRegenerate"/>
      </div>

      <template #prompt>
        <div class="shrink-0 relative z-10 bg-default">
          <assistant-proposals/>
          <div class="p-2">
            <UChatPrompt v-model="input"
              :error="error"
              @submit="onSubmit">
              <UChatPromptSubmit :status="status"
                @stop="stop"
                @reload="onRegenerate"/>
            </UChatPrompt>
          </div>
        </div>
      </template>
    </UChatPalette>
  </div>
</template>