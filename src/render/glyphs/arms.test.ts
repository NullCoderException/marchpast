/**
 * Which arms the legend keys, and the arm its other rows are drawn in
 * (ADR-0015): the one piece of the legend that is a decision rather than ink.
 */
import { describe, expect, it } from "vitest";
import { drawnAtLevel } from "../../schema/hierarchy.ts";
import type { Arm, Phase, Unit } from "../../schema/types.ts";
import { legendArm, legendArms } from "./arms.ts";

/** A roster of the given arms, which is all these two functions read. */
function roster(...arms: Arm[]): Unit[] {
  return arms.map((arm, index) => ({ id: `u${index}`, side: "A", label: `Unit ${index}`, arm }));
}

describe("legendArms", () => {
  it("keys nothing when every unit is a ship, so Trafalgar's legend is unchanged", () => {
    expect(legendArms(roster("ship", "ship", "ship"))).toEqual([]);
  });

  it("keys nothing for a roster of one arm, whichever arm it is", () => {
    expect(legendArms(roster("infantry", "infantry"))).toEqual([]);
    expect(legendArms(roster("cavalry"))).toEqual([]);
  });

  it("keys both arms of a roster of foot and horse", () => {
    expect(legendArms(roster("cavalry", "infantry", "infantry", "cavalry"))).toEqual(["infantry", "cavalry"]);
  });

  it("keys all three when a battle has ships too, in the order the spec lists them", () => {
    expect(legendArms(roster("ship", "cavalry", "infantry"))).toEqual(["infantry", "cavalry", "ship"]);
  });

  it("keys an arm once however many units carry it", () => {
    expect(legendArms(roster("infantry", "infantry", "infantry", "cavalry"))).toEqual(["infantry", "cavalry"]);
  });
});

describe("legendArm", () => {
  it("draws the side and state rows in the arm most of the battle is made of", () => {
    expect(legendArm(roster("ship", "ship", "ship"))).toBe("ship");
    expect(legendArm(roster("cavalry", "infantry", "infantry", "cavalry", "infantry"))).toBe("infantry");
  });

  it("breaks a tie by the order the spec lists the arms", () => {
    expect(legendArm(roster("cavalry", "infantry"))).toBe("infantry");
    expect(legendArm(roster("ship", "cavalry"))).toBe("cavalry");
  });

  it("answers the first arm the spec lists for an empty roster, which the validator never allows anyway", () => {
    expect(legendArm([])).toBe("infantry");
  });
});

describe("the arm rows and the phase", () => {
  /** A phase holding a snapshot for the named units and no others; `drawnAtLevel` reads nothing else off one. */
  function phaseHolding(...ids: string[]): Phase {
    return { units: ids.map((id) => ({ id })) } as unknown as Phase;
  }

  it("keys the aircraft row off the roster, so it does not blink out in a phase the strike is away", () => {
    // ADR-0024: a unit may be absent from a phase, and at Midway 6 June is a
    // day of ships alone. The legend is keyed on what the level can draw and
    // not on what this phase does, so the arm the viewer learnt on 4 June is
    // still explained on the 6th.
    const units = roster("ship", "ship", "aircraft");
    expect(drawnAtLevel(units, 0, phaseHolding("u0", "u1")).map((unit) => unit.arm)).toEqual(["ship", "ship"]);
    expect(legendArms(units)).toEqual(["ship", "aircraft"]);
  });

  it("keys the row in a phase the strike is the only thing present, for the same reason", () => {
    const units = roster("ship", "ship", "aircraft");
    expect(drawnAtLevel(units, 0, phaseHolding("u2")).map((unit) => unit.arm)).toEqual(["aircraft"]);
    expect(legendArms(units)).toEqual(["ship", "aircraft"]);
  });
});
