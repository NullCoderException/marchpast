/**
 * PROTOTYPE: draft schema v1 types, written as INPUT to the extraction test
 * (GitHub issue #11). Not the schema's source of truth; that lives in src/
 * once v0.1 is built. Derived from ADR-0001 to ADR-0006 on 2026-09-05.
 *
 * Fields marked DRAFT are not yet decided by an ADR and are here only so the
 * model has somewhere to put the information; the test partly exists to see
 * what it does with them.
 */

/** A battle file: data/battles/<id>.json. */
export interface Battle {
  /** Kebab-case identifier, matches the file name. */
  id: string;
  /** Display title, e.g. "Battle of Trafalgar". */
  title: string;
  /** Human-readable date of the battle day, e.g. "21 October 1805" (ADR-0002). */
  date: string;
  /** Lat/lon bounding box the battle plays inside, fixed for the whole playback (ADR-0001). */
  extent: Extent;
  /** Display unit for the renderer's scale bar; the only unit-bearing field in v1 (ADR-0001). */
  scale_unit: "nmi" | "km";
  /** Relative path to an optional GeoJSON map file: land polygons and named places (ADR-0005). */
  map?: string;
  /** Battle-clock time, "HH:MM", at which the last phase stops holding its picture (ADR-0002). */
  end: string;
  /** Works the battle draws on, declared once and keyed by a short id (ADR-0006). */
  sources: Record<string, Source>;
  /** DRAFT: every unit the battle follows, declared once with the facts that never change. */
  units: UnitDeclaration[];
  /** Snapshots in strictly increasing t (ADR-0002). */
  phases: Phase[];
}

/** WGS84 decimal degrees. North and east positive (ADR-0001). */
export interface Extent {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** A unit's centre point, WGS84 decimal degrees (ADR-0001). */
export interface Position {
  lat: number;
  lon: number;
}

/** A work the battle draws on (ADR-0006). */
export interface Source {
  /** Short display label the player may show under a caption, e.g. "Collingwood's dispatch". */
  label: string;
  /** Title, author, edition. */
  work: string;
  url?: string;
  /** DRAFT: contents fixed by the data-licensing decision; free string for now. */
  license?: string;
}

/** DRAFT: the facts about a unit that hold for the whole battle. */
export interface UnitDeclaration {
  /** Kebab-case identifier referenced from every phase. */
  id: string;
  /** Display label, e.g. "Weather column (Nelson)". */
  label: string;
  /** DRAFT: which side the unit fights for; free string, e.g. "british". */
  side: string;
}

/** The authored picture of every unit at one battle-clock instant (ADR-0002). */
export interface Phase {
  /** Kebab-case identifier. */
  id: string;
  /** Short display label. */
  label: string;
  /** Battle-clock instant, "HH:MM" 24-hour on the battle day. The phase holds until the next phase's t (ADR-0002). */
  t: string;
  /** Battle-clock seconds elapsed per real second while this phase plays (ADR-0002). */
  playback_rate: number;
  /** DRAFT: wind during the phase; direction only for now (the wind decision is open). */
  wind?: Wind;
  /** Narration text, one plain string, shown verbatim (ADR-0006). */
  caption: string;
  /** Author's reasoning about disputed readings; never animated (ADR-0006). */
  notes?: string;
  /** At least one; vouches for the whole phase (ADR-0006). */
  references: Reference[];
  /** Every unit declared in the battle, exactly once each (ADR-0002). */
  units: UnitSnapshot[];
}

/** DRAFT (ADR-0005 makes wind a phase property; encoding is undecided). */
export interface Wind {
  /** Degrees true the wind blows FROM, meteorological convention, 0 to 360. */
  from: number;
}

/** One unit in one phase. Geometry tweens to the next phase; everything else steps (ADR-0002, ADR-0003). */
export interface UnitSnapshot {
  /** Id of a UnitDeclaration in Battle.units. */
  unit: string;
  position: Position;
  /** Degrees true the unit's front faces, 0 to 360 (ADR-0001). */
  heading: number;
  /** A label the renderer styles, not geometry, e.g. "column", "line", "crescent" (ADR-0001). */
  formation?: string;
  /** intact: not in action. engaged: in action, cohesion held. broken: cohesion lost. destroyed: ceased to exist as a fighting unit (ADR-0003). */
  state: "intact" | "engaged" | "broken" | "destroyed";
  /** Fraction, 0 to 1, of opening fighting strength still fighting as part of the unit. Default 1. Damage to ships still fighting does not reduce it (ADR-0003). */
  strength?: number;
  /** Authored arrows for what the unit's own position cannot show (ADR-0004). Empty by default. */
  moves?: Move[];
}

/** An arrow from the unit toward a position (ADR-0004). The tail is the unit; only the head is stored. */
export interface Move {
  /** detachment: part of the unit going where the unit does not. intent: what the unit was ordered to do, whether or not it happened. */
  kind: "detachment" | "intent";
  /** May lie outside the extent. */
  to: Position;
}

/** A phase's pointer into one source (ADR-0006). */
export interface Reference {
  /** Key into Battle.sources. */
  source: string;
  /** Precise enough for a human to find the passage in the cited edition. */
  locator: string;
  /** Verbatim from the cited edition. */
  quote?: string;
  note?: string;
}
