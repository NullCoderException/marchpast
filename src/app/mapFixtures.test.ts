/**
 * A map fixture is held to one thing: the schema. It never passes the
 * validator on the way to the plate — the player takes it straight — so this
 * is the only place that stops one drifting out of the shape a map file has.
 * The register is empty just now (#109), so that check has nothing to run on:
 * it stands for the next map fixture rather than for one there is.
 */
import { describe, expect, it } from "vitest";
import { validateMap } from "../schema/validateMap.ts";
import { mapFixtureNameFrom, MAP_FIXTURES, mapFixturesThereAre } from "./mapFixtures.ts";

describe("every map fixture", () => {
  it("validates as a map file", () => {
    const invalid = Object.entries(MAP_FIXTURES).flatMap(([name, map]) => {
      const result = validateMap(map);
      return result.ok ? [] : [{ name, errors: result.errors }];
    });
    expect(invalid).toEqual([]);
  });
});

describe("mapFixtureNameFrom", () => {
  it("reads the map fixture the URL names", () => {
    expect(mapFixtureNameFrom("?map=trafalgar-shoals")).toBe("trafalgar-shoals");
    expect(mapFixtureNameFrom("?fixture=trafalgar-sketch&map=trafalgar-shoals")).toBe("trafalgar-shoals");
  });

  it("is undefined when no map is named", () => {
    expect(mapFixtureNameFrom("")).toBeUndefined();
    expect(mapFixtureNameFrom("?fixture=trafalgar-sketch")).toBeUndefined();
    expect(mapFixtureNameFrom("?map=")).toBeUndefined();
    expect(mapFixtureNameFrom("?map=%20%20")).toBeUndefined();
  });
});

describe("mapFixturesThereAre", () => {
  it("names every map fixture, so a mistyped &map= can be corrected from the notice it draws", () => {
    expect(mapFixturesThereAre({ "trafalgar-shoals": {}, "nile-shoals": {} })).toBe("The map fixtures there are: trafalgar-shoals, nile-shoals.");
  });

  it("says there are none rather than offering an empty list, which is what the register holds now", () => {
    expect(mapFixturesThereAre({})).toBe("There are no map fixtures just now: they live in src/app/mapFixtures.ts.");
    expect(mapFixturesThereAre()).toBe("There are no map fixtures just now: they live in src/app/mapFixtures.ts.");
  });
});
