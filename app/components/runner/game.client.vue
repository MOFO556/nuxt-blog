<script setup lang="ts">
  const rootEl = ref<HTMLElement | null>(null);
  const canvasEl = ref<HTMLCanvasElement | null>(null);
  const actorEl = ref<HTMLCanvasElement | null>(null);
  const {
    score,
    best,
    dead,
    paused,
    restart,
  } = useRunnerGame({ rootEl, canvasEl, actorEl });
</script>

<template>
  <div ref="rootEl" class="flex flex-col gap-3">
    <p class="text-sm">
      Score {{ score }} · Best {{ best }}
    </p>
    <div class="relative h-[min(70vh,28rem)] w-full overflow-hidden rounded-xl border border-default">
      <canvas ref="canvasEl" class="h-full w-full touch-none"/>
      <canvas ref="actorEl"
        class="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"/>
      <UButton v-if="!dead && !paused"
        class="absolute right-2 top-2 z-10"
        color="neutral"
        variant="soft"
        icon="i-lucide-pause"
        aria-label="Pause"
        @pointerdown.stop
        @click="paused = true"/>
      <div v-if="dead"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-default/80">
        <p class="text-lg font-medium">Score {{ score }}</p>
        <p class="text-sm text-muted">Best {{ best }}</p>
        <UButton @click="restart">Again</UButton>
      </div>
      <div v-else-if="paused"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-default/80">
        <p class="text-lg font-medium">Paused</p>
        <UButton @click="paused = false">Resume</UButton>
      </div>
    </div>
    <p class="text-xs text-muted">
      Space or the top half to jump. Down arrow or the bottom half to duck. Pause with the button, P, or Escape.
    </p>
  </div>
</template>
