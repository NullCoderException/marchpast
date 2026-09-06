/**
 * The level filter: the one place the viewer's level narrows what is drawn,
 * and the invariants the rest of the renderer leans on — picture order kept,
 * the roster never renumbered.
 */
import { describe, expect, it } from "vitest";
import { unitsDrawn } from "./level.ts";
import type { UnitPicture } from "../timeline/picture.ts";
import type { Unit } from "../schema/types.ts";

/** A roster of `arm: "ship"` units from `[id, parent]` pairs, parents first as the schema requires. */
function roster(...entries: [id: string, parent?: string][]): Unit[] {
  return entries.map(([id, parent]) => {
    const unit: Unit = { id, side: "British", label: id, arm: "ship" };
    if (parent !== undefined) unit.parent = parent;
    return unit;
  });
}

/** One unit's picture, with only the id mattering here: every level draws the same snapshot. */
function pictures(units: readonly Unit[]): UnitPicture[] {
  return units.map((unit) => ({
    id: unit.id,
    position: { lat: 0, lon: 0 },
    heading: 0,
    formation: "column" as const,
    state: "intact" as const,
    strength: 1,
    moves: [],
  }));
}

describe("unitsDrawn", () => {
  it("draws every unit of a flat roster, whatever the level", () => {
    const units = roster(["a"], ["b"], ["c"]);
    const picture = pictures(units);
    expect(unitsDrawn(units, picture, 0).map((unit) => unit.id)).toEqual(["a", "b", "c"]);
  });

  it("draws the roots at level 0 and the children plus the unsubdivided root at level 1", () => {
    const units = roster(["a"], ["a1", "a"], ["a2", "a"], ["b"]);
    const picture = pictures(units);
    expect(unitsDrawn(units, picture, 0).map((unit) => unit.id)).toEqual(["a", "b"]);
    expect(unitsDrawn(units, picture, 1).map((unit) => unit.id)).toEqual(["a1", "a2", "b"]);
  });

  it("keeps the picture's own order, whatever depth the units came from", () => {
    const units = roster(["a"], ["a1", "a"], ["b"], ["c"], ["c1", "c"]);
    const picture = pictures(units);
    expect(unitsDrawn(units, picture, 1).map((unit) => unit.id)).toEqual(["a1", "b", "c1"]);
  });

  it("hands back the picture's own snapshots, never copies", () => {
    // The passes downstream compare and cache on these, and a rebuilt snapshot
    // would also be a renumbered one.
    const units = roster(["a"], ["a1", "a"], ["b"]);
    const picture = pictures(units);
    expect(unitsDrawn(units, picture, 1)[1]).toBe(picture[2]);
  });

  it("keeps a unit's whole-roster index — the numeral that keys it — the same at every level", () => {
    // `b` is drawn at both levels; the legend's numeral is its index in the
    // whole picture, so the filter must not renumber (ADR-0017, schema.md 2.11).
    const units = roster(["a"], ["a1", "a"], ["b"]);
    const picture = pictures(units);
    for (const level of [0, 1]) {
      const b = unitsDrawn(units, picture, level).find((unit) => unit.id === "b");
      expect(picture.indexOf(b!), `level ${level}`).toBe(2);
    }
  });

  it("ignores a unit the picture does not hold, and a picture unit off the roster", () => {
    // Neither can reach a validated battle; the filter must not invent one either.
    const units = roster(["a"], ["a1", "a"], ["b"]);
    expect(unitsDrawn(units, pictures(roster(["a"], ["b"])), 1).map((unit) => unit.id)).toEqual(["b"]);
  });
});
