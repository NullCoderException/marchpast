// PROTOTYPE: draft schema v1 types for the extraction test (wayfinder ticket #11).
// Hand-derived from ADR-0001..0006 and CONTEXT.md on 2026-09-05. Not the real
// source of truth; the real types plus runtime validator are written in the build.
// Fields marked DRAFT are not yet decided by the map (wind #14, licensing #12).

/** A point on the earth: WGS84 decimal degrees. */
export interface Position {
  lat: number;
  lon: number;
}

/** Battle-clock time of day on the battle date, 24-hour "HH:MM". */
export type BattleTime = string;

/** Degrees true, 0 = north, clockwise, 0 <= heading < 360. */
export type Heading = number;

/**
 * intact    = not in action
 * engaged   = in action, cohesion held
 * broken    = cohesion lost, no longer fighting as a body
 * destroyed = ceased to exist as a fighting unit
 */
export type UnitState = "intact" | "engaged" | "broken" | "destroyed";

/**
 * detachment = part of the unit going where the unit's own position does not
 * intent     = what the unit was ordered to do, whether or not it happened
 * A unit's own motion is never a move: the player tweens it from positions.
 */
export type MoveKind = "detachment" | "intent";

export interface Move {
  kind: MoveKind;
  /** Arrow head. May lie outside the extent. Tail is the unit itself. */
  to: Position;
}

/** DRAFT (ticket #14 open): wind as a phase property. */
export interface Wind {
  /** Direction the wind blows FROM, degrees true. */
  from: Heading;
  /** Free label for now, e.g. "light", "fresh", "gale". */
  strength?: string;
}

/** One unit's picture at the phase instant. */
export interface UnitSnapshot {
  /** Must match an id in Battle.units. */
  id: string;
  /** Centre point of the unit. */
  position: Position;
  heading: Heading;
  /** Formation label styled by the renderer, e.g. "column", "line", "crescent". Not geometry. */
  formation?: string;
  state: UnitState;
  /** Fraction 0..1 of opening fighting strength still fighting as part of the unit. Default 1.
   *  Damage to ships still in the fight does NOT reduce it; only ships that have left the unit do. */
  strength?: number;
  moves?: Move[];
}

/** A pointer into one entry of Battle.sources. */
export interface Reference {
  /** Key into Battle.sources. */
  source: string;
  /** Precise enough for a human to find the passage in the cited edition. */
  locator: string;
  /** Verbatim from the cited edition. */
  quote?: string;
  note?: string;
}

/**
 * The authored picture of every unit at one battle-clock instant `t`.
 * The player tweens positions and headings linearly to the next phase's `t`.
 * Everything else (state, strength, formation, caption, wind) steps at `t` and holds.
 */
export interface Phase {
  id: string;
  label: string;
  t: BattleTime;
  /** Battle-clock seconds per real second while this phase plays. */
  playback_rate: number;
  wind?: Wind;
  /** Narration shown verbatim; holds until the next phase. */
  caption: string;
  /** Author's reasoning about disputed readings. Never animated. */
  notes?: string;
  /** At least one. Vouches for the whole phase. */
  references: Reference[];
  /** Every unit in Battle.units, every phase. */
  units: UnitSnapshot[];
}

export interface Source {
  /** Short display label, e.g. "Collingwood's dispatch". */
  label: string;
  /** Title, author, edition. */
  work: string;
  url?: string;
  /** DRAFT (ticket #12 open). */
  licence?: string;
}

/** Battle-level roster entry; identity only, no per-phase data. */
export interface Unit {
  id: string;
  side: string;
  label: string;
}

export interface Extent {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Battle {
  schema_version: 1;
  title: string;
  /** Human-readable, e.g. "21 October 1805". */
  date: string;
  /** Fixed lat/lon bounding box for the whole playback. */
  extent: Extent;
  /** Scale-bar display unit. */
  scale_unit: "nmi" | "km";
  /** Optional relative path to a GeoJSON map file. */
  map?: string;
  /** When the last phase's picture stops holding. */
  end: BattleTime;
  sources: Record<string, Source>;
  units: Unit[];
  /** Strictly increasing `t`. */
  phases: Phase[];
}
