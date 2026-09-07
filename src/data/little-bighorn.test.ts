/**
 * Acceptance checks for the authored files `data/battles/little-bighorn.json`
 * and `data/maps/little-bighorn.geojson` (issue #179): they validate, and they
 * carry the roster, phases, absences, notes, sources and map features the
 * issue asked for. The validators prove shape; these tests prove the authoring
 * brief was met, so a later edit that drops a phase, splits the village a
 * second time, or lets a copyright account in as a source fails here rather
 * than in the driving dev's review.
 *
 * Two of them are the brief's hard rules rather than ordinary coverage.
 * **Custer's battalion is present in all fourteen phases** at both levels
 * (ADR-0027: ignorance is never absence), and **the village's two bodies exist
 * only in phases 3 to 9** (ADR-0024: they were not two bodies outside that
 * run, which is a different claim from nobody knowing where they were).
 */
import { describe, expect, it } from "vitest";
import littleBighornRaw from "../../data/battles/little-bighorn.json?raw";
import littleBighornMapRaw from "../../data/maps/little-bighorn.geojson?raw";
import trafalgarRaw from "../../data/battles/trafalgar.json?raw";
import { drawnAtLevel, unitsAtLevel } from "../schema/hierarchy.ts";
import { classOf } from "../schema/licenses.ts";
import { stillPhase } from "../schema/stillPhase.ts";
import type { Battle, MapFeature, MapFile, Phase, UnitSnapshot } from "../schema/types.ts";
import { validateBattle } from "../schema/validateBattle.ts";
import { validateMap } from "../schema/validateMap.ts";
import { buildLibrary } from "./library.ts";

const battleResult = validateBattle(JSON.parse(littleBighornRaw));
if (!battleResult.ok)
  throw new Error(`little-bighorn.json does not validate:\n${JSON.stringify(battleResult.errors, null, 2)}`);
const battle: Battle = battleResult.battle;

const mapResult = validateMap(JSON.parse(littleBighornMapRaw));
if (!mapResult.ok)
  throw new Error(`little-bighorn.geojson does not validate:\n${JSON.stringify(mapResult.errors, null, 2)}`);
const map: MapFile = mapResult.map;

/** The fourteen phases the issue specified, in order, with their day and battle-clock time. */
const PHASES: ReadonlyArray<readonly [id: string, day: number, t: string]> = [
  ["divide", 0, "12:15"],
  ["lone-tepee", 0, "14:15"],
  ["reno-crosses", 0, "14:30"],
  ["skirmish-line", 0, "14:50"],
  ["timber", 0, "15:10"],
  ["retreat", 0, "15:30"],
  ["benteen-joins", 0, "16:00"],
  ["custer-engaged", 0, "16:30"],
  ["weir-point", 0, "17:00"],
  ["reno-hill", 0, "19:00"],
  ["dark", 0, "21:30"],
  ["dawn-attack", 1, "02:45"],
  ["lull", 1, "11:00"],
  ["village-departs", 1, "19:00"],
];

/** The nine units of the roster, with the parent each hangs from. */
const ROSTER: ReadonlyArray<readonly [id: string, side: string, parent: string | undefined]> = [
  ["custer-battalion", "7th Cavalry", undefined],
  ["keogh-wing", "7th Cavalry", "custer-battalion"],
  ["yates-wing", "7th Cavalry", "custer-battalion"],
  ["reno-battalion", "7th Cavalry", undefined],
  ["benteen-battalion", "7th Cavalry", undefined],
  ["pack-train", "7th Cavalry", undefined],
  ["village", "Lakota and Cheyenne", undefined],
  ["village-south", "Lakota and Cheyenne", "village"],
  ["village-north", "Lakota and Cheyenne", "village"],
];

/** The phases the two village bodies exist in: Reno's fight through the end of Custer's, and nothing outside it. */
const TWO_BODY_PHASES = [
  "reno-crosses",
  "skirmish-line",
  "timber",
  "retreat",
  "benteen-joins",
  "custer-engaged",
  "weir-point",
] as const;

/**
 * The four phases the issue forbids merging, "the four moments where the
 * sources have different commands doing different things at once". Each must
 * differ from the one before it in more than its clock, or it could be folded
 * into it without losing anything.
 */
