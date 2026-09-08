/**
 * The conformance test ADR-0023 locks the derivation with, and ADR-0030 gave
 * its fourth row: run over `VIEWS`, so a fourth view fails loudly here rather
 * than shipping an unreadable strip.
 *
 * It earns its place on the *derived* values specifically. A view guarantees
 * its own ink on its own paper — that is what a view is — but nothing
 * guarantees the ink at 55% against the paper, or the ink on a hover fill. The
 * fourth row, the fill against the ground, is the one that would have caught
 * the staff map: the test asked only that text stay legible *on* the fill and
 * never that the fill be distinguishable *from* the ground, and a printed
 * operations sheet's sea and land are one tone apart on purpose.
 *
 * The bars are WCAG's: 4.5:1 for text, 3:1 for a rule. The fill's is
 * deliberately low — a hover fill is a hint, not text — and it is set where it
 * is because 1.05 fails it and 1.14 passes (ADR-0030).
 */
import { describe, expect, it } from "vitest";
import { ATLAS, CHART_PLATE, NIGHT_PLATE, STAFF_MAP, VIEWS } from "../render/views.ts";
import { contrastRatio, luminance, over, ruleAlpha, surfaceOf } from "./surface.ts";

/** What text has to clear, against anything it is set on. */
const TEXT = 4.5;
/** What a hairline has to clear against the ground it is drawn on. */
const RULE = 3;
/** What the fill has to clear against the ground, so a trough can be seen at all. */
const FILL = 1.1;

describe.each(VIEWS.map((view) => [view.name, view] as const))("the surface %s derives", (_name, view) => {
  const surface = surfaceOf(view);

  it("sets its text at 4.5:1 or better against the strip's ground", () => {
    expect(contrastRatio(surface.ink, surface.ground)).toBeGreaterThanOrEqual(TEXT);
  });

  it("sets its text at 4.5:1 or better against the hover fill", () => {
    expect(contrastRatio(surface.ink, surface.sunk)).toBeGreaterThanOrEqual(TEXT);
  });

  it("draws its rule at 3:1 or better against the ground", () => {
    expect(contrastRatio(surface.rule, surface.ground)).toBeGreaterThanOrEqual(RULE);
  });

  it("steps its fill 1.1:1 or better off the ground, so the trough can be seen", () => {
    expect(contrastRatio(surface.sunk, surface.ground)).toBeGreaterThanOrEqual(FILL);
  });
});

describe("what the surface takes from a view, and what it leaves", () => {
  it("takes the ink, the ground and the page's edge whole, from the palette", () => {
    const surface = surfaceOf(CHART_PLATE);
    expect(surface.ink).toBe(CHART_PLATE.palette.ink);
    expect(surface.ground).toBe(CHART_PLATE.palette.paper);
    expect(surface.edge).toBe(CHART_PLATE.palette.letterbox);
  });

  it("leaves `land` on the map: no token carries the palette's land (ADR-0030)", () => {
    for (const view of VIEWS) {
      // Not `toContain`: the caret is a URI with a colour inside it, so the
      // question is whether the value appears anywhere in a token at all.
      const written = Object.values(surfaceOf(view)).join(" ");
      expect(written).not.toContain(view.palette.land);
    }
  });

  it("lays the fill at 8% of the ink, which is the move the plate and the night plate made", () => {
    expect(surfaceOf(CHART_PLATE).sunk).toBe("#dfd4b8");
    expect(surfaceOf(NIGHT_PLATE).sunk).toBe("#2c333c");
  });

  it("holds the three engraved rules at the 0.55 floor, which already clears 3:1", () => {
    for (const view of [CHART_PLATE, NIGHT_PLATE, ATLAS]) expect(ruleAlpha(view.palette.ink, view.palette.paper)).toBe(0.55);
  });

  it("raises the rule's alpha by hundredths for a palette the floor does not carry", () => {
    // The staff map's, from #139: a flat 0.55 measures 2.91 and 0.57 measures 3.07 (ADR-0030).
    const { ink, paper } = STAFF_MAP.palette;
    expect(ruleAlpha(ink, paper)).toBe(0.57);
    expect(contrastRatio(over(ink, paper, 0.55), paper)).toBeLessThan(RULE);
  });

  it("sets `color-scheme` from the paper's own luminance, never from the operating system (ADR-0029)", () => {
    expect(surfaceOf(CHART_PLATE).scheme).toBe("light");
    expect(surfaceOf(NIGHT_PLATE).scheme).toBe("dark");
  });

  it("names a face a stylesheet can set, with what it falls back to while the face is in flight", () => {
    expect(surfaceOf(CHART_PLATE).face).toBe('"IM Fell English", Georgia, serif');
  });

  it("hands the caret to the view's own type, as a url() carrying that view's ink", () => {
    for (const view of VIEWS) {
      const { caret } = surfaceOf(view);
      expect(caret).toMatch(/^url\("data:image\/svg\+xml,/);
      expect(decodeURIComponent(caret)).toContain(view.palette.ink);
    }
  });
});

describe("the colour arithmetic the derivation is measured with", () => {
  it("scores black on white at 21:1 and a colour against itself at 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#8f2f24", "#8f2f24")).toBeCloseTo(1, 5);
  });

  it("reads a three-digit colour as the six-digit one it stands for", () => {
    expect(luminance("#fff")).toBeCloseTo(luminance("#ffffff"), 12);
  });

  it("answers the ground itself at no alpha and the ink itself at full", () => {
    expect(over("#2b2418", "#efe3c6", 0)).toBe("#efe3c6");
    expect(over("#2b2418", "#efe3c6", 1)).toBe("#2b2418");
  });
});
