<script setup lang="ts">
  import type { GuideCue } from '~/types/mascot';
  import { GuideAction } from '~/types/mascot.enum';

  defineProps<{
    cue: GuideCue,
    below?: boolean,
  }>();

  const emit = defineEmits<{
    talk: [],
  }>();
</script>

<template>
  <div data-mascot-cue
    class="z-10 w-56 -translate-x-1/2 rounded-lg border border-default bg-default p-3 text-sm shadow-lg"
    :class="below ? 'translate-y-2' : '-translate-y-[120%]'">
    <p>{{ cue.text }}</p>
    <UButton v-if="cue.action === GuideAction.openAssistant"
      class="mt-2"
      size="xs"
      @click="emit('talk')">
      Talk
    </UButton>
  </div>
</template>