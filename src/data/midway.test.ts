/**
 * Acceptance checks for the authored files `data/battles/midway.json` and
 * `data/maps/midway.geojson` (issue #180): they validate, and they carry the
 * roster, phases, absences, clock, frame, notes, sources and map features the
 * issue asked for. The validators prove shape; these tests prove the authoring
 * brief was met, so a later edit that drops a strike's run, spells a longitude
 * the normalised way or lets a copyright history in as a source fails here
 * rather than in the driving dev's review.
 *
 * Three of them are the brief's hard rules rather than ordinary coverage.
 * **Every longitude is written in the frame the extent fixes** (ADR-0001 as
 * amended: `west: 173, east: 187.25`, so Yorktown's grave is `183.43` and never
 * `-176.57`). **No strike sits on empty sea before its launch or after its
 * recovery** (ADR-0024: a strike's run starts and ends on the ship or the atoll
 * it flew from, in file on its heading). And **Hiryu never vanishes**: she is on
 * the plate at both levels from the first phase until the one that scuttles
 * her, including the two phases her own strikes are in the air.
 */
import { describe, expect, it } from "vitest";
import littleBighornRaw from "../../data/battles/little-bighorn.json?raw";
import midwayRaw from "../../data/battles/midway.json?raw";
import midwayMapRaw from "../../data/maps/midway.geojson?raw";
import { drawnAtLevel, unitsAtLevel } from "../schema/hierarchy.ts";
import { classOf } from "../schema/licenses.ts";
import { stillPhase } from "../schema/stillPhase.ts";
import type { Battle, MapFeature, MapFile, Phase, UnitSnapshot } from "../schema/types.ts";
import { validateBattle } from "../schema/validateBattle.ts";
import { validateMap } from "../schema/validateMap.ts";
import { wallDuration } from "../timeline/intervals.ts";
import { buildLibrary } from "./library.ts";

const battleResult = validateBattle(JSON.parse(midwayRaw));
if (!battleResult.ok) throw new Error(`midway.json does not validate:\n${JSON.stringify(battleResult.errors, null, 2)}`);
const battle: Battle = battleResult.battle;

const mapResult = validateMap(JSON.parse(midwayMapRaw));
if (!mapResult.ok) throw new Error(`midway.geojson does not validate:\n${JSON.stringify(mapResult.errors, null, 2)}`);
const map: MapFile = mapResult.map;

/** The twenty-one phases the issue specified, in order, with their day and battle-clock time. */
const PHASES: ReadonlyArray<readonly [id: string, day: number, t: string]> = [
  ["dawn-launch", 0, "04:30"],
  ["carriers-sighted", 0, "05:52"],
  ["midway-bombed", 0, "06:30"],
  ["tf16-launches", 0, "07:00"],
  ["midways-strikes", 0, "07:55"],
  ["nagumo-recovers", 0, "09:00"],
  ["torpedo-squadrons", 0, "09:20"],
  ["three-carriers-hit", 0, "10:22"],
  ["hiryu-strikes-back", 0, "10:58"],
  ["yorktown-bombed", 0, "12:14"],
  ["hiryu-torpedo-strike", 0, "13:31"],
  ["yorktown-torpedoed", 0, "14:45"],
  ["hiryu-hit", 0, "17:05"],
  ["evening-sinkings", 0, "19:13"],
  ["occupation-cancelled", 1, "02:55"],
  ["akagi-and-hiryu-scuttled", 1, "05:00"],
  ["pursuit-northwest", 1, "15:00"],
  ["cruisers-caught", 2, "06:45"],
  ["mikuma-sinks", 2, "11:50"],
  ["yorktown-torpedoed-again", 2, "13:36"],
  ["yorktown-sinks", 3, "05:01"],
];

