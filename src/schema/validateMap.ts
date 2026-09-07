/**
 * Runtime validator for the map file (schema.md section 3): a GeoJSON
 * FeatureCollection with exactly two foreign members, holding only the seven
 * feature kinds — `land`, `river`, `shoal`, `contour`, `place`, `work` and
 * `rampart` — each with a geometry its kind allows and only the properties its
 * kind lists, every coordinate a `[lon, lat]` pair in range and nothing else
 * anywhere.
 *
 * Three tables are what a kind is: the geometries it allows, the properties it
 * carries beyond `kind`, and how each of those properties is read. A seventh
 * kind is one row in the first two; a property no kind carries yet is one
 * more reader. `rampart` was that seventh kind and cost exactly that, which is
 * the promise ADR-0026 weighed the alternatives against (#167).
 *
 * Never throws on bad data; collects every error with a JSON-pointer path.
 * Ring winding and polygon validity are not checked (schema.md 3.3).
 */
import { readAttribution, readLicense } from "./licenseFields.ts";
import type { LonLat, MapFeature, MapFile } from "./types.ts";
import {
  allDefined,
  appendPointer,
  ELEVATION_BOUNDS,
  Errors,
  LAT_BOUNDS,
  type NumberBounds,
  ObjectReader,
  readNumber,
  type ValidationError,
  withoutUndefined,
} from "./validation.ts";

export type MapValidation = { ok: true; map: MapFile } | { ok: false; errors: ValidationError[] };

/**
 * WGS84 longitude for a map file. A map has no extent of its own, so it can
 * never use the battle file's frame rule (2.10 rule 2); it takes a flat range
 * of its own instead.
 *
 * Still the folded `-180..180` the v2 of 2026-09-06 shipped. schema.md 3.3
 * rule 6 has already widened it to `-180..360`, for a map serving a battle
 * that crosses the antimeridian, and #167 brings this line to it.
 */
const MAP_LON_BOUNDS: NumberBounds = { min: -180, max: 180 };

type MapKind = MapFeature["properties"]["kind"];
type Geometry = MapFeature["geometry"];
type GeometryType = Geometry["type"];

/**
 * Rule 6's longitude, wider than the canonical `-180..180`: a map's
 * coordinates are written in the frame of the battle it serves (ADR-0001 as
 * amended, schema.md 3.2), so Midway's atoll is `182.63` and not `-177.37`.
 *
 * Wider than the bound the battle file is getting, too, and deliberately: a
 * position there is read against its own extent's centre longitude (schema.md
 * 2.10 rule 2, landing with #166). This validator sees a file and never a
 * pairing, so it cannot narrow the same way — and it need not, because a
 * mis-spelled map coordinate is clipped and costs a piece of the picture,
 * where a mis-spelled position lies about where a force was.
 */
const MAP_LON_BOUNDS: NumberBounds = { min: -180, max: 360 };

const AREA_GEOMETRIES = ["Polygon", "MultiPolygon"] as const;
const LINE_GEOMETRIES = ["LineString", "MultiLineString"] as const;
const POINT_GEOMETRIES = ["Point"] as const;

/** Rule 4: the geometry types each kind allows. Areas, lines and points, in the order of schema.md 3.2. */
const KIND_GEOMETRIES: Record<MapKind, readonly GeometryType[]> = {
  land: AREA_GEOMETRIES,
  river: LINE_GEOMETRIES,
  shoal: AREA_GEOMETRIES,
  contour: LINE_GEOMETRIES,
  place: POINT_GEOMETRIES,
  work: POINT_GEOMETRIES,
  rampart: LINE_GEOMETRIES,
};

/** Rule 5: how each property beyond `kind` is read, one entry per property name any kind carries. */
const PROPERTY_READERS = {
  /** Metres above sea level, bounded either side (schema.md 3.2). */
  elevation: (obj: ObjectReader) => obj.number("elevation", ELEVATION_BOUNDS),
  /** The label a caption refers to: present, a string, and not empty. */
  name: (obj: ObjectReader, kind: MapKind) => {
    const name = obj.string("name");
    if (name === undefined) return undefined;
    if (name !== "") return name;
    obj.errors.add(obj.at("name"), `expected a non-empty ${kind} name`);
    return undefined;
  },
} as const;

type PropertyName = keyof typeof PROPERTY_READERS;

/** Rules 5 and 7: what each kind carries beyond `kind`. Natural features and a rampart carry nothing; a contour its level; named things a name. */
const KIND_PROPERTIES: Record<MapKind, readonly PropertyName[]> = {
  land: [],
  river: [],
  shoal: [],
  contour: ["elevation"],
  place: ["name"],
  work: ["name"],
  rampart: [],
};

const KINDS = Object.keys(KIND_GEOMETRIES) as MapKind[];

/** The geometries allowed when the kind itself did not read, so a bad kind reports once rather than twice. */
const ALL_GEOMETRIES: readonly GeometryType[] = [...AREA_GEOMETRIES, ...LINE_GEOMETRIES, ...POINT_GEOMETRIES];

