import { describe, expect, it } from "vitest";
import { validateBattle } from "../schema/validateBattle.ts";
import { ABSENCE_BATTLE, NIGHT_BATTLE, TEST_BATTLE } from "./testBattle.ts";

describe.each([
  ["TEST_BATTLE", TEST_BATTLE],
  ["NIGHT_BATTLE", NIGHT_BATTLE],
  ["ABSENCE_BATTLE", ABSENCE_BATTLE],
])("the timeline's %s", (_name, battle) => {
  it("is a battle file the validator accepts, so no timeline rule is proved on an impossible file", () => {
    const result = validateBattle(structuredClone(battle));
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
