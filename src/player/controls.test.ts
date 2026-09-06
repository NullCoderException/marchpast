/**
 * The rules the controls follow, taken as pure functions so they are tested
 * without a DOM. What the strip *looks* like is checked by eye; what it offers
 * is checked here.
 */
import { describe, expect, it } from "vitest";
import { levelOptions } from "./controls.ts";
import trafalgarRaw from "../../data/battles/trafalgar.json?raw";
import { MINIMAL_BATTLE } from "../schema/examples.ts";
import type { Battle } from "../schema/types.ts";

/** The shipped Trafalgar file, which `scripts/dataFiles.test.ts` has already proved valid. */
const trafalgar = JSON.parse(trafalgarRaw) as Battle;

/** The example battle with its `levels` replaced, so the rule is read off the field alone. */
function withLevels(levels: string[] | undefined): Battle {
  const battle = { ...MINIMAL_BATTLE };
  if (levels === undefined) delete battle.levels;
  else battle.levels = levels;
  return battle;
}

describe("levelOptions", () => {
  it("offers the battle's levels, coarsest first, when there is a choice", () => {
    expect(levelOptions(MINIMAL_BATTLE)).toEqual(["Columns", "Squadrons"]);
  });

  it("offers nothing for a battle with no levels, so no chooser is built", () => {
    // Trafalgar as it stands is one flat roster (the squadrons are their own data issue).
    expect(trafalgar.levels).toBeUndefined();
    expect(levelOptions(trafalgar)).toEqual([]);
    expect(levelOptions(withLevels(undefined))).toEqual([]);
  });

  it("offers nothing for a single level, which is not a choice either", () => {
    expect(levelOptions(withLevels(["Columns"]))).toEqual([]);
  });

  it("offers all three of a three-deep battle", () => {
    expect(levelOptions(withLevels(["Wings", "Divisions", "Brigades"]))).toEqual(["Wings", "Divisions", "Brigades"]);
  });
});
