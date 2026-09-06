import { describe, expect, it } from "vitest";
import { METRES_PER_UNIT, scaleBarLength } from "./scaleBar.ts";

describe("scaleBarLength", () => {
  it("picks the largest round length that fits the pixel budget", () => {
    // 100 px per nautical mile, up to 550 px: 5 nmi fits, 10 does not.
    expect(scaleBarLength({ pixelsPerUnit: 100, maxPixels: 550 })).toEqual({ units: 5, pixels: 500 });
    // 100 px per unit, up to 950 px: 5 fits, 10 does not.
    expect(scaleBarLength({ pixelsPerUnit: 100, maxPixels: 950 })).toEqual({ units: 5, pixels: 500 });
    // 100 px per unit, up to 1000 px: 10 fits exactly.
    expect(scaleBarLength({ pixelsPerUnit: 100, maxPixels: 1000 })).toEqual({ units: 10, pixels: 1000 });
  });

  it("steps through 1, 2, 5 per decade", () => {
    expect(scaleBarLength({ pixelsPerUnit: 100, maxPixels: 150 })).toEqual({ units: 1, pixels: 100 });
    expect(scaleBarLength({ pixelsPerUnit: 100, maxPixels: 250 })).toEqual({ units: 2, pixels: 200 });
    expect(scaleBarLength({ pixelsPerUnit: 1, maxPixels: 2500 })).toEqual({ units: 2000, pixels: 2000 });
  });

  it("goes below one unit when the budget is small", () => {
    expect(scaleBarLength({ pixelsPerUnit: 100, maxPixels: 60 })).toEqual({ units: 0.5, pixels: 50 });
    expect(scaleBarLength({ pixelsPerUnit: 100, maxPixels: 25 })).toEqual({ units: 0.2, pixels: 20 });
  });

  it("derives pixels per unit from metres per pixel for the battle's unit", () => {
    // 10 metres per pixel: one nautical mile (1852 m) is 185.2 px, one kilometre is 100 px.
    expect(METRES_PER_UNIT.nmi).toBe(1852);
    expect(METRES_PER_UNIT.km).toBe(1000);
    expect(scaleBarLength({ pixelsPerUnit: METRES_PER_UNIT.nmi / 10, maxPixels: 1000 })).toEqual({ units: 5, pixels: 926 });
  });
});
