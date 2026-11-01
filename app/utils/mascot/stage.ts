import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { GuideCue, HotspotId, MascotFit, PlanarMotion } from '~/types/mascot';
import type { MascotTheme } from '~/types/mascot.enum';
import {
  AmbientCue,
  Gait,
  GuideAction,
  HoverBeat,
  MascotBone,
  MascotClip,
  StagePhase,
} from '~/types/mascot.enum';
import { mascotPalette, sceneColor } from '~/utils/dictionary/color';
import { dampAngle } from '~/utils/mascot/angle';
import { createJutsuBurst, type JutsuBurst } from '~/utils/mascot/burst';
import { stageClip } from '~/utils/mascot/clip';
import { headerBottom, readHotspotBoxes } from '~/utils/mascot/dom';
import { catchphrase, guideCue, nextCatchphraseIndex } from '~/utils/mascot/cues';
import { isHotspotId } from '~/utils/mascot/ids';
import { nextGait, stepPlanar, yawForGait } from '~/utils/mascot/motion';
import { createMascotLoader, createToonGradient, fitMascot, prepareMascot } from '~/utils/mascot/model';
import {
  HOTSPOT_PROXIMITY,
  cueStillVisible,
  distanceToBox,
  hoverChanged,
  hoveredHotspot,
} from '~/utils/mascot/pick';
import { buildMascotPlaceholder } from '~/utils/mascot/placeholder';
import {
  isNarrowViewport,
  mascotPixelHeight,
  clampCueAnchor,
  clampFeet,
  patrolSpan,
  pointerHeadsToward,
  restPoint,
  standPoint,
  viewportToWorld,
} from '~/utils/mascot/place';
import { disposeObject3D } from '~/utils/three/dispose';

type MascotStageInput = {
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  theme: () => MascotTheme,
  watchTheme: (apply: (value: MascotTheme) => void) => () => void,
  setCue: (value: GuideCue | null) => void,
  setCueAnchor: (left: number, top: number, below: boolean) => void,
};

type StageHost = {
  root: HTMLElement,
  theme: () => MascotTheme,
  setCue: (value: GuideCue | null) => void,
  setCueAnchor: (left: number, top: number, below: boolean) => void,
  reduced: MediaQueryList,
  coarse: MediaQueryList,
  gradient: THREE.DataTexture,
  scene: THREE.Scene,
  camera: THREE.OrthographicCamera,
  renderer: THREE.WebGLRenderer,
  holder: THREE.Group,
  burst: JutsuBurst,
  loader: ReturnType<typeof createMascotLoader>,
  fit: Map<THREE.Object3D, MascotFit>,
  clipsOf: Map<THREE.Object3D, THREE.AnimationClip[]>,
  cache: Map<MascotTheme, THREE.Group>,
  handWorld: THREE.Vector3,
  disposed: boolean,
  token: number,
  current: THREE.Group | null,
  activeMixer: THREE.AnimationMixer | null,
  clipName: string,
  playing: THREE.AnimationAction | null,
  posedMixer: THREE.AnimationMixer | null,
  appliedHeight: number,
  raf: number,
  phase: StagePhase,
  arriveStarted: number,
  last: number,
  active: GuideCue | null,
  cueStarted: number,
  hoverId: HotspotId | null,
  lastPhrase: number | null,
  poseLock: boolean,
  hoverBeat: HoverBeat | null,
  patrolDir: number,
  lastAmbient: number,
  tappedId: HotspotId | null,
  pointer: { x: number, y: number, seen: boolean, movedAt: number },
  pointerPrev: { x: number, y: number },
  reachUntil: number,
  motion: PlanarMotion,
  facingYaw: number,
  gait: Gait,
};

function finishArrive(host: StageHost) {
  if (host.phase !== StagePhase.arrive)
    return;
  host.phase = StagePhase.guide;
}

function hasClip(host: StageHost, name: string): boolean {
  const clips = host.current ? host.clipsOf.get(host.current) ?? [] : [];
  return clips.some(item => item.name === name);
}

function applyHeight(host: StageHost, rootObject: THREE.Object3D, target: number) {
  const info = host.fit.get(rootObject);
  if (!info)
    return;
  const scale = target / info.unit;
  rootObject.scale.setScalar(scale);
  rootObject.position.y = -info.foot * scale;
}

