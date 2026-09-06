/**
 * The one piece of the units pass that is arithmetic rather than ink: turning
 * the phase's wind into the single angle a glyph is allowed to know (ADR-0014).
 */
import { describe, expect, it } from "vitest";
import { windToRelative } from "./drawUnits.ts";

const QUARTER = Math.PI / 2;

describe("windToRelative", () => {
  it("gives the four compass winds for a unit heading north", () => {
    // The wind blows *to* the opposite of where it comes from, and the glyph is
    // drawn heading up, so this is measured clockwise from the unit's own bow.
    expect(windToRelative(0, 0)).toBeCloseTo(2 * QUARTER, 10); // northerly: astern
    expect(windToRelative(0, 90)).toBeCloseTo(3 * QUARTER, 10); // easterly: to port
    expect(windToRelative(0, 180)).toBeCloseTo(0, 10); // southerly: ahead
    expect(windToRelative(0, 270)).toBeCloseTo(QUARTER, 10); // westerly: to starboard
  });

  it("is measured from the unit's heading, not from north", () => {
    // A westerly blows east; a unit heading east has it dead astern.
    expect(windToRelative(90, 270)).toBeCloseTo(0, 10);
    // The same westerly reaches a unit heading north on its starboard beam.
    expect(windToRelative(0, 270)).toBeCloseTo(QUARTER, 10);
  });

  it("answers within one turn whatever the bearings", () => {
    for (const [heading, from] of [
      [350, 350],
      [-90, 45],
      [720, 0],
    ]) {
      const angle = windToRelative(heading!, from!);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(2 * Math.PI);
    }
  });
});
