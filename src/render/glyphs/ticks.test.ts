/**
 * The lee-flank clamp: where Billow's cloud goes, given the wind the units pass
 * handed the glyph. Pure geometry, so it is worth testing; the cloud whose
 * direction it decides is checked by eye (#58, ADR-0014).
 */
import { describe, expect, it } from "vitest";
import { leeDrift } from "./ticks.ts";

/** Heading is up the negative y axis, so `-y` is ahead, `+y` astern, `+x` to starboard. */
const AHEAD = 0;
const STARBOARD = Math.PI / 2;
const ASTERN = Math.PI;
const PORT = (3 * Math.PI) / 2;

describe("leeDrift", () => {
  it("always answers a unit vector, so the cloud's reach is the glyph's to set", () => {
    for (const windTo of [undefined, AHEAD, STARBOARD, ASTERN, PORT, 1, 2.5, 4]) {
      for (const formation of ["column", "line"] as const) {
        const drift = leeDrift(windTo, formation);
        expect(Math.hypot(drift.x, drift.y)).toBeCloseTo(1, 10);
      }
    }
  });

  it("takes a beam wind straight off the lee flank", () => {
    const starboard = leeDrift(STARBOARD, "column");
    expect(starboard.x).toBeCloseTo(1, 10);
    expect(starboard.y).toBeCloseTo(0, 10);
    expect(leeDrift(PORT, "column").x).toBeCloseTo(-1, 10);
  });

  it("keeps the cloud off the hull when the wind is dead ahead or astern", () => {
    // A column running dead downwind would smoke over its own ticks: the
    // across-hull component is never below about a half, the along-hull damped.
    for (const windTo of [AHEAD, ASTERN]) {
      const drift = leeDrift(windTo, "column");
      expect(Math.abs(drift.x)).toBeGreaterThan(0.5);
      expect(Math.abs(drift.x)).toBeGreaterThan(Math.abs(drift.y));
    }
  });

  it("clears to the flank the wind is already leaning towards", () => {
    // A hair off dead ahead sends the cloud to that side, never across the hull.
    expect(leeDrift(0.1, "column").x).toBeGreaterThan(0);
    expect(leeDrift(-0.1, "column").x).toBeLessThan(0);
  });

  it("measures a line's flanks fore and aft, since its long axis runs across the heading", () => {
    // A wind on the beam of a line-abreast unit blows along its length, which is
    // the case the clamp has to lift off the hull.
    const drift = leeDrift(STARBOARD, "line");
    expect(Math.abs(drift.y)).toBeGreaterThan(0.5);
    expect(Math.abs(drift.y)).toBeGreaterThan(Math.abs(drift.x));
  });

  it("puts a becalmed cloud on the flank the label does not use", () => {
    // The label sits beside a column and astern of a line (`drawUnits`), so the
    // cloud takes the other flank rather than sitting under the words.
    expect(leeDrift(undefined, "column")).toEqual({ x: -1, y: 0 });
    expect(leeDrift(undefined, "line")).toEqual({ x: 0, y: -1 });
  });
});
