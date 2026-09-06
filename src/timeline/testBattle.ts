/**
 * The synthetic battle the timeline tests run on. Deliberately not Trafalgar:
 * every rule under test wants numbers chosen to make its arithmetic obvious,
 * and a real battle's data would drift under the historians.
 *
 * Shape, all times on one morning:
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
import type { Battle } from "../schema/types.ts";

/** A valid three-phase battle with clean interval arithmetic. Treat as frozen: tests that need a variant clone it. */
export const TEST_BATTLE: Battle = {
  schema_version: 1,
  title: "The Test Action",
  date: "1 January 1800",
  extent: { north: 30, south: 0, east: 50, west: 0 },
  scale_unit: "nmi",
  end: "10:30",
  license: "CC-BY-4.0",
  attribution: "Sandtable contributors, CC BY 4.0",
  sources: {
    invented: { label: "An invented source", work: "Nothing at all, made up for the tests", license: "public-domain" },
  },
  units: [
    { id: "alpha", side: "Red", label: "Alpha" },
    { id: "beta", side: "Blue", label: "Beta" },
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

/** Battle-clock seconds since midnight for an `"HH:MM:SS"` string, so the tests can say what they mean. */
export function at(time: string): number {
  const [hh = "0", mm = "0", ss = "0"] = time.split(":");
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
}

/** A deep copy of the fixture, for a test that needs one thing changed. */
export function cloneTestBattle(): Battle {
  return structuredClone(TEST_BATTLE);
}
