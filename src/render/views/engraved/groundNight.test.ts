/**
 * The night plate's arithmetic: how lit one contour segment is. Everything
 * else about the treatment — how wide the lit line runs and how far the shaded
 * one thins — is ink, judged by eye against the Terrain Per View canvas
 * (#138); the factor is what decides which side of the hill a line is on, and
 * it is worth holding still.
 */
import { describe, expect, it } from "vitest";
import type { Point } from "../../primitives.ts";
import { LIGHT, litFactor } from "./groundNight.ts";

/** A unit vector at a compass bearing, in canvas coordinates: north is up the negative y axis. */
const toward = (degrees: number): Point => {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
};

describe("the light", () => {
  it("stands in the north-west, so a slope facing up and left is the lit one", () => {
    expect(LIGHT.x).toBeCloseTo(toward(315).x);
    expect(LIGHT.y).toBeCloseTo(toward(315).y);
    expect(Math.hypot(LIGHT.x, LIGHT.y)).toBeCloseTo(1);
  });
});

describe("litFactor", () => {
  it("is full light where the slope rises straight at it", () => {
    expect(litFactor(toward(315))).toBeCloseTo(1);
  });

  it("is full shade where the slope rises straight away from it", () => {
    expect(litFactor(toward(135))).toBeCloseTo(0);
  });

  it("is half at either normal across the beam, so the two sides of a hill part evenly", () => {
    expect(litFactor(toward(45))).toBeCloseTo(0.5);
    expect(litFactor(toward(225))).toBeCloseTo(0.5);
  });

  it("never leaves the nought-to-one range a weight and an alpha are scaled by", () => {
    for (let bearing = 0; bearing < 360; bearing += 15) {
      const factor = litFactor(toward(bearing));
      expect(factor).toBeGreaterThanOrEqual(0);
      expect(factor).toBeLessThanOrEqual(1);
    }
  });
});
