import { describe, expect, it } from "vitest";
import { MINIMAL_BATTLE } from "../schema/examples.ts";
import type { Battle, SortDate, Unit } from "../schema/types.ts";
import { battleIndexEntry, buildBattleIndex, sideNames } from "./battleIndex.ts";

/** The minimal example with only the fields under test changed. */
function battleWith(fields: Partial<Battle>): Battle {
  return { ...structuredClone(MINIMAL_BATTLE), ...fields };
}

/** A roster entry with nothing but the two fields the index reads. */
function unit(id: string, side: string): Unit {
  return { id, side, label: id, arm: "ship" };
}

/** A battle that exists only to be sorted: its date and its roster. */
function dated(sort_date: SortDate, sides = ["British"]): Battle {
  return battleWith({ sort_date, units: sides.map((side, i) => unit(`u${i}`, side)), levels: undefined });
}

describe("the entry one battle file makes", () => {
  it("carries the name, title, first date, sort date, summary and sides", () => {
    expect(battleIndexEntry("trafalgar", MINIMAL_BATTLE)).toEqual({
      name: "trafalgar",
      title: "The Battle of Trafalgar",
      date: "21 October 1805",
      sort_date: { year: 1805, month: 10, day: 21 },
      summary: MINIMAL_BATTLE.summary,
      sides: ["British", "Combined Fleet"],
    });
  });

  it("takes the first day's date, not the last", () => {
    const battle = battleWith({ dates: ["1 August 1798", "2 August 1798"] });
    expect(battleIndexEntry("nile", battle).date).toBe("1 August 1798");
  });
});

describe("the sides a battle names", () => {
  it("lists them in roster order", () => {
    const battle = battleWith({ units: [unit("a", "Carthaginian"), unit("b", "Roman")], levels: undefined });
    expect(sideNames(battle)).toEqual(["Carthaginian", "Roman"]);
  });

  it("names each side once, however many units it has", () => {
    const battle = battleWith({
      units: [unit("a", "British"), unit("b", "Combined Fleet"), unit("c", "British"), unit("d", "Combined Fleet")],
      levels: undefined,
    });
    expect(sideNames(battle)).toEqual(["British", "Combined Fleet"]);
  });
});

describe("the library's order", () => {
  it("puts the oldest battle first, across BC and AD years", () => {
    const index = buildBattleIndex([
      { name: "trafalgar", battle: dated({ year: 1805, month: 10, day: 21 }) },
      { name: "cannae", battle: dated({ year: -216, month: 8, day: 2 }) },
      { name: "copenhagen", battle: dated({ year: 1801, month: 4, day: 2 }) },
      { name: "nile", battle: dated({ year: 1798, month: 8, day: 1 }) },
    ]);
    expect(index.map((entry) => entry.name)).toEqual(["cannae", "nile", "copenhagen", "trafalgar"]);
  });

  it("orders a shared year by month and then by day", () => {
    const index = buildBattleIndex([
      { name: "third", battle: dated({ year: 1805, month: 10, day: 21 }) },
      { name: "first", battle: dated({ year: 1805, month: 2, day: 28 }) },
      { name: "second", battle: dated({ year: 1805, month: 10, day: 9 }) },
    ]);
    expect(index.map((entry) => entry.name)).toEqual(["first", "second", "third"]);
  });

  it("breaks a tie on the same day by name, so the order is total", () => {
    const day = { year: 1805, month: 10, day: 21 };
    const index = buildBattleIndex([
      { name: "beta", battle: dated(day) },
      { name: "alpha", battle: dated(day) },
    ]);
    expect(index.map((entry) => entry.name)).toEqual(["alpha", "beta"]);
  });

  it("is empty when there are no battles", () => {
    expect(buildBattleIndex([])).toEqual([]);
  });
});