/** The roster, with the force each unit hangs from and what it is made of. */
const ROSTER: ReadonlyArray<readonly [id: string, side: string, parent: string | undefined, arm: string]> = [
  ["mobile-force", "Japanese", undefined, "ship"],
  ["akagi", "Japanese", "mobile-force", "ship"],
  ["kaga", "Japanese", "mobile-force", "ship"],
  ["soryu", "Japanese", "mobile-force", "ship"],
  ["hiryu", "Japanese", "mobile-force", "ship"],
  ["midway-strike", "Japanese", "mobile-force", "aircraft"],
  ["hiryu-bombers", "Japanese", "mobile-force", "aircraft"],
  ["hiryu-torpedo", "Japanese", "mobile-force", "aircraft"],
  ["crudiv-7", "Japanese", undefined, "ship"],
  ["tf16", "American", undefined, "ship"],
  ["enterprise", "American", "tf16", "ship"],
  ["hornet", "American", "tf16", "ship"],
  ["vt-8", "American", "tf16", "aircraft"],
  ["enterprise-strike", "American", "tf16", "aircraft"],
  ["hiryu-hunters", "American", "tf16", "aircraft"],
  ["enterprise-6-june", "American", "tf16", "aircraft"],
  ["tf17", "American", undefined, "ship"],
  ["yorktown", "American", "tf17", "ship"],
  ["yorktown-strike", "American", "tf17", "aircraft"],
  ["midway", "American", undefined, "aircraft"],
  ["midway-air", "American", "midway", "aircraft"],
  ["midway-torpedo", "American", "midway", "aircraft"],
  ["vmsb-241", "American", "midway", "aircraft"],
  ["b-17s", "American", "midway", "aircraft"],
  ["b-17s-evening", "American", "midway", "aircraft"],
];

/** The five forces, which are the roster's roots and the whole of the Forces level. */
const FORCES = ["mobile-force", "crudiv-7", "tf16", "tf17", "midway"] as const;

/**
 * Each strike's run, as the phases it is on the plate in: from the phase it is
 * drawn aboard for the launch to the phase that recovers it or ends it
 * (ADR-0024). A second sortie is a second unit, which is why the B-17s appear
 * twice and Enterprise's group three times.
 */
const STRIKE_RUNS: Readonly<Record<string, readonly [first: string, last: string]>> = {
  "midway-strike": ["dawn-launch", "nagumo-recovers"],
  "hiryu-bombers": ["hiryu-strikes-back", "hiryu-torpedo-strike"],
  "hiryu-torpedo": ["hiryu-torpedo-strike", "hiryu-hit"],
  "vt-8": ["tf16-launches", "torpedo-squadrons"],
  "enterprise-strike": ["tf16-launches", "hiryu-strikes-back"],
  "hiryu-hunters": ["yorktown-torpedoed", "evening-sinkings"],
  "enterprise-6-june": ["cruisers-caught", "yorktown-torpedoed-again"],
  "yorktown-strike": ["midways-strikes", "hiryu-strikes-back"],
  "midway-torpedo": ["carriers-sighted", "tf16-launches"],
  "vmsb-241": ["carriers-sighted", "nagumo-recovers"],
  "b-17s": ["carriers-sighted", "nagumo-recovers"],
  "b-17s-evening": ["hiryu-hit", "evening-sinkings"],
};

/** The strikes whose last phase brings them home to the ship or the atoll they left. */
const RECOVERED_ABOARD = [
  "midway-strike",
  "hiryu-bombers",
  "hiryu-torpedo",
  "enterprise-strike",
  "yorktown-strike",
  "enterprise-6-june",
  "vmsb-241",
  "b-17s",
] as const;

/** The four ships whose loss the file dates, with the phase each is first out of action and the phase it is gone. */
const SINKINGS: ReadonlyArray<readonly [ship: string, broken: string, destroyed: string]> = [
  ["kaga", "three-carriers-hit", "evening-sinkings"],
  ["soryu", "three-carriers-hit", "evening-sinkings"],
  ["akagi", "three-carriers-hit", "akagi-and-hiryu-scuttled"],
  ["hiryu", "hiryu-hit", "akagi-and-hiryu-scuttled"],
];

/** A work in copyright, or one whose licence would infect a CC BY file, must not be a source. */
const FORBIDDEN_SOURCES = /Morison|Fuchida|Okumiya|Walter Lord|Incredible Victory|Prange|Lundstrom|Parshall|Shattered Sword|Symonds|wikipedia/i;

/** Index of the phase with this id; throws so a typo fails loudly rather than reading phase 0. */
function phaseIndex(id: string): number {
  const index = battle.phases.findIndex((phase) => phase.id === id);
  if (index === -1) throw new Error(`no phase ${id}`);
  return index;
}

