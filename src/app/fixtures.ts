/**
 * Renderer fixtures: battles that live in code rather than in `data/`, played
 * with `?fixture=<name>` so a slice can be looked at before its battle file
 * exists.
 *
 * A fixture is **not** a battle. It is not in the Library, it is not fetched,
 * its positions are invented and its captions say so; the only thing it is
 * held to is the schema, which `fixtures.test.ts` checks by running each one
 * through the validator. And a fixture goes once a real battle covers what it
 * stood in for: the Cannae fixture went when `data/battles/cannae.json`
 * landed, researched and over a map cut from the ground itself (#109), and the
 * register has been empty since. The route stays for the next slice that has
 * to be looked at before its battle file exists.
 */
import type { Battle } from "../schema/types.ts";

/** Every fixture there is, by the name `?fixture=` calls it. There is none just now. */
export const FIXTURES: Readonly<Record<string, Battle>> = {};

/** The fixture named in a query string such as `?fixture=<name>`, or `undefined` when none is. */
export function fixtureNameFrom(search: string): string | undefined {
  const name = new URLSearchParams(search).get("fixture")?.trim() ?? "";
  return name === "" ? undefined : name;
}

/**
 * What a visitor who named a fixture there is not is told. The register is
 * empty as often as not — a fixture goes as soon as a battle file covers it —
 * and an empty list reads as a fault rather than as an answer, so with nothing
 * to offer this says so, and says where a fixture is written.
 */
export function fixturesThereAre(fixtures: Readonly<Record<string, unknown>> = FIXTURES): string {
  const names = Object.keys(fixtures);
  return names.length === 0 ? "There are no fixtures just now: they live in src/app/fixtures.ts." : `The fixtures there are: ${names.join(", ")}.`;
}
