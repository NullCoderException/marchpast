/**
 * The loader fetches a battle by name, validates it, follows its `map` and
 * reports every failure with the file it came from. The fetch is injected so
 * these run without a server; the responses are the shapes the data route
 * (`vite/serve-data.ts`) really returns.
 */
import { describe, expect, it } from "vitest";
import { battleUrl, mapUrl } from "../data/paths.ts";
import { MINIMAL_BATTLE, MINIMAL_MAP } from "../schema/examples.ts";
import type { Battle } from "../schema/types.ts";
import { formatLoadErrors, loadBattle, type FetchLike } from "./loadBattle.ts";

/** The minimal battle without its `map`, for the case that needs no map file. */
const MAPLESS: Battle = (() => {
  const battle = structuredClone(MINIMAL_BATTLE);
  delete battle.map;
  return battle;
})();

/** A fetch that answers from a table of URL to body; anything else is a plain 404 like the dev server's. */
function fetchFrom(files: Readonly<Record<string, string>>): FetchLike {
  return async (url) => {
    const body = files[url];
    if (body === undefined) return new Response(`Not found: ${url}`, { status: 404, statusText: "Not Found" });
    return new Response(body, { status: 200 });
  };
}

const json = (value: unknown): string => JSON.stringify(value);

describe("loadBattle", () => {
  it("returns the validated battle, with no map when the battle names none", async () => {
    const fetch = fetchFrom({ [battleUrl("minimal")]: json(MAPLESS) });
    const result = await loadBattle("minimal", fetch);
    expect(result).toEqual({ ok: true, battle: MAPLESS, map: undefined });
  });

  it("follows the battle's map name to its file and validates that too", async () => {
    const battle = { ...MINIMAL_BATTLE, map: "somewhere" };
    const fetch = fetchFrom({
      [battleUrl("minimal")]: json(battle),
      [mapUrl("somewhere")]: json(MINIMAL_MAP),
    });
    const result = await loadBattle("minimal", fetch);
    expect(result).toEqual({ ok: true, battle, map: MINIMAL_MAP });
  });

  it("reports a missing battle file with its URL and the HTTP status", async () => {
    const result = await loadBattle("nowhere", fetchFrom({}));
    expect(result).toEqual({
      ok: false,
      errors: [{ file: battleUrl("nowhere"), path: "", message: "HTTP 404 Not Found" }],
    });
  });

  it("reports a network failure without throwing", async () => {
    const failing: FetchLike = async () => {
      throw new TypeError("Failed to fetch");
    };
    const result = await loadBattle("minimal", failing);
    expect(result).toEqual({
      ok: false,
      errors: [{ file: battleUrl("minimal"), path: "", message: "cannot fetch: Failed to fetch" }],
    });
  });

  it("reports a file that is not JSON", async () => {
    const result = await loadBattle("broken", fetchFrom({ [battleUrl("broken")]: "{ not json" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ file: battleUrl("broken"), path: "" });
    expect(result.errors[0]?.message).toMatch(/^not valid JSON: /);
  });

  it("reports every validation error of the battle with its JSON-pointer path", async () => {
    const battle = { ...MINIMAL_BATTLE, schema_version: 2, title: 7 };
    const result = await loadBattle("bad", fetchFrom({ [battleUrl("bad")]: json(battle) }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.errors.map((error) => error.path);
    expect(paths).toContain("/schema_version");
    expect(paths).toContain("/title");
    for (const error of result.errors) expect(error.file).toBe(battleUrl("bad"));
  });

  it("does not fetch the map when the battle itself is invalid", async () => {
    const fetched: string[] = [];
    const fetch: FetchLike = async (url) => {
      fetched.push(url);
      return new Response(json({ ...MINIMAL_BATTLE, map: "somewhere", title: 7 }));
    };
    const result = await loadBattle("bad", fetch);
    expect(result.ok).toBe(false);
    expect(fetched).toEqual([battleUrl("bad")]);
  });

  it("reports map errors against the map file", async () => {
    const battle = { ...MINIMAL_BATTLE, map: "somewhere" };
    const fetch = fetchFrom({
      [battleUrl("minimal")]: json(battle),
      [mapUrl("somewhere")]: json({ ...MINIMAL_MAP, type: "Feature" }),
    });
    const result = await loadBattle("minimal", fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
    for (const error of result.errors) expect(error.file).toBe(mapUrl("somewhere"));
  });

  it("reports a map file that does not exist", async () => {
    const battle = { ...MINIMAL_BATTLE, map: "missing" };
    const result = await loadBattle("minimal", fetchFrom({ [battleUrl("minimal")]: json(battle) }));
    expect(result).toEqual({
      ok: false,
      errors: [{ file: mapUrl("missing"), path: "", message: "HTTP 404 Not Found" }],
    });
  });
});

describe("formatLoadErrors", () => {
  it("groups errors under their file, one line each, the root path written as (root)", () => {
    const lines = formatLoadErrors([
      { file: battleUrl("x"), path: "/phases/3/units/1/heading", message: "must be a number" },
      { file: battleUrl("x"), path: "", message: "unknown key: extra" },
      { file: mapUrl("y"), path: "/features", message: "must be an array" },
    ]);
    expect(lines).toEqual([
      battleUrl("x"),
      "  /phases/3/units/1/heading: must be a number",
      "  (root): unknown key: extra",
      mapUrl("y"),
      "  /features: must be an array",
    ]);
  });
});