/** One phase by id. */
function phase(id: string): Phase {
  const found = battle.phases[phaseIndex(id)];
  if (found === undefined) throw new Error(`no phase ${id}`);
  return found;
}

/** The snapshot of one unit in one phase, or `undefined` when the unit is absent from it. */
function snapshot(phaseId: string, unitId: string): UnitSnapshot | undefined {
  return phase(phaseId).units.find((unit) => unit.id === unitId);
}

/** The snapshot of a unit the test expects to be there; throws otherwise, so absence never passes for a value. */
function present(phaseId: string, unitId: string): UnitSnapshot {
  const found = snapshot(phaseId, unitId);
  if (found === undefined) throw new Error(`${unitId} is absent from ${phaseId}`);
  return found;
}

/** The ids of the phases a unit appears in, in phase order. */
function run(unitId: string): string[] {
  return battle.phases.filter((p) => p.units.some((unit) => unit.id === unitId)).map((p) => p.id);
}

/** The roster entry for an id. */
function unit(id: string) {
  const found = battle.units.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no unit ${id}`);
  return found;
}

/** The unit a strike is standing on in a phase: its own force, or one of that force's ships, at the same point. */
function carrying(phaseId: string, strikeId: string): UnitSnapshot | undefined {
  const strike = present(phaseId, strikeId);
  const force = unit(strikeId).parent;
  const family = new Set(battle.units.filter((u) => u.id === force || u.parent === force).map((u) => u.id));
  return phase(phaseId).units.find(
    (candidate) =>
      candidate.id !== strikeId &&
      family.has(candidate.id) &&
      candidate.position.lat === strike.position.lat &&
      candidate.position.lon === strike.position.lon,
  );
}

/** Nautical miles between two positions, near enough at this latitude for a speed check. */
function milesBetween(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const dLat = (to.lat - from.lat) * 60;
  const dLon = (to.lon - from.lon) * 60 * Math.cos((((from.lat + to.lat) / 2) * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Minutes from midnight of the battle's first day: what a leg's duration is measured in. */
function instant(p: Phase): number {
  return (p.day ?? 0) * 1440 + Number(p.t.slice(0, 2)) * 60 + Number(p.t.slice(3));
}

/** The map's features of one kind, narrowed to that kind's geometry and properties. */
function featuresOfKind<K extends MapFeature["properties"]["kind"]>(
  kind: K,
): Extract<MapFeature, { properties: { kind: K } }>[] {
  return map.features.filter(
    (feature): feature is Extract<MapFeature, { properties: { kind: K } }> => feature.properties.kind === kind,
  );
}

/** Every coordinate in the map file, as `[lon, lat]` pairs. */
function mapCoordinates(): [number, number][] {
  const out: [number, number][] = [];
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (node.length === 2 && typeof node[0] === "number" && typeof node[1] === "number") out.push([node[0], node[1]]);
    else for (const child of node) walk(child);
  };
  for (const feature of map.features) walk(feature.geometry.coordinates);
  return out;
}

describe("data/battles/midway.json", () => {
  it("is twenty-one phases over four days, in the order and at the times the issue set", () => {
    expect(battle.phases.map((p) => [p.id, p.day ?? 0, p.t])).toEqual(PHASES.map(([id, day, t]) => [id, day, t]));
    expect(battle.phases.filter((p) => (p.day ?? 0) === 0)).toHaveLength(14);
    expect(battle.phases.filter((p) => p.day === 1)).toHaveLength(3);
    expect(battle.phases.filter((p) => p.day === 2)).toHaveLength(3);
    expect(battle.phases.filter((p) => p.day === 3)).toHaveLength(1);
  });

  it("spans 4 to 7 June 1942, in nautical miles over the midway map, ending half an hour after Yorktown", () => {
    expect(battle.dates).toEqual(["4 June 1942", "5 June 1942", "6 June 1942", "7 June 1942"]);
    expect(battle.sort_date).toEqual({ year: 1942, month: 6, day: 4 });
    expect(battle.map).toBe("midway");
    expect(battle.scale_unit).toBe("nmi");
    expect(battle.end).toBe("05:30");
    expect(battle.end_day).toBe(3);
    expect(battle.license).toBe("CC-BY-4.0");
    expect(battle.attribution).toContain("CC BY 4.0");
  });

  it("fixes the frame the battle is read in, from 173 east round to 187.25", () => {
    expect(battle.extent.west).toBe(173);
    expect(battle.extent.east).toBe(187.25);
    expect(battle.extent.south).toBeLessThan(battle.extent.north);
  });

  it("spells every longitude in that frame, so nothing is drawn on the wrong side of the world", () => {
    const centre = (battle.extent.west + battle.extent.east) / 2;
    for (const p of battle.phases) {
      for (const snap of p.units) {
        const where = `${p.id}/${snap.id}`;
        for (const lon of [snap.position.lon, ...(snap.moves ?? []).map((move) => move.to.lon)]) {
          // Rule 2: within half a turn of the frame's centre, which is what the validator enforces.
          expect(lon, where).toBeGreaterThanOrEqual(centre - 180);
          expect(lon, where).toBeLessThan(centre + 180);
          // And the spelling this file chose: east longitudes as they are, west ones plus 360.
          expect(lon, where).toBeGreaterThan(0);
        }
        expect(snap.position.lat, where).toBeGreaterThan(battle.extent.south);
        expect(snap.position.lat, where).toBeLessThan(battle.extent.north);
      }
    }
    // The two positions the frame exists for: the atoll, and Yorktown's grave.
    expect(present("dawn-launch", "midway").position.lon).toBeCloseTo(182.63, 2);
    expect(present("yorktown-sinks", "yorktown").position.lon).toBeCloseTo(183.43, 2);
  });

  it("rosters twenty-five units at two levels, ships and aircraft, Japanese first", () => {
    expect(battle.levels).toEqual(["Forces", "Ships and strikes"]);
    expect(battle.units.map((u) => [u.id, u.side, u.parent, u.arm])).toEqual(
      ROSTER.map(([id, side, parent, arm]) => [id, side, parent, arm]),
    );
    expect(new Set(battle.units.map((u) => u.arm))).toEqual(new Set(["ship", "aircraft"]));
    expect([...new Set(battle.units.map((u) => u.side))]).toEqual(["Japanese", "American"]);
  });

  it("gives every unit a short label, distinct within the level it is drawn at", () => {
    for (const u of battle.units) expect(u.short_label, u.id).toBeTruthy();
    for (let level = 0; level < battle.levels!.length; level++) {
      const shortLabels = unitsAtLevel(battle.units, level).map((u) => u.short_label);
      expect(new Set(shortLabels).size, `level ${level}`).toBe(shortLabels.length);
    }
  });

  it("draws the five forces in every phase and never more than sixteen ships and strikes", () => {
    for (const p of battle.phases) {
      expect(drawnAtLevel(battle.units, 0, p).map((u) => u.id), p.id).toEqual([...FORCES]);
      const fine = drawnAtLevel(battle.units, 1, p).length;
      expect(fine, p.id).toBeLessThanOrEqual(16);
    }
    // The three morning phases where every Midway flight and both carrier groups are up are the crowded ones.
    const busiest = Math.max(...battle.phases.map((p) => drawnAtLevel(battle.units, 1, p).length));
    expect(busiest).toBe(15);
  });

  it("keeps Midway's air group on the plate in all twenty-one phases, and the atoll itself off the fine level", () => {
    expect(run("midway-air")).toEqual(battle.phases.map((p) => p.id));
    expect(run("midway")).toEqual(battle.phases.map((p) => p.id));
    expect(unitsAtLevel(battle.units, 1).map((u) => u.id)).not.toContain("midway");
    for (const p of battle.phases) {
      expect(drawnAtLevel(battle.units, 1, p).map((u) => u.id), p.id).toContain("midway-air");
    }
  });

  it("gives every strike one contiguous run from its launch phase to its recovery phase", () => {
    const ids = battle.phases.map((p) => p.id);
    for (const [strike, [first, last]] of Object.entries(STRIKE_RUNS)) {
      expect(run(strike), strike).toEqual(ids.slice(phaseIndex(first), phaseIndex(last) + 1));
    }
    // Every aircraft unit but the atoll and its permanent air group is one of those runs.
    const permanent = new Set(["midway", "midway-air"]);
    const strikes = battle.units.filter((u) => u.arm === "aircraft" && !permanent.has(u.id)).map((u) => u.id);
    expect(strikes.sort()).toEqual(Object.keys(STRIKE_RUNS).sort());
    // And nothing else is ever absent: every ship and force runs from phase one to the phase it is lost.
    for (const u of battle.units.filter((candidate) => candidate.arm === "ship")) {
      const own = run(u.id);
      expect(own[0], u.id).toBe(ids[0]);
      expect(own, u.id).toEqual(ids.slice(0, own.length));
    }
  });

  it("puts no strike on empty sea: each one starts in file on the ship or the atoll it left", () => {
    for (const [strike, [first]] of Object.entries(STRIKE_RUNS)) {
      const snap = present(first, strike);
      const home = carrying(first, strike);
      expect(home, `${strike} at ${first}`).toBeDefined();
      expect(snap.formation, `${strike} at ${first}`).toBe("column");
      expect(snap.heading, `${strike} at ${first}`).toBe(home!.heading);
      expect(snap.state, `${strike} at ${first}`).toBe("intact");
    }
  });

  it("brings the strikes that came home back aboard, in file, and lets the rest end where they were lost", () => {
    for (const strike of RECOVERED_ABOARD) {
      const last = STRIKE_RUNS[strike]![1];
      const snap = present(last, strike);
      expect(carrying(last, strike), `${strike} at ${last}`).toBeDefined();
      expect(snap.formation, `${strike} at ${last}`).toBe("column");
    }
    // Torpedo Eight is the one strike the file destroys outright.
    const waldron = present("torpedo-squadrons", "vt-8");
    expect(waldron.state).toBe("destroyed");
    expect(waldron.strength).toBe(0);
    expect(carrying("torpedo-squadrons", "vt-8")).toBeUndefined();
  });

  it("never lets Hiryu vanish, at either level, until she is scuttled", () => {
    const scuttled = phaseIndex("akagi-and-hiryu-scuttled");
    for (const [index, p] of battle.phases.entries()) {
      const drawn = drawnAtLevel(battle.units, 1, p).map((u) => u.id);
      if (index <= scuttled) expect(drawn, p.id).toContain("hiryu");
      else expect(drawn, p.id).not.toContain("hiryu");
    }
    // Including the two phases her own strikes are in the air, which is what ADR-0024 was decided for.
    for (const id of ["hiryu-strikes-back", "hiryu-torpedo-strike"]) {
      expect(present(id, "hiryu").state, id).toBe("engaged");
    }
  });

  it("breaks each carrier when she burns and destroys her when she sinks, and takes the wreck off the plate", () => {
    for (const [ship, broken, destroyed] of SINKINGS) {
      const own = run(ship);
      expect(own.at(-1), ship).toBe(destroyed);
      expect(present(broken, ship).state, `${ship} at ${broken}`).toBe("broken");
      expect(present(destroyed, ship).state, `${ship} at ${destroyed}`).toBe("destroyed");
      expect(present(destroyed, ship).strength, `${ship} at ${destroyed}`).toBe(0);
      // Never intact again once she is hit.
      const after = own.slice(own.indexOf(broken));
      for (const id of after) expect(present(id, ship).state, `${ship} at ${id}`).not.toBe("intact");
    }
    // The four sinking positions from the Nagumo report, in the file's frame.
    expect(present("evening-sinkings", "kaga").position).toEqual({ lat: 30.338, lon: 180.713 });
    expect(present("evening-sinkings", "soryu").position).toEqual({ lat: 30.708, lon: 181.375 });
    expect(present("akagi-and-hiryu-scuttled", "akagi").position).toEqual({ lat: 30.5, lon: 181.333 });
    expect(present("akagi-and-hiryu-scuttled", "hiryu").position).toEqual({ lat: 31.4583, lon: 180.6083 });
  });

  it("carries Yorktown from bombed to abandoned to sunk without ever reducing her strength for damage", () => {
    expect(run("yorktown")).toEqual(battle.phases.map((p) => p.id));
    const states = battle.phases.map((p) => present(p.id, "yorktown").state);
    expect(states).toEqual([
      ...new Array(9).fill("intact"),
      "engaged",
      "engaged",
      ...new Array(9).fill("broken"),
      "destroyed",
    ]);
    // A stopped and burning ship is engaged at full strength: strength is what is fighting, not what is undamaged.
    for (const id of ["yorktown-bombed", "hiryu-torpedo-strike", "yorktown-torpedoed", "yorktown-torpedoed-again"]) {
      expect(present(id, "yorktown").strength ?? 1, id).toBe(1);
    }
    expect(present("yorktown-sinks", "yorktown").strength).toBe(0);
  });

  it("keeps Cruiser Division 7 one unit, broken at half strength rather than destroyed", () => {
    expect(battle.units.map((u) => u.id)).not.toContain("mikuma");
    expect(run("crudiv-7")).toEqual(battle.phases.map((p) => p.id));
    expect(present("occupation-cancelled", "crudiv-7").state).toBe("engaged");
    expect(present("occupation-cancelled", "crudiv-7").strength).toBe(0.75);
    expect(present("mikuma-sinks", "crudiv-7").state).toBe("broken");
    expect(present("mikuma-sinks", "crudiv-7").strength).toBe(0.5);
    expect(present("yorktown-sinks", "crudiv-7").state).toBe("broken");
    expect(phase("mikuma-sinks").notes).toMatch(/Mikuma's own grave is in no public-domain source/);
  });

  it("never asks a ship for more than the twenty-four knots the sources give her", () => {
    const ships = new Set(battle.units.filter((u) => u.arm === "ship").map((u) => u.id));
    for (const [index, p] of battle.phases.entries()) {
      const before = battle.phases[index - 1];
      if (before === undefined) continue;
      const hours = (instant(p) - instant(before)) / 60;
      for (const snap of p.units) {
        if (!ships.has(snap.id)) continue;
        const was = before.units.find((candidate) => candidate.id === snap.id);
        if (was === undefined) continue;
        const knots = milesBetween(was.position, snap.position) / hours;
        expect(knots, `${snap.id} into ${p.id}`).toBeLessThanOrEqual(24);
      }
    }
  });

  it("keeps the pursuit's arrow the length the pilots were given, not the length they flew", () => {
    const spruance = present("pursuit-northwest", "tf16");
    const arrow = spruance.moves?.find((move) => move.kind === "intent");
    expect(arrow).toBeDefined();
    // Enterprise's log estimated the objective 230 miles off; what the aircraft actually found was 400 further on.
    const miles = milesBetween(spruance.position, arrow!.to);
    expect(miles).toBeGreaterThan(200);
    expect(miles).toBeLessThan(260);
    expect(phase("pursuit-northwest").notes).toMatch(/The arrow is the order, not the outcome/);
  });

  it("lets the Mobile Force go off the fine level once its four carriers are down, and says so", () => {
    const gone = phaseIndex("pursuit-northwest");
    for (const [index, p] of battle.phases.entries()) {
      const drawn = drawnAtLevel(battle.units, 1, p).map((u) => u.id);
      const japanese = drawn.filter((id) => ["akagi", "kaga", "soryu", "hiryu"].includes(id));
      // `unitsAtLevel` never draws a parent that has children, so the four carriers are the force's whole
      // representation at this level; after the scuttling there is nothing of it left to draw (ADR-0024).
      expect(drawn, p.id).not.toContain("mobile-force");
      expect(japanese.length > 0, p.id).toBe(index < gone);
    }
    expect(phase("pursuit-northwest").notes).toMatch(/At Ships and strikes there is nothing of it left to draw/);
    // The three forces that must stay visible there do have a permanent childless child or ship apiece.
    for (const [force, standIn] of [
      ["tf16", "enterprise"],
      ["tf17", "yorktown"],
      ["midway", "midway-air"],
    ]) {
      expect(run(standIn!), standIn).toEqual(battle.phases.map((p) => p.id));
      expect(unit(standIn!).parent, standIn).toBe(force);
    }
  });

  it("carries the wind on every phase: light from the south-east, then moderate from the south-west", () => {
    for (const p of battle.phases) {
      const expected = (p.day ?? 0) >= 2 ? { from: 225, force: "moderate" } : { from: 135, force: "light" };
      expect(p.wind, p.id).toEqual(expected);
    }
  });

  it("marks the six minutes that decided the battle as its still", () => {
    expect(battle.phases.filter((p) => p.still === true).map((p) => p.id)).toEqual(["three-carriers-hit"]);
    expect(stillPhase(battle).id).toBe("three-carriers-hit");
    // Three carriers change state in that one phase and Hiryu does not.
    for (const ship of ["akagi", "kaga", "soryu"]) {
      expect(present("three-carriers-hit", ship).state, ship).toBe("broken");
      expect(present("torpedo-squadrons", ship).state, ship).toBe("intact");
    }
    expect(present("three-carriers-hit", "hiryu").state).toBe("intact");
  });

  it("says in every phase's notes which clock its instant came off, and how the positions were got", () => {
    for (const p of battle.phases) {
      expect(p.notes, p.id).toMatch(/Time: (verbatim|converted|authored)/);
      expect(p.notes, p.id).toMatch(/Positions:/);
    }
    // The three clocks are keyed once, in the first phase, with the conversion each needs.
    const first = phase("dawn-launch").notes;
    expect(first).toMatch(/Zone plus 12/);
    expect(first).toMatch(/Zone plus 10/);
    expect(first).toMatch(/Tokyo time, plus 9/);
    expect(first).toMatch(/breaks the rule that a time is copied verbatim/);
    // And keys the course reversals, which a carrier battle has more of than any other kind (schema.md 2.13).
    expect(first).toMatch(/more than a quarter circle/);
    // And every phase whose instant is converted names the source reading it was converted from.
    for (const p of battle.phases.filter((candidate) => /Time: converted/.test(candidate.notes))) {
      expect(p.references.some((reference) => /Tokyo|Zone plus 10/.test(reference.note ?? "")), p.id).toBe(true);
    }
  });

  it("cites every phase, with at least one verbatim quote in each, and puts every source to work", () => {
    for (const p of battle.phases) {
      expect(p.references.length, p.id).toBeGreaterThan(0);
      expect(p.references.some((reference) => reference.quote !== undefined), p.id).toBe(true);
      for (const reference of p.references) expect(Object.keys(battle.sources)).toContain(reference.source);
    }
    const cited = new Set(battle.phases.flatMap((p) => p.references.map((reference) => reference.source)));
    expect(Object.keys(battle.sources).filter((key) => !cited.has(key))).toEqual([]);
  });

  it("ships twelve public-domain United States Government sources and no history in copyright", () => {
    expect(Object.keys(battle.sources)).toHaveLength(12);
    for (const [key, source] of Object.entries(battle.sources)) {
      expect(classOf(source.license), key).toBe("public-domain");
      expect(source.license_note, key).toBeDefined();
      expect(source.license_note, key).toMatch(/17 U\.S\.C\. 105/);
      expect(source.work, key).not.toMatch(FORBIDDEN_SOURCES);
      expect(source.url ?? "", key).not.toMatch(/wikipedia\.org|openstreetmap/i);
    }
  });

  it("plays the four days in three or four minutes at 1x, the action of the fourth slowest", () => {
    const seconds = wallDuration(battle).total;
    expect(seconds).toBeGreaterThan(150);
    expect(seconds).toBeLessThan(300);
    // From the first bomb on Midway to the last blow of the fourth, against the night and the three days after it.
    const action = battle.phases.slice(phaseIndex("midway-bombed"), phaseIndex("evening-sinkings"));
    const coda = battle.phases.slice(phaseIndex("evening-sinkings"));
    expect(Math.max(...action.map((p) => p.playback_rate))).toBeLessThan(Math.min(...coda.map((p) => p.playback_rate)));
    // The still's own phase is the slowest of all: six minutes of battle should not go by in one.
    expect(phase("three-carriers-hit").playback_rate).toBe(Math.min(...battle.phases.map((p) => p.playback_rate)));
  });

  it("takes its place in the library sixty-five years after the Little Bighorn", () => {
    const bighorn = validateBattle(JSON.parse(littleBighornRaw));
    if (!bighorn.ok) throw new Error("little-bighorn.json does not validate");
    const library = buildLibrary([
      { name: "midway", battle },
      { name: "little-bighorn", battle: bighorn.battle },
    ]);
    expect(library.map((entry) => entry.name)).toEqual(["little-bighorn", "midway"]);
    // Complete years between the two first days: 25 June 1876 to 4 June 1942 is sixty-five.
    const { year, month, day } = bighorn.battle.sort_date;
    const beforeTheAnniversary =
      battle.sort_date.month < month || (battle.sort_date.month === month && battle.sort_date.day < day);
    expect(battle.sort_date.year - year - (beforeTheAnniversary ? 1 : 0)).toBe(65);
  });
});

describe("data/maps/midway.geojson", () => {
  it("is public domain and credits Natural Earth for the coastline and the reef", () => {
    expect(map.license).toBe("public-domain");
    expect(map.attribution).toMatch(/Natural Earth/);
    expect(map.attribution).not.toMatch(/OpenStreetMap/i);
  });

  it("holds the atoll and nothing else: land, a reef, two places and the air station", () => {
    expect(map.features.map((feature) => feature.properties.kind)).toEqual(["land", "shoal", "place", "place", "work"]);
    expect(featuresOfKind("place").map((feature) => feature.properties.name)).toEqual(["Midway", "Kure"]);
    expect(featuresOfKind("work").map((feature) => feature.properties.name)).toEqual(["Naval Air Station Midway"]);
    // Sand Island, Eastern Island and Kure, and the Midway and Kure reefs.
    const land = featuresOfKind("land")[0]!;
    const shoal = featuresOfKind("shoal")[0]!;
    expect(land.geometry.type).toBe("MultiPolygon");
    expect(shoal.geometry.type).toBe("MultiPolygon");
    expect(land.geometry.type === "MultiPolygon" ? land.geometry.coordinates : []).toHaveLength(3);
    expect(shoal.geometry.type === "MultiPolygon" ? shoal.geometry.coordinates : []).toHaveLength(2);
  });

  it("is written in the battle's frame, shifted whole, with the atoll at 182.63", () => {
    const coordinates = mapCoordinates();
    expect(coordinates.length).toBeGreaterThan(30);
    for (const [lon, lat] of coordinates) {
      expect(lon).toBeGreaterThan(battle.extent.west);
      expect(lon).toBeLessThan(battle.extent.east);
      expect(lat).toBeGreaterThan(battle.extent.south);
      expect(lat).toBeLessThan(battle.extent.north);
    }
    const midway = featuresOfKind("place").find((feature) => feature.properties.name === "Midway")!;
    expect(midway.geometry.coordinates[0]).toBeCloseTo(182.63, 2);
    // Kure is fifty-odd miles west-north-west of it, and both are inside the plate.
    const kure = featuresOfKind("place").find((feature) => feature.properties.name === "Kure")!;
    expect(kure.geometry.coordinates[0]).toBeLessThan(midway.geometry.coordinates[0]);
    expect(kure.geometry.coordinates[1]).toBeGreaterThan(midway.geometry.coordinates[1]);
  });

  it("closes every ring, and puts the air station on Eastern Island inside the reef", () => {
    for (const feature of [featuresOfKind("land")[0]!, featuresOfKind("shoal")[0]!]) {
      const polygons = feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
      for (const polygon of polygons) {
        for (const ring of polygon) {
          expect(ring.length).toBeGreaterThanOrEqual(4);
          expect(ring[0]).toEqual(ring.at(-1));
        }
      }
    }
    const station = featuresOfKind("work")[0]!.geometry.coordinates;
    const reef = featuresOfKind("shoal")[0]!;
    const midwayReef = (reef.geometry.type === "MultiPolygon" ? reef.geometry.coordinates : [])[0]![0]!;
    const lons = midwayReef.map(([lon]) => lon);
    const lats = midwayReef.map(([, lat]) => lat);
    expect(station[0]).toBeGreaterThan(Math.min(...lons));
    expect(station[0]).toBeLessThan(Math.max(...lons));
    expect(station[1]).toBeGreaterThan(Math.min(...lats));
    expect(station[1]).toBeLessThan(Math.max(...lats));
  });

  it("puts the atoll where the battle puts Midway", () => {
    const midway = featuresOfKind("place").find((feature) => feature.properties.name === "Midway")!;
    const unitPosition = present("dawn-launch", "midway").position;
    expect(Math.abs(midway.geometry.coordinates[0] - unitPosition.lon)).toBeLessThan(0.05);
    expect(Math.abs(midway.geometry.coordinates[1] - unitPosition.lat)).toBeLessThan(0.05);
  });
});
