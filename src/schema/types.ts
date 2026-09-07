/**
 * Schema v2 for the two data files, the battle file and the map file.
 *
 * These types are the schema's source of truth; `docs/schema.md` is kept in
 * step with them. Field names are `snake_case`. Doc comments carry the
 * one-line meaning from the spec so the types read alone. Runtime checking
 * lives in `validateBattle.ts` and `validateMap.ts`.
 */
import type { Arm } from "./arms.ts";
import type { LicenseId } from "./licenses.ts";

export type { Arm } from "./arms.ts";
export type { LicenseId } from "./licenses.ts";

/**
 * A 24-hour `"HH:MM"` battle-clock time, `00:00` to `23:59`, read on the day
 * its `day` names. Nothing finer. A reading, never an instant: no timezone,
 * never UTC, never a `Date` (ADR-0002, ADR-0013).
 */
export type BattleTime = string;

/** A non-negative integer counting days from the battle's first day at `0` (ADR-0013). */
export type Day = number;

/** An angle in degrees true: `0` is north, clockwise, `0 <= x < 360`. Decimals allowed so the sixteen compass points round-trip (WNW is `292.5`). */
export type DegreesTrue = number;

/** Where a unit's force is directed, in degrees true: its course while it moves, the way its line faces while it fights (ADR-0019). */
export type Heading = DegreesTrue;

/**
 * WGS84 decimal degrees, north and east positive, `-90 <= lat <= 90`
 * (battle-file convention, ADR-0001). Longitude is continuous rather than
 * folded: it is bounded against the frame the `Extent` fixes, within 180
 * degrees of that frame's centre, and not by a flat `-180..180`.
 */
export interface Position {
  lat: number;
  lon: number;
}

/**
 * The lat/lon bounding box the battle plays inside, fixed for the whole
 * playback. `south < north`; `-180 <= west <= 180` and
 * `west < east <= west + 360`.
 *
 * It also fixes the **frame** every longitude in the file is read in: `west`
 * is spelled canonically and `east` runs east of it, so a battle crossing the
 * antimeridian writes an `east` past 180 (Midway is `west: 173, east: 187.25`).
 */
