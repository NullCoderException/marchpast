/**
 * What the muster offers: which units it lists at a level and in a phase, and
 * the two strings each one is announced by (#130, ADR-0024).
 *
 * The list is the plate's own drawn set, so these tests read it the way the
 * renderer does — through the level and through the phase — and the strings
 * are the card's own words, so a change to `cardContent` shows up here.
 */
import { describe, expect, it } from "vitest";
import { musterOptions } from "./muster.ts";
import { MINIMAL_BATTLE } from "../schema/examples.ts";
import type { Battle } from "../schema/types.ts";
import { pictureAt } from "../timeline/pictureAt.ts";
import { ABSENCE_BATTLE, clock } from "../timeline/testBattle.ts";

/** The ids the muster lists for a battle at an instant and a level, in the order it lists them. */
function ids(battle: Battle, time: string, level: number): string[] {
  return musterOptions(battle, pictureAt(battle, clock(time)), level).map((option) => option.id);
}

/** One unit's option at an instant and a level. */
function option(battle: Battle, time: string, level: number, id: string) {
  return musterOptions(battle, pictureAt(battle, clock(time)), level).find((entry) => entry.id === id);
}

describe("the units the muster lists", () => {
  it("lists the units the coarsest level draws, in roster order", () => {
    expect(ids(MINIMAL_BATTLE, "05:40", 0)).toEqual(["weather-column", "lee-column", "combined-fleet"]);
  });

  it("lists the finer level's own units, and the shallower ones that were never split", () => {
    // The Combined Fleet has no children, so it stands for itself at both levels.
    expect(ids(MINIMAL_BATTLE, "05:40", 1)).toEqual(["weather-van", "lee-van", "combined-fleet"]);
  });

  it("leaves out a unit the phase does not hold, because the plate is not drawing it", () => {
    // The strike is on the plate for phases one to three of six (ADR-0024).
    expect(ids(ABSENCE_BATTLE, "10:00", 1)).toEqual(["fleet"]);
    expect(ids(ABSENCE_BATTLE, "11:00", 1)).toEqual(["fleet", "strike"]);
    expect(ids(ABSENCE_BATTLE, "15:00", 1)).toEqual(["fleet"]);
  });

  it("lists nothing the level does not draw, absent or not", () => {
    expect(ids(ABSENCE_BATTLE, "11:00", 0)).toEqual(["force"]);
  });
});

describe("what an option is announced by", () => {
  it("is named by the unit and its side, which ink alone carries on the plate", () => {
    expect(option(MINIMAL_BATTLE, "05:40", 0, "weather-column")?.name).toBe("Weather column, British");
    expect(option(MINIMAL_BATTLE, "05:40", 0, "combined-fleet")?.name).toBe("Combined Fleet, Combined Fleet");
  });

  it("is described by the card's own words: the commander, the facts line and the children", () => {
    expect(option(MINIMAL_BATTLE, "05:40", 0, "weather-column")?.description).toBe(
      "Nelson. ship, column, intact, 100%. Van of the weather column, intact",
    );
  });

  it("names the parent on a child's card, and says nothing of a tree the unit has none of", () => {
    expect(option(MINIMAL_BATTLE, "05:40", 1, "weather-van")?.description).toBe("Nelson. ship, column, intact, 100%. of Weather column");
    expect(option(MINIMAL_BATTLE, "05:40", 1, "combined-fleet")?.description).toBe("Villeneuve. ship, column, intact, 100%");
  });

  it("takes the state and the strength of the instant, as the card does", () => {
    expect(option(MINIMAL_BATTLE, "13:30", 1, "combined-fleet")?.description).toBe("Villeneuve. ship, line, broken, 60%");
  });

  it("leaves the commander out of a unit the roster names none for", () => {
    expect(option(ABSENCE_BATTLE, "11:00", 1, "strike")?.description).toBe("aircraft, line, engaged, 100%. of The force");
  });
});
