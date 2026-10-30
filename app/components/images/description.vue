<script setup lang="ts">
  const description = defineModel<string | undefined>();
  const { canEdit: canEdit = false } = defineProps<{ canEdit: boolean }>();

  const draft = ref(description.value ?? '');
  const readMode = ref(!canEdit || !!description.value);
  const inputRef = useTemplateRef('inputRef');
  const emit = defineEmits(['editStopped']);
  const onEnterEditMode = () => {
    if (!canEdit)
      return;
    readMode.value = false;
    nextTick(() => inputRef.value?.inputRef?.focus());
  };

  const onEditModeFinish = () => {
    if (readMode.value)
      return;
    const native = inputRef.value?.inputRef?.value;
    const value = native ?? draft.value;
    draft.value = value;
    description.value = value;
    readMode.value = true;
    emit('editStopped', value);
  };
</script>

<template>
  <div v-if="readMode"
    class="md:text-sm x-2.5 py-1.5 text-base/5"
    @dblclick.prevent="onEnterEditMode">
    {{ draft || description || 'Enter image description...'}}
  </div>
  <UInput v-else ref="inputRef"
    class="w-full"
    v-model="draft"
    placeholder="Enter image description..."
    @keydown.ctrl.enter="onEditModeFinish">
  </UInput>
</template>