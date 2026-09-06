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
import { checkMultiplier, clampClock, clockIntervals, endClock, intervalAt } from "./intervals.ts";
import type { ClockSeconds } from "./picture.ts";

/** Where the clock has reached, and whether the battle is over there. */
export interface Advance {
  /** The battle-clock instant after the wall delta, never past `end`. */
  clockSeconds: ClockSeconds;
  /** True at `end`: the player pauses, and plays again from `startClock(battle)`. */
  finished: boolean;
}

/**
 * The clock after `wallDeltaSeconds` of real time at `multiplier` times the
 * authored rates, crossing as many phase boundaries as the delta pays for and
 * changing rate at each. Stops at `end` and reports finished; an instant
 * before the first phase's `t` is clamped up to it first.
 *
 * Advancing never restarts, because it cannot tell a resumed play from a
 * still-running tick: playing on from a finished battle is the player setting
 * the clock back to `startClock(battle)` and advancing from there.
 */
export function advance(battle: Battle, clockSeconds: ClockSeconds, wallDeltaSeconds: number, multiplier: number): Advance {
  if (!(wallDeltaSeconds >= 0) || !Number.isFinite(wallDeltaSeconds)) {
    throw new RangeError(`A wall delta runs forward: ${wallDeltaSeconds}`);
  }
  checkMultiplier(multiplier);

  const end = endClock(battle);
  const phases = clockIntervals(battle);
  let clock = clampClock(battle, clockSeconds);
  let index = intervalAt(battle, clock).index;
  let remaining = wallDeltaSeconds;

  while (remaining > 0 && clock < end) {
    const interval = phases[index];
    if (interval === undefined) break;
    const rate = interval.playbackRate * multiplier;
    const wallLeftInPhase = (interval.endSeconds - clock) / rate;
    if (remaining < wallLeftInPhase) {
      clock += remaining * rate;
      remaining = 0;
    } else {
      // Land exactly on the boundary rather than accumulating float drift.
      clock = interval.endSeconds;
      remaining -= wallLeftInPhase;
      index += 1;
    }
  }

  return { clockSeconds: clock, finished: clock >= end };
}

/** The next phase jump's target: the following phase's `t`, or `end` when the last phase is playing. */
export function nextPhaseStart(battle: Battle, clockSeconds: ClockSeconds): ClockSeconds {
  const phases = clockIntervals(battle);
  const interval = phases[intervalAt(battle, clockSeconds).index + 1];
  return interval === undefined ? endClock(battle) : interval.startSeconds;
}

/**
 * The previous phase jump's target, given how much wall-clock playback has
 * elapsed since the current phase began. Past one wall second the jump
 * restarts the current phase, the way a track player's back button does;
 * within it, the jump goes to the previous phase. The first phase's `t` is as
 * far back as it goes.
 */
export function previousPhaseStart(battle: Battle, clockSeconds: ClockSeconds, wallSecondsIntoPhase: number): ClockSeconds {
  const phases = clockIntervals(battle);
  const index = intervalAt(battle, clockSeconds).index;
  const target = wallSecondsIntoPhase > 1 ? index : Math.max(index - 1, 0);
  return phases[target]!.startSeconds;
}
