/**
 * Relief's arithmetic: which levels a map carries, the interval it was cut at,
 * which of them are index contours, and which tint bands the atlas can lay.
 * Pure; how the lines actually look is checked by eye against the design
 * canvas (ADR-0009, ADR-0014).
 */
import { describe, expect, it } from "vitest";
import type { MapFile } from "../schema/types.ts";
import { bandIndexAt, contourInterval, contourLevels, indexLevels, TINT_BAND_LEVELS, tintBandLevels, uphillOf, uphillToward } from "./relief.ts";

/** A map carrying one contour feature per level, plus a place the levels must not be read from. */
function mapWithLevels(levels: readonly number[]): MapFile {
  return {
    type: "FeatureCollection",
    license: "public-domain",
    features: [
      { type: "Feature", properties: { kind: "place", name: "Cannae" }, geometry: { type: "Point", coordinates: [16.13, 41.3] } },
      ...levels.map((elevation) => ({
        type: "Feature" as const,
        properties: { kind: "contour" as const, elevation },
        geometry: { type: "LineString" as const, coordinates: [[16.1, 41.3], [16.2, 41.31]] as [number, number][] },
      })),
    ],
  };
}

describe("contourLevels", () => {
  it("gives the distinct levels of a map's contours, ascending", () => {
    expect(contourLevels(mapWithLevels([30, 10, 20, 10]))).toEqual([10, 20, 30]);
  });

  it("is empty for a map with no relief, and for no map at all", () => {
    expect(contourLevels(mapWithLevels([]))).toEqual([]);
    expect(contourLevels(undefined)).toEqual([]);
  });
});

describe("contourInterval", () => {
  it("is the smallest gap between adjacent levels", () => {
    expect(contourInterval([10, 20, 30, 40])).toBe(10);
    expect(contourInterval([20, 40, 60])).toBe(20);
  });

  it("takes the smallest gap when the levels are uneven", () => {
    expect(contourInterval([10, 25, 30])).toBe(5);
  });

  it("has no interval to give from fewer than two levels", () => {
    expect(contourInterval([])).toBeUndefined();
    expect(contourInterval([50])).toBeUndefined();
  });
});

describe("indexLevels", () => {
  it("weights every fifth level: 10 m contours index at the 50 m multiples", () => {
    const levels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
    expect(indexLevels(levels)).toEqual([50, 100]);
  });

  it("reads the interval from the levels, so 20 m contours index at the 100 m multiples", () => {
    const levels = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
    expect(indexLevels(levels)).toEqual([100, 200]);
  });

  it("counts zero and the levels below the sea as multiples like any other", () => {
    const acrossTheSea = [-60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60];
    expect(indexLevels(acrossTheSea)).toEqual([-50, 0, 50]);
  });

  it("does not crash on uneven levels, or on too few to have an interval", () => {
    expect(indexLevels([10, 25, 30])).toEqual([25]);
    expect(indexLevels([12, 37, 59])).toEqual([]);
    expect(indexLevels([50])).toEqual([]);
    expect(indexLevels([])).toEqual([]);
  });
});

describe("tintBandLevels", () => {
  it("is the atlas's five thresholds, kept to the ones the data carries", () => {
    expect(TINT_BAND_LEVELS).toEqual([30, 50, 100, 150, 200]);
    const tenMetres = Array.from({ length: 30 }, (_, i) => (i + 1) * 10);
    expect(tintBandLevels(tenMetres)).toEqual([30, 50, 100, 150, 200]);
  });

  it("bands the plate by the thresholds a level list reaches", () => {
    // 20 m contours have no 30 m and no 150 m line to close a band on.
    const twentyMetres = Array.from({ length: 10 }, (_, i) => (i + 1) * 20);
    expect(tintBandLevels(twentyMetres)).toEqual([100, 200]);
    expect(tintBandLevels([10, 20, 30, 40])).toEqual([30]);
    expect(tintBandLevels([])).toEqual([]);
  });
});

