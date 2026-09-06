/**
 * The Library's list as a value: what it holds, in what order, and where each
 * entry leads. Drawing it is a handful of elements over this (`library.ts`).
 */
import { describe, expect, it } from "vitest";
import type { BattleIndex } from "../data/battleIndex.ts";
import { libraryRows } from "./library.ts";

/** An index entry with only the fields the list reads; `sides` is carried for the file, not the page. */
function entry(name: string, year: number, month = 1, day = 1): BattleIndex[number] {
  return {
    name,
    title: `The Battle of ${name}`,
    date: `${day} of month ${month}, ${year}`,
    sort_date: { year, month, day },
    summary: `What happened at ${name}.`,
    sides: ["British"],
  };
}

describe("the Library's list", () => {
  it("carries each battle's title, date and summary, and where it is played", () => {
    expect(libraryRows([entry("trafalgar", 1805, 10, 21)])).toEqual([
      {
        name: "trafalgar",
        title: "The Battle of trafalgar",
        date: "21 of month 10, 1805",
        summary: "What happened at trafalgar.",
        href: "?battle=trafalgar",
      },
    ]);
  });

  it("is oldest first, whatever order the index arrived in", () => {
    const index = [
      entry("trafalgar", 1805, 10, 21),
      entry("cannae", -216, 8, 2),
      entry("copenhagen", 1801, 4, 2),
      entry("nile", 1798, 8, 1),
    ];
    expect(libraryRows(index).map((row) => row.name)).toEqual(["cannae", "nile", "copenhagen", "trafalgar"]);
  });

  it("leaves the index it was handed alone", () => {
    const index = [entry("trafalgar", 1805), entry("cannae", -216)];
    libraryRows(index);
    expect(index.map((battle) => battle.name)).toEqual(["trafalgar", "cannae"]);
  });

  it("is empty for an empty library", () => {
    expect(libraryRows([])).toEqual([]);
  });
});
