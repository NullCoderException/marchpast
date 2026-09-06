/**
 * Loads a battle by name for the player: fetches `data/battles/<name>.json`
 * through the path module, runs the validator, and when the battle names a
 * `map` fetches and validates `data/maps/<map>.geojson` too.
 *
 * Nothing here throws. Every failure, from a 404 to a bad field, comes back as
 * a `LoadError` carrying the file it was found in, so the page can write the
 * same file / path / message lines `npm run validate` prints. The fetch is a
 * parameter so the loader tests without a server.
 */
import { battleUrl, mapUrl } from "../data/paths.ts";
import type { Battle, MapFile } from "../schema/types.ts";
import { validateBattle } from "../schema/validateBattle.ts";
import { validateMap } from "../schema/validateMap.ts";
import type { ValidationError } from "../schema/validation.ts";

/** A validation error with the file it belongs to; `path` is `""` for a whole-file failure. */
export interface LoadError extends ValidationError {
  file: string;
}

/** A battle ready to play, with its map when it names one, or the errors that stopped it. */
export type LoadResult = { ok: true; battle: Battle; map: MapFile | undefined } | { ok: false; errors: LoadError[] };

/** The one call the loader makes to the network: `fetch` by default, a table in tests. */
export type FetchLike = (url: string) => Promise<Response>;

/** Fetches, validates and returns the battle called `name`, following its `map`. */
export async function loadBattle(name: string, fetchLike: FetchLike = fetch): Promise<LoadResult> {
  const battleFile = battleUrl(name);
  const battleJson = await fetchJson(battleFile, fetchLike);
  if (!battleJson.ok) return { ok: false, errors: [{ file: battleFile, path: "", message: battleJson.message }] };

  const battle = validateBattle(battleJson.value);
  if (!battle.ok) return { ok: false, errors: withFile(battleFile, battle.errors) };
  if (battle.battle.map === undefined) return { ok: true, battle: battle.battle, map: undefined };

  const mapFile = mapUrl(battle.battle.map);
  const mapJson = await fetchJson(mapFile, fetchLike);
  if (!mapJson.ok) return { ok: false, errors: [{ file: mapFile, path: "", message: mapJson.message }] };

  const map = validateMap(mapJson.value);
  if (!map.ok) return { ok: false, errors: withFile(mapFile, map.errors) };
  return { ok: true, battle: battle.battle, map: map.map };
}

/** Errors as the validator reports them, each stamped with the file they came from. */
function withFile(file: string, errors: ValidationError[]): LoadError[] {
  return errors.map((error) => ({ file, ...error }));
}

/** One file as parsed JSON, or the reason it could not be: unreachable, not found, not JSON. */
async function fetchJson(url: string, fetchLike: FetchLike): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  let response: Response;
  try {
    response = await fetchLike(url);
  } catch (error) {
    return { ok: false, message: `cannot fetch: ${describe(error)}` };
  }
  if (!response.ok) {
    return { ok: false, message: `HTTP ${response.status}${response.statusText === "" ? "" : ` ${response.statusText}`}` };
  }
  try {
    return { ok: true, value: await response.json() };
  } catch (error) {
    return { ok: false, message: `not valid JSON: ${describe(error)}` };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The errors as lines for a person: each file once, then one indented line per
 * error with its JSON-pointer path (`(root)` for the whole file) and message.
 * The same shape `scripts/validate.ts` prints on the command line.
 */
export function formatLoadErrors(errors: readonly LoadError[]): string[] {
  const lines: string[] = [];
  let currentFile: string | undefined;
  for (const error of errors) {
    if (error.file !== currentFile) {
      currentFile = error.file;
      lines.push(error.file);
    }
    lines.push(`  ${error.path || "(root)"}: ${error.message}`);
  }
  return lines;
}
