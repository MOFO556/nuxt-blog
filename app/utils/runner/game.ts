import * as THREE from 'three';
import type { PropTemplate, RunnerActor, RunnerState } from '~/types/runner';
import type { MascotTheme } from '~/types/mascot.enum';
import { KeyboardCode, ObstacleKind, RunnerPhase } from '~/types/runner.enum';
import { runnerPalette, sceneColor } from '~/utils/dictionary/color';
import { createMascotLoader, createToonGradient, prepareMascot } from '~/utils/mascot/model';
import { disposeRunnerActor, placeRunnerActor, playRunnerPose } from '~/utils/runner/actor';
import { readBest, writeBest } from '~/utils/runner/best';
import { isTypingTarget } from '~/utils/runner/input';
import { RUNNER_ACTOR_HEIGHT, RUNNER_GROUND_RATIO, RUNNER_KUNAI_DROP, RUNNER_PLAYER_SCREEN_X, runnerPixelRatio } from '~/utils/runner/layout';
import { paintCourse } from '~/utils/runner/paint';
import { runnerPose } from '~/utils/runner/pose';
import { loadProp, placeProp } from '~/utils/runner/prop';
import { createRunner, nextBest, runnerScore, stepRunner } from '~/utils/runner/step';
import { disposeObject3D } from '~/utils/three/dispose';

export type RunnerGameInput = {
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  actorCanvas: HTMLCanvasElement,
  theme: () => MascotTheme,
  watchTheme: (apply: (value: MascotTheme) => void) => () => void,
  setScore: (value: number) => void,
  setBest: (value: number) => void,
  setDead: (value: boolean) => void,
  setPaused: (value: boolean) => void,
  readPaused: () => boolean,
  readDead: () => boolean,
};

export type RunnerGameHandle = {
  stop: () => void,
  restart: () => void,
};

type RunnerHost = {
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  theme: () => MascotTheme,
  setScore: (value: number) => void,
  setBest: (value: number) => void,
  setDead: (value: boolean) => void,
  setPaused: (value: boolean) => void,
  readPaused: () => boolean,
  readDead: () => boolean,
  gradient: THREE.DataTexture,
  loader: ReturnType<typeof createMascotLoader>,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.OrthographicCamera,
  holder: THREE.Group,
  state: RunnerState,
  raf: number,
  last: number,
  held: { duck: boolean },
  edge: { jump: boolean },
  disposed: boolean,
  actor: RunnerActor | null,
  actorToken: number,
  actorCache: Map<MascotTheme, RunnerActor>,
  props: Map<number, THREE.Group>,
  stoneTemplate: PropTemplate | null,
  kunaiTemplate: PropTemplate | null,
  best: number,
};

function syncProps(host: RunnerHost, viewW: number, viewH: number) {
  const live = new Set(host.state.obstacles.map(obstacle => obstacle.id));
  for (const [id, group] of host.props) {
    if (live.has(id))
      continue;
    host.scene.remove(group);
    host.props.delete(id);
  }
  const ground = viewH * RUNNER_GROUND_RATIO;
  for (const obstacle of host.state.obstacles) {
    const template = obstacle.kind === ObstacleKind.air ? host.kunaiTemplate : host.stoneTemplate;
    if (!template)
      continue;
    let group = host.props.get(obstacle.id);
    if (!group) {
      group = template.group.clone(true);
      host.scene.add(group);
      host.props.set(obstacle.id, group);
    }
    const air = obstacle.kind === ObstacleKind.air;
    placeProp(
      group,
      template.box,
      RUNNER_PLAYER_SCREEN_X + (obstacle.x - 40),
      ground - obstacle.y + (air ? RUNNER_KUNAI_DROP : 0),
      obstacle.width,
      obstacle.height,
      viewW,
      viewH,
      air ? 72 : 96,
      obstacle.kind === ObstacleKind.ground ? 150 : 0,
    );
  }
}

function restart(host: RunnerHost) {
  host.state = createRunner((Date.now() >>> 0) || 1);
  host.setDead(false);
  host.setScore(0);
  host.setPaused(false);
  if (host.actor)
    host.actor.pose = '';
}

function showActor(host: RunnerHost, next: RunnerActor) {
  if (host.actor && host.actor !== next)
    host.holder.remove(host.actor.group);
  next.mixer.stopAllAction();
  next.pose = '';
  host.actor = next;
  if (next.group.parent !== host.holder)
    host.holder.add(next.group);
  placeRunnerActor(next, RUNNER_ACTOR_HEIGHT);
  playRunnerPose(next, runnerPose(false, false, new Set(next.clips.keys())));
}