function ensureClip(host: StageHost, name: string, loop: boolean) {
  const key = `${name}:${loop ? 'loop' : 'once'}`;
  if (!host.activeMixer || !host.current || host.clipName === key)
    return;
  const clip = (host.clipsOf.get(host.current) ?? []).find(item => item.name === name);
  if (!clip) {
    if (name === MascotClip.Idle || name === MascotClip.Notice)
      host.poseLock = false;
    return;
  }
  const previous = host.playing;
  const action = host.activeMixer.clipAction(clip);
  action.reset();
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  if (!loop && name === MascotClip.Arrive) {
    const elapsed = (performance.now() - host.arriveStarted) / 1000;
    action.time = Math.min(clip.duration, Math.max(0, elapsed));
  }
  action.play();
  action.setEffectiveWeight(1);
  if (previous && previous !== action)
    previous.fadeOut(0.15);
  host.clipName = key;
  host.playing = action;
}

function onClipFinished(host: StageHost, action: THREE.AnimationAction) {
  if (action !== host.playing)
    return;
  const name = action.getClip().name;
  if (name === MascotClip.Arrive)
    finishArrive(host);
  if (name === MascotClip.Idle || name === MascotClip.Notice) {
    if (host.hoverBeat === HoverBeat.notice && host.hoverId) {
      host.hoverBeat = HoverBeat.walk;
      host.poseLock = false;
    }
    else if (host.hoverBeat !== HoverBeat.stand) {
      host.poseLock = false;
    }
  }
}

function attach(host: StageHost, group: THREE.Group) {
  host.burst.points.removeFromParent();
  if (host.current)
    host.holder.remove(host.current);
  host.current = group;
  host.holder.add(group);
  host.holder.add(host.burst.points);
  const clips = host.clipsOf.get(group) ?? [];
  host.activeMixer = clips.length > 0 ? new THREE.AnimationMixer(group) : null;
  host.clipName = '';
  host.playing = null;
  host.posedMixer = null;
  host.appliedHeight = 0;
  host.activeMixer?.addEventListener('finished', (event) => {
    onClipFinished(host, event.action);
  });
}

function storeModel(host: StageHost, gltf: GLTF, value: MascotTheme): THREE.Group {
  const prepared = prepareMascot(gltf, value, host.gradient);
  host.fit.set(prepared.group, prepared.fit);
  host.clipsOf.set(prepared.group, prepared.clips);
  return prepared.group;
}

function loadTheme(host: StageHost, value: MascotTheme): Promise<THREE.Group | null> {
  return fetch(`/mascot/${value}.glb`)
    .then(async (response) => {
      if (!response.ok)
        return null;
      const buffer = await response.arrayBuffer();
      return new Promise<THREE.Group | null>((resolve) => {
        host.loader.parse(
          buffer,
          '',
          gltf => resolve(storeModel(host, gltf, value)),
          () => resolve(null),
        );
      });
    })
    .catch(() => null);
}

function rememberPlaceholder(host: StageHost, value: MascotTheme): THREE.Group {
  const group = buildMascotPlaceholder(value, host.gradient);
  host.fit.set(group, fitMascot(group));
  host.clipsOf.set(group, []);
  return group;
}

async function showTheme(host: StageHost, value: MascotTheme) {
  const currentToken = ++host.token;
  host.burst.setColor(mascotPalette[value].burst);
  const cached = host.cache.get(value);
  if (cached) {
    if (!host.disposed && currentToken === host.token)
      attach(host, cached);
    return;
  }
  const scratch = rememberPlaceholder(host, value);
  if (!host.disposed && currentToken === host.token)
    attach(host, scratch);
  const loaded = await loadTheme(host, value);
  if (host.disposed || currentToken !== host.token) {
    disposeObject3D(scratch);
    if (loaded)
      disposeObject3D(loaded);
    return;
  }
  if (loaded) {
    host.cache.set(value, loaded);
    attach(host, loaded);
    disposeObject3D(scratch);
    return;
  }
  host.cache.set(value, scratch);
}

function beginCue(host: StageHost, next: GuideCue, now: number) {
  host.active = next;
  host.setCue(next);
  host.cueStarted = now;
  host.poseLock = true;
  host.clipName = '';
  if (next.id !== AmbientCue.aside)
    host.hoverBeat = HoverBeat.notice;
}

function syncHeight(host: StageHost, narrow: boolean) {
  if (!host.current)
    return;
  const target = mascotPixelHeight(window.innerHeight, narrow);
  if (target === host.appliedHeight)
    return;
  applyHeight(host, host.current, target);
  host.appliedHeight = target;
}

