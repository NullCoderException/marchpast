/**
 * Runtime validator for the map file (schema.md section 3): a GeoJSON
 * FeatureCollection with exactly two foreign members, holding only `land`
 * (Polygon or MultiPolygon) and `place` (Point with a name) features, every
 * coordinate a `[lon, lat]` pair in range and nothing else anywhere.
 *
 * Never throws on bad data; collects every error with a JSON-pointer path.
 * Ring winding and polygon validity are not checked (schema.md 3.3).
 */
import { readAttribution, readLicense } from "./licenseFields.ts";
import type { LandFeature, LonLat, MapFeature, MapFile, PlaceFeature } from "./types.ts";
import {
  allDefined,
  appendPointer,
  Errors,
  LAT_BOUNDS,
  LON_BOUNDS,
  ObjectReader,
  readNumber,
  type ValidationError,
  withoutUndefined,
} from "./validation.ts";

export type MapValidation = { ok: true; map: MapFile } | { ok: false; errors: ValidationError[] };

const KINDS = ["land", "place"] as const;
const LAND_GEOMETRIES = ["Polygon", "MultiPolygon"] as const;
const PLACE_GEOMETRIES = ["Point"] as const;
const ALL_GEOMETRIES = [...LAND_GEOMETRIES, ...PLACE_GEOMETRIES] as const;

/** Nesting depth of `coordinates` below a single `[lon, lat]` position, per geometry type. */
const COORDINATE_DEPTH = { Point: 0, Polygon: 2, MultiPolygon: 3 } as const;

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

/** Rules 3, 4 and 6: one feature. */
function readFeature(value: unknown, path: string, errors: Errors): MapFeature | undefined {
  const obj = ObjectReader.of(value, path, errors, ["type", "properties", "geometry"]);
  if (obj === undefined) return undefined;
  const type = obj.oneOf("type", ["Feature"]);
  const properties = readProperties(obj);
  const geometry = readGeometry(obj, properties?.kind);
  if (type === undefined || properties === undefined || geometry === undefined) return undefined;

  if (properties.kind === "land") {
    if (geometry.type === "Point") return undefined;
    const feature: LandFeature = { type, properties: { kind: "land" }, geometry };
    return feature;
  }
  if (geometry.type !== "Point") return undefined;
  const feature: PlaceFeature = { type, properties: { kind: "place", name: properties.name }, geometry };
  return feature;
}

type Properties = { kind: "land" } | { kind: "place"; name: string };

/** `properties` may carry only the keys listed for its kind: `kind` for land, `kind` and a non-empty `name` for place. */
function readProperties(feature: ObjectReader): Properties | undefined {
  const obj = feature.object("properties", (raw) => (raw["kind"] === "place" ? ["kind", "name"] : ["kind"]));
  if (obj === undefined) return undefined;
  const kind = obj.oneOf("kind", KINDS);
  if (kind === undefined) return undefined;
  if (kind === "land") return { kind };
  const name = obj.string("name");
  if (name === undefined) return undefined;
  if (name === "") {
    obj.errors.add(obj.at("name"), "expected a non-empty place name");
    return undefined;
  }
  return { kind, name };
}

type Geometry = MapFeature["geometry"];

/** Rules 4 and 5: a non-null geometry of the type the kind allows, with `[lon, lat]` coordinates nested to that type's depth. */
function readGeometry(feature: ObjectReader, kind: Properties["kind"] | undefined): Geometry | undefined {
  const raw = feature.raw("geometry");
  if (raw === undefined) return undefined;
  if (raw === null) {
    feature.errors.add(feature.at("geometry"), "a null geometry is not allowed");
    return undefined;
  }
  const obj = ObjectReader.of(raw, feature.at("geometry"), feature.errors, ["type", "coordinates"]);
  if (obj === undefined) return undefined;
  const allowed = kind === "land" ? LAND_GEOMETRIES : kind === "place" ? PLACE_GEOMETRIES : ALL_GEOMETRIES;
  const type = obj.oneOf("type", allowed);
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
