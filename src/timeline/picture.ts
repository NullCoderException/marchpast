/**
 * The Picture: what the timeline hands the renderer for one battle-clock
 * instant. Landed ahead of both so the timeline slice (#21) produces it and
 * the renderer slice (#22) consumes it without either inventing its own.
 *
 * Rules the shape encodes (ADR-0002, schema.md 2.10): geometry tweens,
 * everything else steps. `position` and `heading` are interpolated within the
 * phase's interval; every other field is the current phase's value verbatim.
 * The last phase holds its own snapshot, untweened, until `end`.
 */
import type { Formation, Heading, Move, Phase, Position, Reference, UnitState, Wind } from "../schema/types.ts";

/** Battle-clock seconds since midnight on the battle's date. */
export type ClockSeconds = number;

/** The current interval's tween endpoints for one unit, so the renderer can draw the arrow ahead. Absent in the last phase. */
export interface Track {
  /** The unit's position at the interval's start (the current phase's snapshot). */
  from: Position;
  /** The unit's position at the interval's end (the next phase's snapshot). */
  to: Position;
}

/** One unit at the instant. */
export interface UnitPicture {
  /** The roster `units[].id`. */
  id: string;
  /** Tweened linearly in lat and lon degrees across the interval. */
  position: Position;
  /** Tweened along the shortest arc; an exact 180-degree difference resolves clockwise. Always in `[0, 360)`. */
  heading: Heading;
  /** Steps. */
  formation: Formation;
  /** Steps. */
  state: UnitState;
  /** Steps; the snapshot's value with the schema default of `1` applied. */
  strength: number;
  /** Steps; the snapshot's value with the schema default of `[]` applied. */
  moves: Move[];
  /** The tween's endpoints when there is a next phase; absent in the last phase. */
  track?: Track;
}

/** Everything the renderer draws for one instant. */
export interface Picture {
  /** Index into `battle.phases` of the phase whose interval holds `clock`. */
  phaseIndex: number;
  /** That phase, for anything the renderer reads straight from it. */
  phase: Phase;
  /** The instant, in battle-clock seconds since midnight. */
  clock: ClockSeconds;
  /** Every roster unit, in roster order. */
  units: UnitPicture[];
  /** Steps. Absent when the battle does not track wind. */
  wind?: Wind;
  /** Steps: the current phase's caption. */
  caption: string;
  /** Steps: the current phase's label. */
  label: string;
  /** Steps: the current phase's references. */
  references: Reference[];
  /** Steps: the current phase's notes, when it has them. */
  notes?: string;
}
