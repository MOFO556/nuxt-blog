<script setup lang="ts">
const {title = '', showTitle = true, description = 'Are you sure to continue?', 
    declineButton = 'Cancel', acceptButton = 'OK'
} = defineProps<{
  title?: string,
  showTitle?: boolean,
  description?: string,
  declineButton?: string,
  acceptButton?: string
}>()

const emit = defineEmits<{ close: [boolean] }>()
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }"
    :title="showTitle ? title : ''"
    :ui="{
      header: 'border-none p-2 sm:px-4 min-h-0',
      close: 'p-0 sm:px-0 top-2',
      body: 'border-none p-2 sm:p-4',
      footer: 'items-center justify-end p-2 sm:p-4'
    }">
    <template #body v-if="description">
      {{ description }}
    </template>
    <template #footer>
      <div class="flex gap-2 w-full items-center justify-end">
        <UButton color="neutral" :label="declineButton" @click="emit('close', false)" />
        <UButton :label="acceptButton" @click="emit('close', true)" />
      </div>
    </template>
  </UModal>
</template>