<script setup lang="ts">
  const { openChat } = useAssistantOverlay();
  const rootEl = ref<HTMLElement | null>(null);
  const canvasEl = ref<HTMLCanvasElement | null>(null);
  const { cue, cueStyle, cueBelow } = useMascotStage({ rootEl, canvasEl });
</script>

<template>
  <div ref="rootEl" class="h-full w-full overflow-x-clip">
    <canvas ref="canvasEl"
      class="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"/>
    <div class="pointer-events-none absolute inset-0">
      <mascot-cue v-if="cue"
        class="pointer-events-auto absolute"
        :style="cueStyle"
        :cue="cue"
        :below="cueBelow"
        @talk="openChat"/>
    </div>
  </div>
</template>