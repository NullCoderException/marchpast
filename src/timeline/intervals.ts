/**
 * The battle clock's shape: where each phase's interval starts and ends, how
 * long each takes to play at a given speed, and which phase holds a given
 * instant.
 *
 * A phase carries one instant, `t`, not a start and an end (ADR-0002): its
 * interval runs to the next phase's `t`, and the last phase's runs to the
 * battle's `end`. Intervals come in two units because the battle has two:
 * `intervals` is minutes, since `"HH:MM"` is all the schema stores, and
 * `clockIntervals` is the same stretch in the seconds the playing clock
 * counts, a wall frame being worth a fraction of a minute. Everything a
 * player holds is seconds.
 *
 * This module still reads `t` alone and ignores a phase's `day`, so it is
 * right for a battle inside one day and wrong across midnight. The clock that
 * counts from the first day's midnight (`instantMinutes` in
 * `src/schema/time.ts`) is the battle-clock slice's work, not this one's.
 */
import type { Battle } from "../schema/types.ts";
import { parseBattleTime } from "../schema/time.ts";
import type { ClockSeconds } from "./picture.ts";

/** One phase's stretch of battle clock, in minutes since midnight, and the rate it plays at. */
export interface Interval {
  /** The phase's own `t`. */
  startMinutes: number;
  /** The next phase's `t`, or the battle's `end` for the last phase. */
  endMinutes: number;
  /** Battle-clock seconds per real second, before any viewer multiplier. */
  playbackRate: number;
}

/** The same stretch in battle-clock seconds, the unit the playing clock counts, and the phase it belongs to. */
export interface ClockInterval {
  /** Index into `battle.phases`. */
  index: number;
  /** The phase's own `t`, in battle-clock seconds. */
  startSeconds: ClockSeconds;
  /** The next phase's `t`, or the battle's `end` for the last phase, in battle-clock seconds. */
  endSeconds: ClockSeconds;
  /** Battle-clock seconds per real second, before any viewer multiplier. */
  playbackRate: number;
}

/** How long the whole battle and each of its phases take to play, in wall seconds. */
export interface WallDuration {
  /** Wall seconds from the first phase's `t` to `end`. */
  total: number;
  /** Wall seconds per phase, in phase order. */
  perPhase: number[];
}

/** Throws unless `multiplier` is a viewer speed a duration can be divided by. */
export function checkMultiplier(multiplier: number): void {
  if (!(multiplier > 0) || !Number.isFinite(multiplier)) {
    throw new RangeError(`Speed multiplier must be a positive finite number: ${multiplier}`);
  }
}

/** Each phase's interval, in phase order. */
export function intervals(battle: Battle): Interval[] {
  const end = parseBattleTime(battle.end);
  return battle.phases.map((phase, index) => {
    const next = battle.phases[index + 1];
    return {
      startMinutes: parseBattleTime(phase.t),
      endMinutes: next === undefined ? end : parseBattleTime(next.t),
      playbackRate: phase.playback_rate,
    };
  });
}

/** Each phase's interval in battle-clock seconds: the one derivation everything on the playing clock works from. */
export function clockIntervals(battle: Battle): ClockInterval[] {
  return intervals(battle).map((interval, index) => ({
    index,
    startSeconds: interval.startMinutes * 60,
    endSeconds: interval.endMinutes * 60,
    playbackRate: interval.playbackRate,
  }));
}

/** The instant playback starts from: the first phase's `t`, in battle-clock seconds. */
export function startClock(battle: Battle): ClockSeconds {
  const first = battle.phases[0];
  if (first === undefined) throw new RangeError("A battle has at least one phase");
  return parseBattleTime(first.t) * 60;
}

/** The instant playback finishes at: the battle's `end`, in battle-clock seconds. */
export function endClock(battle: Battle): ClockSeconds {
  return parseBattleTime(battle.end) * 60;
}

/** `clock` held inside the battle: never before the first phase's `t`, never past `end`. */
export function clampClock(battle: Battle, clock: ClockSeconds): ClockSeconds {
  return Math.min(Math.max(clock, startClock(battle)), endClock(battle));
}

/**
 * Wall seconds the battle takes to play at `multiplier` times its authored
 * rates: each phase's interval divided by its rate, and the sum.
 */
export function wallDuration(battle: Battle, multiplier = 1): WallDuration {
  checkMultiplier(multiplier);
  const perPhase = clockIntervals(battle).map(
    (interval) => (interval.endSeconds - interval.startSeconds) / (interval.playbackRate * multiplier),
  );
  return { total: perPhase.reduce((a, b) => a + b, 0), perPhase };
}

/**
 * Each phase's share of the whole playback, as fractions summing to one: the
 * widths the scrubber draws its phase segments at. The multiplier scales every
 * phase alike, so it never changes the answer; it is accepted so a caller can
 * pass the speed it is playing at without having to know that.
 */
export function scrubberSegments(battle: Battle, multiplier = 1): number[] {
  const { total, perPhase } = wallDuration(battle, multiplier);
  return perPhase.map((seconds) => seconds / total);
}

/**
 * The index of the phase whose interval holds `clockMinutes`: from its own `t`
 * up to but not including the next phase's. An instant before the first phase
 * clamps to the first; `end` and anything past it clamps to the last, which is
 * what makes the last phase hold.
 */
export function phaseIndexAt(battle: Battle, clockMinutes: number): number {
  const phases = battle.phases;
  for (let index = phases.length - 1; index > 0; index -= 1) {
    if (clockMinutes >= parseBattleTime(phases[index]!.t)) return index;
  }
  return 0;
}

/** The interval holding `clock`, which is clamped into the battle first, so the caller never has to. */
export function intervalAt(battle: Battle, clock: ClockSeconds): ClockInterval {
  const index = phaseIndexAt(battle, clampClock(battle, clock) / 60);
  return clockIntervals(battle)[index]!;
}
