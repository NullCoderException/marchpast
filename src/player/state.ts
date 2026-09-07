/**
 * What the player holds between frames, and every way a control moves it.
 *
 * The state is a clock, a flag and the viewer's four choices — speed, view,
 * level and the unit card they have open: nothing here is authored, and
 * nothing survives a reload (issue #13's resolution, #47 for the view,
 * ADR-0017 for the level, #60 for the card). Every
 * transition is a pure function of the battle and the state before it, so the
 * controls can be read as "which transition does this button call" and the
 * rules are tested without a DOM. The fixed lists a chooser offers live here
 * for the same reason.
 */
import { DEFAULT_VIEW, type CardTarget, type ViewId } from "../render/index.ts";
import { unitsAtLevel } from "../schema/hierarchy.ts";
import type { Battle } from "../schema/types.ts";
import { checkMultiplier, clockIntervals, endClock, intervalAt, startClock } from "../timeline/intervals.ts";
import type { ClockSeconds } from "../timeline/picture.ts";
import { presentAt } from "../timeline/pictureAt.ts";
import { advance, nextPhaseStart, previousPhaseStart } from "../timeline/playback.ts";
import { fractionToClock, type BarFraction } from "./scrub.ts";

/** The speed multipliers the viewer may choose, applied uniformly to every phase's authored rate. */
export const MULTIPLIERS = [0.5, 1, 2, 4] as const;

/**
 * The levels the viewer may choose, coarsest first: the battle's own `levels`
 * names, and none at all when there is nothing to choose. A battle with no
 * `levels` has one level and gets no Level chooser; so would a `levels` of one
 * name, which the validator does not allow but which is one level all the same
 * (ADR-0017).
 */
export function levelOptions(battle: Battle): readonly string[] {
  const levels = battle.levels ?? [];
  return levels.length < 2 ? [] : levels;
}

/** Everything the player knows between frames. */
export interface PlayerState {
  /** The battle-clock instant on screen, in seconds from midnight of the battle's first day. */
  clock: ClockSeconds;
  /** Whether the loop is advancing the clock. */
  playing: boolean;
  /** The viewer's speed multiplier on every phase's authored rate. */
  multiplier: number;
  /**
   * The view the picture is drawn in: player state like the multiplier, never
   * authored and never in the picture, so two viewers of the same instant see
   * the same battle in whichever treatment each has picked (ADR-0014).
   */
  view: ViewId;
  /**
   * The depth of the unit tree the plate draws: `0` is the coarsest, and every
   * visit opens on it. Player state like the view — never authored, never on
   * the URL, never remembered — and a battle with one level never moves it off
   * `0` (ADR-0017).
   */
  level: number;
  /**
   * The unit whose card is open, and whether a click pinned it there. Player
   * state like the view and the level — viewer-opened, never authored, never
   * on the URL and never remembered — and absent when no card is open (#60).
   */
  card?: CardTarget;
}

/** Paused on the first phase in the default view at the coarsest level, which is what loading lands on (schema.md 2.11, #47). */
export function initialState(battle: Battle, multiplier = 1): PlayerState {
  checkMultiplier(multiplier);
  return { clock: startClock(battle), playing: false, multiplier, view: DEFAULT_VIEW.id, level: 0 };
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

/**
 * Switch the view, leaving the clock, the play state and any open card where
 * they are: a switch never interrupts (#47), and the card is redrawn in the
 * new palette rather than closed (#60).
 */
export function setView(state: PlayerState, view: ViewId): PlayerState {
  return { ...state, view };
}

/**
 * The pointer has come to rest on a unit, or on none. An unpinned card follows
 * the pointer and closes when it leaves; a **pinned** card ignores it entirely,
 * which is the whole point of pinning — a unit slides out from under a still
 * pointer while the battle plays (#60).
 */
export function hoverUnit(state: PlayerState, id: string | undefined): PlayerState {
  if (state.card?.pinned === true) return state;
  if (id === undefined) return closeCard(state);
  if (state.card?.id === id) return state;
  return { ...state, card: { id, pinned: false } };
}

/** A click or tap on a unit: the card is pinned to it, swapping from whatever it was on. One card at a time. */
export function pinUnit(state: PlayerState, id: string): PlayerState {
  return { ...state, card: { id, pinned: true } };
}

/** Close the card, which is what a click or tap on bare plate does. Nothing at all when none is open. */
export function closeCard(state: PlayerState): PlayerState {
  if (state.card === undefined) return state;
  const next = { ...state };
  delete next.card;
  return next;
}

/**
 * Switch the level drawn, leaving the clock and the play state where they are:
 * only the renderer's choice of units changes, mid-playback included
 * (ADR-0017).
 *
 * The one thing it does close is a card on a unit the new level does not draw.
 * A card is anchored at its unit's glyph, so a card on a unit with no glyph
 * has nowhere to be; there is no re-pinning to a drawn ancestor, which is a
 * rule nobody asked for (#60). A unit that is absent at this instant has no
 * glyph either, whatever the level says of the roster (ADR-0024), so the same
 * rule closes the card on it.
 */
export function setLevel(battle: Battle, state: PlayerState, level: number): PlayerState {
  const next = { ...state, level };
  const id = state.card?.id;
  if (id === undefined) return next;
  const drawn = unitsAtLevel(battle.units, level).some((unit) => unit.id === id) && presentAt(battle, state.clock).has(id);
  return drawn ? next : closeCard(next);
}

/** Jump to a phase's own `t` — what a scrubber tick clicks to — keeping the play state. */
export function jumpToPhase(battle: Battle, state: PlayerState, index: number): PlayerState {
  const interval = clockIntervals(battle)[index];
  if (interval === undefined) throw new RangeError(`No phase at index ${index}`);
  return { ...state, clock: interval.startSeconds };
}
