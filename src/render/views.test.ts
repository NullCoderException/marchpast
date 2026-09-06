/**
 * The views table: the shape every view has to hold, checked once for all
 * three, plus the fallback an unknown id takes. What each view *looks* like is
 * checked by eye against the design canvas (ADR-0014), never here.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_VIEW, VIEWS, viewById } from "./views.ts";

describe("the views there are", () => {
  it("offers the three v0.2 views under unique ids, the default first", () => {
    expect(VIEWS.map((view) => view.id)).toEqual(["plate", "night", "atlas"]);
    expect(VIEWS.map((view) => view.name)).toEqual(["Chart plate", "Night plate", "Atlas"]);
    expect(VIEWS[0]).toBe(DEFAULT_VIEW);
  });

  it("gives every view a full side palette, so the sixth side is never the ink", () => {
    for (const view of VIEWS) {
      expect(view.palette.sides).toHaveLength(6);
      expect(new Set(view.palette.sides).size).toBe(6);
    }
  });

  it("gives every pen a positive width, so no motion style is invisible", () => {
    for (const view of VIEWS) {
      for (const pen of [view.pens.track, view.pens.intent, view.pens.detachment]) {
        expect(pen.width).toBeGreaterThan(0);
        expect(pen.headSize).toBeGreaterThan(0);
      }
    }
  });
});

describe("viewById", () => {
  it("finds a view by its id", () => {
    expect(viewById("night").id).toBe("night");
    expect(viewById("atlas").id).toBe("atlas");
  });

  it("falls back to the default for an id no view carries", () => {
    expect(viewById("nonsense")).toBe(DEFAULT_VIEW);
    expect(viewById(undefined)).toBe(DEFAULT_VIEW);
  });
});
