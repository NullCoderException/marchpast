/**
 * The Library's index is fetched from the data route like any other file, and
 * its failures read the same way a battle's do. The fetch is injected, so
 * these run without a server.
 */
import { describe, expect, it } from "vitest";
import { battleIndexEntry } from "../data/battleIndex.ts";
import { indexUrl } from "../data/paths.ts";
import { MINIMAL_BATTLE } from "../schema/examples.ts";
import type { FetchLike } from "./load.ts";
import { loadIndex } from "./loadIndex.ts";

const INDEX = [battleIndexEntry("trafalgar", MINIMAL_BATTLE)];

/** A fetch that answers one body at the index URL, and 404s everything else the way the dev server does. */
function fetchFrom(body: string | undefined): FetchLike {
  return async (url) => {
    if (url !== indexUrl() || body === undefined) {
      return new Response(`Not found: ${url}`, { status: 404, statusText: "Not Found" });
    }
    return new Response(body, { status: 200 });
  };
}

describe("loadIndex", () => {
  it("returns the list the build generated", async () => {
    expect(await loadIndex(fetchFrom(JSON.stringify(INDEX)))).toEqual({ ok: true, index: INDEX });
  });

  it("returns an empty library rather than an error when there are no battles", async () => {
    expect(await loadIndex(fetchFrom("[]"))).toEqual({ ok: true, index: [] });
  });

  it("reports the file and the status when the index is not there", async () => {
    const result = await loadIndex(fetchFrom(undefined));
    expect(result).toEqual({ ok: false, errors: [{ file: indexUrl(), path: "", message: "HTTP 404 Not Found" }] });
  });

  it("reports an index that is not the list this build writes", async () => {
    const result = await loadIndex(fetchFrom(JSON.stringify({ battles: ["trafalgar"] })));
    expect(result).toMatchObject({ ok: false, errors: [{ file: indexUrl(), path: "" }] });

    const partial = await loadIndex(fetchFrom(JSON.stringify([{ name: "trafalgar" }])));
    expect(partial.ok).toBe(false);
  });
});