const SEPARATE_PHASES = ["retreat", "benteen-joins", "custer-engaged", "weir-point"] as const;

/**
 * The turns through more than a quarter circle the file authors with no phase
 * between, as `[phase, unit]`. schema.md 2.13 wants an intermediate phase for
 * a turn this big; these are the two about-faces the sources describe as
 * single acts — the column turning out of the ford and up Deep Coulee and then
 * dismounting to fight facing back, and Reno's rally on the hill — and the
 * phases that carry them say so in their notes.
 */
const AUTHORED_ABOUT_FACES: ReadonlyArray<readonly [phase: string, unit: string]> = [
  ["benteen-joins", "custer-battalion"],
  ["benteen-joins", "keogh-wing"],
  ["benteen-joins", "yates-wing"],
  ["benteen-joins", "reno-battalion"],
  ["custer-engaged", "custer-battalion"],
  ["custer-engaged", "keogh-wing"],
  ["custer-engaged", "yates-wing"],
];

/** The camp circles the map draws as works, in Wooden Leg's order: the Cheyenne end, downstream, first. */
const CIRCLES = ["Cheyenne", "Sans Arc", "Oglala", "Miniconjou", "Blackfeet", "Hunkpapa"];

/** The places the issue asks the map to name. */
const PLACES = ["The divide", "Medicine Tail Coulee", "Last Stand Hill", "Weir Point", "Reno Hill", "Little Bighorn River"];

/** A work whose text is under copyright, or whose licence would infect a CC BY file, must not be a source. */
const FORBIDDEN_SOURCES = /Bighead|She Watched Custer|wikipedia\.org|openstreetmap|Custer's Last Campaign|Archaeology, History, and Custer/i;

/**
 * The file's own shorthand for what a picture rests on (ADR-0027): one of the
 * four letters followed by the prose that uses it. Written as a lookahead so
 * that "A little before noon" does not read as evidence.
 */
const EVIDENCE_LETTER = /\b[TMAR](?=[.,:;]| (?:is|for|and|with|from|to|throughout|at|on|in))/g;

/** Index of the phase with this id; throws so a typo fails loudly rather than reading phase 0. */
function phaseIndex(id: string): number {
  const index = battle.phases.findIndex((phase) => phase.id === id);
  if (index === -1) throw new Error(`no phase ${id}`);
  return index;
}

