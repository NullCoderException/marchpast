import { afterEach, describe, expect, it, vi } from "vitest";
import { battleNameFrom, battleNameFromPath, battlePath, battleQuery, libraryHref, readRoute } from "./battleName.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

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

describe("the battle named by the path", () => {
  it("is the one bare segment under the site's root", () => {
    expect(battleNameFromPath("/cannae/")).toBe("cannae");
  });

  it("is read whether or not the host added the trailing slash", () => {
    expect(battleNameFromPath("/cannae")).toBe("cannae");
  });

  it("is nothing at the root: the bare URL is the Library", () => {
    expect(battleNameFromPath("/")).toBeNull();
    expect(battleNameFromPath("")).toBeNull();
  });

  it("is nothing for a document the host served by its own file name", () => {
    expect(battleNameFromPath("/index.html")).toBeNull();
    expect(battleNameFromPath("/404.html")).toBeNull();
  });

  it("is the battle when the URL names that battle's own document outright", () => {
    // `/cannae/index.html` is the file the build writes for `/cannae/`, and it
    // carries Cannae's head: booting the Library under it would be a lie.
    expect(battleNameFromPath("/cannae/index.html")).toBe("cannae");
  });

  it("is nothing for anything deeper than one segment", () => {
    expect(battleNameFromPath("/data/battles/cannae.json")).toBeNull();
    expect(battleNameFromPath("/cannae/again/")).toBeNull();
  });

  it("decodes a name that needed escaping, and refuses one that will not decode", () => {
    expect(battleNameFromPath("/the%20nile/")).toBe("the nile");
    expect(battleNameFromPath("/%E0%A4%A/")).toBeNull();
  });

  it("follows the app's base URL, and reads nothing outside it", () => {
    vi.stubEnv("BASE_URL", "/under-a-path/");
    expect(battleNameFromPath("/under-a-path/cannae/")).toBe("cannae");
    expect(battleNameFromPath("/under-a-path/")).toBeNull();
    expect(battleNameFromPath("/cannae/")).toBeNull();
  });
});

describe("where a battle is played", () => {
  it("is a page of its own at the battle's name", () => {
    expect(battlePath("trafalgar")).toBe("/trafalgar/");
  });

  it("escapes a name that needs it, so the link survives the round trip", () => {
    expect(battleNameFromPath(battlePath("the nile"))).toBe("the nile");
    expect(battlePath("a&b")).toBe("/a%26b/");
  });

  it("follows the app's base URL", () => {
    vi.stubEnv("BASE_URL", "/under-a-path/");
    expect(battlePath("trafalgar")).toBe("/under-a-path/trafalgar/");
  });
});

describe("where a battle was played before ADR-0028", () => {
  it("is the same page with the battle named", () => {
    expect(battleQuery("trafalgar")).toBe("?battle=trafalgar");
  });

  it("escapes a name that needs it, so the legacy link survives the round trip", () => {
    expect(battleNameFrom(battleQuery("the nile"))).toBe("the nile");
    expect(battleQuery("a&b")).toBe("?battle=a%26b");
  });
});

describe("the route one visit is on", () => {
  it("is the Library when the URL names no battle, and rewrites nothing", () => {
    expect(readRoute("/", "")).toEqual({ name: null, rewriteTo: null });
    expect(readRoute("/", "?view=night")).toEqual({ name: null, rewriteTo: null });
  });

  it("is the path's battle, left where it is", () => {
    expect(readRoute("/cannae/", "")).toEqual({ name: "cannae", rewriteTo: null });
  });

  it("takes the path over the query, and leaves the URL alone when it does", () => {
    expect(readRoute("/cannae/", "?battle=trafalgar")).toEqual({ name: "cannae", rewriteTo: null });
  });

  it("reads the legacy query, and answers with the path it should be put on", () => {
    expect(readRoute("/", "?battle=trafalgar")).toEqual({ name: "trafalgar", rewriteTo: "/trafalgar/" });
    expect(readRoute("/", "?battle=the%20nile")).toEqual({ name: "the nile", rewriteTo: "/the%20nile/" });
  });
});

describe("where the Library is", () => {
  it("is the app's own page, with nothing on the query", () => {
    expect(libraryHref()).toBe("/");
  });

  it("follows the app's base URL", () => {
    vi.stubEnv("BASE_URL", "/under-a-path/");
    expect(libraryHref()).toBe("/under-a-path/");
  });
});
