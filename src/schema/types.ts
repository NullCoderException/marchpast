/**
 * Schema v1 for the two data files, the battle file and the map file.
 *
 * These types are the schema's source of truth; `docs/schema.md` is kept in
 * step with them. Field names are `snake_case`. Doc comments carry the
 * one-line meaning from the spec so the types read alone. Runtime checking
 * lives in `validateBattle.ts` and `validateMap.ts`.
 */
import type { LicenseId } from "./licenses";

export type { LicenseId } from "./licenses";

/** A 24-hour `"HH:MM"` battle-clock time on the battle's date, `00:00` to `23:59`. Nothing finer (ADR-0002). */
export type BattleTime = string;

/** Degrees true: `0` is north, clockwise, `0 <= x < 360`. Decimals allowed so the sixteen compass points round-trip (WNW is `292.5`). */
export type Heading = number;

/** WGS84 decimal degrees, north and east positive, `-90 <= lat <= 90`, `-180 <= lon <= 180` (battle-file convention, ADR-0001). */
export interface Position {
  lat: number;
  lon: number;
}

/** The lat/lon bounding box the battle plays inside, fixed for the whole playback. `south < north`, `west < east`. */
export interface Extent {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** The battle file, `data/battles/<name>.json`: the roster and the phases that play over an optional map. */
export interface Battle {
  /** Rejected if anything but `1`. */
  schema_version: 1;
  /** Display title, e.g. `"The Battle of Trafalgar"`. */
  title: string;
  /** Human-readable battle date, e.g. `"21 October 1805"`. Display only; not parsed. */
  date: string;
  /** The bounding box the renderer fits to the canvas, letterboxing the rest. */
  extent: Extent;
  /** The unit the renderer's scale bar is drawn in. */
  scale_unit: "nmi" | "km";
  /** Bare name of the map file, resolved to `data/maps/<map>.geojson`. Never a path. Absent means plain parchment. */
  map?: string;
  /** When the last phase's picture stops holding. Later than the last phase's `t`. */
  end: BattleTime;
  /** The battle file's own licence. `CC-BY-4.0` for files under `data/battles/`. */
  license: LicenseId;
  /** Credit line naming the licensor. Required when the licence class is attribution or share-alike. */
  attribution?: string;
  /** The works the battle draws on, keyed by a short id such as `collingwood-dispatch`. Unreferenced entries are allowed. */
  sources: Record<string, Source>;
  /** The roster: identity only, no per-phase data. At least one unit; ids unique. */
  units: Unit[];
  /** At least one phase, in battle-clock order. */
  phases: Phase[];
}

/** One work the battle draws on. */
export interface Source {
  /** Short display label the player may show without parsing prose, e.g. `"Collingwood's dispatch"`. */
  label: string;
  /** Title, author, edition: enough to identify the cited edition. */
  work: string;
  /** Where to read it; a transcription's own licence does not make the text a share-alike source. */
  url?: string;
  /** The licence of the work itself, not of the transcription or scan. */
  license: LicenseId;
  /** Evidence for the licence: a Commons template string, a Gutenberg header, the reason a transcription is treated as public domain. */
  license_note?: string;
}

/** A roster entry: a body of force the battle follows as one marker. */
export interface Unit {
  /** Unique across the roster; referenced from every phase. */
  id: string;
  /** The side's display name, e.g. `"British"`. Sides are ordered by first appearance in `units[]`. */
  side: string;
  /** The unit's display name, e.g. `"Weather column"`. */
  label: string;
  /** Display only: the person the sources name the unit by, e.g. `"Nelson"`. A change of command is caption matter. */
  commander?: string;
}

/** The authored picture of every unit at one battle-clock instant, with the caption and wind that hold until the next phase. */
export interface Phase {
  /** Unique across phases, e.g. `"lee-column-breaks"`. */
  id: string;
  /** Short title shown in the caption band. */
  label: string;
  /** The instant this picture is true. Strictly increasing across `phases`. */
  t: BattleTime;
  /** Battle-clock seconds per real second while this phase plays; `> 0`. */
  playback_rate: number;
  /** All or nothing across phases. Absent means the battle does not track wind; it never means calm. */
  wind?: Wind;
  /** Narration shown verbatim, holding until the next phase. */
  caption: string;
  /** The author's reasoning about the sources for this phase. Surfaced on demand; never animated. */
  notes?: string;
  /** Pointers into `sources` vouching for the phase as a whole. At least one. */
  references: Reference[];
  /** Exactly one snapshot for every roster unit, no more, no fewer, no duplicates. */
  units: UnitSnapshot[];
}

/** How hard the wind blows, in the words the sources use. Not Beaufort, not knots. */
export type WindForce = "calm" | "light" | "moderate" | "fresh" | "gale";

/** The wind for a phase; steps at the phase instant, never tweened. */
export interface Wind {
  /** Degrees true the wind blows *from*. Present if and only if `force` is not `calm`. */
  from?: Heading;
  force: WindForce;
}

/** A phase's pointer into one source. */
export interface Reference {
  /** A key of the battle's `sources`. */
  source: string;
  /** Free text precise enough for a human to find the passage in the cited edition. */
  locator: string;
  /** Verbatim from the cited edition, for checking the caption against the source, not display. */
  quote?: string;
  /** Anything about this reference in particular. */
  note?: string;
}

/** `column` is ships or men in line ahead along the heading; `line` is abreast across it. A styled label, not geometry. */
export type Formation = "column" | "line";

/** `intact`: not yet in action. `engaged`: in action, cohesion held. `broken`: cohesion lost. `destroyed`: ceased to exist as a fighting unit. */
export type UnitState = "intact" | "engaged" | "broken" | "destroyed";

/** One unit's picture at the phase instant. */
export interface UnitSnapshot {
  /** A roster `units[].id`. */
  id: string;
  /** The unit's centre point. Tweens linearly to the next phase. */
  position: Position;
  /** The direction the unit's front faces. Tweens along the shortest arc. */
  heading: Heading;
  /** Steps. */
  formation: Formation;
  /** Steps. Battle-neutral: `struck` is `destroyed`. */
  state: UnitState;
  /** Fraction of the unit's opening fighting strength still fighting as part of the unit, `0 <= x <= 1`. Default `1`. Steps. */
  strength?: number;
  /** Authored arrows for what the position cannot show. Default empty. */
  moves?: Move[];
}

/** An authored arrow from the unit toward `to`, for what the unit's own position cannot show. */
export interface Move {
  /** `detachment`: part of the unit going where the unit does not. `intent`: what the unit was ordered to do, whether or not it happened. */
  kind: "detachment" | "intent";
  /** The arrow head. May lie outside the extent; the renderer clips. Does not tween. */
  to: Position;
}

/** A GeoJSON position in the map file: `[lon, lat]`, WGS84. Exactly two elements (ADR-0005). */
export type LonLat = [lon: number, lat: number];

/** The map file, `data/maps/<name>.geojson`: a GeoJSON FeatureCollection with two foreign members and nothing else. */
export interface MapFile {
  type: "FeatureCollection";
  /** Only `land` and `place` features. */
  features: MapFeature[];
  /** The map file's own licence, share-alike allowed: a map is an independent database the battle only points at. */
  license: LicenseId;
  /** The credit line, always drawn in the frame. Required when the licence class demands it. */
  attribution?: string;
}

export type MapFeature = LandFeature | PlaceFeature;

/** Land. Everything not covered by a land polygon is sea. */
export interface LandFeature {
  type: "Feature";
  properties: { kind: "land" };
  geometry:
    | { type: "Polygon"; coordinates: LonLat[][] }
    | { type: "MultiPolygon"; coordinates: LonLat[][][] };
}

/** A named point drawn as a label so captions can refer to it: Cadiz, Cape Trafalgar. */
export interface PlaceFeature {
  type: "Feature";
  properties: { kind: "place"; name: string };
  geometry: { type: "Point"; coordinates: LonLat };
}
