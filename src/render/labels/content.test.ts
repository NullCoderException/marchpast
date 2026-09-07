/**
 * The label's anatomy: what each step of the collapse order leaves standing,
 * and the box those words occupy around the point the label hangs from.
 */
import { describe, expect, it } from "vitest";
import { contentAt, contentWidth, labelBox, LAST_STEP, type Measure, nearEdgeSetback } from "./content.ts";
import type { LabelUnit } from "./geometry.ts";
import { toRadians } from "../projection.ts";

function unit(over: Partial<LabelUnit> = {}): LabelUnit {
  return {
    id: "weather",
    rosterIndex: 3,
    name: "Weather column",
    state: "engaged",
    strength: 1,
    colour: "#900",
    anchor: { x: 0, y: 0 },
    heading: 0,
    formation: "column",
    length: 72,
    halfWidth: 2.6,
    hasMove: false,
    ...over,
  };
}

/** A measurer with no canvas: every glyph a half of its point size wide. */
const measure: Measure = (text, size) => text.length * size * 0.5;

describe("contentAt", () => {
  it("shows the name and the state word at full strength", () => {
    expect(contentAt(unit(), 0)).toEqual({ name: "Weather column", detail: "engaged" });
  });

  it("adds the percentage below full strength", () => {
    expect(contentAt(unit({ strength: 0.62 }), 0)).toEqual({ name: "Weather column", detail: "engaged · 62%" });
  });

  it("says the same thing displaced as it does in place", () => {
    expect(contentAt(unit({ strength: 0.5 }), 1)).toEqual(contentAt(unit({ strength: 0.5 }), 0));
  });

  it("drops the state word and the percentage together at step 2", () => {
    expect(contentAt(unit({ strength: 0.5 }), 2)).toEqual({ name: "Weather column" });
  });

  it("takes the roster's short_label at step 3", () => {
    expect(contentAt(unit({ shortLabel: "Weather" }), 3)).toEqual({ name: "Weather" });
  });

  it("skips step 3 for a unit the roster gave no short_label", () => {
    expect(contentAt(unit(), 3)).toBeUndefined();
  });

  it("keys the unit by its roster numeral at the last step", () => {
    expect(contentAt(unit(), LAST_STEP)).toEqual({ name: "4", numeral: 4 });
  });

  it("numbers from one, so the first roster entry is 1 and not 0", () => {
    expect(contentAt(unit({ rosterIndex: 0 }), LAST_STEP)).toEqual({ name: "1", numeral: 1 });
  });
});

describe("contentWidth", () => {
  it("is the wider of the name and the detail, each at its own size", () => {
    const width = contentWidth({ name: "abc", detail: "de" }, measure);
    expect(width).toBeCloseTo(Math.max(3 * 14 * 0.5, 2 * 12 * 0.5));
  });

  it("is the name alone when there is no detail", () => {
    expect(contentWidth({ name: "abc" }, measure)).toBeCloseTo(3 * 14 * 0.5);
  });
});

describe("labelBox", () => {
  it("hangs a left-aligned label to the right of the point it is anchored at", () => {
    const box = labelBox({ x: 100, y: 100 }, "left", 60, true);
    expect(box.x).toBe(100);
    expect(box.width).toBe(60);
  });

  it("hangs a right-aligned label to the left of it", () => {
    const box = labelBox({ x: 100, y: 100 }, "right", 60, true);
    expect(box.x).toBe(40);
    expect(box.width).toBe(60);
  });

  it("is shorter when the state word has gone", () => {
    const withDetail = labelBox({ x: 0, y: 0 }, "left", 60, true);
    const nameOnly = labelBox({ x: 0, y: 0 }, "left", 60, false);
    expect(nameOnly.height).toBeLessThan(withDetail.height);
    expect(nameOnly.y).toBe(withDetail.y);
  });
});

describe("nearEdgeSetback", () => {
  const width = 60;

  it("is nothing when the label hangs straight out sideways, because the anchor is its near edge", () => {
    expect(nearEdgeSetback("left", width, true, toRadians(90))).toBeCloseTo(0);
    expect(nearEdgeSetback("right", width, true, toRadians(270))).toBeCloseTo(0);
  });

  it("is the box's own depth when the label sits above or below the glyph", () => {
    // Straight up: the near edge is the box's bottom, which hangs below the anchor.
    const above = nearEdgeSetback("left", width, true, toRadians(0));
    const below = nearEdgeSetback("left", width, true, toRadians(180));
    expect(above).toBeGreaterThan(0);
    expect(below).toBeGreaterThan(0);
    expect(above).not.toBeCloseTo(below);
  });

  it("counts the whole width when the label reaches back across its anchor", () => {
    // Due west with a left-aligned box: the box runs east, so its near edge is
    // its far corner and the anchor must be pushed a whole width out.
    expect(nearEdgeSetback("left", width, false, toRadians(270))).toBeCloseTo(width);
  });
});
