import { describe, expect, it } from "vitest";
import { DEFAULT_BATTLE, battleNameFrom } from "./battleName.ts";

describe("the battle named on the URL", () => {
  it("is read from ?battle=", () => {
    expect(battleNameFrom("?battle=cannae")).toBe("cannae");
  });

  it("defaults to trafalgar when the query is absent", () => {
    expect(battleNameFrom("")).toBe(DEFAULT_BATTLE);
    expect(DEFAULT_BATTLE).toBe("trafalgar");
  });

  it("defaults when ?battle= is present but empty or blank", () => {
    expect(battleNameFrom("?battle=")).toBe("trafalgar");
    expect(battleNameFrom("?battle=%20%20")).toBe("trafalgar");
  });

  it("trims the name and ignores other parameters", () => {
    expect(battleNameFrom("?speed=2&battle=%20cannae%20")).toBe("cannae");
  });
});