async function loadActor(host: RunnerHost, value: MascotTheme) {
  const current = ++host.actorToken;
  const cached = host.actorCache.get(value);
  if (cached) {
    if (!host.disposed && current === host.actorToken)
      showActor(host, cached);
    return;
  }
  try {
    const response = await fetch(`/mascot/${value}.glb`);
    if (!response.ok)
      throw new Error('missing model');
    const buffer = await response.arrayBuffer();
    const prepared = await new Promise<ReturnType<typeof prepareMascot> | null>((resolve) => {
      host.loader.parse(
        buffer,
        '',
        gltf => resolve(prepareMascot(gltf, value, host.gradient)),
        () => resolve(null),
      );
    });
    if (!prepared || host.disposed || current !== host.actorToken) {
      if (prepared)
        disposeObject3D(prepared.group);
      return;
    }
    const next: RunnerActor = {
      theme: value,
      group: prepared.group,
      mixer: new THREE.AnimationMixer(prepared.group),
      clips: new Map(prepared.clips.map(clip => [clip.name, clip])),
      fit: prepared.fit,
      pose: '',
    };
    host.actorCache.set(value, next);
    showActor(host, next);
  }
  catch {
    if (!host.disposed && current === host.actorToken && host.actor?.theme === value) {
      host.holder.remove(host.actor.group);
      host.actor = null;
    }
  }
}

function resize(host: RunnerHost) {
  const parent = host.canvas.parentElement;
  if (!parent)
    return;
  const dpr = runnerPixelRatio();
  host.canvas.width = Math.max(1, Math.floor(parent.clientWidth * dpr));
  host.canvas.height = Math.max(1, Math.floor(parent.clientHeight * dpr));
  const width = parent.clientWidth;
  const height = parent.clientHeight;
  host.renderer.setPixelRatio(dpr);
  host.renderer.setSize(width, height, false);
  host.camera.left = -width / 2;
  host.camera.right = width / 2;
  host.camera.top = height / 2;
  host.camera.bottom = -height / 2;
  host.camera.updateProjectionMatrix();
}

function draw(host: RunnerHost) {
  const ctx = host.canvas.getContext('2d');
  if (!ctx)
    return;
  const dpr = runnerPixelRatio();
  paintCourse({
    ctx,
    dpr,
    width: host.canvas.width / dpr,
    height: host.canvas.height / dpr,
    paint: runnerPalette[host.theme()],
    obstacles: host.state.obstacles,
    stonesReady: host.stoneTemplate !== null,
    kunaiReady: host.kunaiTemplate !== null,
    playerY: host.state.playerY,
    ducking: host.state.ducking,
    drawBody: !host.actor,
  });
}

function placeActor(host: RunnerHost, width: number, height: number, dt: number) {
  syncProps(host, width, height);
  const actor = host.actor;
  if (actor) {
    const ground = height * RUNNER_GROUND_RATIO;
    const feet = ground - host.state.playerY;
    host.holder.position.set(RUNNER_PLAYER_SCREEN_X - width / 2, height / 2 - feet, 0);
    const groundedDuck = host.state.ducking && host.state.playerY <= 2;
    const clips = new Set(actor.clips.keys());
    playRunnerPose(actor, runnerPose(host.state.playerY > 2, groundedDuck, clips));
    actor.mixer.update(dt);
  }
  host.renderer.render(host.scene, host.camera);
}

function onKeyDown(host: RunnerHost, event: KeyboardEvent) {
  if (isTypingTarget(event.target))
    return;
  if (event.code === KeyboardCode.pause || event.code === KeyboardCode.escape) {
    event.preventDefault();
    if (!event.repeat && !host.readDead())
      host.setPaused(!host.readPaused());
    return;
  }
  if (host.readPaused())
    return;
  if (event.code === KeyboardCode.jump || event.code === KeyboardCode.jumpAlt) {
    event.preventDefault();
    if (!event.repeat)
      host.edge.jump = true;
  }
  else if (event.code === KeyboardCode.duck) {
    event.preventDefault();
    host.held.duck = true;
  }
}

function onKeyUp(host: RunnerHost, event: KeyboardEvent) {
  if (event.code === KeyboardCode.duck)
    host.held.duck = false;
}

function onPointerDown(host: RunnerHost, event: PointerEvent) {
  if (host.readPaused() || host.readDead())
    return;
  const rect = host.canvas.getBoundingClientRect();
  const y = event.clientY - rect.top;
  if (y < rect.height / 2)
    host.edge.jump = true;
  else
    host.held.duck = true;
}

