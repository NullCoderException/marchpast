import { describe, expect, it } from "vitest";
import { treeDepth, unitDepths, unitsAtLevel } from "./hierarchy.ts";
import type { Unit } from "./types.ts";

/** A roster of `arm: "ship"` units from `[id, parent]` pairs, parents first as the schema requires. */
function roster(...entries: [id: string, parent?: string][]): Unit[] {
  return entries.map(([id, parent]) => {
    const unit: Unit = { id, side: "British", label: id, arm: "ship" };
    if (parent !== undefined) unit.parent = parent;
    return unit;
  });
}

/** The ids `unitsAtLevel` draws, in roster order. */
function drawn(units: Unit[], level: number): string[] {
  return unitsAtLevel(units, level).map((unit) => unit.id);
}

describe("unitDepths", () => {
  it("puts a root at depth 0 and a child one deeper than its parent", () => {
    const units = roster(["a"], ["a1", "a"], ["a1x", "a1"], ["b"]);
    expect(unitDepths(units)).toEqual(new Map([["a", 0], ["a1", 1], ["a1x", 2], ["b", 0]]));
  });

  it("puts every unit of a flat roster at depth 0", () => {
    expect(treeDepth(roster(["a"], ["b"], ["c"]))).toBe(1);
  });

  it("counts the tree's depth as the deepest unit's depth plus one", () => {
    expect(treeDepth(roster(["a"], ["a1", "a"]))).toBe(2);
    expect(treeDepth(roster(["a"], ["a1", "a"], ["a1x", "a1"]))).toBe(3);
  });
});

describe("unitsAtLevel", () => {
  it("draws every unit at that depth", () => {
    const units = roster(["a"], ["a1", "a"], ["a2", "a"], ["b"], ["b1", "b"]);
    expect(drawn(units, 0)).toEqual(["a", "b"]);
    expect(drawn(units, 1)).toEqual(["a1", "a2", "b1"]);
  });

  it("keeps a shallower unit with no children on the plate at every finer level", () => {
    // `b` was never split, so showing the squadrons still draws it (ADR-0017).
    const units = roster(["a"], ["a1", "a"], ["a2", "a"], ["b"]);
    expect(drawn(units, 0)).toEqual(["a", "b"]);
    expect(drawn(units, 1)).toEqual(["a1", "a2", "b"]);
  });

  it("keeps them in roster order, whatever depth they came from", () => {
    const units = roster(["a"], ["a1", "a"], ["b"], ["c"], ["c1", "c"]);
    expect(drawn(units, 1)).toEqual(["a1", "b", "c1"]);
  });

  it("draws only the leaves at a level past the deepest unit", () => {
    const units = roster(["a"], ["a1", "a"], ["a1x", "a1"], ["b"]);
    expect(drawn(units, 2)).toEqual(["a1x", "b"]);
    expect(drawn(units, 5)).toEqual(["a1x", "b"]);
  });
});