function resize(host: StageHost) {
  const width = Math.max(1, Math.floor(host.root.clientWidth));
  const height = Math.max(1, Math.floor(host.root.clientHeight));
  host.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  host.renderer.setSize(width, height, false);
  host.camera.left = -width / 2;
  host.camera.right = width / 2;
  host.camera.top = height / 2;
  host.camera.bottom = -height / 2;
  host.camera.updateProjectionMatrix();
  host.appliedHeight = 0;
}

function onPointerMove(host: StageHost, event: PointerEvent) {
  if (event.clientX === host.pointer.x && event.clientY === host.pointer.y)
    return;
  host.pointer.x = event.clientX;
  host.pointer.y = event.clientY;
  host.pointer.seen = true;
  host.pointer.movedAt = performance.now();
}

function onPointerDown(host: StageHost, event: PointerEvent) {
  if (!(host.reduced.matches || host.coarse.matches))
    return;
  const target = event.target;
  if (!(target instanceof Element))
    return;
  const marked = target.closest('[data-mascot-hotspot]');
  const raw = marked instanceof HTMLElement ? marked.dataset.mascotHotspot : undefined;
  if (raw && isHotspotId(raw))
    host.tappedId = raw;
}

function steer(host: StageHost, now: number, dt: number, narrow: boolean, direct: boolean, intro: number) {
  const rect = host.root.getBoundingClientRect();
  if (rect.width <= 2 || rect.height <= 2)
    return;

  const bounds = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
  const origin = { left: rect.left, top: rect.top };
  const size = { width: rect.width, height: rect.height };
  const bodyHeight = mascotPixelHeight(window.innerHeight, narrow);
  const halfWidth = Math.max(64, bodyHeight * 0.28);
  const ceiling = headerBottom();
  const ground = restPoint(bounds, narrow);
  const feetX = rect.left + (host.motion.x + rect.width / 2);
  const feetY = rect.top + (rect.height / 2 - host.motion.y);
  const sinceMove = now - host.pointer.movedAt;
  const pointerLive = host.pointer.seen && sinceMove < 250;
  const pointerIdle = !host.pointer.seen || sinceMove >= 2500;
  const cueBox = document.querySelector('[data-mascot-cue]')?.getBoundingClientRect();
  const reachingCue = Boolean(host.active?.action === GuideAction.openAssistant
    && host.pointer.seen
    && cueBox
    && pointerHeadsToward(
      host.pointerPrev,
      host.pointer,
      {
        left: cueBox.left - 36,
        top: cueBox.top - 36,
        width: cueBox.width + 72,
        height: cueBox.height + 72,
      },
    ));
  if (reachingCue)
    host.reachUntil = now + 700;
  const holdingCue = host.active?.action === GuideAction.openAssistant && now < host.reachUntil;
  let target = {
    x: host.motion.ready ? feetX : ground.x,
    y: host.motion.ready ? feetY : ground.y,
  };
  let moveSpeed = 560;
  const boxes = readHotspotBoxes();
  const tap = host.tappedId;
  host.tappedId = null;
  const hovered = host.phase === StagePhase.guide
    ? hoveredHotspot({
      theme: host.theme(),
      boxes,
      pointer: host.pointer.seen ? { x: host.pointer.x, y: host.pointer.y } : null,
      tappedId: tap,
      proximity: HOTSPOT_PROXIMITY,
      directOnly: direct,
    })
    : null;

  if (host.phase === StagePhase.guide && hoverChanged(hovered, host.hoverId)) {
    host.hoverId = hovered;
    if (hovered)
      beginCue(host, guideCue(hovered, host.theme()), now);
  }
  else if (hovered !== host.hoverId) {
    host.hoverId = hovered;
    host.hoverBeat = null;
    host.poseLock = false;
  }

  if (pointerLive && !hovered) {
    host.poseLock = false;
    host.hoverBeat = null;
  }
  if (!holdingCue && host.hoverBeat === HoverBeat.walk && hovered) {
    const box = boxes.find(item => item.id === hovered);
    if (box) {
      const stand = clampFeet(
        standPoint(box, bounds),
        bounds,
        bodyHeight,
        ceiling,
        halfWidth,
      );
      target = stand;
      const arrived = Math.hypot(feetX - stand.x, feetY - stand.y) < 64;
      if (arrived) {
        host.hoverBeat = HoverBeat.stand;
        host.poseLock = true;
        host.clipName = '';
      }
    }
  }
  else if (!holdingCue && !host.poseLock && pointerLive && !direct && host.phase === StagePhase.guide) {
    target = { x: host.pointer.x, y: host.pointer.y };
  }
  else if (!holdingCue && !host.poseLock && pointerIdle && !direct && !narrow && host.phase === StagePhase.guide) {
    const span = patrolSpan(bounds, narrow, bodyHeight, ceiling, halfWidth);
    const goalX = host.patrolDir > 0 ? span.right : span.left;
    target = { x: goalX, y: span.y };
    moveSpeed = 320;
    const atEnd = host.patrolDir > 0
      ? feetX >= span.right - 48
      : feetX <= span.left + 48;
    if (atEnd)
      host.patrolDir = -host.patrolDir;
  }
  target = clampFeet(target, bounds, bodyHeight, ceiling, halfWidth);

  if (host.phase === StagePhase.guide
    && pointerIdle
    && !host.poseLock
    && !hovered
    && !host.active
    && now - host.lastAmbient >= 30_000
  ) {
    const index = nextCatchphraseIndex(host.lastPhrase, Math.random());
    host.lastPhrase = index;
    host.lastAmbient = now;
    beginCue(host, { id: AmbientCue.aside, text: catchphrase(host.theme(), index) }, now);
  }

  if (host.active?.id === AmbientCue.aside) {
    if ((now - host.cueStarted) / 1000 > 4.2) {
      host.active = null;
      host.setCue(null);
    }
  }
  else if (host.active && hovered !== host.active.id && !holdingCue) {
    const box = boxes.find(item => item.id === host.active?.id);
    const near = Boolean(box
      && host.pointer.seen
      && distanceToBox({ x: host.pointer.x, y: host.pointer.y }, box) <= HOTSPOT_PROXIMITY);
    if (!cueStillVisible({
      shownFor: (now - host.cueStarted) / 1000,
      minSeconds: direct ? 3.2 : 1.4,
      pointerNear: near,
      directOnly: direct,
    })) {
      host.active = null;
      host.setCue(null);
    }
  }

  const desired = viewportToWorld(target.x, target.y, origin, size);
  stepPlanar(
    host.motion,
    desired,
    direct || host.phase === StagePhase.arrive,
    moveSpeed,
    dt,
  );
  const rise = host.phase === StagePhase.arrive ? (1 - intro) * 320 : 0;
  host.holder.scale.setScalar(intro);
  host.holder.position.set(host.motion.x, host.motion.y - rise, 0);

  const speed = Math.hypot(host.motion.velocityX, host.motion.velocityY);
  const patrolling = host.phase === StagePhase.guide
    && pointerIdle
    && !host.poseLock
    && !holdingCue
    && !hovered
    && !direct
    && !narrow;
  host.gait = nextGait({
    gait: host.gait,
    hoverBeat: host.hoverBeat,
    poseLock: host.poseLock,
    patrolling,
    speed,
  });
  host.facingYaw = yawForGait(host.gait, host.motion.velocityX, host.facingYaw);
  host.holder.rotation.y = dampAngle(host.holder.rotation.y, host.facingYaw, dt);
  host.holder.rotation.z = 0;

  if (host.active) {
    const heightPx = mascotPixelHeight(window.innerHeight, narrow) * intro;
    const headScreenY = rect.top + (rect.height / 2 - host.motion.y) - heightPx;
    const below = headScreenY - 96 < ceiling;
    host.setCueAnchor(
      clampCueAnchor(host.motion.x + rect.width / 2, rect.width, 224),
      below
        ? rect.height / 2 - host.motion.y + 12
        : rect.height / 2 - host.motion.y - heightPx,
      below,
    );
  }
  host.pointerPrev.x = host.pointer.x;
  host.pointerPrev.y = host.pointer.y;
}

