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
 * landed, researched and over a map cut from the ground itself (#109).
 *
 * The register holds `carrier-strike`, which stands in for Midway while its
 * battle file is being written: it is the only thing on the site that has a
 * unit absent from a phase, or an extent running east past 180. It goes when
 * Midway lands.
 */
import type { Battle, Phase, UnitSnapshot } from "../schema/types.ts";

/** One snapshot of the strike fixture below, spelled short because it is written twenty-one times. */
function snapshot(id: string, lat: number, lon: number, heading: number, over: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return { id, position: { lat, lon }, heading, formation: "column", state: "intact", ...over };
}

/** One phase of the strike fixture: an hour apart, all at the same rate, each with the same invented source behind it. */
function hour(hour24: number, label: string, caption: string, notes: string, units: UnitSnapshot[]): Phase {
  const hh = String(hour24).padStart(2, "0");
  return {
    id: `at-${hh}00`,
    label,
    t: `${hh}:00`,
    playback_rate: 600,
    caption,
    notes,
    references: [{ source: "invented", locator: "nothing; this is a fixture" }],
    units,
  };
}

/**
 * The absence fixture (#166): a carrier action in which the strike exists on
 * the plate for three phases of six, and the frame runs east past 180.
 *
 * Nothing here is history. Every position is invented and the captions say so;
 * it exists so that a person can look at the two things schema v2's v0.3
 * additions do to the picture, before Midway's battle file exists:
 *
 * - **Absence.** `blue-strike` is launched at 07:00, attacks, and is recovered
 *   at 09:00. It has a snapshot in those three phases and in no other, so it
 *   is drawn from 07:00 to 09:00 and nowhere else. Watched at Groups, no glyph
 *   parks on `blue-force` in the hours it is away: which units a level draws is
 *   a property of the roster, and presence filters that (ADR-0024).
 * - **The frame.** The extent runs from 178 to 184.5, so every longitude here
 *   is spelled east of 180 rather than folded (ADR-0001 as amended on #143).
 *
 * The strike is `aircraft`, and draws with that arm's own sign (#171).
 */
const CARRIER_STRIKE: Battle = {
  schema_version: 2,
  title: "An invented carrier action",
  summary: "A fixture, not a battle: a strike that flies, attacks and is recovered, over a frame that crosses the antimeridian.",
  dates: ["a day that never happened"],
  sort_date: { year: 1942, month: 6, day: 4 },
  extent: { north: 29.5, south: 27, east: 184.5, west: 178 },
  scale_unit: "nmi",
  end: "12:00",
  license: "CC-BY-4.0",
  attribution: "Marchpast contributors, CC BY 4.0",
  sources: {
    invented: { label: "Nothing at all", work: "No source: every position in this fixture is invented", license: "public-domain" },
  },
  levels: ["Forces", "Groups"],
  units: [
    { id: "blue-force", side: "Blue", label: "Blue force", short_label: "Blue", arm: "ship" },
    { id: "blue-carriers", side: "Blue", label: "Blue carrier group", short_label: "Carriers", arm: "ship", parent: "blue-force" },
    { id: "blue-strike", side: "Blue", label: "Blue strike", short_label: "Strike", arm: "aircraft", parent: "blue-force" },
    { id: "red-force", side: "Red", label: "Red force", short_label: "Red", arm: "ship" },
  ],
  phases: [
    hour(6, "Before dawn: the forces close", "Invented: the two forces close from east and west, and nothing is in the air.", "Nothing here is history. The positions are chosen so the strike has somewhere to fly from.", [
      snapshot("blue-force", 28.2, 183.4, 260),
      snapshot("blue-carriers", 28.35, 183.6, 260),
      snapshot("red-force", 27.9, 179.2, 80),
    ]),
    hour(7, "The strike is launched", "Invented: the strike goes off the deck and appears on the plate for the first time.", "The strike's first snapshot. A unit appears at the instant of its first phase, with no fade (ADR-0024).", [
      snapshot("blue-force", 28.2, 183.0, 260),
      snapshot("blue-carriers", 28.35, 183.2, 260),
      snapshot("blue-strike", 28.3, 182.8, 260, { formation: "line" }),
      snapshot("red-force", 27.9, 179.6, 80),
    ]),
    hour(8, "The strike attacks", "Invented: the strike is over the Red force, which is engaged.", "The middle of the run: the strike tweens across both of the intervals its snapshots bound.", [
      snapshot("blue-force", 28.2, 182.6, 260),
      snapshot("blue-carriers", 28.35, 182.8, 260),
      snapshot("blue-strike", 28.05, 180.4, 260, { formation: "line", state: "engaged" }),
      snapshot("red-force", 27.95, 180.1, 80, { state: "engaged", strength: 0.7 }),
    ]),
    hour(9, "The strike is recovered", "Invented: the strike is back on the deck, and is on the plate for the last time.", "The strike's last snapshot: it is over the carriers, and from this instant it is gone.", [
      snapshot("blue-force", 28.2, 182.2, 260),
      snapshot("blue-carriers", 28.3, 182.3, 260),
      snapshot("blue-strike", 28.3, 182.3, 260, { state: "engaged", strength: 0.6 }),
      snapshot("red-force", 28.0, 180.6, 80, { state: "engaged", strength: 0.7 }),
    ]),
    hour(10, "The forces are in contact", "Invented: with nothing in the air, the two forces fight it out.", "The strike is absent from here on. Nothing rolls its picture up into its parent.", [
      snapshot("blue-force", 28.2, 181.8, 260, { state: "engaged" }),
      snapshot("blue-carriers", 28.3, 181.9, 260, { state: "engaged" }),
      snapshot("red-force", 28.05, 181.1, 80, { state: "engaged", strength: 0.5 }),
    ]),
    hour(11, "The Red force breaks off", "Invented: the Red force turns away and the action ends.", "The last phase, whose picture holds until end.", [
      snapshot("blue-force", 28.2, 181.4, 260, { state: "engaged" }),
      snapshot("blue-carriers", 28.3, 181.5, 260, { state: "engaged" }),
      snapshot("red-force", 28.2, 181.0, 30, { state: "broken", strength: 0.4 }),
    ]),
  ],
};

/** Every fixture there is, by the name `?fixture=` calls it. */
export const FIXTURES: Readonly<Record<string, Battle>> = { "carrier-strike": CARRIER_STRIKE };

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
