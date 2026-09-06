/**
 * The list the front door draws: what it holds and in what order. Drawing it
 * is a handful of elements over this (`libraryPage.ts`).
 */
import { describe, expect, it } from "vitest";
import type { Library } from "../data/library.ts";
import { libraryOrder } from "./libraryPage.ts";

/** A library entry with only the fields the page reads; `sides` is carried for the file, not the page. */
function entry(name: string, year: number, month = 1, day = 1): Library[number] {
  return {
    name,
    title: `The Battle of ${name}`,
    date: `${day} of month ${month}, ${year}`,
    sort_date: { year, month, day },
    summary: `What happened at ${name}.`,
    sides: ["British"],
  };
}

describe("the order the front door lists battles in", () => {
  it("is oldest first, whatever order the file arrived in", () => {
    const library = [
      entry("trafalgar", 1805, 10, 21),
      entry("cannae", -216, 8, 2),
      entry("copenhagen", 1801, 4, 2),
      entry("nile", 1798, 8, 1),
    ];
    expect(libraryOrder(library).map((battle) => battle.name)).toEqual(["cannae", "nile", "copenhagen", "trafalgar"]);
  });

  it("keeps every battle, with what the entry says about it", () => {
    expect(libraryOrder([entry("trafalgar", 1805, 10, 21)])).toEqual([entry("trafalgar", 1805, 10, 21)]);
  });

  it("leaves the library it was handed alone", () => {
    const library = [entry("trafalgar", 1805), entry("cannae", -216)];
    libraryOrder(library);
    expect(library.map((battle) => battle.name)).toEqual(["trafalgar", "cannae"]);
  });

  it("is empty for an empty library", () => {
    expect(libraryOrder([])).toEqual([]);
  });
});
