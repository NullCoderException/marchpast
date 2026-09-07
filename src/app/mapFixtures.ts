/**
 * Map fixtures: maps that live in code rather than in `data/maps/`, drawn
 * under a battle fixture with `?fixture=<battle>&map=<map>` so the map pass
 * can be looked at before a real cut of the ground exists.
 *
 * A map fixture is **not** a map. Nothing here is geo-registered and nothing
 * is traced from a source; the only thing one is held to is the schema, which
 * `mapFixtures.test.ts` checks by running each one through the validator. And
 * one goes once a real map covers what it stood in for: the synthetic
 * Cannae-shaped valley went when `data/maps/cannae.geojson` landed, contoured
 * from SRTM (#109), and the register has been empty since. The route stays for
 * the next map pass that has to be looked at before the ground is cut.
 */
import type { MapFile } from "../schema/types.ts";

/** Every map fixture there is, by the name `?map=` calls it. There is none just now. */
export const MAP_FIXTURES: Readonly<Record<string, MapFile>> = {};

/** The map fixture named in a query string such as `?map=<name>`, or `undefined` when none is. */
export function mapFixtureNameFrom(search: string): string | undefined {
  const name = new URLSearchParams(search).get("map")?.trim() ?? "";
  return name === "" ? undefined : name;
}

/** What a visitor who named a map fixture there is not is told, for the reason `fixturesThereAre` gives. */
export function mapFixturesThereAre(fixtures: Readonly<Record<string, unknown>> = MAP_FIXTURES): string {
  const names = Object.keys(fixtures);
  return names.length === 0
    ? "There are no map fixtures just now: they live in src/app/mapFixtures.ts."
    : `The map fixtures there are: ${names.join(", ")}.`;
}
