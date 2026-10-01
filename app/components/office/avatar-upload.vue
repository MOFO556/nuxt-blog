<script setup lang="ts">
  const { editable } = defineProps<{ editable?: boolean }>();
  const { previewUrl, hasNewAvatar, form, isDefaultPicture } = useProfileEdit();
  const fileInput = ref<HTMLInputElement | null>(null);

  function pick() {
    if (!editable) 
      return;
    fileInput.value?.click()
  };

  function onChange(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) form.value.avatar = file
    input.value = ''
  };

  const provider = computed(() =>
    isDefaultPicture
      ? 'none'
      : 'ipx',
  );
</script>

<template>
  <div class="relative shrink-0">
    <LazyUAvatar :src="previewUrl"
      :provider="provider"
      :ui="{ root: 'size-40 md:size-75' }"
      alt="avatar"/>
    
    <UButton v-if="editable"
      class="absolute bottom-5 right-5 rounded-full"
      icon="i-lucide-camera"
      variant="outline"
      color="neutral"
      size="lg"
      aria-label="Upload new avatar"
      @click="pick"/>

    <UTooltip v-if="isDefaultPicture && !hasNewAvatar" class="absolute top-3 right-5 cursor-help" text="No avatar loaded">
      <UBadge class="rounded-full" color="primary" variant="soft" icon="i-lucide-asterisk" size="lg"/>
    </UTooltip>
    <UTooltip v-if="hasNewAvatar" class="absolute top-3 right-5 cursor-help" text="Avatar unsaved">
      <UBadge class="rounded-full" color="warning" variant="soft" icon="i-lucide-asterisk" size="lg"/>
    </UTooltip>

    <input ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onChange"/>
  </div>
</template>