/**
 * Loads the Library's index, `data/index.json`: the list the front door is
 * drawn from and the Picker is filled from.
 *
 * The file is a build output, generated from the battle files that have
 * already passed the validator (`vite/serve-data.ts`), so there is nothing to
 * validate here beyond the shape: what this guards against is a stale or
 * missing index, not a bad battle file. As with the battle loader, nothing
 * throws — a failure comes back as a `LoadError` the page can show.
 */
import type { BattleIndex, BattleIndexEntry } from "../data/battleIndex.ts";
import { indexUrl } from "../data/paths.ts";
import { isRecord } from "../schema/validation.ts";
import { fetchJson, type FetchLike, type LoadError } from "./load.ts";

/** The Library's index, or the errors that stopped it loading. */
export type IndexResult = { ok: true; index: BattleIndex } | { ok: false; errors: LoadError[] };

/** Fetches the index the build generated. */
export async function loadIndex(fetchLike: FetchLike = fetch): Promise<IndexResult> {
  const file = indexUrl();
  const json = await fetchJson(file, fetchLike);
  if (!json.ok) return { ok: false, errors: [{ file, path: "", message: json.message }] };
  if (!isIndex(json.value)) {
    return { ok: false, errors: [{ file, path: "", message: "not a library index; rebuild the site" }] };
  }
  return { ok: true, index: json.value };
}

/** Whether the fetched value is the list this build writes: an array of entries, each naming a battle. */
function isIndex(value: unknown): value is BattleIndex {
  return Array.isArray(value) && value.every(isIndexEntry);
}

function isIndexEntry(value: unknown): value is BattleIndexEntry {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.title === "string" &&
    typeof value.date === "string" &&
    typeof value.summary === "string" &&
    isRecord(value.sort_date) &&
    Array.isArray(value.sides)
  );
}
