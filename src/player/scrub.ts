/**
 * The scrubber's scale: where each phase sits along the bar, and the two
 * conversions between a position on the bar and the battle clock.
 *
 * The bar is phase-segmented by playback duration (issue #13's resolution):
 * a phase's share of the bar is the share of the wall-clock playback it takes,
 * so a slow phase is wide and a fast one narrow. Inside a segment the battle
 * clock is linear, because a phase plays at one rate throughout. The speed
 * multiplier scales every phase alike and so never changes any of this, which
 * is why nothing here takes one.
 */
import type { Battle } from "../schema/types.ts";
import { clampClock, clockIntervals, endClock, scrubberSegments, startClock, type ClockInterval } from "../timeline/intervals.ts";
import type { ClockSeconds } from "../timeline/picture.ts";

/** A position along the scrubber's bar: `0` at the first phase's `t`, `1` at `end`. */
export type BarFraction = number;

/** One phase's stretch of the bar. */
export interface BarSegment {
  /** Index into `battle.phases`. */
  index: number;
  /** The fraction at the phase's own `t`; the tick the phase-jump lands on. */
  start: BarFraction;
  /** The fraction at the next phase's `t`, or `1` for the last phase. */
  end: BarFraction;
}

/** Every phase's stretch of the bar, in phase order, running end to end from `0` to `1`. */
export function barSegments(battle: Battle): BarSegment[] {
  const widths = scrubberSegments(battle);
  let start = 0;
  return widths.map((width, index) => {
    // Carry the running total rather than summing the widths again, and pin
    // the last end to exactly 1 so the bar has no float-sized gap at its right.
    const end = index === widths.length - 1 ? 1 : start + width;
    const segment = { index, start, end };
    start = end;
    return segment;
  });
}

/**
 * The first phase whose segment and interval hold the value `inside` accepts,
 * which is what both conversions walk: one in bar fractions, the other in
 * battle-clock seconds.
 */
function find(
  battle: Battle,
  inside: (segment: BarSegment, interval: ClockInterval) => boolean,
): { segment: BarSegment; interval: ClockInterval } | undefined {
  const intervals = clockIntervals(battle);
  for (const segment of barSegments(battle)) {
    const interval = intervals[segment.index]!;
    if (inside(segment, interval)) return { segment, interval };
  }
  return undefined;
}

/** Where `clock` sits along the bar, from `0` at the first phase's `t` to `1` at `end`. Outside instants clamp. */
export function clockToFraction(battle: Battle, clockSeconds: ClockSeconds): BarFraction {
  const clock = clampClock(battle, clockSeconds);
  const held = find(battle, (_segment, interval) => clock < interval.endSeconds);
  if (held === undefined) return 1;
  const { segment, interval } = held;
  const throughPhase = (clock - interval.startSeconds) / (interval.endSeconds - interval.startSeconds);
  return segment.start + throughPhase * (segment.end - segment.start);
}

/** The battle clock at `fraction` of the way along the bar. Outside fractions clamp to the battle's own ends. */
export function fractionToClock(battle: Battle, fraction: BarFraction): ClockSeconds {
  if (!(fraction > 0)) return startClock(battle);
  if (fraction >= 1) return endClock(battle);
  const held = find(battle, (segment) => fraction < segment.end);
  if (held === undefined) return endClock(battle);
  const { segment, interval } = held;
  const throughSegment = (fraction - segment.start) / (segment.end - segment.start);
  return interval.startSeconds + throughSegment * (interval.endSeconds - interval.startSeconds);
}
