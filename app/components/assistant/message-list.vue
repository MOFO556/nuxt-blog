<script setup lang="ts">
  import {
    getToolName,
    isTextUIPart,
    isToolUIPart,
    type ChatStatus,
    type UIMessage,
  } from 'ai';
  import { assistantToolLabel } from '~/utils/assistantToolLabels';

  const props = defineProps<{
    messages: UIMessage[];
    status: ChatStatus;
  }>();

  const emit = defineEmits<{
    edit: [messageId: string, text: string];
    regenerate: [];
  }>();

  const messagesUi = {
    root: 'w-full flex flex-col gap-2 flex-1 px-0 [&>article]:last-of-type:min-h-0',
  };

  const editingId = ref<string | null>(null);
  const draft = ref('');

  function messageText(message: UIMessage): string {
    return (message.parts ?? [])
      .filter(isTextUIPart)
      .map(part => part.text)
      .join('\n')
      .trim();
  }

  function startEdit(message: UIMessage) {
    if (message.role !== 'user'
      || props.status === 'streaming'
      || props.status === 'submitted')
      return;
    editingId.value = message.id;
    draft.value = messageText(message);
  }

  function cancelEdit() {
    editingId.value = null;
    draft.value = '';
  }

  function saveEdit() {
    const id = editingId.value;
    const text = draft.value.trim();
    if (!id || !text)
      return;
    editingId.value = null;
    draft.value = '';
    emit('edit', id, text);
  }

  function toolLabel(part: UIMessage['parts'][number]): string {
    if (!isToolUIPart(part))
      return 'Working…';
    return assistantToolLabel(getToolName(part));
  }

  function toolLoading(part: UIMessage['parts'][number]): boolean {
    if (!isToolUIPart(part))
      return false;
    const state = 'state' in part ? String(part.state) : '';
    return state === 'input-streaming'
      || state === 'input-available'
      || state === 'partial-call';
  }

  function messageHasLoadingTool(message: UIMessage): boolean {
    return (message.parts ?? []).some(part => toolLoading(part));
  }

  function lastToolPartIndex(message: UIMessage): number {
    let last = -1;
    for (let i = 0; i < (message.parts ?? []).length; i++) {
      const part = message.parts[i];
      if (part && isToolUIPart(part))
        last = i;
    }
    return last;
  }

  const lastAssistantId = computed(() => {
    for (let i = props.messages.length - 1; i >= 0; i--) {
      const message = props.messages[i];
      if (message?.role === 'assistant')
        return message.id;
    }
    return null;
  });

  const lastMessageId = computed(() =>
    props.messages[props.messages.length - 1]?.id ?? null,
  );

  const canRegenerate = computed(() =>
    Boolean(lastAssistantId.value)
      && props.status !== 'streaming'
      && props.status !== 'submitted',
  );

  const showBusy = computed(() =>
    props.status === 'submitted' || props.status === 'streaming',
  );

  const showTrailingBusy = computed(() => {
    if (!showBusy.value || !lastMessageId.value)
      return false;
    const message = props.messages.find(m => m.id === lastMessageId.value);
    if (!message)
      return false;
    return !messageHasLoadingTool(message);
  });

  const busyLabel = computed(() =>
    props.status === 'submitted'
      ? 'Sending…'
      : 'Waiting…',
  );
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <UChatMessages class="min-h-0 flex-1"
      :messages="messages"
      :status="status"
      :should-auto-scroll="true"
      :should-scroll-to-bottom="false"
      :ui="messagesUi">
      <template #content="{ message }">
        <div v-if="editingId === message.id" class="flex w-full flex-col gap-2">
          <UTextarea class="w-full"
            v-model="draft"
            :rows="3"
            autoresize
            @keydown.ctrl.enter.prevent="saveEdit"/>
          <div class="flex justify-end gap-2">
            <UButton size="xs" color="neutral" variant="ghost" @click="cancelEdit">
              Cancel
            </UButton>
            <UButton size="xs" :disabled="!draft.trim()" @click="saveEdit">
              Save &amp; resend
            </UButton>
          </div>
        </div>
        <template v-else>
          <template v-for="(part, index) in message.parts" :key="index">
            <div v-if="isTextUIPart(part)"
              class="whitespace-pre-wrap text-sm leading-relaxed">
              {{ part.text }}
            </div>
            <LazyUChatTool v-else-if="isToolUIPart(part)"
              class="text-muted"
              :text="toolLoading(part) && showBusy && index === lastToolPartIndex(message)
                ? `${toolLabel(part)} · ${busyLabel}`
                : toolLabel(part)"
              :loading="toolLoading(part)"/>
          </template>
          <LazyUChatTool v-if="message.id === lastMessageId && showTrailingBusy"
            class="text-muted"
            :text="busyLabel"
            :loading="true"/>
        </template>
      </template>

      <template #actions="{ message }">
        <UButton v-if="message.role === 'user' && editingId !== message.id"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-pencil"
          aria-label="Edit message"
          :disabled="status === 'streaming' || status === 'submitted'"
          @click="startEdit(message)"/>
        <UButton v-else-if="message.role === 'assistant'
          && message.id === lastAssistantId
          && canRegenerate"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          aria-label="Regenerate reply"
          @click="emit('regenerate')"/>
      </template>
    </UChatMessages>
  </div>
</template>