import { describe, expect, it } from "vitest";
import { MINIMAL_MAP } from "./examples.ts";
import { validateMap } from "./validateMap.ts";

function validateBroken(mutate: (map: any) => void) {
  const map = structuredClone(MINIMAL_MAP) as any;
  mutate(map);
  return validateMap(map);
}

function errorPaths(result: ReturnType<typeof validateMap>): string[] {
  if (result.ok) throw new Error("expected validation to fail");
  return result.errors.map((e) => e.path);
}

describe("validateMap: a well-formed file", () => {
  it("accepts the minimal example and hands back the typed map", () => {
    expect(validateMap(structuredClone(MINIMAL_MAP))).toEqual({ ok: true, map: MINIMAL_MAP });
  });

  it("accepts a MultiPolygon land feature and an empty feature list", () => {
    const multi = validateBroken((m) => {
      m.features[0].geometry = {
        type: "MultiPolygon",
        coordinates: [[[[-6.03, 36.18], [-6.0, 36.2], [-5.95, 36.18], [-6.03, 36.18]]], [[[-6.5, 36.5], [-6.4, 36.6], [-6.5, 36.6], [-6.5, 36.5]]]],
      };
    });
    expect(multi.ok).toBe(true);
    expect(validateBroken((m) => (m.features = [])).ok).toBe(true);
  });

  it("rejects anything that is not a JSON object, at the root path", () => {
    for (const notAnObject of [null, 1, "map", []]) {
      expect(errorPaths(validateMap(notAnObject))).toEqual([""]);
    }
  });
});

describe("validateMap: rules (schema.md 3.3)", () => {
  it("1. the top level is a FeatureCollection with only the four allowed members", () => {
    expect(errorPaths(validateBroken((m) => (m.type = "Feature")))).toEqual(["/type"]);
    expect(errorPaths(validateBroken((m) => delete m.features))).toEqual(["/features"]);
    expect(errorPaths(validateBroken((m) => (m.features = {})))).toEqual(["/features"]);
    const foreign = validateBroken((m) => {
      m.bbox = [-7, 36, -5, 37];
      m.name = "cadiz";
      m.crs = {};
      m.sources = {};
    });
    expect(errorPaths(foreign)).toEqual(["/bbox", "/name", "/crs", "/sources"]);
  });

  it("2. license is allowlisted and attribution follows its class", () => {
    expect(errorPaths(validateBroken((m) => (m.license = "MIT")))).toEqual(["/license"]);
    expect(errorPaths(validateBroken((m) => delete m.license))).toEqual(["/license"]);
    expect(
      errorPaths(
        validateBroken((m) => {
          m.license = "ODbL-1.0";
          delete m.attribution;
        }),
      ),
    ).toEqual(["/attribution"]);
    expect(validateBroken((m) => delete m.attribution).ok).toBe(true);
    expect(validateBroken((m) => (m.license = "CC-BY-SA-4.0")).ok).toBe(true);
    expect(errorPaths(validateBroken((m) => (m.attribution = 1)))).toEqual(["/attribution"]);
  });

  it("3. every feature is a Feature with a non-null geometry and a land or place kind", () => {
    expect(errorPaths(validateBroken((m) => (m.features[0].type = "feature")))).toEqual(["/features/0/type"]);
    expect(errorPaths(validateBroken((m) => (m.features[1].geometry = null)))).toEqual(["/features/1/geometry"]);
    expect(errorPaths(validateBroken((m) => delete m.features[1].geometry))).toEqual(["/features/1/geometry"]);
    expect(errorPaths(validateBroken((m) => (m.features[0].properties.kind = "river")))).toEqual([
      "/features/0/properties/kind",
    ]);
    expect(errorPaths(validateBroken((m) => delete m.features[0].properties))).toEqual(["/features/0/properties"]);
    expect(errorPaths(validateBroken((m) => (m.features[0].properties = null)))).toEqual(["/features/0/properties"]);
    expect(errorPaths(validateBroken((m) => m.features.push(m.features[1].geometry)))).toEqual(
      expect.arrayContaining(["/features/2/type", "/features/2/properties"]),
    );
    expect(errorPaths(validateBroken((m) => m.features.push("land")))).toEqual(["/features/2"]);
  });

  it("4. land is a Polygon or MultiPolygon; place is a Point with a name", () => {
    expect(errorPaths(validateBroken((m) => (m.features[0].geometry.type = "LineString")))).toEqual([
      "/features/0/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[0].geometry = m.features[1].geometry)))).toEqual([
      "/features/0/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[1].geometry = m.features[0].geometry)))).toEqual([
      "/features/1/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[1].geometry.type = "GeometryCollection")))).toEqual([
      "/features/1/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => delete m.features[1].properties.name))).toEqual([
      "/features/1/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[1].properties.name = "")))).toEqual([
      "/features/1/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[1].properties.name = 7)))).toEqual([
      "/features/1/properties/name",
    ]);
  });

  it("5. every coordinate is a [lon, lat] pair in range", () => {
    const ring = (m: any) => m.features[0].geometry.coordinates[0];
    expect(errorPaths(validateBroken((m) => (ring(m)[1] = [-6.0, 36.2, 0])))).toEqual([
      "/features/0/geometry/coordinates/0/1",
    ]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = [-5.95])))).toEqual(["/features/0/geometry/coordinates/0/2"]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = [181, 36.25])))).toEqual([
      "/features/0/geometry/coordinates/0/2/0",
    ]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = [-5.95, -91])))).toEqual([
      "/features/0/geometry/coordinates/0/2/1",
    ]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = ["-5.95", 36.25])))).toEqual([
      "/features/0/geometry/coordinates/0/2/0",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[1].geometry.coordinates = [36.183, -6.034, 5])))).toEqual([
      "/features/1/geometry/coordinates",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[1].geometry.coordinates = [-6.034, 90.5])))).toEqual([
      "/features/1/geometry/coordinates/1",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[0].geometry.coordinates = [[-6.03, 36.18]])))).toEqual([
      "/features/0/geometry/coordinates/0/0",
      "/features/0/geometry/coordinates/0/1",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[0].geometry.coordinates = "ring")))).toEqual([
      "/features/0/geometry/coordinates",
    ]);
  });

  it("6. no property beyond those listed for the kind", () => {
    expect(errorPaths(validateBroken((m) => (m.features[0].properties.name = "Spain")))).toEqual([
      "/features/0/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[1].properties.population = 70000)))).toEqual([
      "/features/1/properties/population",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[0].id = "es")))).toEqual(["/features/0/id"]);
    expect(errorPaths(validateBroken((m) => (m.features[1].geometry.bbox = [])))).toEqual(["/features/1/geometry/bbox"]);
  });

  it("collects errors across features instead of stopping at the first", () => {
    const result = validateBroken((m) => {
      m.features[0].properties.kind = "sea";
      m.features[1].properties.name = "";
    });
    expect(errorPaths(result)).toEqual(["/features/0/properties/kind", "/features/1/properties/name"]);
  });
});
