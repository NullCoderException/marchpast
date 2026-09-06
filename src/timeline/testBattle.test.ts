import { describe, expect, it } from "vitest";
import { validateBattle } from "../schema/validateBattle.ts";
import { TEST_BATTLE } from "./testBattle.ts";

describe("the timeline's test battle", () => {
  it("is a battle file the validator accepts, so no timeline rule is proved on an impossible file", () => {
    const result = validateBattle(structuredClone(TEST_BATTLE));
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});
