import * as THREE from 'three';
import type { RunnerActor } from '~/types/runner';
import { RunnerPose } from '~/types/runner.enum';
import { disposeObject3D } from '~/utils/three/dispose';

export function placeRunnerActor(actor: RunnerActor, height: number) {
  const scale = height / actor.fit.unit;
  actor.group.scale.setScalar(scale);
  actor.group.position.set(0, -actor.fit.foot * scale, 0);
}

export function playRunnerPose(actor: RunnerActor, name: RunnerPose) {
  if (actor.pose === name)
    return;
  const clip = actor.clips.get(name);
  if (!clip)
    return;
  const next = actor.mixer.clipAction(clip);
  const previousClip = actor.pose ? actor.clips.get(actor.pose) : undefined;
  const previous = previousClip ? actor.mixer.existingAction(previousClip) : null;
  const hold = name === RunnerPose.Duck;
  const leavingCrouch = actor.pose === RunnerPose.Duck;
  next.reset();
  next.paused = false;
  next.timeScale = hold ? 2.2 : 1;
  next.setLoop(hold ? THREE.LoopOnce : THREE.LoopRepeat, hold ? 1 : Infinity);
  next.clampWhenFinished = hold;
  next.play();
  next.setEffectiveWeight(1);
  if (previous && previous !== next) {
    previous.paused = false;
    if (hold || leavingCrouch)
      previous.stop();
    else
      previous.fadeOut(0.12);
  }
  actor.pose = name;
}

export function disposeRunnerActor(actor: RunnerActor) {
  actor.mixer.stopAllAction();
  disposeObject3D(actor.group);
}