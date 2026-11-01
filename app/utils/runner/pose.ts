import { RunnerPose } from '~/types/runner.enum';

export function runnerPose(
  airborne: boolean,
  ducking: boolean,
  clips: ReadonlySet<string>,
): RunnerPose {
  if (airborne && clips.has(RunnerPose.Jump))
    return RunnerPose.Jump;
  if (ducking && clips.has(RunnerPose.Duck))
    return RunnerPose.Duck;
  if (clips.has(RunnerPose.Run))
    return RunnerPose.Run;
  if (clips.has(RunnerPose.Walk))
    return RunnerPose.Walk;
  return RunnerPose.Idle;
}