/**
 * The two facts #170's treatments need beyond the levels themselves: which way
 * is up from a closed ring, and which band a level stands in.
 */
describe("uphillOf", () => {
  /** A unit square in canvas coordinates (y down), given clockwise on the screen. */
  const CLOCKWISE = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
  const ANTICLOCKWISE = [...CLOCKWISE].reverse();

  it("reads a clockwise ring's uphill side off its signed area: inside is to the right", () => {
    expect(uphillOf(CLOCKWISE)).toBe(-1);
  });

  it("reads an anticlockwise ring the other way, so the same hill is still the high side", () => {
    expect(uphillOf(ANTICLOCKWISE)).toBe(1);
  });

  it("is unmoved by where the ring starts, and by its being closed back on itself", () => {
    const rotated = [...CLOCKWISE.slice(2), ...CLOCKWISE.slice(0, 2)];
    expect(uphillOf(rotated)).toBe(-1);
    expect(uphillOf([...CLOCKWISE, CLOCKWISE[0]!])).toBe(-1);
  });

  it("answers the left for a line with no area at all, rather than nothing", () => {
    expect(uphillOf([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(1);
  });
});

describe("bandIndexAt", () => {
  it("is the highest band at or below the level, which is the ground a numeral stands on", () => {
    expect(bandIndexAt(30)).toBe(0);
    expect(bandIndexAt(40)).toBe(0);
    expect(bandIndexAt(50)).toBe(1);
    expect(bandIndexAt(120)).toBe(2);
    expect(bandIndexAt(200)).toBe(4);
    expect(bandIndexAt(640)).toBe(4);
  });

  it("stands a level below every band on no band at all, so a coast keeps the plain land tone", () => {
    expect(bandIndexAt(29)).toBe(-1);
    expect(bandIndexAt(0)).toBe(-1);
    expect(bandIndexAt(-5)).toBe(-1);
  });

  it("indexes the ramp the atlas carries, one colour per threshold", () => {
    expect(bandIndexAt(TINT_BAND_LEVELS[TINT_BAND_LEVELS.length - 1]!)).toBe(TINT_BAND_LEVELS.length - 1);
  });
});

/**
 * The open line: a contour clipped by the extent is a C-shaped arc, not a
 * ring, and its implicit closure encloses an area that says nothing about the
 * ground. Cannae ships 52 of those against 10 closed, so this is the ordinary
 * case on a real file and not the corner one.
 */
describe("uphillToward", () => {
  /** A line running due east across the canvas, and the contour above it to the north. */
  const EAST = [
    { x: 0, y: 100 },
    { x: 50, y: 100 },
    { x: 100, y: 100 },
    { x: 150, y: 100 },
  ];
  const NORTH_OF_IT = [
    { x: 0, y: 60 },
    { x: 75, y: 55 },
    { x: 150, y: 60 },
  ];
  const SOUTH_OF_IT = NORTH_OF_IT.map(({ x, y }) => ({ x, y: 200 - y }));

  it("reads the slope from the level above: walking east with the higher line to the north is uphill left", () => {
    expect(uphillToward(EAST, NORTH_OF_IT)).toBe(1);
  });

  it("reads the other way when the ground above it lies south, which is the same line drawn back again", () => {
    expect(uphillToward(EAST, SOUTH_OF_IT)).toBe(-1);
    expect(uphillToward([...EAST].reverse(), NORTH_OF_IT)).toBe(-1);
  });

  it("has nothing to answer with when there is no level above, so the caller keeps the winding", () => {
    expect(uphillToward(EAST, [])).toBeUndefined();
    expect(uphillToward([{ x: 0, y: 0 }], NORTH_OF_IT)).toBeUndefined();
  });

  it("votes along the line rather than asking once, so one bend does not answer for the whole of it", () => {
    // A long line whose last vertex hooks back north past the contour above:
    // that one sample says right, the other five say left, and left wins.
    const hooked = [...EAST, { x: 160, y: 20 }];
    expect(uphillToward(hooked, NORTH_OF_IT)).toBe(1);
  });
});
