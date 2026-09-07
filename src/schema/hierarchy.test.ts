import { describe, expect, it } from "vitest";
import { drawnAtLevel, treeDepth, unitDepths, unitsAtLevel } from "./hierarchy.ts";
import type { Phase, Unit } from "./types.ts";

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

/** A phase holding a snapshot of each id named and of nothing else, in the order given. */
function phaseOf(...ids: string[]): Phase {
  return {
    id: "a-phase",
    label: "A phase",
    t: "10:00",
    playback_rate: 60,
    caption: "A caption.",
    notes: "A note.",
    references: [{ source: "invented", locator: "p. 1" }],
    units: ids.map((id) => ({ id, position: { lat: 0, lon: 0 }, heading: 0, formation: "line", state: "intact" })),
  };
}

/** The ids `drawnAtLevel` draws, in roster order. */
function present(units: Unit[], level: number, phase: Phase): string[] {
  return drawnAtLevel(units, level, phase).map((unit) => unit.id);
}

describe("unitDepths", () => {
  it("puts a root at depth 0 and a child one deeper than its parent", () => {
    const units = roster(["a"], ["a1", "a"], ["a1x", "a1"], ["b"]);
    expect(unitDepths(units)).toEqual(new Map([["a", 0], ["a1", 1], ["a1x", 2], ["b", 0]]));
  });

  it("puts every unit of a flat roster at depth 0", () => {
    expect(unitDepths(roster(["a"], ["b"], ["c"]))).toEqual(new Map([["a", 0], ["b", 0], ["c", 0]]));
  });
});

describe("treeDepth", () => {
  it("counts a flat roster as one level", () => {
    expect(treeDepth(roster(["a"], ["b"], ["c"]))).toBe(1);
  });

  it("counts the deepest unit's depth plus one", () => {
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

  it("draws the grandchildren, the unsubdivided children and the unsubdivided roots at level 2", () => {
    // Three deep, with something left whole at each of the two shallower depths.
    const units = roster(["a"], ["a1", "a"], ["a1x", "a1"], ["a2", "a"], ["b"]);
    expect(drawn(units, 0)).toEqual(["a", "b"]);
    expect(drawn(units, 1)).toEqual(["a1", "a2", "b"]);
    expect(drawn(units, 2)).toEqual(["a1x", "a2", "b"]);
  });

  it("draws only the leaves at a level past the deepest unit", () => {
    const units = roster(["a"], ["a1", "a"], ["a1x", "a1"], ["b"]);
    expect(drawn(units, 2)).toEqual(["a1x", "b"]);
    expect(drawn(units, 5)).toEqual(["a1x", "b"]);
  });
});

describe("drawnAtLevel", () => {
  it("draws what the level draws when the phase holds every unit", () => {
    const units = roster(["a"], ["a1", "a"], ["a2", "a"], ["b"]);
    expect(present(units, 1, phaseOf("a", "a1", "a2", "b"))).toEqual(drawn(units, 1));
  });

  it("drops a unit the phase has no snapshot of", () => {
    const units = roster(["a"], ["a1", "a"], ["a2", "a"], ["b"]);
    expect(present(units, 1, phaseOf("a", "a1", "b"))).toEqual(["a1", "b"]);
  });

  it("keeps roster order, whatever order the phase lists its snapshots in", () => {
    const units = roster(["a"], ["a1", "a"], ["b"], ["c"], ["c1", "c"]);
    expect(present(units, 1, phaseOf("c1", "b", "a1"))).toEqual(["a1", "b", "c1"]);
  });

  it("leaves a parent off a finer level in the phases its children are away", () => {
    // Which units a level *can* draw is a property of the roster; presence only
    // filters that set, so `a` never pops onto level 1 (schema.md 2.9).
    const units = roster(["a"], ["a1", "a"], ["a2", "a"], ["b"]);
    expect(present(units, 0, phaseOf("a", "b"))).toEqual(["a", "b"]);
    expect(present(units, 1, phaseOf("a", "b"))).toEqual(["b"]);
  });

  it("draws nothing at a level whose units are all absent", () => {
    const units = roster(["a"], ["a1", "a"]);
    expect(present(units, 1, phaseOf("a"))).toEqual([]);
  });
});
