/**
 * Relief's arithmetic: which levels a map carries, the interval it was cut at,
 * which of them are index contours, and which tint bands the atlas can lay.
 * Pure; how the lines actually look is checked by eye against the design
 * canvas (ADR-0009, ADR-0014).
 */
import { describe, expect, it } from "vitest";
import type { MapFile } from "../schema/types.ts";
import { contourInterval, contourLevels, indexLevels, TINT_BAND_LEVELS, tintBandLevels } from "./relief.ts";

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
