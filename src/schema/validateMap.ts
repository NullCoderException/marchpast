/**
 * Runtime validator for the map file (schema.md section 3): a GeoJSON
 * FeatureCollection with exactly two foreign members, holding only the six
 * feature kinds — `land`, `river`, `shoal`, `contour`, `place` and `work` —
 * each with a geometry its kind allows and only the properties its kind lists,
 * every coordinate a `[lon, lat]` pair in range and nothing else anywhere.
 *
 * The two tables below are what a kind is: one row in each adds a seventh.
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
  LON_BOUNDS,
  ObjectReader,
  readNumber,
  type ValidationError,
  withoutUndefined,
} from "./validation.ts";

export type MapValidation = { ok: true; map: MapFile } | { ok: false; errors: ValidationError[] };

type MapKind = MapFeature["properties"]["kind"];
type Geometry = MapFeature["geometry"];
type GeometryType = Geometry["type"];

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
};

/** Rules 5 and 7: what each kind carries beyond `kind`. Natural features carry nothing; a contour its level; named things a name. */
const KIND_PROPERTIES: Record<MapKind, readonly string[]> = {
  land: [],
  river: [],
  shoal: [],
  contour: ["elevation"],
  place: ["name"],
  work: ["name"],
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

  if (kind === "contour") {
    const elevation = obj.number("elevation", ELEVATION_BOUNDS);
    if (elevation === undefined) return undefined;
    return { kind, elevation };
  }
  if (kind === "place" || kind === "work") {
    const name = obj.string("name");
    if (name === undefined) return undefined;
    if (name === "") {
      obj.errors.add(obj.at("name"), `expected a non-empty ${kind} name`);
      return undefined;
    }
    return { kind, name };
  }
  return { kind };
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
  const lon = readNumber(value[0], appendPointer(path, 0), LON_BOUNDS, errors);
  const lat = readNumber(value[1], appendPointer(path, 1), LAT_BOUNDS, errors);
  if (lon === undefined || lat === undefined) return undefined;
  return [lon, lat];
}
