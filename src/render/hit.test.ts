/**
 * Hit regions (#84): the boxes one frame leaves behind so the player can turn
 * a pointer into a unit id. What is worth testing is the resolution rule —
 * a point inside a glyph resolves to its unit, a point inside a legend numeral
 * row resolves to the unit that row keys, and a point on bare plate to
 * nothing.
 */
import { describe, expect, it } from "vitest";
import { type HitRegion, unitAt } from "./hit.ts";

const REGIONS: HitRegion[] = [
  { id: "weather", box: { x: 100, y: 100, width: 40, height: 40 } },
  // The same unit's label, displaced well clear of its glyph: two boxes, never
  // one bounding box, so the bare plate between them stays bare.
  { id: "weather", box: { x: 300, y: 100, width: 90, height: 30 } },
  { id: "lee", box: { x: 200, y: 300, width: 40, height: 40 } },
  // The legend, and one numeral row inside it.
  { id: "combined", box: { x: 20, y: 400, width: 168, height: 18 } },
];

describe("unitAt", () => {
  it("resolves a point inside a glyph box to its unit", () => {
    expect(unitAt(REGIONS, { x: 120, y: 120 })).toBe("weather");
  });

  it("resolves a point inside a displaced label to the same unit", () => {
    expect(unitAt(REGIONS, { x: 350, y: 110 })).toBe("weather");
  });

  it("resolves a point inside a legend numeral row to the unit that row keys", () => {
    expect(unitAt(REGIONS, { x: 100, y: 410 })).toBe("combined");
  });

  it("resolves a point on bare plate to nothing", () => {
    expect(unitAt(REGIONS, { x: 220, y: 120 })).toBeUndefined();
  });

  it("resolves a point between a glyph and its own displaced label to nothing", () => {
    expect(unitAt(REGIONS, { x: 250, y: 110 })).toBeUndefined();
  });

  it("takes the smallest region when two overlap, so a row inside a panel wins", () => {
    const overlapping: HitRegion[] = [
      { id: "panel", box: { x: 0, y: 0, width: 200, height: 200 } },
      { id: "row", box: { x: 10, y: 10, width: 40, height: 20 } },
    ];
    expect(unitAt(overlapping, { x: 20, y: 20 })).toBe("row");
    expect(unitAt(overlapping, { x: 100, y: 100 })).toBe("panel");
  });

  it("resolves anything against an empty frame to nothing", () => {
    expect(unitAt([], { x: 0, y: 0 })).toBeUndefined();
  });
});
