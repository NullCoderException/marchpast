/**
 * A fixture is held to one thing: the schema. It never passes the validator on
 * the way to the plate — the player takes it straight — so this is the only
 * place that stops one drifting out of the shape a battle file has. The
 * register holds the absence fixture of #166, which is exactly what the check
 * is for: a fixture is written to be looked at, and nothing else would notice
 * it drifting out of the shape a battle file has.
 */
import { describe, expect, it } from "vitest";
import { validateBattle } from "../schema/validateBattle.ts";
import { fixtureNameFrom, FIXTURES, fixturesThereAre } from "./fixtures.ts";

describe("every fixture", () => {
  it("validates as a battle file", () => {
    const invalid = Object.entries(FIXTURES).flatMap(([name, battle]) => {
      const result = validateBattle(battle);
      return result.ok ? [] : [{ name, errors: result.errors }];
    });
    expect(invalid).toEqual([]);
  });
});

describe("fixtureNameFrom", () => {
  it("reads the fixture the URL names", () => {
    expect(fixtureNameFrom("?fixture=trafalgar-sketch")).toBe("trafalgar-sketch");
    expect(fixtureNameFrom("?battle=trafalgar&fixture=trafalgar-sketch")).toBe("trafalgar-sketch");
  });

  it("answers nothing when the URL names none, so the ordinary battle path runs", () => {
    expect(fixtureNameFrom("")).toBeUndefined();
    expect(fixtureNameFrom("?battle=trafalgar")).toBeUndefined();
    expect(fixtureNameFrom("?fixture=")).toBeUndefined();
    expect(fixtureNameFrom("?fixture=%20%20")).toBeUndefined();
  });
});

describe("fixturesThereAre", () => {
  it("names every fixture, so a mistyped ?fixture= can be corrected from the notice it draws", () => {
    expect(fixturesThereAre({ "trafalgar-sketch": {}, "nile-sketch": {} })).toBe("The fixtures there are: trafalgar-sketch, nile-sketch.");
  });

  it("says there are none rather than offering an empty list, which is what an emptied register gets", () => {
    expect(fixturesThereAre({})).toBe("There are no fixtures just now: they live in src/app/fixtures.ts.");
  });

  it("names the register there is", () => {
    expect(fixturesThereAre()).toBe("The fixtures there are: carrier-strike.");
  });
});
