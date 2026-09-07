/**
 * What the plate's glyph promises the shared label pass: the reach it reports
 * covers the cloud it actually draws.
 *
 * `markReach` moved onto the glyph on ADR-0021, so this is the plate's own
 * bargain and no longer a constant every view pays for. Re-tuning Billow past
 * it fails here rather than silently leaving labels sitting in smoke.
 */
import { describe, expect, it } from "vitest";
import type { UnitState } from "../../schema/types.ts";
import { billowReach, ticks } from "./ticks.ts";

describe("the plate's mark reach", () => {
  it("covers the plate's own cloud, and not by much", () => {
    for (const state of ["engaged", "broken"] as const) {
      expect(billowReach(state, 1)).toBeLessThanOrEqual(ticks.markReach(1, state));
      expect(billowReach(state, 1)).toBeGreaterThan(ticks.markReach(1, state) - 6);
    }
  });

  it("is nothing at all for a unit that is not fighting", () => {
    for (const state of ["intact", "destroyed"] as UnitState[]) {
      expect(billowReach(state, 1)).toBe(0);
      expect(ticks.markReach(1, state)).toBe(0);
    }
  });

  it("scales with the sample, as `halfWidth` does, so the legend's rows are not spaced for the plate", () => {
    expect(ticks.markReach(0.5, "engaged")).toBeCloseTo(ticks.markReach(1, "engaged") / 2, 10);
  });
});
