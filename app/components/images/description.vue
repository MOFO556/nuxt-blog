<script setup lang="ts">
  const description = defineModel<string>();
  const { canEdit = false } = defineProps<{ canEdit: boolean }>()
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
    readMode.value = true;
    emit('editStopped', description.value);
  };
</script>

<template>
  <div v-if="readMode"
    class="md:text-sm x-2.5 py-1.5 text-base/5"
    @dblclick.prevent="onEnterEditMode">
    {{ description || 'Enter image description...'}}
  </div>
  <UInput v-else ref="inputRef"
    class="w-full"
    v-model="description"
    placeholder="Enter image description..."
    @keydown.ctrl.enter="onEditModeFinish">
  </UInput>
</template>