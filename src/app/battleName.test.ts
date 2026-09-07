import { afterEach, describe, expect, it, vi } from "vitest";
import { battleNameFrom, battleQuery, libraryHref } from "./battleName.ts";

describe("the battle named on the URL", () => {
  it("is read from ?battle=", () => {
    expect(battleNameFrom("?battle=cannae")).toBe("cannae");
  });

  it("is nothing at all when the query is absent: the bare URL is the Library", () => {
    expect(battleNameFrom("")).toBeNull();
    expect(battleNameFrom("?view=night")).toBeNull();
  });

  it("is nothing when ?battle= is present but empty or blank", () => {
    expect(battleNameFrom("?battle=")).toBeNull();
    expect(battleNameFrom("?battle=%20%20")).toBeNull();
  });

  it("trims the name and ignores other parameters", () => {
    expect(battleNameFrom("?speed=2&battle=%20cannae%20")).toBe("cannae");
  });
});

describe("where a battle is played", () => {
  it("is the same page with the battle named", () => {
    expect(battleQuery("trafalgar")).toBe("?battle=trafalgar");
  });

  it("escapes a name that needs it, so the link survives the round trip", () => {
    expect(battleNameFrom(battleQuery("the nile"))).toBe("the nile");
    expect(battleQuery("a&b")).toBe("?battle=a%26b");
  });
});

describe("where the Library is", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is the app's own page, with nothing on the query", () => {
    expect(libraryHref()).toBe("/");
  });

  it("follows the app's base URL", () => {
    vi.stubEnv("BASE_URL", "/under-a-path/");
    expect(libraryHref()).toBe("/under-a-path/");
  });
});
