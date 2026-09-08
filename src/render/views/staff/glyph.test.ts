/**
 * The frame's footprint: the one thing about the staff map's glyph that is a
 * measurement rather than a drawing (#139, ADR-0016). The tint, the serration
 * and the arm signs are judged by eye against the design canvas; what is held
 * here is that the box the label clears is the box the unit fills, and that a
 * glyph with no mark reaches nothing.
 */
import { describe, expect, it } from "vitest";
import type { Formation, UnitState } from "../../../schema/types.ts";
import { GLYPH_PX, STATES } from "../../anatomy.ts";
import { frame, frameSize } from "./glyph.ts";

describe("frameSize", () => {
  it("gives a line the anatomy's long axis across the heading, and a column along it", () => {
    expect(frameSize("line", GLYPH_PX)).toEqual({ w: 72, h: 18 });
    expect(frameSize("column", GLYPH_PX)).toEqual({ w: 18, h: 72 });
  });

  it("gives a mass the two-rank footprint: half a line's frontage by twice its depth", () => {
    expect(frameSize("mass", GLYPH_PX)).toEqual({ w: 36, h: 36 });
  });

  it("thins the depth with the sample and leaves the length to the caller", () => {
    // The legend hands in a shorter length already, and a scale for the depth.
    expect(frameSize("column", 34, 0.75)).toEqual({ w: 13.5, h: 34 });
  });
});

describe("the frame glyph", () => {
  it("clears the footprint's flank, and twice as much for a mass", () => {
    for (const formation of ["line", "column"] as Formation[]) {
      expect(frame.halfWidth(1, formation)).toBe(18 / 2 + 4);
    }
    expect(frame.halfWidth(1, "mass")).toBe(36 / 2 + 4);
    expect(frame.halfWidth(0.5, "line")).toBe((18 / 2 + 4) * 0.5);
  });

  it("reaches nothing in any state, because its engaged mark is inside the unit's own footprint", () => {
    for (const state of STATES) expect(frame.markReach(1, state)).toBe(0);
    expect(frame.markReach(2, "engaged" as UnitState)).toBe(0);
  });

  it("lays nothing down before the bodies: it has no mark half at all (ADR-0021)", () => {
    expect(frame.mark).toBeUndefined();
  });

  it("draws a sign for every arm there is, so no unit falls back to a blank box (ADR-0015)", () => {
    expect(Object.keys(frame.signs).sort()).toEqual(["aircraft", "cavalry", "infantry", "ship"]);
  });
});
