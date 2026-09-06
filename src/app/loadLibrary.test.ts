/**
 * The library is fetched from the data route like any other file, and its
 * failures read the same way a battle's do. The fetch is injected, so these
 * run without a server.
 */
import { describe, expect, it } from "vitest";
import { libraryEntry } from "../data/library.ts";
import { indexUrl } from "../data/paths.ts";
import { MINIMAL_BATTLE } from "../schema/examples.ts";
import type { FetchLike } from "./load.ts";
import { loadLibrary } from "./loadLibrary.ts";

const LIBRARY = [libraryEntry("trafalgar", MINIMAL_BATTLE)];

/** A fetch that answers one body at the library's URL, and 404s everything else the way the dev server does. */
function fetchFrom(body: string | undefined): FetchLike {
  return async (url) => {
    if (url !== indexUrl() || body === undefined) {
      return new Response(`Not found: ${url}`, { status: 404, statusText: "Not Found" });
    }
    return new Response(body, { status: 200 });
  };
}

describe("loadLibrary", () => {
  it("returns the list the build generated", async () => {
    expect(await loadLibrary(fetchFrom(JSON.stringify(LIBRARY)))).toEqual({ ok: true, library: LIBRARY });
  });

  it("returns an empty library rather than an error when there are no battles", async () => {
    expect(await loadLibrary(fetchFrom("[]"))).toEqual({ ok: true, library: [] });
  });

  it("reports the file and the status when the library is not there", async () => {
    const result = await loadLibrary(fetchFrom(undefined));
    expect(result).toEqual({ ok: false, errors: [{ file: indexUrl(), path: "", message: "HTTP 404 Not Found" }] });
  });

  it("reports a file that is not the list this build writes", async () => {
    const wrong = await loadLibrary(fetchFrom(JSON.stringify({ battles: ["trafalgar"] })));
    expect(wrong).toMatchObject({ ok: false, errors: [{ file: indexUrl(), path: "" }] });

    const partial = await loadLibrary(fetchFrom(JSON.stringify([{ name: "trafalgar" }])));
    expect(partial.ok).toBe(false);
  });

  it("refuses an entry whose sort date would order the list by NaN", async () => {
    const entry = { ...LIBRARY[0], sort_date: { year: 1805, month: 10 } };
    expect((await loadLibrary(fetchFrom(JSON.stringify([entry])))).ok).toBe(false);
  });
});
