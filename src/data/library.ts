/**
 * The library as a value: everything the site knows about a battle without
 * loading it. A battle joins the library by existing — the list is built from
 * the battle files themselves and is never hand-written (ADR-0011).
 *
 * The file it is built into is `data/index.json`, the name that ADR gave it;
 * what the file holds is the library. The functions here are pure over battles
 * that have already passed the validator: reading the files and writing the
 * JSON is `vite/library.ts`, fetching it is `src/app/loadLibrary.ts`, and
 * drawing it is `src/app/libraryPage.ts`.
 */
import type { Battle, SortDate } from "../schema/types.ts";

/** One battle as the library and the Picker know it: enough to list it, sort it and link to it, and nothing more. */
export interface LibraryEntry {
  /** Bare file name of `data/battles/<name>.json`, and what `?battle=` carries. */
  name: string;
  /** Display title, as the battle file writes it. */
  title: string;
  /** The battle's first day in words, `dates[0]`. Display only; never parsed. */
  date: string;
  /** The first day as integers: what the library is ordered on, never counted from (ADR-0013). */
  sort_date: SortDate;
  /** The battle's own one-sentence description of itself. */
  summary: string;
  /** The side names in roster order, each once. */
  sides: string[];
}

/** Every battle the site holds, oldest first: the shape of `data/index.json`. */
export type Library = LibraryEntry[];

/** A battle file's bare name and its validated contents, as the library is built from. */
export interface NamedBattle {
  name: string;
  battle: Battle;
}

/** The library's entry for one battle file. */
export function libraryEntry(name: string, battle: Battle): LibraryEntry {
  return {
    name,
    title: battle.title,
    // The validator requires at least one date, so the fallback is only ever reached by a file that never gets this far.
    date: battle.dates[0] ?? "",
    sort_date: battle.sort_date,
    summary: battle.summary,
    sides: sideNames(battle),
  };
}

/** The battle's side names in roster order, each once (schema.md 2.3: sides are ordered by first appearance in `units`). */
export function sideNames(battle: Battle): string[] {
  return [...new Set(battle.units.map((unit) => unit.side))];
}

/** The library these battles make, oldest first. */
export function buildLibrary(battles: readonly NamedBattle[]): Library {
  return battles.map(({ name, battle }) => libraryEntry(name, battle)).sort(compareBattles);
}

/**
 * Oldest first on the sort date, ties broken by name so the order is total and
 * the same everywhere: two battles fought on one day would otherwise sit in
 * whatever order the directory happened to be read in.
 */
export function compareBattles(a: LibraryEntry, b: LibraryEntry): number {
  return (
    a.sort_date.year - b.sort_date.year ||
    a.sort_date.month - b.sort_date.month ||
    a.sort_date.day - b.sort_date.day ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  );
}
