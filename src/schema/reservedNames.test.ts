import { describe, expect, it } from "vitest";
import { RESERVED_BATTLE_NAMES, reservedNameError } from "./reservedNames.ts";

describe("reservedNameError", () => {
  it("passes an ordinary battle name", () => {
    for (const name of ["trafalgar", "the-nile", "little-bighorn", "midway", "index-card"]) {
      expect(reservedNameError(name), name).toBeUndefined();
    }
  });

  it("rejects every path the build emits at the site's root", () => {
    expect([...RESERVED_BATTLE_NAMES]).toEqual(["data", "assets", "404", "index"]);
    for (const name of RESERVED_BATTLE_NAMES) {
      expect(reservedNameError(name)?.path, name).toBe("");
      expect(reservedNameError(name)?.message, name).toContain(JSON.stringify(name));
    }
  });
});
