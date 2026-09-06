import { describe, expect, it } from "vitest";
import { MINIMAL_MAP } from "./examples.ts";
import { validateMap } from "./validateMap.ts";

/** The six features of `MINIMAL_MAP` by index, one of each kind (schema.md 3.4). */
const LAND = 0;
const RIVER = 1;
const SHOAL = 2;
const CONTOUR = 3;
const PLACE = 4;
const WORK = 5;

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
  it("accepts the minimal example, one feature of each kind, and hands back the typed map", () => {
    expect(validateMap(structuredClone(MINIMAL_MAP))).toEqual({ ok: true, map: MINIMAL_MAP });
  });

  it("accepts a MultiPolygon land feature and an empty feature list", () => {
    const multi = validateBroken((m) => {
      m.features[LAND].geometry = {
        type: "MultiPolygon",
        coordinates: [
          [[[16.05, 41.25], [16.3, 41.25], [16.3, 41.38], [16.05, 41.25]]],
          [[[16.5, 41.5], [16.6, 41.5], [16.6, 41.6], [16.5, 41.5]]],
        ],
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
      m.bbox = [16, 41, 17, 42];
      m.name = "cannae";
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

  it("3. every feature is a Feature with a non-null geometry and one of the six kinds", () => {
    expect(errorPaths(validateBroken((m) => (m.features[LAND].type = "feature")))).toEqual(["/features/0/type"]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].geometry = null)))).toEqual(["/features/4/geometry"]);
    expect(errorPaths(validateBroken((m) => delete m.features[RIVER].geometry))).toEqual(["/features/1/geometry"]);
    expect(errorPaths(validateBroken((m) => delete m.features[LAND].properties))).toEqual(["/features/0/properties"]);
    expect(errorPaths(validateBroken((m) => (m.features[LAND].properties = null)))).toEqual(["/features/0/properties"]);
    expect(errorPaths(validateBroken((m) => m.features.push(m.features[PLACE].geometry)))).toEqual(
      expect.arrayContaining(["/features/6/type", "/features/6/properties"]),
    );
    expect(errorPaths(validateBroken((m) => m.features.push("land")))).toEqual(["/features/6"]);
  });

  it('3. an unknown kind is rejected: "road" arrives additively when a battle needs one', () => {
    expect(errorPaths(validateBroken((m) => (m.features[LAND].properties.kind = "road")))).toEqual([
      "/features/0/properties/kind",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[LAND].properties.kind = "sea")))).toEqual([
      "/features/0/properties/kind",
    ]);
    expect(errorPaths(validateBroken((m) => delete m.features[SHOAL].properties.kind))).toEqual([
      "/features/2/properties/kind",
    ]);
  });

  it("4. land and shoal are areas; river and contour are lines; place and work are points", () => {
    expect(
      validateBroken((m) => {
        m.features[RIVER].geometry = {
          type: "MultiLineString",
          coordinates: [[[16.06, 41.28], [16.15, 41.31]], [[16.2, 41.36], [16.22, 41.37]]],
        };
      }).ok,
    ).toBe(true);
    expect(
      validateBroken((m) => {
        m.features[SHOAL].geometry = {
          type: "MultiPolygon",
          coordinates: [[[[16.26, 41.36], [16.29, 41.36], [16.29, 41.375], [16.26, 41.36]]]],
        };
      }).ok,
    ).toBe(true);
    expect(
      validateBroken((m) => {
        m.features[CONTOUR].geometry = { type: "LineString", coordinates: [[16.14, 41.29], [16.16, 41.3]] };
      }).ok,
    ).toBe(true);

    expect(errorPaths(validateBroken((m) => (m.features[LAND].geometry.type = "LineString")))).toEqual([
      "/features/0/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[RIVER].geometry = m.features[PLACE].geometry)))).toEqual([
      "/features/1/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[SHOAL].geometry = m.features[RIVER].geometry)))).toEqual([
      "/features/2/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[CONTOUR].geometry = m.features[LAND].geometry)))).toEqual([
      "/features/3/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].geometry = m.features[LAND].geometry)))).toEqual([
      "/features/4/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[WORK].geometry = m.features[SHOAL].geometry)))).toEqual([
      "/features/5/geometry/type",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].geometry.type = "GeometryCollection")))).toEqual([
      "/features/4/geometry/type",
    ]);
  });

  it("5. a contour carries a finite elevation in metres, -500 to 9000", () => {
    expect(errorPaths(validateBroken((m) => delete m.features[CONTOUR].properties.elevation))).toEqual([
      "/features/3/properties/elevation",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[CONTOUR].properties.elevation = 9001)))).toEqual([
      "/features/3/properties/elevation",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[CONTOUR].properties.elevation = -501)))).toEqual([
      "/features/3/properties/elevation",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[CONTOUR].properties.elevation = "50")))).toEqual([
      "/features/3/properties/elevation",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[CONTOUR].properties.elevation = Number.NaN)))).toEqual([
      "/features/3/properties/elevation",
    ]);
    expect(validateBroken((m) => (m.features[CONTOUR].properties.elevation = -500)).ok).toBe(true);
    expect(validateBroken((m) => (m.features[CONTOUR].properties.elevation = 9000)).ok).toBe(true);
    expect(validateBroken((m) => (m.features[CONTOUR].properties.elevation = 12.5)).ok).toBe(true);
  });

  it("5. a place and a work carry a non-empty name", () => {
    expect(errorPaths(validateBroken((m) => delete m.features[PLACE].properties.name))).toEqual([
      "/features/4/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].properties.name = "")))).toEqual([
      "/features/4/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].properties.name = 7)))).toEqual([
      "/features/4/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => delete m.features[WORK].properties.name))).toEqual([
      "/features/5/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[WORK].properties.name = "")))).toEqual([
      "/features/5/properties/name",
    ]);
  });

  it("6. every coordinate is a [lon, lat] pair in range", () => {
    const ring = (m: any) => m.features[LAND].geometry.coordinates[0];
    expect(errorPaths(validateBroken((m) => (ring(m)[1] = [16.3, 41.25, 0])))).toEqual([
      "/features/0/geometry/coordinates/0/1",
    ]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = [16.3])))).toEqual(["/features/0/geometry/coordinates/0/2"]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = [181, 41.38])))).toEqual([
      "/features/0/geometry/coordinates/0/2/0",
    ]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = [16.3, -91])))).toEqual([
      "/features/0/geometry/coordinates/0/2/1",
    ]);
    expect(errorPaths(validateBroken((m) => (ring(m)[2] = ["16.3", 41.38])))).toEqual([
      "/features/0/geometry/coordinates/0/2/0",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].geometry.coordinates = [16.15, 41.31, 5])))).toEqual([
      "/features/4/geometry/coordinates",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[WORK].geometry.coordinates = [16.12, 90.5])))).toEqual([
      "/features/5/geometry/coordinates/1",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[LAND].geometry.coordinates = [[16.05, 41.25]])))).toEqual([
      "/features/0/geometry/coordinates/0/0",
      "/features/0/geometry/coordinates/0/1",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[LAND].geometry.coordinates = "ring")))).toEqual([
      "/features/0/geometry/coordinates",
    ]);
  });

  it("6. a line's positions are checked at their own nesting depth", () => {
    expect(errorPaths(validateBroken((m) => (m.features[RIVER].geometry.coordinates[1] = [16.15, 41.31, 12])))).toEqual(
      ["/features/1/geometry/coordinates/1"],
    );
    expect(errorPaths(validateBroken((m) => (m.features[RIVER].geometry.coordinates[2] = [16.2, 191])))).toEqual([
      "/features/1/geometry/coordinates/2/1",
    ]);
    expect(
      errorPaths(validateBroken((m) => (m.features[CONTOUR].geometry.coordinates[0][1] = [16.16, 41.3, 50]))),
    ).toEqual(["/features/3/geometry/coordinates/0/1"]);
    expect(errorPaths(validateBroken((m) => (m.features[CONTOUR].geometry.coordinates[1] = [16.2, 41.27])))).toEqual([
      "/features/3/geometry/coordinates/1/0",
      "/features/3/geometry/coordinates/1/1",
    ]);
  });

  it("7. no property beyond those listed for the kind", () => {
    expect(errorPaths(validateBroken((m) => (m.features[LAND].properties.name = "Apulia")))).toEqual([
      "/features/0/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[RIVER].properties.name = "Aufidus")))).toEqual([
      "/features/1/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[RIVER].properties.conjectural = true)))).toEqual([
      "/features/1/properties/conjectural",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[SHOAL].properties.depth = 3)))).toEqual([
      "/features/2/properties/depth",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[CONTOUR].properties.name = "50 m")))).toEqual([
      "/features/3/properties/name",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].properties.elevation = 50)))).toEqual([
      "/features/4/properties/elevation",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[WORK].properties.population = 70000)))).toEqual([
      "/features/5/properties/population",
    ]);
    expect(errorPaths(validateBroken((m) => (m.features[LAND].id = "apulia")))).toEqual(["/features/0/id"]);
    expect(errorPaths(validateBroken((m) => (m.features[PLACE].geometry.bbox = [])))).toEqual([
      "/features/4/geometry/bbox",
    ]);
  });

  it("collects errors across features instead of stopping at the first", () => {
    const result = validateBroken((m) => {
      m.features[LAND].properties.kind = "sea";
      m.features[SHOAL].properties.depth = 3;
      m.features[CONTOUR].properties.elevation = 9001;
      m.features[WORK].properties.name = "";
    });
    expect(errorPaths(result)).toEqual([
      "/features/0/properties/kind",
      "/features/2/properties/depth",
      "/features/3/properties/elevation",
      "/features/5/properties/name",
    ]);
  });
});
