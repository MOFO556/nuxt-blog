import type { Ref } from 'vue';
import { startRunnerGame } from '~/utils/runner/game';

export function useRunnerGame(input: {
  rootEl: Ref<HTMLElement | null>,
  canvasEl: Ref<HTMLCanvasElement | null>,
  actorEl: Ref<HTMLCanvasElement | null>,
}) {
  const { theme } = useMascotTheme();
  const score = ref(0);
  const best = ref(0);
  const dead = ref(false);
  const paused = ref(false);

  let restartGame = () => {};
  let stopGame = () => {};
  let alive = true;
  onBeforeUnmount(() => {
    alive = false;
    stopGame();
  });
  onMounted(() => {
    nextTick(() => {
      const root = input.rootEl.value;
      const canvas = input.canvasEl.value;
      const actorCanvas = input.actorEl.value;
      if (!alive || !root || !canvas || !actorCanvas)
        return;
      const game = startRunnerGame({
        root,
        canvas,
        actorCanvas,
        theme: () => theme.value,
        watchTheme: apply => watch(theme, value => apply(value)),
        setScore: (value) => {
          score.value = value;
        },
        setBest: (value) => {
          best.value = value;
        },
        setDead: (value) => {
          dead.value = value;
        },
        setPaused: (value) => {
          paused.value = value;
        },
        readPaused: () => paused.value,
        readDead: () => dead.value,
      });
      restartGame = game.restart;
      stopGame = game.stop;
    });
  });

  function restart() {
    restartGame();
  }

  return { score, best, dead, paused, restart };
}
