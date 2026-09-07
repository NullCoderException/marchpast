/**
 * The one piece of the key that is a count rather than ink: how many rows it
 * stands, which the arm rows change and nothing else does (ADR-0015). What a
 * key *looks* like is the view's, and is checked by eye.
 */
import { describe, expect, it } from "vitest";
import type { Arm, Unit } from "../schema/types.ts";
import { keyRowCount } from "./key.ts";
import { legendArms } from "./glyphs/arms.ts";

/** A roster of the given arms, which is all the arm rows read. */
function roster(...arms: Arm[]): Unit[] {
  return arms.map((arm, index) => ({ id: `u${index}`, side: "A", label: `Unit ${index}`, arm }));
}

/** The legend for a roster of these arms, over `sides` sides. */
function rows(sides: number, ...arms: Arm[]): number {
  return keyRowCount(sides, legendArms(roster(...arms)));
}

describe("keyRowCount", () => {
  it("keys no arm for an all-ship roster, so Trafalgar's legend is the height it was", () => {
    // Two sides, the four states and the three line styles: nine rows, as before arms existed.
    expect(rows(2, "ship", "ship", "ship")).toBe(9);
  });

  it("gains a row for each of two arms when a battle has foot and horse", () => {
    expect(rows(2, "cavalry", "infantry", "infantry", "cavalry")).toBe(11);
    expect(rows(2, "cavalry", "infantry", "infantry", "cavalry") - rows(2, "ship")).toBe(2);
  });

  it("gains three rows for a battle of all three arms", () => {
    expect(rows(2, "infantry", "cavalry", "ship") - rows(2, "ship")).toBe(3);
  });

  it("counts a side's row whatever the arms, so the two never interfere", () => {
    expect(rows(3, "infantry", "cavalry") - rows(2, "infantry", "cavalry")).toBe(1);
  });
});