function frame(host: StageHost) {
  host.raf = requestAnimationFrame(() => {
    frame(host);
  });
  if (host.disposed || document.hidden || !host.root)
    return;

  const now = performance.now();
  const dt = Math.min(0.05, (now - host.last) / 1000);
  host.last = now;
  if (host.phase === StagePhase.arrive && host.reduced.matches)
    finishArrive(host);

  const narrow = isNarrowViewport(window.innerWidth);
  const direct = host.reduced.matches || host.coarse.matches;
  syncHeight(host, narrow);

  const arriveClip = host.current
    ? (host.clipsOf.get(host.current) ?? []).find(item => item.name === MascotClip.Arrive)
    : undefined;
  const duration = arriveClip ? Math.max(arriveClip.duration, 2.4) : 2.8;
  const elapsed = (now - host.arriveStarted) / 1000;
  if (host.phase === StagePhase.arrive && elapsed >= duration)
    finishArrive(host);
  const arriveT = Math.min(1, elapsed / Math.max(duration, 0.001));
  const eased = 1 - (1 - arriveT) ** 3;
  const intro = host.phase === StagePhase.arrive ? Math.max(0.08, eased) : 1;

  const hand = host.current?.getObjectByName(MascotBone.rightHand);
  if (hand) {
    hand.getWorldPosition(host.handWorld);
    host.holder.worldToLocal(host.handWorld);
  }
  host.burst.update(arriveT, host.phase === StagePhase.arrive, hand ? host.handWorld : null);
  steer(host, now, dt, narrow, direct, intro);

  const posing = host.poseLock && host.phase === StagePhase.guide;
  const choice = stageClip({
    arriving: host.phase === StagePhase.arrive,
    posing,
    direct,
    walking: host.gait === Gait.walk,
    hasNotice: hasClip(host, MascotClip.Notice),
    hasWalk: hasClip(host, MascotClip.Walk),
  });
  ensureClip(host, choice.name, choice.loop);
  if (host.playing && (host.clipName.startsWith(MascotClip.Walk) || host.clipName.startsWith(MascotClip.Run))) {
    const pace = Math.hypot(host.motion.velocityX, host.motion.velocityY);
    host.playing.timeScale = Math.min(1.35, Math.max(1, pace / 220));
  }
  else if (host.playing) {
    host.playing.timeScale = 1;
  }

  if (host.activeMixer) {
    if (host.reduced.matches) {
      if (host.posedMixer !== host.activeMixer) {
        host.activeMixer.update(0.001);
        host.posedMixer = host.activeMixer;
      }
    }
    else {
      host.activeMixer.update(dt);
    }
  }

  host.renderer.render(host.scene, host.camera);
}

