import type { Ref } from 'vue';
import type { GuideCue } from '~/types/mascot';
import { startMascotStage } from '~/utils/mascot/stage';

export function useMascotStage(input: {
  rootEl: Ref<HTMLElement | null>,
  canvasEl: Ref<HTMLCanvasElement | null>,
}) {
  const { theme } = useMascotTheme();
  const cue = ref<GuideCue | null>(null);
  const cueLeft = ref(0);
  const cueTop = ref(0);
  const cueBelow = ref(false);
  const cueStyle = computed(() => ({
    left: `${cueLeft.value}px`,
    top: `${cueTop.value}px`,
  }));

  let stopStage = () => {};
  let alive = true;
  onBeforeUnmount(() => {
    alive = false;
    stopStage();
  });
  onMounted(() => {
    nextTick(() => {
      const root = input.rootEl.value;
      const canvas = input.canvasEl.value;
      if (!alive || !root || !canvas)
        return;
      stopStage = startMascotStage({
        root,
        canvas,
        theme: () => theme.value,
        watchTheme: apply => watch(theme, value => apply(value)),
        setCue: (value) => {
          cue.value = value;
        },
        setCueAnchor: (left, top, below) => {
          cueLeft.value = left;
          cueTop.value = top;
          cueBelow.value = below;
        },
      });
    });
  });

  return { cue, cueStyle, cueBelow };
}