/** One phase by id. */
function phase(id: string): Phase {
  const found = battle.phases.find((candidate) => candidate.id === id);
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

/** The smaller angle between two headings, in degrees: how far a unit turns between two phases. */
function turn(from: number, to: number): number {
  const difference = Math.abs(to - from);
  return difference > 180 ? 360 - difference : difference;
}

/** Everything one unit's picture asserts beyond the clock, for comparing one phase with the next. */
function picture(unitId: string, phaseId: string): string {
  const snap = snapshot(phaseId, unitId);
  if (snap === undefined) return "absent";
  return [snap.state, snap.formation, snap.strength ?? 1, snap.position.lat, snap.position.lon, snap.heading].join("/");
}

/** The map's features of one kind, narrowed to that kind's geometry and properties. */
function featuresOfKind<K extends MapFeature["properties"]["kind"]>(
  kind: K,
): Extract<MapFeature, { properties: { kind: K } }>[] {
  return map.features.filter(
    (feature): feature is Extract<MapFeature, { properties: { kind: K } }> => feature.properties.kind === kind,
  );
}

describe("data/battles/little-bighorn.json", () => {
  it("is fourteen phases over two days, in the order and at the times the issue set", () => {
    expect(battle.phases.map((p) => [p.id, p.day ?? 0, p.t])).toEqual(PHASES.map(([id, day, t]) => [id, day, t]));
    expect(battle.phases.filter((p) => (p.day ?? 0) === 0)).toHaveLength(11);
    expect(battle.phases.filter((p) => p.day === 1)).toHaveLength(3);
  });

  it("spans 25 and 26 June 1876 and holds its last picture until ten at night on the second day", () => {
    expect(battle.dates).toEqual(["25 June 1876", "26 June 1876"]);
    expect(battle.sort_date).toEqual({ year: 1876, month: 6, day: 25 });
    expect(battle.end).toBe("22:00");
    expect(battle.end_day).toBe(1);
  });

  it("keeps the four phases where different commands are doing different things apart", () => {
    for (const id of SEPARATE_PHASES) {
      const before = battle.phases[phaseIndex(id) - 1];
      if (before === undefined) throw new Error(`${id} has no phase before it`);
      const changed = battle.units.filter((unit) => picture(unit.id, id) !== picture(unit.id, before.id));
      // More than one unit's picture changes, so neither phase could be folded into the other.
      expect(changed.length, `${before.id} -> ${id}`).toBeGreaterThan(1);
    }
  });

  it("carries the night on one phase at a rate that runs five hours off in seconds", () => {
    const dark = phase("dark");
    expect(dark.playback_rate).toBeGreaterThanOrEqual(2400);
    // 21:30 on day 0 to 02:45 on day 1 is five and a quarter hours of battle clock.
    const seconds = (24 - 21.5 + 2.75) * 3600;
    expect(seconds / dark.playback_rate).toBeLessThan(10);
  });

  it("rosters nine units at two levels, every one of them cavalry", () => {
    expect(battle.levels).toEqual(["Commands", "Wings"]);
    expect(battle.units.map((unit) => [unit.id, unit.side, unit.parent])).toEqual(
      ROSTER.map(([id, side, parent]) => [id, side, parent]),
    );
    expect(battle.units.map((unit) => unit.arm)).toEqual(new Array(ROSTER.length).fill("cavalry"));
  });

  it("draws five commands in every phase and seven wings only while the village is two bodies", () => {
    for (const p of battle.phases) {
      expect(drawnAtLevel(battle.units, 0, p).map((unit) => unit.id), p.id).toEqual([
        "custer-battalion",
        "reno-battalion",
        "benteen-battalion",
        "pack-train",
        "village",
      ]);
      const twoBodied = (TWO_BODY_PHASES as readonly string[]).includes(p.id);
      expect(drawnAtLevel(battle.units, 1, p).length, p.id).toBe(twoBodied ? 7 : 5);
    }
  });

  it("keeps Custer's battalion and both its wings on the plate in all fourteen phases", () => {
    const ids = battle.phases.map((p) => p.id);
    for (const unit of ["custer-battalion", "keogh-wing", "yates-wing"]) expect(run(unit)).toEqual(ids);
    // At the Wings level the battalion itself is not drawn, so the wings are what keeps Custer visible.
    expect(unitsAtLevel(battle.units, 1).map((unit) => unit.id)).not.toContain("custer-battalion");
    for (const p of battle.phases) {
      const drawn = drawnAtLevel(battle.units, 1, p).map((unit) => unit.id);
      expect(drawn).toContain("keogh-wing");
      expect(drawn).toContain("yates-wing");
    }
  });

  it("gives the two village bodies one contiguous run, phases 3 to 9, and nothing outside it", () => {
    for (const unit of ["village-south", "village-north"]) expect(run(unit)).toEqual([...TWO_BODY_PHASES]);
    // The parent is on the plate throughout, so the coarse level never loses the village.
    expect(run("village")).toEqual(battle.phases.map((p) => p.id));
    // And it never pops onto the fine level in the phases its children are away.
    for (const p of battle.phases) {
      expect(drawnAtLevel(battle.units, 1, p).map((unit) => unit.id)).not.toContain("village");
    }
  });

  it("destroys Custer's battalion at Weir Point and never lets it recover", () => {
    for (const unit of ["custer-battalion", "keogh-wing", "yates-wing"]) {
      for (const [id] of PHASES.slice(0, phaseIndex("weir-point"))) {
        expect(present(id, unit).state, `${unit} in ${id}`).not.toBe("destroyed");
      }
      for (const [id] of PHASES.slice(phaseIndex("weir-point"))) {
        expect(present(id, unit).state, `${unit} in ${id}`).toBe("destroyed");
        expect(present(id, unit).strength, `${unit} in ${id}`).toBe(0);
      }
    }
  });

  it("charges the scouts' raid to Reno's strength and never gives it back", () => {
    const moves = present("skirmish-line", "reno-battalion").moves ?? [];
    expect(moves.map((move) => move.kind)).toEqual(["detachment"]);
    const strengths = battle.phases.map((p) => present(p.id, "reno-battalion").strength ?? 1);
    expect(strengths).toEqual([1, 1, 1, 0.85, 0.85, 0.55, 0.55, 0.55, 0.55, 0.55, 0.55, 0.5, 0.5, 0.5]);
    // Strength only ever falls: nothing that left the battalion is given back to it.
    expect(strengths).toEqual([...strengths].sort((a, b) => b - a));
    expect(phase("skirmish-line").notes).toMatch(/scouts/);
    // And the scouts are a cost, never a tenth unit.
    expect(battle.units.map((unit) => unit.id)).not.toContain("scouts");
  });

  it("turns a unit through more than a quarter circle only where the phase's notes say why", () => {
    const heading = new Map<string, number>();
    const big: string[][] = [];
    for (const p of battle.phases) {
      for (const snap of p.units) {
        const before = heading.get(snap.id);
        if (before !== undefined && turn(before, snap.heading) > 90) big.push([p.id, snap.id]);
        heading.set(snap.id, snap.heading);
      }
    }
    expect(big).toEqual(AUTHORED_ABOUT_FACES.map(([id, unit]) => [id, unit]));
    for (const id of new Set(AUTHORED_ABOUT_FACES.map(([phaseId]) => phaseId))) {
      expect(phase(id).notes, id).toMatch(/more than a quarter circle/);
    }
  });

  it("keys the T, M, A and R letters once, in the first phase's notes, and uses them in every phase", () => {
    const first = phase("divide").notes;
    expect(first).toMatch(/T is testimony/);
    expect(first).toMatch(/M is the Maguire survey/);
    expect(first).toMatch(/A is the archaeology/);
    expect(first).toMatch(/R is reconstruction/);
    // And says whose clock the file keeps.
    expect(first).toMatch(/regiment's watch time/);
    for (const p of battle.phases) {
      const letters = p.notes.match(EVIDENCE_LETTER) ?? [];
      expect(letters.length, p.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("names the reading it declines in each of Custer's five phases", () => {
    expect(phase("timber").notes).toMatch(/against Godfrey, who denied/);
    expect(phase("timber").notes).toMatch(/archaeology sides with Maguire/);
    expect(phase("retreat").notes).toMatch(/declined reading is Godfrey's/);
    expect(phase("benteen-joins").notes).toMatch(/declined reading is Godfrey's/);
    expect(phase("custer-engaged").notes).toMatch(/Crow King|Curley|Reno's report alone/);
    expect(phase("weir-point").notes).toMatch(/order of the collapse/);
  });

  it("marks the phase Custer is engaged as the battle's still", () => {
    expect(battle.phases.filter((p) => p.still === true).map((p) => p.id)).toEqual(["custer-engaged"]);
    expect(stillPhase(battle).id).toBe("custer-engaged");
  });

  it("cites every phase, with at least one verbatim quote in each", () => {
    for (const p of battle.phases) {
      expect(p.references.length, p.id).toBeGreaterThan(0);
      expect(
        p.references.some((reference) => reference.quote !== undefined),
        p.id,
      ).toBe(true);
      for (const reference of p.references) expect(Object.keys(battle.sources)).toContain(reference.source);
    }
  });

  it("puts every source it declares to work in some phase", () => {
    const cited = new Set(battle.phases.flatMap((p) => p.references.map((reference) => reference.source)));
    expect(Object.keys(battle.sources).filter((key) => !cited.has(key))).toEqual([]);
  });

  it("ships only public-domain sources, and never Kate Bighead", () => {
    for (const [key, source] of Object.entries(battle.sources)) {
      expect(classOf(source.license), key).toBe("public-domain");
      expect(source.license_note, key).toBeDefined();
      expect(source.work, key).not.toMatch(FORBIDDEN_SOURCES);
      expect(source.url ?? "", key).not.toMatch(/wikipedia\.org|openstreetmap/i);
    }
    // Kate Bighead is named once, in the note that says why she is not a source.
    expect(battle.sources["wooden-leg-1931"]?.license_note).toMatch(/Bighead/);
    expect(battle.sources["wooden-leg-1931"]?.license_note).toMatch(/is not a source/);
  });

  it("takes its place in the library's chronology seventy years after Trafalgar", () => {
    const trafalgar = validateBattle(JSON.parse(trafalgarRaw));
    if (!trafalgar.ok) throw new Error("trafalgar.json does not validate");
    const library = buildLibrary([
      { name: "little-bighorn", battle },
      { name: "trafalgar", battle: trafalgar.battle },
    ]);
    expect(library.map((entry) => entry.name)).toEqual(["trafalgar", "little-bighorn"]);
    // Complete years between the two first days: 21 October 1805 to 25 June 1876 is seventy.
    const { year, month, day } = trafalgar.battle.sort_date;
    const beforeTheAnniversary =
      battle.sort_date.month < month || (battle.sort_date.month === month && battle.sort_date.day < day);
    expect(battle.sort_date.year - year - (beforeTheAnniversary ? 1 : 0)).toBe(70);
  });
});

describe("data/maps/little-bighorn.geojson", () => {
  it("is public domain and credits the 1891 sheet the river is traced from", () => {
    expect(map.license).toBe("public-domain");
    expect(map.attribution).toMatch(/1891/);
    expect(map.attribution).toMatch(/SRTM/);
    expect(map.attribution).not.toMatch(/OpenStreetMap/i);
  });

  it("opens with one land polygon that overhangs the extent on every side", () => {
    const land = featuresOfKind("land");
    expect(land).toHaveLength(1);
    const ring = land[0]!.geometry.type === "Polygon" ? land[0]!.geometry.coordinates[0]! : [];
    const lons = ring.map(([lon]) => lon);
    const lats = ring.map(([, lat]) => lat);
    expect(Math.min(...lons)).toBeLessThan(battle.extent.west);
    expect(Math.max(...lons)).toBeGreaterThan(battle.extent.east);
    expect(Math.min(...lats)).toBeLessThan(battle.extent.south);
    expect(Math.max(...lats)).toBeGreaterThan(battle.extent.north);
  });

  it("draws the valley's contours at a twenty-metre interval", () => {
    const levels = featuresOfKind("contour")
      .map((feature) => feature.properties.elevation)
      .sort((a, b) => a - b);
    expect(levels.length).toBeGreaterThan(25);
    const steps = new Set(levels.slice(1).map((level, index) => level - levels[index]!));
    expect([...steps]).toEqual([20]);
    // The river runs at about 920 m and the divide stands over 1,400.
    expect(levels[0]).toBeLessThanOrEqual(930);
    expect(levels.at(-1)).toBeGreaterThan(1400);
  });

  it("carries the camp circles as works and the battle's landmarks as places", () => {
    expect(featuresOfKind("work").map((feature) => feature.properties.name)).toEqual(CIRCLES);
    const places = featuresOfKind("place").map((feature) => feature.properties.name);
    for (const name of PLACES) expect(places).toContain(name);
  });

  it("strings the camp circles down the west bank, the Cheyenne end downstream of the Hunkpapa", () => {
    const river = featuresOfKind("river").find((feature) => feature.geometry.type === "LineString")!;
    const line = river.geometry.type === "LineString" ? river.geometry.coordinates : [];
    const works = featuresOfKind("work");
    for (const work of works) {
      const [lon, lat] = work.geometry.coordinates;
      const band = line.filter(([, riverLat]) => Math.abs(riverLat - lat) < 0.002);
      expect(band.length, work.properties.name).toBeGreaterThan(0);
      expect(lon, work.properties.name).toBeLessThan(Math.min(...band.map(([riverLon]) => riverLon)));
    }
    // Downstream is north, and the circles are listed from the lower end up.
    const latitudes = works.map((work) => work.geometry.coordinates[1]);
    expect(latitudes).toEqual([...latitudes].sort((a, b) => b - a));
    // The accounts put the village between two and three miles long.
    const span = (Math.max(...latitudes) - Math.min(...latitudes)) * 111.132;
    expect(span).toBeGreaterThan(2.5);
    expect(span).toBeLessThan(5);
  });
});
