/**
 * Renderer fixtures: battles that live in code rather than in `data/`, played
 * with `?fixture=<name>` so a slice can be looked at before its battle file
 * exists.
 *
 * A fixture is **not** a battle. It is not in the Library, it is not fetched,
 * its positions are invented and its captions say so; the only thing it is
 * held to is the schema, which `fixtures.test.ts` checks by running each one
 * through the validator. When `data/battles/cannae.json` lands, the Cannae
 * fixture goes.
 */
import type { Battle } from "../schema/types.ts";

/**
 * Cannae as the renderer has to draw it (#80): eight wing-level units of foot
 * and horse on a Cannae-shaped extent with no map, a Roman infantry `mass`,
 * cavalry on both flanks, and the Roman horse broken at a fifth in the second
 * phase, retiring with its front still to the enemy so its track runs behind
 * it.
 *
 * The unit list, ids and order are the Cannae research note's (the Roman side
 * first, so the red ink falls on Rome); the positions are sketches on a
 * Cannae-shaped extent and are not the battle file's.
 */
const CANNAE_DEPLOYMENT: Battle = {
  schema_version: 2,
  title: "Cannae (renderer fixture)",
  summary: "A land fixture for the plate: foot, horse and a mass on a Cannae-shaped extent, with invented positions.",
  dates: ["2 August 216 BC"],
  sort_date: { year: -216, month: 8, day: 2 },
  extent: { north: 41.336, south: 41.279, east: 16.197, west: 16.108 },
  scale_unit: "km",
  end: "09:30",
  license: "CC-BY-4.0",
  attribution: "Sandtable contributors, CC BY 4.0. A renderer fixture: the positions are invented.",
  sources: {
    polybius: {
      label: "Polybius",
      work: "Polybius, Histories III.113-117, trans. Evelyn S. Shuckburgh (London: Macmillan, 1889)",
      url: "https://www.gutenberg.org/ebooks/44125",
      license: "public-domain",
      license_note: "Translator died 1906; the Project Gutenberg header states the text is free of restrictions.",
    },
  },
  units: [
    { id: "roman-cavalry", side: "Roman", label: "Roman cavalry", short_label: "Roman horse", commander: "Paullus", arm: "cavalry" },
    { id: "roman-infantry", side: "Roman", label: "Roman and allied infantry", short_label: "Roman foot", commander: "Servilius", arm: "infantry" },
    { id: "allied-cavalry", side: "Roman", label: "Allied cavalry", short_label: "Allied horse", commander: "Varro", arm: "cavalry" },
    { id: "hasdrubal-cavalry", side: "Carthaginian", label: "Spanish and Gallic cavalry", short_label: "Hasdrubal's horse", commander: "Hasdrubal", arm: "cavalry" },
    { id: "libyans-left", side: "Carthaginian", label: "Libyan foot (river flank)", short_label: "Libyans, river", commander: "Hannibal", arm: "infantry" },
    { id: "spanish-gallic-centre", side: "Carthaginian", label: "Spanish and Gallic foot", short_label: "The centre", commander: "Hannibal", arm: "infantry" },
    { id: "libyans-right", side: "Carthaginian", label: "Libyan foot (open flank)", short_label: "Libyans, open", commander: "Hannibal", arm: "infantry" },
    { id: "numidians", side: "Carthaginian", label: "Numidian horse", short_label: "Numidians", commander: "Hanno", arm: "cavalry" },
  ],
  phases: [
    {
      id: "deployment",
      label: "Deployment",
      t: "07:30",
      playback_rate: 600,
      wind: { from: 135, force: "fresh" },
      caption:
        "The armies are drawn up across the plain, the Roman foot in a mass several times deeper than its front, the horse of both sides on the wings. Positions in this fixture are invented; it exists to be looked at, not read.",
      references: [{ source: "polybius", locator: "III.113" }],
      units: [
        { id: "roman-cavalry", position: { lat: 41.32039, lon: 16.12798 }, heading: 200, formation: "line", state: "intact" },
        { id: "roman-infantry", position: { lat: 41.313, lon: 16.155 }, heading: 200, formation: "mass", state: "intact" },
        { id: "allied-cavalry", position: { lat: 41.30561, lon: 16.18202 }, heading: 200, formation: "line", state: "intact" },
        { id: "hasdrubal-cavalry", position: { lat: 41.31024, lon: 16.12307 }, heading: 20, formation: "line", state: "intact" },
        { id: "libyans-left", position: { lat: 41.30655, lon: 16.13658 }, heading: 20, formation: "line", state: "intact" },
        { id: "spanish-gallic-centre", position: { lat: 41.30285, lon: 16.15009 }, heading: 20, formation: "line", state: "intact" },
        { id: "libyans-right", position: { lat: 41.29916, lon: 16.16359 }, heading: 20, formation: "line", state: "intact" },
        {
          id: "numidians",
          position: { lat: 41.29546, lon: 16.1771 },
          heading: 20,
          formation: "line",
          state: "intact",
          moves: [{ kind: "intent", to: { lat: 41.308, lon: 16.193 } }],
        },
      ],
    },
    {
      id: "cavalry-clash",
      label: "The horse close by the river",
      t: "08:30",
      playback_rate: 600,
      wind: { from: 135, force: "fresh" },
      caption:
        "Hasdrubal's horse drives the Roman cavalry back along the river; it retires with its front still to the enemy, so its heading holds and its track runs behind it.",
      references: [{ source: "polybius", locator: "III.115" }],
      units: [
        { id: "roman-cavalry", position: { lat: 41.32320, lon: 16.12010 }, heading: 200, formation: "line", state: "broken", strength: 0.2 },
        { id: "roman-infantry", position: { lat: 41.30962, lon: 16.15336 }, heading: 200, formation: "mass", state: "engaged", strength: 0.9 },
        { id: "allied-cavalry", position: { lat: 41.30561, lon: 16.18202 }, heading: 200, formation: "line", state: "engaged" },
        { id: "hasdrubal-cavalry", position: { lat: 41.31531, lon: 16.12553 }, heading: 20, formation: "line", state: "engaged" },
        { id: "libyans-left", position: { lat: 41.30655, lon: 16.13658 }, heading: 20, formation: "line", state: "intact" },
        { id: "spanish-gallic-centre", position: { lat: 41.30539, lon: 16.15131 }, heading: 20, formation: "line", state: "engaged", strength: 0.8 },
        { id: "libyans-right", position: { lat: 41.29916, lon: 16.16359 }, heading: 20, formation: "line", state: "intact" },
        {
          id: "numidians",
          position: { lat: 41.29546, lon: 16.1771 },
          heading: 20,
          formation: "line",
          state: "engaged",
          moves: [{ kind: "detachment", to: { lat: 41.308, lon: 16.193 } }],
        },
      ],
    },
  ],
};

/** Every fixture there is, by the name `?fixture=` calls it. */
export const FIXTURES: Readonly<Record<string, Battle>> = { "cannae-deployment": CANNAE_DEPLOYMENT };

/** The fixture named in a query string such as `?fixture=cannae-deployment`, or `undefined` when none is. */
export function fixtureNameFrom(search: string): string | undefined {
  const name = new URLSearchParams(search).get("fixture")?.trim() ?? "";
  return name === "" ? undefined : name;
}
