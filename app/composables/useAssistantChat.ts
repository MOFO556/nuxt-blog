import { createSharedComposable } from '@vueuse/core';
import { useChat } from '@ai-sdk/vue';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useAuthTokenCookie } from '~/utils/auth-cookie';
import {
  collectAwaitingProposalIds,
  scanAssistantProposals,
} from '~/utils/assistantToolParts';
import { useAssistantFormBridge } from '~/composables/useAssistantFormBridge';

function useAssistantChatImpl() {
  const store = useAssistantStore();
  const route = useRoute();
  const formBridge = useAssistantFormBridge();
  const tokenCookie = useAuthTokenCookie();
  const config = useRuntimeConfig();
  const input = ref('');

  const apiUrl = `${String(config.public.API_URL)}assistant/chat`.replace(/([^:]\/)\/+/g, '$1');

  const {
    messages,
    status,
    error,
    sendMessage: chatSend,
    stop,
    regenerate,
    clearError,
  } = useChat({
    transport: new DefaultChatTransport({
      api: apiUrl,
      headers: () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (tokenCookie.value)
          headers.Authorization = `Bearer ${tokenCookie.value}`;
        return headers;
      },
      prepareSendMessagesRequest: ({ 
        messages: nextMessages, 
        body, headers, credentials, api, id }) => ({
        body: {
          ...(body ?? {}),
          id,
          messages: nextMessages,
          threadId: store.activeThreadId,
          context: {
            path: route.fullPath,
            formOpen: Boolean(formBridge.value),
            postFormSnapshot: formBridge.value?.getSnapshot() ?? store.formSnapshot,
          },
        },
        headers,
        credentials,
        api,
      }),
      fetch: async (inputUrl, init) => {
        const response = await fetch(inputUrl, init);
        const threadHeader = response.headers.get('x-assistant-thread-id');
        if (threadHeader)
          store.setActiveThreadId(threadHeader);
        return response;
      },
    }),
    onFinish: ({ messages: finished }) => {
      applyProposals(finished);
    },
  });

  function applyProposals(list: UIMessage[]) {
    const found = scanAssistantProposals(list);
    const dismissed = new Set(store.dismissedProposalIds);
    store.pendingNavigation = found.navigation?.toolCallId
      && dismissed.has(found.navigation.toolCallId)
      ? null
      : found.navigation;
    store.pendingFormPatch = found.formPatch?.toolCallId
      && dismissed.has(found.formPatch.toolCallId)
      ? null
      : found.formPatch;
    const batchIds = found.imageBatch?.toolCallIds?.length
      ? found.imageBatch.toolCallIds
      : (found.imageBatch?.toolCallId ? [found.imageBatch.toolCallId] : []);
    const batchFullyDismissed = batchIds.length > 0
      && batchIds.every(id => dismissed.has(id));
    store.pendingImageBatch = found.imageBatch && !batchFullyDismissed
      ? found.imageBatch
      : null;
    store.pendingImages = found.images.filter(
      image => !image.toolCallId || !dismissed.has(image.toolCallId),
    );
  }

  watch(messages, (list) => applyProposals(list), { deep: true });

  watch(
    () => route.fullPath,
    (next, prev) => {
      if (prev && next !== prev)
        store.clearPendingProposals();
    },
  );

  async function sendMessage(text?: string) {
    const value = (text ?? input.value).trim();
    if (!value)
      return;
    input.value = '';
    store.clearPendingProposals();
    clearError();
    await chatSend({ text: value });
  }

  async function editUserMessage(messageId: string, text: string) {
    const value = text.trim();
    if (!value)
      return;
    const idx = messages.value.findIndex(m => m.id === messageId);
    const target = messages.value[idx];
    if (idx < 0 || !target || target.role !== 'user')
      return;

    store.clearPendingProposals();
    clearError();
    messages.value = messages.value.slice(0, idx);
    await chatSend({ text: value });
  }

  async function regenerateLast() {
    store.clearPendingProposals();
    clearError();
    await regenerate();
  }

  async function loadThread(threadId: string) {
    const { $api } = useNuxtApp();
    const detail = await $api.assistant.getThread(threadId);
    store.setActiveThreadId(detail.thread.id);
    const next: UIMessage[] = detail.messages.map(m => ({
      id: m.id,
      role: m.role,
      parts: m.parts,
    }));
    store.resetDismissedProposals();
    for (const id of collectAwaitingProposalIds(next))
      store.markProposalDismissed(id);
    messages.value = next;
    store.clearPendingProposals();
  }

  function resetChat() {
    store.setActiveThreadId(null);
    store.resetDismissedProposals();
    messages.value = [];
    store.clearPendingProposals();
  }

  return {
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
  };
}

export const useAssistantChat = createSharedComposable(useAssistantChatImpl);