function onPointerUp(host: RunnerHost) {
  host.held.duck = false;
}

function tick(host: RunnerHost, now: number) {
  host.raf = requestAnimationFrame(stamp => tick(host, stamp));
  if (host.disposed)
    return;
  if (document.hidden) {
    host.last = now;
    return;
  }
  const dt = Math.min(0.05, (now - host.last) / 1000);
  host.last = now;
  const width = host.root.clientWidth;
  const height = host.root.clientHeight;
  if (host.readPaused()) {
    draw(host);
    placeActor(host, width, height, 0);
    return;
  }
  const input = { jump: host.edge.jump, duck: host.held.duck };
  host.edge.jump = false;
  const prev = host.state.phase;
  host.state = stepRunner(host.state, input, dt);
  if (prev === RunnerPhase.running && host.state.phase === RunnerPhase.dead) {
    const value = runnerScore(host.state.distance);
    host.best = nextBest(host.best, value);
    host.setBest(host.best);
    writeBest(host.best);
    host.setDead(true);
    host.setScore(value);
  }
  else if (host.state.phase === RunnerPhase.running) {
    const shown = runnerScore(host.state.distance);
    host.setScore(shown);
  }
  draw(host);
  placeActor(host, width, height, dt);
}

export function startRunnerGame(input: RunnerGameInput): RunnerGameHandle {
  const gradient = createToonGradient();
  const renderer = new THREE.WebGLRenderer({
    canvas: input.actorCanvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(sceneColor.clear, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  camera.position.z = 20;
  const hemi = new THREE.HemisphereLight(sceneColor.hemisphereSky, sceneColor.hemisphereGround, 1.2);
  const sun = new THREE.DirectionalLight(sceneColor.sun, 2.4);
  sun.position.set(40, 90, 140);
  const holder = new THREE.Group();
  holder.rotation.y = Math.PI / 2;
  scene.add(hemi, sun, holder);
  const host: RunnerHost = {
    root: input.root,
    canvas: input.canvas,
    theme: input.theme,
    setScore: input.setScore,
    setBest: input.setBest,
    setDead: input.setDead,
    setPaused: input.setPaused,
    readPaused: input.readPaused,
    readDead: input.readDead,
    gradient,
    loader: createMascotLoader(),
    renderer,
    scene,
    camera,
    holder,
    state: createRunner(1),
    raf: 0,
    last: performance.now(),
    held: { duck: false },
    edge: { jump: false },
    disposed: false,
    actor: null,
    actorToken: 0,
    actorCache: new Map(),
    props: new Map(),
    stoneTemplate: null,
    kunaiTemplate: null,
    best: readBest(),
  };

  input.setBest(host.best);
  const onKey = (event: KeyboardEvent) => {
    onKeyDown(host, event);
  };
  const onUp = (event: KeyboardEvent) => {
    onKeyUp(host, event);
  };
  const onDown = (event: PointerEvent) => {
    onPointerDown(host, event);
  };
  const onRelease = () => {
    onPointerUp(host);
  };
  const observer = new ResizeObserver(() => {
    resize(host);
    draw(host);
    placeActor(host, host.root.clientWidth, host.root.clientHeight, 0);
  });
  observer.observe(host.root);
  resize(host);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onUp);
  input.canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onRelease);
  loadProp('/runner/stones.glb').then((value) => {
    if (!host.disposed)
      host.stoneTemplate = value;
  });
  loadProp('/runner/kunai.glb', true).then((value) => {
    if (!host.disposed)
      host.kunaiTemplate = value;
  });
  loadActor(host, host.theme());
  const stopTheme = input.watchTheme((value) => {
    loadActor(host, value);
  });
  host.raf = requestAnimationFrame(stamp => tick(host, stamp));

  return {
    restart: () => {
      restart(host);
    },
    stop: () => {
      host.disposed = true;
      stopTheme();
      cancelAnimationFrame(host.raf);
      observer.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
      input.canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onRelease);
      for (const group of host.props.values())
        host.scene.remove(group);
      host.props.clear();
      for (const template of [host.stoneTemplate, host.kunaiTemplate]) {
        if (template)
          disposeObject3D(template.group);
      }
      for (const cached of host.actorCache.values())
        disposeRunnerActor(cached);
      host.actorCache.clear();
      host.gradient.dispose();
      host.renderer.dispose();
      host.renderer.forceContextLoss();
    },
  };
}