/** Nesting depth of `coordinates` below a single `[lon, lat]` position, per geometry type. */
const COORDINATE_DEPTH: Record<GeometryType, number> = {
  Point: 0,
  LineString: 1,
  MultiLineString: 2,
  Polygon: 2,
  MultiPolygon: 3,
};

export function validateMap(json: unknown): MapValidation {
  const errors = new Errors();
  const map = readMap(json, errors);
  if (map === undefined || errors.any) return { ok: false, errors: errors.list };
  return { ok: true, map };
}

/** Rules 1 and 2: the collection level. */
function readMap(json: unknown, errors: Errors): MapFile | undefined {
  const obj = ObjectReader.of(json, "", errors, ["type", "features", "license", "attribution"]);
  if (obj === undefined) return undefined;
  const type = obj.oneOf("type", ["FeatureCollection"]);
  const features = obj.array("features", (value, path) => readFeature(value, path, errors));
  const license = readLicense(obj);
  const attribution = readAttribution(obj, license);
  if (type === undefined || features === undefined || !allDefined(features.items) || license === undefined) {
    return undefined;
  }
  return withoutUndefined({ type, features: features.items, license, attribution });
}

/** Rule 3: one feature, its properties and geometry read against each other. */
function readFeature(value: unknown, path: string, errors: Errors): MapFeature | undefined {
  const obj = ObjectReader.of(value, path, errors, ["type", "properties", "geometry"]);
  if (obj === undefined) return undefined;
  const type = obj.oneOf("type", ["Feature"]);
  const properties = readProperties(obj);
  const geometry = readGeometry(obj, properties?.kind);
  if (type === undefined || properties === undefined || geometry === undefined) return undefined;
  // `readGeometry` accepted only a geometry the kind allows, so this pair is one
  // of the six features; the two unions are read apart, so the compiler cannot see it.
  return { type, properties, geometry } as MapFeature;
}

/** Rules 3, 5 and 7: `properties` carries a known `kind` and only what `KIND_PROPERTIES` lists for it. */
function readProperties(feature: ObjectReader): MapFeature["properties"] | undefined {
  const obj = feature.object("properties", (raw) => allowedProperties(raw["kind"]));
  if (obj === undefined) return undefined;
  const kind = obj.oneOf("kind", KINDS);
  if (kind === undefined) return undefined;
  const properties: Record<string, unknown> = { kind };
  for (const property of KIND_PROPERTIES[kind]) properties[property] = PROPERTY_READERS[property](obj, kind);
  if (Object.values(properties).some((value) => value === undefined)) return undefined;
  // Every property the kind lists read cleanly and nothing else got through the
  // allowed keys, so this is that kind's `properties`.
  return properties as MapFeature["properties"];
}

/** The keys a `properties` object may carry, read off its own `kind` so anything else is reported as an unknown key. */
function allowedProperties(kind: unknown): readonly string[] {
  const known = KINDS.find((candidate) => candidate === kind);
  return known === undefined ? ["kind"] : ["kind", ...KIND_PROPERTIES[known]];
}

/** Rules 4 and 6: a non-null geometry of a type the kind allows, with `[lon, lat]` coordinates nested to that type's depth. */
function readGeometry(feature: ObjectReader, kind: MapKind | undefined): Geometry | undefined {
  const raw = feature.raw("geometry");
  if (raw === undefined) return undefined;
  if (raw === null) {
    feature.errors.add(feature.at("geometry"), "a null geometry is not allowed");
    return undefined;
  }
  const obj = ObjectReader.of(raw, feature.at("geometry"), feature.errors, ["type", "coordinates"]);
  if (obj === undefined) return undefined;
  const type = obj.oneOf("type", kind === undefined ? ALL_GEOMETRIES : KIND_GEOMETRIES[kind]);
  const rawCoordinates = obj.raw("coordinates");
  if (type === undefined || rawCoordinates === undefined) return undefined;
  const coordinates = readCoordinates(rawCoordinates, obj.at("coordinates"), COORDINATE_DEPTH[type], obj.errors);
  if (coordinates === undefined) return undefined;
  return { type, coordinates } as Geometry;
}

/** Arrays nested `depth` deep, bottoming out in `[lon, lat]` positions. Every level is checked; `undefined` if any part failed. */
function readCoordinates(value: unknown, path: string, depth: number, errors: Errors): unknown {
  if (depth === 0) return readLonLat(value, path, errors);
  if (!Array.isArray(value)) {
    errors.add(path, "expected an array of coordinates");
    return undefined;
  }
  const items = value.map((item, index) => readCoordinates(item, appendPointer(path, index), depth - 1, errors));
  return items.every((item) => item !== undefined) ? items : undefined;
}

/** One position: exactly `[lon, lat]`, both finite and in range. A third element is rejected. */
function readLonLat(value: unknown, path: string, errors: Errors): LonLat | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    errors.add(path, "expected a [lon, lat] pair with exactly two elements");
    return undefined;
  }
  const lon = readNumber(value[0], appendPointer(path, 0), MAP_LON_BOUNDS, errors);
  const lat = readNumber(value[1], appendPointer(path, 1), LAT_BOUNDS, errors);
  if (lon === undefined || lat === undefined) return undefined;
  return [lon, lat];
}
