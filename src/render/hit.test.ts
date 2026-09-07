/**
 * Hit regions (#84): the boxes one frame leaves behind so the player can turn
 * a pointer into a unit id. What is worth testing is the resolution rule —
 * a point inside a glyph resolves to its unit, a point inside a legend numeral
 * row resolves to the unit that row keys, a point on bare plate to nothing,
 * and where two regions overlap the one drawn over the other answers.
 */
import { describe, expect, it } from "vitest";
import { hoverAt, type HitRegion, unitAt } from "./hit.ts";

/** In draw order, bottom to top: the glyphs, the legend's key, then the labels. */
const REGIONS: HitRegion[] = [
  { id: "weather", box: { x: 100, y: 100, width: 40, height: 40 }, hover: true },
  { id: "lee", box: { x: 200, y: 300, width: 40, height: 40 }, hover: true },
  // The legend, whose numeral row keys a unit whose label collapsed all the way.
  { id: "combined", box: { x: 20, y: 400, width: 168, height: 18 }, hover: false },
  // The same unit's label, displaced well clear of its glyph: two boxes, never
  // one bounding box, so the bare plate between them stays bare.
  { id: "weather", box: { x: 300, y: 100, width: 90, height: 30 }, hover: true },
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

  it("gives an overlap to the region drawn last, so a card answers for what it covers", () => {
    const covered: HitRegion[] = [
      { id: "lee", box: { x: 100, y: 100, width: 40, height: 40 }, hover: true },
      // The card, wide enough to have drawn over the glyph above it.
      { id: "weather", box: { x: 60, y: 60, width: 220, height: 120 }, hover: true },
    ];
    expect(unitAt(covered, { x: 120, y: 120 })).toBe("weather");
    expect(unitAt(covered, { x: 260, y: 170 })).toBe("weather");
  });

  it("resolves anything against an empty frame to nothing", () => {
    expect(unitAt([], { x: 0, y: 0 })).toBeUndefined();
  });
});

describe("hoverAt", () => {
  it("shows a card for a pointer resting on a glyph or on its label", () => {
    expect(hoverAt(REGIONS, { x: 120, y: 120 })).toBe("weather");
    expect(hoverAt(REGIONS, { x: 350, y: 110 })).toBe("weather");
  });

  it("shows nothing for a pointer resting on a legend numeral row, which only a click opens", () => {
    expect(hoverAt(REGIONS, { x: 100, y: 410 })).toBeUndefined();
    expect(unitAt(REGIONS, { x: 100, y: 410 })).toBe("combined");
  });

  it("shows nothing for a pointer on bare plate", () => {
    expect(hoverAt(REGIONS, { x: 220, y: 120 })).toBeUndefined();
  });
});
