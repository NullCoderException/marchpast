/**
 * Loads a battle by name for the player: fetches `data/battles/<name>.json`
 * through the path module, runs the validator, and when the battle names a
 * `map` fetches and validates `data/maps/<map>.geojson` too.
 *
 * Nothing here throws: every failure, from a 404 to a bad field, comes back as
 * one of the `LoadError`s defined in `load.ts`, which is also where the fetch
 * and the error formatting live.
 */
import { battleUrl, mapUrl } from "../data/paths.ts";
import type { Battle, MapFile } from "../schema/types.ts";
import { validateBattle } from "../schema/validateBattle.ts";
import { validateMap } from "../schema/validateMap.ts";
import { fetchJson, withFile, type FetchLike, type LoadError } from "./load.ts";

/** A battle ready to play, with its map when it names one, or the errors that stopped it. */
export type LoadResult = { ok: true; battle: Battle; map: MapFile | undefined } | { ok: false; errors: LoadError[] };

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
