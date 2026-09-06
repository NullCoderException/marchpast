/**
 * The two synthetic battles the timeline tests run on: `TEST_BATTLE`, a
 * morning inside one day, and `NIGHT_BATTLE`, an action that crosses midnight.
 * Deliberately neither Trafalgar nor the Nile: every rule under test wants
 * numbers chosen to make its arithmetic obvious, and a real battle's data
 * would drift under the historians.
 */
import type { Battle } from "../schema/types.ts";
import { instantMinutes } from "../schema/time.ts";
import type { ClockSeconds } from "./picture.ts";

/**
 * A valid three-phase battle with clean interval arithmetic, all on one
 * morning. Treat as frozen: tests that need a variant clone it.
 *
 * | phase | `t`     | rate | interval | wall seconds |
 * | ----- | ------- | ---- | -------- | ------------ |
 * | one   | `10:00` |  600 |     600s |            1 |
 * | two   | `10:10` |   60 |     600s |           10 |
 * | three | `10:20` |  120 |     600s |            5 |
 * | (end) | `10:30` |      |          |              |
 *
 * `alpha` turns 350 to 10 (through north) and loses strength; `beta` turns 0
 * to 180 (the clockwise tie) and never authors a strength, so it exercises the
 * schema default.
 */
export const TEST_BATTLE: Battle = {
  schema_version: 2,
  title: "The Test Action",
  summary: "Two invented units meet on an invented morning so the timeline's arithmetic is obvious.",
  dates: ["1 January 1800"],
  sort_date: { year: 1800, month: 1, day: 1 },
  extent: { north: 30, south: 0, east: 50, west: 0 },
  scale_unit: "nmi",
  end: "10:30",
  license: "CC-BY-4.0",
  attribution: "Sandtable contributors, CC BY 4.0",
  sources: {
    invented: { label: "An invented source", work: "Nothing at all, made up for the tests", license: "public-domain" },
  },
  units: [
    { id: "alpha", side: "Red", label: "Alpha", arm: "ship" },
    { id: "beta", side: "Blue", label: "Beta", arm: "ship" },
  ],
  phases: [
    {
      id: "one",
      label: "Phase one",
      t: "10:00",
      playback_rate: 600,
      wind: { from: 270, force: "fresh" },
      caption: "Caption one.",
      notes: "A note only the first phase has.",
      references: [{ source: "invented", locator: "p. 1" }],
      units: [
        { id: "alpha", position: { lat: 10, lon: 20 }, heading: 350, formation: "column", state: "intact", strength: 1 },
        { id: "beta", position: { lat: 0, lon: 0 }, heading: 0, formation: "line", state: "intact" },
      ],
    },
    {
      id: "two",
      label: "Phase two",
      t: "10:10",
      playback_rate: 60,
      wind: { from: 90, force: "light" },
      caption: "Caption two.",
      references: [{ source: "invented", locator: "p. 2" }],
      units: [
        {
          id: "alpha",
          position: { lat: 20, lon: 40 },
          heading: 10,
          formation: "line",
          state: "engaged",
          strength: 0.33,
          moves: [{ kind: "intent", to: { lat: 25, lon: 45 } }],
        },
        { id: "beta", position: { lat: 4, lon: 8 }, heading: 180, formation: "line", state: "engaged" },
      ],
    },
    {
      id: "three",
      label: "Phase three",
      t: "10:20",
      playback_rate: 120,
      wind: { force: "calm" },
      caption: "Caption three.",
      references: [{ source: "invented", locator: "p. 3" }],
      units: [
        { id: "alpha", position: { lat: 22, lon: 44 }, heading: 90, formation: "line", state: "broken", strength: 0.2 },
        { id: "beta", position: { lat: 6, lon: 12 }, heading: 270, formation: "column", state: "destroyed" },
      ],
    },
  ],
};


