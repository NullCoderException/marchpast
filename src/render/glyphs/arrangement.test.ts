/**
 * How a glyph's eight signs are laid out and which of them survive: the
 * arithmetic under every view's body pass (ADR-0016). What the signs *look*
 * like is checked by eye against the design canvas; where they sit is checked
 * here.
 */
import { describe, expect, it } from "vitest";
import { SIGNS_PER_GLYPH } from "../style.ts";
import { occupiedSlots, shownSigns, signPositions, signSlots } from "./arrangement.ts";

/** A glyph is 72px long, so its signs sit on a 9px pitch. */
const LENGTH = 72;
const PITCH = LENGTH / SIGNS_PER_GLYPH;
/** The tests that never reach the broken scatter still have to hand a generator over. */
const NO_RANDOM = (): number => {
  throw new Error("only a broken unit's signs are scattered");
};

describe("signSlots", () => {
  it("puts a column's eight signs in file along the heading, front first", () => {
    const slots = signSlots("column", LENGTH);
    expect(slots).toHaveLength(SIGNS_PER_GLYPH);
    expect(slots.every((slot) => slot.x === 0)).toBe(true);
    // Heading is up the negative y axis, so the front slot is the most negative.
    expect(slots.map((slot) => slot.y)).toEqual([-31.5, -22.5, -13.5, -4.5, 4.5, 13.5, 22.5, 31.5]);
  });

  it("puts a line's eight signs abreast across the heading", () => {
    const slots = signSlots("line", LENGTH);
    expect(slots.every((slot) => slot.y === 0)).toBe(true);
    expect(slots.map((slot) => slot.x)).toEqual([-31.5, -22.5, -13.5, -4.5, 4.5, 13.5, 22.5, 31.5]);
  });

  it("puts a mass in two ranks of four, the front rank across the heading", () => {
    const slots = signSlots("mass", LENGTH);
    expect(slots).toHaveLength(SIGNS_PER_GLYPH);
    // Four across, on the same pitch as a line, so a mass is half a line's frontage.
    expect(slots.slice(0, 4)).toEqual([
      { x: -1.5 * PITCH, y: -PITCH / 2 },
      { x: -0.5 * PITCH, y: -PITCH / 2 },
      { x: 0.5 * PITCH, y: -PITCH / 2 },
      { x: 1.5 * PITCH, y: -PITCH / 2 },
    ]);
    // The rear rank repeats the frontage one pitch behind.
    expect(slots.slice(4).map((slot) => slot.y)).toEqual([PITCH / 2, PITCH / 2, PITCH / 2, PITCH / 2]);
    expect(slots.slice(4).map((slot) => slot.x)).toEqual(slots.slice(0, 4).map((slot) => slot.x));
  });

  it("keeps a mass's frontage half a line's and its depth two ranks", () => {
    const line = signSlots("line", LENGTH);
    const mass = signSlots("mass", LENGTH);
    // The footprint is the span between the outer slots plus the pitch they each sit in the middle of.
    const footprint = (values: number[]): number => Math.max(...values) - Math.min(...values) + PITCH;
    expect(footprint(mass.map((slot) => slot.x))).toBeCloseTo(footprint(line.map((slot) => slot.x)) / 2, 10);
    expect(footprint(mass.map((slot) => slot.y))).toBeCloseTo(2 * PITCH, 10);
    expect(footprint(line.map((slot) => slot.y))).toBeCloseTo(PITCH, 10);
  });
});

describe("shownSigns", () => {
  it("scales the eight signs by strength, never below one while the unit exists", () => {
    expect(shownSigns("intact", 1)).toBe(SIGNS_PER_GLYPH);
    expect(shownSigns("engaged", 0.5)).toBe(4);
    expect(shownSigns("broken", 0.125)).toBe(1);
    expect(shownSigns("broken", 0.01)).toBe(1);
  });

  it("draws no sign at all for a destroyed unit, which is an outline instead", () => {
    expect(shownSigns("destroyed", 1)).toBe(0);
    expect(shownSigns("destroyed", 0)).toBe(0);
  });
});

describe("occupiedSlots", () => {
  it("centres a column's or a line's surviving signs in a contiguous run", () => {
    expect(occupiedSlots("line", "engaged", 4, NO_RANDOM)).toEqual([2, 3, 4, 5]);
    expect(occupiedSlots("column", "intact", 8, NO_RANDOM)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("empties a mass's rear rank before its front one", () => {
    expect(occupiedSlots("mass", "engaged", 8, NO_RANDOM)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // Half strength is one full rank of four, still a body.
    expect(occupiedSlots("mass", "engaged", 4, NO_RANDOM)).toEqual([0, 1, 2, 3]);
    // Above half, the remainder stands behind the whole front rank, centred on it.
    expect(occupiedSlots("mass", "engaged", 6, NO_RANDOM)).toEqual([0, 1, 2, 3, 5, 6]);
    // Below it, the front rank itself thins, and nothing stands behind.
    expect(occupiedSlots("mass", "engaged", 1, NO_RANDOM).every((slot) => slot < 4)).toBe(true);
  });

  it("knocks a broken unit's signs out of rank, gaps and all", () => {
    const random = (): number => 0.9;
    const broken = occupiedSlots("line", "broken", 3, random);
    expect(broken).toHaveLength(3);
    expect(new Set(broken).size).toBe(3);
    // Spread over the whole glyph rather than closed up in the middle.
    expect(Math.max(...broken) - Math.min(...broken)).toBeGreaterThan(2);
  });
});

describe("signPositions", () => {
  it("draws all eight signs at full strength, whatever the formation", () => {
    for (const formation of ["column", "line", "mass"] as const) {
      expect(signPositions(formation, "intact", 1, LENGTH, NO_RANDOM)).toEqual(signSlots(formation, LENGTH));
    }
  });

  it("leaves a mass at half strength standing in its front rank", () => {
    const half = signPositions("mass", "engaged", 0.5, LENGTH, NO_RANDOM);
    expect(half).toHaveLength(4);
    expect(half.every((slot) => slot.y < 0)).toBe(true);
    expect(half).toEqual(signSlots("mass", LENGTH).slice(0, 4));
  });

  it("leaves one sign of a mass at an eighth, and it stands in the front rank", () => {
    const last = signPositions("mass", "engaged", 0.125, LENGTH, NO_RANDOM);
    expect(last).toHaveLength(1);
    expect(last[0]?.y).toBeLessThan(0);
  });

  it("draws no signs for a destroyed unit in any formation", () => {
    for (const formation of ["column", "line", "mass"] as const) {
      expect(signPositions(formation, "destroyed", 1, LENGTH, NO_RANDOM)).toEqual([]);
    }
  });
});
