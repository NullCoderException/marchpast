/**
 * The Library's index: everything the site knows about a battle without
 * loading it. `data/index.json` is this list, built from the battle files
 * themselves so a battle joins the Library by existing (ADR-0011); nothing
 * here is hand-written and nothing is committed.
 *
 * The functions are pure over already-validated battles. Reading the files and
 * writing the JSON is `vite/serve-data.ts`; fetching it is `src/app/`.
 */
import type { Battle, SortDate } from "../schema/types.ts";

/** One battle as the Library and the Picker know it: enough to list it, sort it and link to it, and nothing more. */
export interface BattleIndexEntry {
  /** Bare file name of `data/battles/<name>.json`, and what `?battle=` carries. */
  name: string;
  /** Display title, as the battle file writes it. */
  title: string;
  /** The battle's first day in words, `dates[0]`. Display only; never parsed. */
  date: string;
  /** The first day as integers: what the list is sorted on, never counted from (ADR-0013). */
  sort_date: SortDate;
  /** The battle's own one-sentence description of itself. */
  summary: string;
  /** The side names in roster order, each once. */
  sides: string[];
}

/** The whole Library, oldest battle first: the shape of `data/index.json`. */
export type BattleIndex = BattleIndexEntry[];

/** A battle file's bare name and its validated contents, as the index is built from. */
export interface NamedBattle {
  name: string;
  battle: Battle;
}

/** The index entry for one battle file. */
export function battleIndexEntry(name: string, battle: Battle): BattleIndexEntry {
  return {
    name,
    title: battle.title,
    // The validator requires at least one date, so this is only ever the fallback of a file that never reaches here.
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

/** Every battle as an index, oldest first. */
export function buildBattleIndex(battles: readonly NamedBattle[]): BattleIndex {
  return battles.map(({ name, battle }) => battleIndexEntry(name, battle)).sort(compareBattles);
}

/**
 * Oldest first on the sort date, ties broken by name so the order is total and
 * the same everywhere: two battles fought on one day would otherwise sit in
 * whatever order the directory was read in.
 */
export function compareBattles(a: BattleIndexEntry, b: BattleIndexEntry): number {
  return (
    a.sort_date.year - b.sort_date.year ||
    a.sort_date.month - b.sort_date.month ||
    a.sort_date.day - b.sort_date.day ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  );
}
