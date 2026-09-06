/**
 * What the player holds between frames, and every way a control moves it.
 *
 * The state is three numbers, a flag and a view: nothing here is authored, nothing
 * survives a reload (issue #13's resolution). Every transition is a pure
 * function of the battle and the state before it, so the controls can be read
 * as "which transition does this button call" and the rules are tested without
 * a DOM.
 */
import { DEFAULT_VIEW, type ViewId } from "../render/index.ts";
import type { Battle } from "../schema/types.ts";
import { checkMultiplier, clockIntervals, endClock, intervalAt, startClock } from "../timeline/intervals.ts";
import type { ClockSeconds } from "../timeline/picture.ts";
import { advance, nextPhaseStart, previousPhaseStart } from "../timeline/playback.ts";
import { fractionToClock, type BarFraction } from "./scrub.ts";

/** The speed multipliers the viewer may choose, applied uniformly to every phase's authored rate. */
export const MULTIPLIERS = [0.5, 1, 2, 4] as const;

/** Everything the player knows between frames. */
export interface PlayerState {
  /** The battle-clock instant on screen, in seconds since midnight. */
  clock: ClockSeconds;
  /** Whether the loop is advancing the clock. */
  playing: boolean;
  /** The viewer's speed multiplier on every phase's authored rate. */
  multiplier: number;
  /**
   * The view the picture is drawn in: player state like the multiplier, never
   * authored, never in the picture. The renderer is handed the view this names.
   */
  view: ViewId;
}

/** Paused on the first phase, which is what loading lands on (schema.md 2.10). */
export function initialState(battle: Battle, multiplier = 1, view: ViewId = DEFAULT_VIEW.id): PlayerState {
  checkMultiplier(multiplier);
  return { clock: startClock(battle), playing: false, multiplier, view };
}

/** Whether the clock has reached `end`, where the last picture holds. */
export function isFinished(battle: Battle, state: PlayerState): boolean {
  return state.clock >= endClock(battle);
}

/**
 * How much wall-clock playback the current instant is into its phase: the time
 * it would take to play from the phase's `t` to here at the current speed. It
 * is derived rather than accumulated so a jump or a scrub answers the same way
 * as playing there did.
 */
function wallSecondsIntoPhase(battle: Battle, state: PlayerState): number {
  const interval = intervalAt(battle, state.clock);
  return (Math.max(state.clock, interval.startSeconds) - interval.startSeconds) / (interval.playbackRate * state.multiplier);
}

/** The state after `wallDeltaSeconds` of real time. Paused ticks stand still; reaching `end` pauses on the last picture. */
export function tick(battle: Battle, state: PlayerState, wallDeltaSeconds: number): PlayerState {
  if (!state.playing) return state;
  const { clockSeconds, finished } = advance(battle, state.clock, wallDeltaSeconds, state.multiplier);
  return { ...state, clock: clockSeconds, playing: !finished };
}

/** Play or pause. Playing on from a finished battle restarts it from the first phase; there is no loop. */
export function togglePlay(battle: Battle, state: PlayerState): PlayerState {
  if (state.playing) return { ...state, playing: false };
  return { ...state, clock: isFinished(battle, state) ? startClock(battle) : state.clock, playing: true };
}

/**
 * Jump to the next phase's `t`, keeping the play state. From the last phase the
 * jump lands on `end`, the one target that is not a phase instant: the
 * end-of-battle rule wins there, so the player pauses on the last picture.
 */
export function jumpNext(battle: Battle, state: PlayerState): PlayerState {
  const clock = nextPhaseStart(battle, state.clock);
  return { ...state, clock, playing: state.playing && clock < endClock(battle) };
}

/**
 * Jump backward, keeping the play state: past a wall second of playback into
 * the current phase this restarts it, otherwise it goes to the phase before.
 */
export function jumpPrevious(battle: Battle, state: PlayerState): PlayerState {
  return { ...state, clock: previousPhaseStart(battle, state.clock, wallSecondsIntoPhase(battle, state)) };
}

/** Scrub to a fraction of the bar. Dragging pauses playback, and release leaves it paused. */
export function scrubTo(battle: Battle, state: PlayerState, fraction: BarFraction): PlayerState {
  return { ...state, clock: fractionToClock(battle, fraction), playing: false };
}

/** Change the speed multiplier, leaving the clock and the play state where they are. */
export function setMultiplier(state: PlayerState, multiplier: number): PlayerState {
  checkMultiplier(multiplier);
  return { ...state, multiplier };
}

/** Switch the view, leaving the clock and the play state where they are. */
export function setView(state: PlayerState, view: ViewId): PlayerState {
  return { ...state, view };
}

/** Jump to a phase's own `t` — what a scrubber tick clicks to — keeping the play state. */
export function jumpToPhase(battle: Battle, state: PlayerState, index: number): PlayerState {
  const interval = clockIntervals(battle)[index];
  if (interval === undefined) throw new RangeError(`No phase at index ${index}`);
  return { ...state, clock: interval.startSeconds };
}