export function startMascotStage(input: MascotStageInput): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  const gradient = createToonGradient();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  camera.position.z = 20;
  const renderer = new THREE.WebGLRenderer({
    canvas: input.canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(sceneColor.clear, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const hemi = new THREE.HemisphereLight(sceneColor.hemisphereSky, sceneColor.hemisphereGround, 1.2);
  const sun = new THREE.DirectionalLight(sceneColor.sun, 2.4);
  sun.position.set(40, 90, 140);
  const holder = new THREE.Group();
  scene.add(hemi, sun, holder);
  const burst = createJutsuBurst(mascotPalette[input.theme()].burst);
  holder.add(burst.points);
  const mountedAt = performance.now();
  const host: StageHost = {
    root: input.root,
    theme: input.theme,
    setCue: input.setCue,
    setCueAnchor: input.setCueAnchor,
    reduced,
    coarse,
    gradient,
    scene,
    camera,
    renderer,
    holder,
    burst,
    loader: createMascotLoader(),
    fit: new Map(),
    clipsOf: new Map(),
    cache: new Map(),
    handWorld: new THREE.Vector3(),
    disposed: false,
    token: 0,
    current: null,
    activeMixer: null,
    clipName: '',
    playing: null,
    posedMixer: null,
    appliedHeight: 0,
    raf: 0,
    phase: reduced.matches ? StagePhase.guide : StagePhase.arrive,
    arriveStarted: mountedAt,
    last: mountedAt,
    active: null,
    cueStarted: 0,
    hoverId: null,
    lastPhrase: null,
    poseLock: false,
    hoverBeat: null,
    patrolDir: 1,
    lastAmbient: mountedAt,
    tappedId: null,
    pointer: { x: 0, y: 0, seen: false, movedAt: 0 },
    pointerPrev: { x: 0, y: 0 },
    reachUntil: 0,
    motion: { x: 0, y: 0, ready: false, velocityX: 0, velocityY: 0 },
    facingYaw: Math.PI / 2,
    gait: Gait.idle,
  };

  const move = (event: PointerEvent) => {
    onPointerMove(host, event);
  };
  const down = (event: PointerEvent) => {
    onPointerDown(host, event);
  };
  const observer = new ResizeObserver(() => {
    resize(host);
  });
  observer.observe(host.root);
  resize(host);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerdown', down);
  showTheme(host, host.theme());
  host.raf = requestAnimationFrame(() => {
    frame(host);
  });
  const stopTheme = input.watchTheme((value) => {
    showTheme(host, value);
  });

  return () => {
    host.disposed = true;
    stopTheme();
    cancelAnimationFrame(host.raf);
    observer.disconnect();
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerdown', down);
    host.burst.dispose();
    host.gradient.dispose();
    for (const group of host.cache.values())
      disposeObject3D(group);
    host.renderer.dispose();
    host.renderer.forceContextLoss();
  };
}