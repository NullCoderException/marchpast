import { describe, expect, it } from "vitest";
import { lerpHeading, lerpPosition } from "./tween.ts";

describe("lerpHeading", () => {
  it("takes the short way round the north point", () => {
    expect(lerpHeading(350, 10, 0.5)).toBeCloseTo(0);
    expect(lerpHeading(350, 10, 0.25)).toBeCloseTo(355);
    expect(lerpHeading(350, 10, 1)).toBeCloseTo(10);
  });

  it("goes backward through north when the short way round is backward", () => {
    expect(lerpHeading(10, 350, 0.5)).toBeCloseTo(0);
    expect(lerpHeading(10, 350, 0.25)).toBeCloseTo(5);
  });

  it("resolves an exact 180 degree difference clockwise", () => {
    expect(lerpHeading(0, 180, 0.5)).toBeCloseTo(90);
    expect(lerpHeading(90, 270, 0.5)).toBeCloseTo(180);
    expect(lerpHeading(270, 90, 0.5)).toBeCloseTo(0);
  });

  it("holds the endpoints", () => {
    expect(lerpHeading(45, 315, 0)).toBeCloseTo(45);
    expect(lerpHeading(45, 315, 1)).toBeCloseTo(315);
  });

  it("always answers in [0, 360)", () => {
    for (let a = 0; a < 360; a += 17) {
      for (let b = 0; b < 360; b += 23) {
        for (const f of [0, 0.25, 0.5, 0.75, 1]) {
          const h = lerpHeading(a, b, f);
          expect(h, `${a} to ${b} at ${f}`).toBeGreaterThanOrEqual(0);
          expect(h, `${a} to ${b} at ${f}`).toBeLessThan(360);
        }
      }
    }
  });

  it("never turns more than half a circle", () => {
    for (let a = 0; a < 360; a += 13) {
      for (let b = 0; b < 360; b += 11) {
        const quarter = lerpHeading(a, b, 0.25);
        const turned = Math.abs(((quarter - a + 540) % 360) - 180);
        expect(turned, `${a} to ${b}`).toBeLessThanOrEqual(45.0001);
      }
    }
  });
});

describe("lerpPosition", () => {
  it("is the arithmetic mean at the midpoint", () => {
    expect(lerpPosition({ lat: 10, lon: 20 }, { lat: 20, lon: 40 }, 0.5)).toEqual({ lat: 15, lon: 30 });
    const mid = lerpPosition({ lat: -1, lon: -6.8 }, { lat: 1, lon: -6.4 }, 0.5);
    expect(mid.lat).toBeCloseTo(0, 12);
    expect(mid.lon).toBeCloseTo(-6.6, 12);
  });

  it("holds the endpoints and interpolates linearly between them", () => {
    const from = { lat: 0, lon: 0 };
    const to = { lat: 8, lon: -4 };
    expect(lerpPosition(from, to, 0)).toEqual(from);
    expect(lerpPosition(from, to, 1)).toEqual(to);
    expect(lerpPosition(from, to, 0.25)).toEqual({ lat: 2, lon: -1 });
  });

  it("answers a fresh position, never the one it was given", () => {
    const from = { lat: 0, lon: 0 };
    expect(lerpPosition(from, { lat: 8, lon: -4 }, 0)).not.toBe(from);
  });
});
