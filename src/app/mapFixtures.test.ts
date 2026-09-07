/**
 * A map fixture is held to one thing: the schema. It never passes the
 * validator on the way to the plate — the player takes it straight — so this
 * is the only place that stops one drifting out of the shape a map file has.
 */
import { describe, expect, it } from "vitest";
import { validateMap } from "../schema/validateMap.ts";
import { mapFixtureNameFrom, MAP_FIXTURES } from "./mapFixtures.ts";

describe("every map fixture", () => {
  it.each(Object.keys(MAP_FIXTURES))("%s validates as a map file", (name) => {
    const result = validateMap(MAP_FIXTURES[name]);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});

describe("the Cannae ground fixture", () => {
  const map = MAP_FIXTURES["cannae-ground"]!;
  const kinds = map.features.map((feature) => feature.properties.kind);

  it("carries all six feature kinds, so the map pass has every one to draw", () => {
    expect(new Set(kinds)).toEqual(new Set(["land", "river", "shoal", "contour", "place", "work"]));
  });

  it("cuts the hill at 10 m from 10 to 300, which is thirty levels for the renderer to weight", () => {
    const levels = map.features.flatMap((feature) => (feature.properties.kind === "contour" ? [feature.properties.elevation] : []));
    expect(levels).toHaveLength(30);
    expect(levels[0]).toBe(10);
    expect(levels[levels.length - 1]).toBe(300);
  });
});

describe("mapFixtureNameFrom", () => {
  it("reads the map fixture the URL names", () => {
    expect(mapFixtureNameFrom("?map=cannae-ground")).toBe("cannae-ground");
    expect(mapFixtureNameFrom("?fixture=cannae-deployment&map=cannae-ground")).toBe("cannae-ground");
  });

  it("is undefined when no map is named", () => {
    expect(mapFixtureNameFrom("")).toBeUndefined();
    expect(mapFixtureNameFrom("?fixture=cannae-deployment")).toBeUndefined();
    expect(mapFixtureNameFrom("?map=")).toBeUndefined();
    expect(mapFixtureNameFrom("?map=%20%20")).toBeUndefined();
  });
});
