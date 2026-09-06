/**
 * The battle clock's shape: where each phase's interval starts and ends, how
 * long each takes to play at a given speed, and which phase holds a given
 * instant.
 *
 * A phase carries one instant, `t` on its `day`, not a start and an end
 * (ADR-0002, ADR-0013): its interval runs to the next phase's instant, and the
 * last phase's runs to the battle's `end` on `end_day`. Intervals come in two
 * units because the battle has two: `intervals` is minutes, since `"HH:MM"`
 * and a day offset are all the schema stores, and `clockIntervals` is the same
 * stretch in the seconds the playing clock counts, a wall frame being worth a
 * fraction of a minute. Everything a player holds is seconds.
 *
 * Every number here counts from midnight of the battle's first day
 * (`instantMinutes` in `src/schema/time.ts`), so a battle that crosses
 * midnight stays monotonic and every comparison below stays a comparison of
 * plain numbers. Only converting back to `"HH:MM"` takes the remainder, and
 * that is `formatBattleTime`'s work, never this module's.
 */
import type { Battle, Phase } from "../schema/types.ts";
import { instantMinutes } from "../schema/time.ts";
import type { ClockSeconds } from "./picture.ts";

/** One phase's stretch of battle clock, in minutes from midnight of the first day, and the rate it plays at. */
export interface Interval {
  /** The phase's own instant, `t` on its `day`. */
  startMinutes: number;
  /** The next phase's instant, or the battle's `end` on `end_day` for the last phase. */
  endMinutes: number;
  /** Battle-clock seconds per real second, before any viewer multiplier. */
  playbackRate: number;
}

/** The same stretch in battle-clock seconds, the unit the playing clock counts, and the phase it belongs to. */
export interface ClockInterval {
  /** Index into `battle.phases`. */
  index: number;
  /** The phase's own instant, in battle-clock seconds. */
  startSeconds: ClockSeconds;
  /** The next phase's instant, or the battle's `end` on `end_day` for the last phase, in battle-clock seconds. */
  endSeconds: ClockSeconds;
  /** Battle-clock seconds per real second, before any viewer multiplier. */
  playbackRate: number;
}

/** How long the whole battle and each of its phases take to play, in wall seconds. */
export interface WallDuration {
  /** Wall seconds from the first phase's instant to `end`. */
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

/** A phase's instant in minutes from midnight of the first day; an absent `day` is day 0 (schema.md 2.4). */
function phaseInstant(phase: Phase): number {
  return instantMinutes(phase.day ?? 0, phase.t);
}

/**
 * The battle's `end` in the same minutes. `end_day` defaults to the last
 * phase's `day` rather than to 0, because "later than the last phase" is only
 * meaningful on the same day (ADR-0013).
 */
function endInstant(battle: Battle): number {
  return instantMinutes(battle.end_day ?? battle.phases.at(-1)?.day ?? 0, battle.end);
}

/** Each phase's interval, in phase order. */
export function intervals(battle: Battle): Interval[] {
  const end = endInstant(battle);
  return battle.phases.map((phase, index) => {
    const next = battle.phases[index + 1];
    return {
      startMinutes: phaseInstant(phase),
      endMinutes: next === undefined ? end : phaseInstant(next),
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

/** The instant playback starts from: the first phase's instant, in battle-clock seconds. */
export function startClock(battle: Battle): ClockSeconds {
  const first = battle.phases[0];
  if (first === undefined) throw new RangeError("A battle has at least one phase");
  return phaseInstant(first) * 60;
}

/** The instant playback finishes at: the battle's `end` on `end_day`, in battle-clock seconds. */
export function endClock(battle: Battle): ClockSeconds {
  return endInstant(battle) * 60;
}

/** `clock` held inside the battle: never before the first phase's instant, never past `end`. */
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
 * The index of the phase whose interval holds `clockMinutes`, counted from
 * midnight of the first day: from the phase's own instant up to but not
 * including the next phase's. An instant before the first phase clamps to the
 * first; `end` and anything past it clamps to the last, which is what makes
 * the last phase hold.
 */
export function phaseIndexAt(battle: Battle, clockMinutes: number): number {
  const phases = battle.phases;
  for (let index = phases.length - 1; index > 0; index -= 1) {
    if (clockMinutes >= phaseInstant(phases[index]!)) return index;
  }
  return 0;
}

/** The interval holding `clock`, which is clamped into the battle first, so the caller never has to. */
export function intervalAt(battle: Battle, clock: ClockSeconds): ClockInterval {
  const index = phaseIndexAt(battle, clampClock(battle, clock) / 60);
  return clockIntervals(battle)[index]!;
}
