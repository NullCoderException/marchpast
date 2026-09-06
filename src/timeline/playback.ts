/**
 * Driving the battle clock: how far a wall-clock frame moves it, and where the
 * two phase-jump controls land.
 *
 * Wall time reaches the battle clock only through the current phase's
 * `playback_rate` (battle-clock seconds per real second), scaled by a viewer
 * speed multiplier that is passed in and never stored in a battle file. A
 * single frame may span a phase boundary, so `advance` walks the intervals
 * rather than multiplying once.
 */
import type { Battle } from "../schema/types.ts";
import { parseBattleTime } from "../schema/time.ts";
import { endClock, phaseIndexAt, startClock } from "./intervals.ts";
import type { ClockSeconds } from "./picture.ts";

/** Where the clock has reached, and whether the battle is over there. */
export interface Advance {
  /** The battle-clock instant after the wall delta, never past `end`. */
  clockSeconds: ClockSeconds;
  /** True at `end`: the player pauses, and plays again from `startClock(battle)`. */
  finished: boolean;
}

/** The battle-clock second the phase at `index` starts on. */
function phaseStart(battle: Battle, index: number): ClockSeconds {
  return parseBattleTime(battle.phases[index]!.t) * 60;
}

/**
 * The clock after `wallDeltaSeconds` of real time at `multiplier` times the
 * authored rates, crossing as many phase boundaries as the delta pays for and
 * changing rate at each. Stops at `end` and reports finished; an instant
 * before the first phase's `t` is clamped up to it first.
 */
export function advance(battle: Battle, clockSeconds: ClockSeconds, wallDeltaSeconds: number, multiplier: number): Advance {
  if (!(wallDeltaSeconds >= 0) || !Number.isFinite(wallDeltaSeconds)) {
    throw new RangeError(`A wall delta runs forward: ${wallDeltaSeconds}`);
  }
  if (!(multiplier > 0) || !Number.isFinite(multiplier)) {
    throw new RangeError(`Speed multiplier must be a positive finite number: ${multiplier}`);
  }

  const end = endClock(battle);
  let clock = Math.min(Math.max(clockSeconds, startClock(battle)), end);
  let remaining = wallDeltaSeconds;

  while (remaining > 0 && clock < end) {
    const index = phaseIndexAt(battle, clock / 60);
    const next = battle.phases[index + 1];
    const intervalEnd = next === undefined ? end : parseBattleTime(next.t) * 60;
    const rate = battle.phases[index]!.playback_rate * multiplier;
    const wallLeftInPhase = (intervalEnd - clock) / rate;
    if (remaining < wallLeftInPhase) {
      clock += remaining * rate;
      remaining = 0;
    } else {
      // Land exactly on the boundary rather than accumulating float drift.
      clock = intervalEnd;
      remaining -= wallLeftInPhase;
    }
  }

  return { clockSeconds: clock, finished: clock >= end };
}

/** The next phase jump's target: the following phase's `t`, or `end` when the last phase is playing. */
export function nextPhaseStart(battle: Battle, clockSeconds: ClockSeconds): ClockSeconds {
  const index = phaseIndexAt(battle, Math.min(Math.max(clockSeconds, startClock(battle)), endClock(battle)) / 60);
  return index + 1 < battle.phases.length ? phaseStart(battle, index + 1) : endClock(battle);
}

/**
 * The previous phase jump's target, given how much wall-clock playback has
 * elapsed since the current phase began. Past one wall second the jump
 * restarts the current phase, the way a track player's back button does;
 * within it, the jump goes to the previous phase. The first phase's `t` is as
 * far back as it goes.
 */
export function previousPhaseStart(battle: Battle, clockSeconds: ClockSeconds, wallSecondsIntoPhase: number): ClockSeconds {
  const index = phaseIndexAt(battle, Math.min(Math.max(clockSeconds, startClock(battle)), endClock(battle)) / 60);
  if (wallSecondsIntoPhase > 1) return phaseStart(battle, index);
  return phaseStart(battle, Math.max(index - 1, 0));
}
