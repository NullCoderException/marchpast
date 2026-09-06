/**
 * Loads the library, `data/index.json`: the list the front door is drawn from
 * and the Picker is filled from.
 *
 * The file is a build output, generated from battle files that have already
 * passed the validator (`vite/library.ts`), so there is nothing to validate
 * here beyond the shape: what this guards against is a missing or stale file,
 * not a bad battle file. As with the battle loader, nothing throws — a failure
 * comes back as a `LoadError` the page can show.
 */
import type { Library, LibraryEntry } from "../data/library.ts";
import { indexUrl } from "../data/paths.ts";
import { isRecord } from "../schema/validation.ts";
import { fetchJson, type FetchLike, type LoadError } from "./load.ts";

/** The library, or the errors that stopped it loading. */
export type LibraryResult = { ok: true; library: Library } | { ok: false; errors: LoadError[] };

/** Fetches the library the build generated. */
export async function loadLibrary(fetchLike: FetchLike = fetch): Promise<LibraryResult> {
  const file = indexUrl();
  const json = await fetchJson(file, fetchLike);
  if (!json.ok) return { ok: false, errors: [{ file, path: "", message: json.message }] };
  if (!isLibrary(json.value)) {
    return { ok: false, errors: [{ file, path: "", message: "not a library; rebuild the site" }] };
  }
  return { ok: true, library: json.value };
}

/** Whether the fetched value is the list this build writes: entries, each naming and dating a battle. */
function isLibrary(value: unknown): value is Library {
  return Array.isArray(value) && value.every(isLibraryEntry);
}

/** Whether one fetched value has every field the page and the Picker read, in the type they read it as. */
function isLibraryEntry(value: unknown): value is LibraryEntry {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.title === "string" &&
    typeof value.date === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.sides) &&
    isSortDate(value.sort_date)
  );
}

/** The three numbers the library is ordered on. Checked because a missing one would order the list by `NaN`. */
function isSortDate(value: unknown): boolean {
  return (
    isRecord(value) && typeof value.year === "number" && typeof value.month === "number" && typeof value.day === "number"
  );
}