export interface Extent {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** The first day in machine form, for the Library to sort on. Only ever compared, never counted from (ADR-0013). */
export interface SortDate {
  /** Ordinary historical numbering, BC negative and no year zero: Cannae is `-216`. */
  year: number;
  /** `1` to `12`. */
  month: number;
  /** `1` to `31`. */
  day: number;
}

/** The battle file, `data/battles/<name>.json`: the roster and the phases that play over an optional map. */
export interface Battle {
  /** Rejected if anything but `2`. */
  schema_version: 2;
  /** Display title, e.g. `"The Battle of Trafalgar"`. */
  title: string;
  /** One plain sentence the battle carries wherever it is named but not played: the Library's list, the Picker. Display only (ADR-0011). */
  summary: string;
  /** Human-readable date of each day the battle spans, in order, one entry per day. Display only; never parsed (ADR-0013). */
  dates: string[];
  /** The first day as integers, for the Library to sort on. Restates `dates[0]`; nothing checks the two agree. */
  sort_date: SortDate;
  /** The bounding box the renderer fits to the canvas, letterboxing the rest. */
  extent: Extent;
  /** The unit the renderer's scale bar is drawn in. */
  scale_unit: "nmi" | "km";
  /** Bare name of the map file, resolved to `data/maps/<map>.geojson`. Never a path. Absent means plain parchment. */
  map?: string;
  /** When the last phase's picture stops holding, on `end_day`. Later than the last phase on the pair (`day`, `t`). */
  end: BattleTime;
  /** Which day `end` falls on. Default the last phase's `day`; never less than it. */
  end_day?: Day;
  /** The battle file's own licence. `CC-BY-4.0` for files under `data/battles/`. */
  license: LicenseId;
  /** Credit line naming the licensor. Required when the licence class is attribution or share-alike. */
  attribution?: string;
  /** The works the battle draws on, keyed by a short id such as `collingwood-dispatch`. Unreferenced entries are allowed. */
  sources: Record<string, Source>;
  /** One display name per depth of the unit tree, from the roots down. Required when any unit has a `parent`, forbidden otherwise (ADR-0017). */
  levels?: string[];
  /** The roster: identity only, no per-phase data. At least one unit; ids unique; a parent precedes its children. */
  units: Unit[];
  /** At least one phase, in battle-clock order on (`day`, `t`). */
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
  /** Unique across the roster; referenced from every phase and from `parent`. */
  id: string;
  /** The side's display name, e.g. `"British"`. Sides are ordered by first appearance in `units[]`. A unit's side equals its parent's. */
  side: string;
  /** The unit's display name, e.g. `"Weather column"`. */
  label: string;
  /** A shorter name the label pass may fall back to when the full one will not fit. Never derived from `label` or `commander`. */
  short_label?: string;
  /** Display only: the person the sources name the unit by, e.g. `"Nelson"`. A change of command is caption matter. */
  commander?: string;
  /** What the unit is made of. Identity, never per-phase state; a closed list kept in `arms.ts` (ADR-0015). */
  arm: Arm;
  /** The id of the roster unit this one belongs to: an earlier entry with the same `side`. Nothing is computed between the two (ADR-0017). */
  parent?: string;
}

/** The authored picture of every unit at one battle-clock instant, with the caption and wind that hold until the next phase. */
export interface Phase {
  /** Unique across phases, e.g. `"lee-column-breaks"`. */
  id: string;
  /** Short title shown in the caption band. */
  label: string;
  /** Which day of the battle `t` falls on. Default `0`; the first phase is on day `0` (ADR-0013). */
  day?: Day;
  /** The instant this picture is true, on `day`. Strictly increasing across `phases` on the pair (`day`, `t`). */
  t: BattleTime;
  /** Battle-clock seconds per real second while this phase plays; `> 0`. */
  playback_rate: number;
  /** All or nothing across phases. Absent means the battle does not track wind; it never means calm. */
  wind?: Wind;
  /** Narration shown verbatim, holding until the next phase. */
  caption: string;
  /** The author's account of what this phase rests on. Surfaced on demand; never animated. Nothing else marks a reading as conjectural (ADR-0027). */
  notes: string;
  /** Pointers into `sources` vouching for the phase as a whole. At least one. */
  references: Reference[];
  /**
   * Marks the phase whose picture stands for the battle: the build renders the
   * library's thumbnail and the battle page's social card from it. At most one
   * phase per battle carries it, and it is only ever `true` — a phase that is
   * not the still omits the field (ADR-0025, ADR-0028).
   */
  still?: true;
  /**
   * One snapshot for every roster unit that exists on the plate at this
   * instant, parents and children alike, no duplicates and no id off the
   * roster. A roster unit missing from a phase is **absent**: it does not
   * exist on the plate then, and the phase says nothing else about it
   * (ADR-0024).
   */
  units: UnitSnapshot[];
}

/** How hard the wind blows, in the words the sources use. Not Beaufort, not knots. */
export type WindForce = "calm" | "light" | "moderate" | "fresh" | "gale";

/** The wind for a phase; steps at the phase instant, never tweened. */
export interface Wind {
  /** Degrees true the wind blows *from*. Present if and only if `force` is not `calm`. */
  from?: DegreesTrue;
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

/**
 * `column` is signs in file along the heading; `line` is abreast across it;
 * `mass` is in ranks, four across and two deep. A shape and never a condition:
 * a fleet at anchor is drawn in the shape it lies in. One flat list for every
 * arm, never cross-checked against it (ADR-0016).
 */
export type Formation = "column" | "line" | "mass";

/**
 * `intact`: not yet in action. `engaged`: in the action or its aftermath,
 * cohesion held, under a flag of truce included. `broken`: no longer acting as
 * one body, whether it flees or fights on in fragments. `destroyed`: ceased to
 * exist as a fighting unit, whatever became of its men. A condition and never a
 * place (ADR-0018, ADR-0019).
 */
export type UnitState = "intact" | "engaged" | "broken" | "destroyed";

/** One unit's picture at the phase instant. */
export interface UnitSnapshot {
  /** A roster `units[].id`. */
  id: string;
  /** The unit's centre point. Tweens linearly to the next phase. A unit that leaves the field keeps a position on the plate. */
  position: Position;
  /** Where the unit's force is directed: its course while it moves, the way its guns or its line face while it fights. Tweens along the shortest arc. */
  heading: Heading;
  /** Steps. */
  formation: Formation;
  /** Steps. Battle-neutral: `struck` is `destroyed`. */
  state: UnitState;
  /** Fraction of the unit's opening fighting strength still fighting as part of the unit, `0 <= x <= 1`. Never a casualty count. Default `1`. Steps; never tweens. */
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

/** The geometry of a kind drawn as an area: land and a shoal. */
export type AreaGeometry =
  | { type: "Polygon"; coordinates: LonLat[][] }
  | { type: "MultiPolygon"; coordinates: LonLat[][][] };

/** The geometry of a kind drawn as a line: a river, a contour and a rampart. */
export type LineGeometry =
  | { type: "LineString"; coordinates: LonLat[] }
  | { type: "MultiLineString"; coordinates: LonLat[][] };

/** The geometry of a kind drawn at a point: a place and a work. */
export type PointGeometry = { type: "Point"; coordinates: LonLat };

/** The map file, `data/maps/<name>.geojson`: a GeoJSON FeatureCollection with two foreign members and nothing else. */
export interface MapFile {
  type: "FeatureCollection";
  /** Only the seven feature kinds. */
  features: MapFeature[];
  /** The map file's own licence, share-alike allowed: a map is an independent database the battle only points at. */
  license: LicenseId;
  /** The credit line, always drawn in the frame. Required when the licence class demands it. */
  attribution?: string;
}

/**
 * The seven feature kinds (schema.md 3.2). A feature's `properties` carry only
 * the keys listed for its kind: natural features and a rampart carry no name,
 * a contour carries its level, named things carry a name.
 */
export type MapFeature =
  | LandFeature
  | RiverFeature
  | ShoalFeature
  | ContourFeature
  | PlaceFeature
  | WorkFeature
  | RampartFeature;

/** Land. Everything not covered by a land polygon is sea. An island, artificial or not, is `land`. */
export interface LandFeature {
  type: "Feature";
  properties: { kind: "land" };
  geometry: AreaGeometry;
}

/**
 * A watercourse, drawn as a line: two banks with the sea's material between.
 * No name and no width. Where the ancient channel is unknown, the modern line
 * stands in and the battle's caption says so.
 */
export interface RiverFeature {
  type: "Feature";
  properties: { kind: "river" };
  geometry: LineGeometry;
}

/**
 * Water too shallow to fight over, drawn as an outline with a fine stipple:
 * the Aboukir shoal, the Middle Ground. No name and no depth; neither land nor
 * open sea.
 */
export interface ShoalFeature {
  type: "Feature";
  properties: { kind: "shoal" };
  geometry: AreaGeometry;
}

/**
 * A line joining ground at one height. The set of them is how a map holds
 * elevation; nothing else does. `MultiLineString` because `gdal_contour` emits
 * many segments per level. No index flag: the renderer weights every fifth
 * level from the levels it is given.
 */
export interface ContourFeature {
  type: "Feature";
  /** `elevation` is metres, `-500 <= x <= 9000` (ADR-0012). */
  properties: { kind: "contour"; elevation: number };
  geometry: LineGeometry;
}

/**
 * A named point drawn as a label so captions can refer to it: Cadiz, Cape
 * Trafalgar, the Aufidus, the Middle Ground. The one naming mechanism: a river
 * or a shoal that must be labelled gets a place on it.
 */
export interface PlaceFeature {
  type: "Feature";
  properties: { kind: "place"; name: string };
  geometry: PointGeometry;
}

/**
 * A named built thing on the ground, drawn as a plan sign with its name in
 * small capitals: a fort, a battery, a camp. Trekroner, Abu Qir castle, the
 * Roman camps. A point, never a polygon; independent of any `land` under it.
 */
export interface WorkFeature {
  type: "Feature";
  properties: { kind: "work"; name: string };
  geometry: PointGeometry;
}

/**
 * A built line on the ground, drawn with its ditch and the teeth on the side
 * it faces: Alesia's contravallation and circumvallation, a trench line, a
 * wall, a berm. The kind names the drawn line, not what it was made of, and
 * the caption says which. Nameless like a river — one a caption must name gets
 * a `place` on it — and no width.
 *
 * **The direction the line is drawn in is the side it faces**: the teeth fall
 * on the right of its direction of travel. Winding is meaning for this kind
 * and for no other, and nothing checks it (schema.md 3.3, ADR-0026).
 */
export interface RampartFeature {
  type: "Feature";
  properties: { kind: "rampart" };
  geometry: LineGeometry;
}