/**
 * The synthetic battle that crosses midnight (ADR-0013): an evening action
 * that runs through the night into the next afternoon.
 *
 * Shape, one evening and the day after. Every phase plays at the same rate, so
 * a scrubber segment is simply its interval's share of the whole:
 *
 * | phase    | day | `t`     | rate | instant  | interval | wall seconds |
 * | -------- | --- | ------- | ---- | -------- | -------- | ------------ |
 * | evening  |   0 | `23:00` |  600 |  82,800s |  6h 05m  |         36.5 |
 * | daybreak |   1 | `05:05` |  600 | 104,700s |  5h 55m  |         35.5 |
 * | forenoon |   1 | `11:00` |  600 | 126,000s |  3h 00m  |           18 |
 * | (end)    |   1 | `14:00` |      | 136,800s |          |              |
 *
 * The clock never resets at midnight: the daybreak phase is at 104,700
 * seconds, and only the readout takes the remainder, to show it as `"05:05"`.
 * The battle tracks no wind, which is the other half of the all-or-nothing
 * rule `TEST_BATTLE` covers.
 */
export const NIGHT_BATTLE: Battle = {
  schema_version: 2,
  title: "The Night Action",
  summary: "An invented action that opens before midnight and ends the next afternoon, so the clock has to cross a day.",
  dates: ["1 January 1800", "2 January 1800"],
  sort_date: { year: 1800, month: 1, day: 1 },
  extent: { north: 30, south: 0, east: 50, west: 0 },
  scale_unit: "nmi",
  end: "14:00",
  end_day: 1,
  license: "CC-BY-4.0",
  attribution: "Sandtable contributors, CC BY 4.0",
  sources: {
    invented: { label: "An invented source", work: "Nothing at all, made up for the tests", license: "public-domain" },
  },
  units: [
    { id: "alpha", side: "Red", label: "Alpha", arm: "ship" },
    { id: "beta", side: "Blue", label: "Beta", arm: "ship" },
  ],
  phases: [
    {
      id: "evening",
      label: "Evening",
      t: "23:00",
      playback_rate: 600,
      caption: "Caption one, before midnight.",
      references: [{ source: "invented", locator: "p. 1" }],
      units: [
        { id: "alpha", position: { lat: 10, lon: 20 }, heading: 0, formation: "column", state: "intact" },
        { id: "beta", position: { lat: 0, lon: 0 }, heading: 180, formation: "line", state: "intact" },
      ],
    },
    {
      id: "daybreak",
      label: "Daybreak",
      day: 1,
      t: "05:05",
      playback_rate: 600,
      caption: "Caption two, at first light.",
      references: [{ source: "invented", locator: "p. 2" }],
      units: [
        { id: "alpha", position: { lat: 20, lon: 40 }, heading: 90, formation: "line", state: "engaged" },
        { id: "beta", position: { lat: 4, lon: 8 }, heading: 270, formation: "line", state: "engaged" },
      ],
    },
    {
      id: "forenoon",
      label: "Forenoon",
      day: 1,
      t: "11:00",
      playback_rate: 600,
      caption: "Caption three, in the forenoon.",
      references: [{ source: "invented", locator: "p. 3" }],
      units: [
        { id: "alpha", position: { lat: 22, lon: 44 }, heading: 180, formation: "line", state: "broken" },
        { id: "beta", position: { lat: 6, lon: 12 }, heading: 0, formation: "column", state: "destroyed" },
      ],
    },
  ],
};

/**
 * Battle-clock seconds for an `"HH:MM"` or `"HH:MM:SS"` instant on `day`, so a
 * test can say the moment it means. The clock counts from midnight of the
 * battle's first day (ADR-0013), so `clock("05:05", 1)` is 104,700, not 18,300.
 */
export function clock(time: string, day = 0): ClockSeconds {
  const match = /^(\d{2}:\d{2})(?::([0-5]\d))?$/.exec(time);
  if (match === null) throw new RangeError(`Not an "HH:MM" or "HH:MM:SS" instant: ${JSON.stringify(time)}`);
  return instantMinutes(day, match[1]!) * 60 + Number(match[2] ?? 0);
}

/** A deep copy of the fixture, for a test that needs one thing changed. */
export function cloneTestBattle(): Battle {
  return structuredClone(TEST_BATTLE);
}
