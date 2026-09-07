/**
 * What the Details panel carries about the plate itself. On a phone the
 * legend keeps only its line of sides, so the rows it can no longer show —
 * the states, the arms, the line styles — and the map's credit are here
 * instead (#86). Building the DOM is a handful of elements over this.
 */
import { describe, expect, it } from "vitest";
import type { Battle, MapFile } from "../schema/types.ts";
import { keyRowLabel } from "../render/key.ts";
import { plateKey } from "./details.ts";

/** A roster of ships, or of the arms named: the arm rows are all the roster is read for. */
function battleOf(...arms: ("ship" | "infantry" | "cavalry")[]): Battle {
  return { units: arms.map((arm, index) => ({ id: `u${index}`, side: "A", label: `Unit ${index}`, arm })) } as unknown as Battle;
}

const CREDITED = { attribution: "Natural Earth, public domain" } as unknown as MapFile;

/** The words the key teaches, in the order it teaches them. */
function words(battle: Battle, map: MapFile | undefined = CREDITED): string[] {
  return (plateKey(battle, map, "phone")?.rows ?? []).map(keyRowLabel);
}

describe("the plate's key in the Details panel", () => {
  it("is nothing at all on a desktop, where the legend still carries every row", () => {
    expect(plateKey(battleOf("ship"), CREDITED, "desktop")).toBeUndefined();
  });

  it("carries the four state rows on a phone", () => {
    expect(words(battleOf("ship"))).toEqual(expect.arrayContaining(["intact", "engaged", "broken", "destroyed"]));
  });

  it("carries the three line styles", () => {
    expect(words(battleOf("ship"))).toEqual(expect.arrayContaining(["track", "intent", "detachment"]));
  });

  it("carries an arm row for each arm the roster keys, and none for a battle of one arm", () => {
    expect(words(battleOf("infantry", "cavalry"))).toEqual(expect.arrayContaining(["infantry", "cavalry"]));
    // Trafalgar is all ships, so it keys no arm — as the plate's own legend does not (ADR-0015).
    expect(words(battleOf("ship", "ship"))).not.toContain("ship");
  });

  it("keeps the sides out of it: they are the one row the phone's strip still draws", () => {
    expect(words(battleOf("ship"))).not.toContain("A");
  });

  it("carries the map's credit line, which a phone takes off the plate", () => {
    expect(plateKey(battleOf("ship"), CREDITED, "phone")?.credit).toBe("Natural Earth, public domain");
  });

  it("carries no credit when the battle has no map, or the map has nothing to credit", () => {
    expect(plateKey(battleOf("ship"), undefined, "phone")?.credit).toBeUndefined();
    expect(plateKey(battleOf("ship"), {} as unknown as MapFile, "phone")?.credit).toBeUndefined();
    expect(plateKey(battleOf("ship"), { attribution: "" } as unknown as MapFile, "phone")?.credit).toBeUndefined();
  });

  it("still carries its rows when there is no credit to carry", () => {
    expect(words(battleOf("ship"), undefined).length).toBeGreaterThan(0);
  });
});
