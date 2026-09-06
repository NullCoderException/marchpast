/**
 * The minimal examples from `docs/schema.md` (2.12 and 3.4) as typed
 * constants: the smallest battle and map files the validators accept.
 * Tests start from these and break one thing at a time; the schema-examples
 * test separately proves the Markdown copies still validate.
 */
import type { Battle, MapFile } from "./types.ts";

export const MINIMAL_BATTLE: Battle = {
  schema_version: 2,
  title: "The Battle of Trafalgar",
  summary: "Nelson's two columns cut Villeneuve's line off Cape Trafalgar and destroy the Combined Fleet in an afternoon.",
  dates: ["21 October 1805"],
  sort_date: { year: 1805, month: 10, day: 21 },
  extent: { north: 36.61, south: 36.05, east: -6.0, west: -6.8 },
  scale_unit: "nmi",
  map: "cadiz",
  end: "17:30",
  license: "CC-BY-4.0",
  attribution: "Sandtable contributors, CC BY 4.0",
  sources: {
    "collingwood-dispatch": {
      label: "Collingwood's dispatch",
      work: "Collingwood to Marsden, 22 October 1805, London Gazette Extraordinary no. 15858",
      url: "https://en.wikisource.org/wiki/The_London_Gazette/Number_15858",
      license: "public-domain",
      license_note: "Crown copyright in an 1805 publication long expired",
    },
  },
  levels: ["Columns", "Squadrons"],
  units: [
    { id: "weather-column", side: "British", label: "Weather column", short_label: "Weather", commander: "Nelson", arm: "ship" },
    {
      id: "weather-van",
      side: "British",
      label: "Van of the weather column",
      short_label: "Weather van",
      commander: "Nelson",
      arm: "ship",
      parent: "weather-column",
    },
    { id: "lee-column", side: "British", label: "Lee column", short_label: "Lee", commander: "Collingwood", arm: "ship" },
    {
      id: "lee-van",
      side: "British",
      label: "Van of the lee column",
      short_label: "Lee van",
      commander: "Collingwood",
      arm: "ship",
      parent: "lee-column",
    },
    { id: "combined-fleet", side: "Combined Fleet", label: "Combined Fleet", commander: "Villeneuve", arm: "ship" },
  ],
  phases: [
    {
      id: "dawn-sighting",
      label: "Dawn: the fleets sight each other",
      t: "05:40",
      playback_rate: 600,
      wind: { from: 292.5, force: "light" },
      caption: "At daylight the enemy is discovered six or seven miles to the eastward.",
      notes: "Collingwood's dawn fix anchors the British position.",
      references: [{ source: "collingwood-dispatch", locator: "p. 1365", quote: "at Daylight" }],
      units: [
        { id: "weather-column", position: { lat: 36.26, lon: -6.47 }, heading: 45, formation: "column", state: "intact" },
        { id: "weather-van", position: { lat: 36.27, lon: -6.46 }, heading: 45, formation: "column", state: "intact" },
        { id: "lee-column", position: { lat: 36.24, lon: -6.44 }, heading: 45, formation: "column", state: "intact" },
        { id: "lee-van", position: { lat: 36.25, lon: -6.43 }, heading: 45, formation: "column", state: "intact" },
        {
          id: "combined-fleet",
          position: { lat: 36.22, lon: -6.3 },
          heading: 180,
          formation: "column",
          state: "intact",
          moves: [{ kind: "intent", to: { lat: 36.0, lon: -6.2 } }],
        },
      ],
    },
    {
      id: "melee",
      label: "The melee",
      day: 0,
      t: "13:30",
      playback_rate: 120,
      wind: { from: 292.5, force: "light" },
      caption: "The action is general; the Combined Fleet's line is cut in two places.",
      references: [{ source: "collingwood-dispatch", locator: "p. 1366" }],
      units: [
        { id: "weather-column", position: { lat: 36.27, lon: -6.24 }, heading: 90, formation: "column", state: "engaged" },
        { id: "weather-van", position: { lat: 36.28, lon: -6.23 }, heading: 90, formation: "column", state: "engaged" },
        { id: "lee-column", position: { lat: 36.23, lon: -6.24 }, heading: 90, formation: "column", state: "engaged" },
        { id: "lee-van", position: { lat: 36.24, lon: -6.23 }, heading: 90, formation: "column", state: "engaged" },
        { id: "combined-fleet", position: { lat: 36.25, lon: -6.22 }, heading: 275, formation: "line", state: "broken", strength: 0.6 },
      ],
    },
  ],
};

export const MINIMAL_MAP: MapFile = {
  type: "FeatureCollection",
  license: "public-domain",
  attribution: "Coastline from Natural Earth (public domain)",
  features: [
    {
      type: "Feature",
      properties: { kind: "land" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-6.03, 36.18], [-6.0, 36.2], [-5.95, 36.25], [-5.95, 36.18], [-6.03, 36.18]]],
      },
    },
    {
      type: "Feature",
      properties: { kind: "place", name: "Cape Trafalgar" },
      geometry: { type: "Point", coordinates: [-6.034, 36.183] },
    },
  ],
};
