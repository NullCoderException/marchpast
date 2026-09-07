/**
 * Acceptance checks for the authored files `data/battles/copenhagen.json` and
 * `data/maps/copenhagen.geojson` (issue #90): they validate, and they carry
 * the roster, phases, wind, references, geometry and map features the issue
 * asked for. The validators prove shape; these tests prove the authoring brief
 * was met, so a later edit that drops a quote, moves a squadron off the King's
 * Deep or lets a post-1801 fort back onto the map fails here rather than in
 * the driving dev's review.
 *
 * The geographic assertions are written as containment against the map's own
 * polygons, because that is the acceptance the issue states: the Danish line
 * and Nelson's line lie in the channel between Amager and the Middle Ground,
 * the groundings touch the shoal, and the flag of truce reaches Zealand.
 */
import { describe, expect, it } from "vitest";
import copenhagenRaw from "../../data/battles/copenhagen.json?raw";
import copenhagenMapRaw from "../../data/maps/copenhagen.geojson?raw";
import { validateBattle } from "../schema/validateBattle.ts";
import { validateMap } from "../schema/validateMap.ts";
import type { Battle, LonLat, MapFeature, MapFile, Move, Position, UnitSnapshot } from "../schema/types.ts";
import { wallDuration } from "../timeline/intervals.ts";

const battleResult = validateBattle(JSON.parse(copenhagenRaw));
if (!battleResult.ok) throw new Error(`copenhagen.json does not validate:\n${JSON.stringify(battleResult.errors, null, 2)}`);
const battle: Battle = battleResult.battle;

const mapResult = validateMap(JSON.parse(copenhagenMapRaw));
if (!mapResult.ok) throw new Error(`copenhagen.geojson does not validate:\n${JSON.stringify(mapResult.errors, null, 2)}`);
const map: MapFile = mapResult.map;

/** The eight phases the issue specified, in order, with their battle-clock times. */
const PHASES: ReadonlyArray<readonly [id: string, t: string]> = [
  ["fair-wind-at-dawn", "06:00"],
  ["weigh-in-succession", "09:30"],
  ["bellona-and-russell-ground", "10:05"],
  ["battle-general", "11:30"],
  ["signal-39", "13:00"],
  ["southern-wing-silenced", "14:30"],
  ["truce", "15:15"],
  ["withdrawal", "16:00"],
];

/** Wikipedia is a fact-check, never a source: the issue forbids it and the CC BY-SA order of battle with it. */
const SHARE_ALIKE_WORKS = /wikipedia\.org|wikidata\.org/;

/** The move heads the issue names, each of which must appear in a run of phases and nowhere else. */
const AGAMEMNON = { lat: 55.652, lon: 12.668 };
const BELLONA_AND_RUSSELL = { lat: 55.674, lon: 12.645 };
const BOMBS = { lat: 55.688, lon: 12.644 };

/**
 * How near two positions must be to count as the same authored point: a tenth
 * of a minute of arc, which is finer than any two heads in this file are apart
 * and coarser than the rounding the positions are written to.
 */
const SAME_POINT = { lat: 0.002, lon: 0.003 };

/** Metres per degree of latitude, and of longitude at this battle's latitude, for turning an extent into a shape. */
const METRES_PER_DEGREE_LAT = 111_320;
const METRES_PER_DEGREE_LON = METRES_PER_DEGREE_LAT * Math.cos((55.67 * Math.PI) / 180);

/** Index of the phase with this id; throws so a typo fails loudly rather than reading phase 0. */
function phaseIndex(id: string): number {
  const index = battle.phases.findIndex((phase) => phase.id === id);
  if (index === -1) throw new Error(`no phase ${id}`);
  return index;
}

/** The snapshot of one unit in one phase; the validator guarantees it exists, so a miss is a test bug. */
function snapshot(phaseId: string, unitId: string): UnitSnapshot {
  const found = battle.phases[phaseIndex(phaseId)]?.units.find((unit) => unit.id === unitId);
  if (found === undefined) throw new Error(`no snapshot for ${unitId} in phase ${phaseId}`);
  return found;
}

/** One unit's snapshots across every phase, in phase order. */
function snapshots(unitId: string): UnitSnapshot[] {
  return battle.phases.map((phase) => snapshot(phase.id, unitId));
}

/** One phase's notes; `notes` is optional in the schema but this brief asks for it on every phase. */
function phaseNotes(phaseId: string): string {
  return battle.phases[phaseIndex(phaseId)]?.notes ?? "";
}

/** Every move a unit carries in a phase, in the order authored. */
function moves(phaseId: string, unitId: string): Move[] {
  return snapshot(phaseId, unitId).moves ?? [];
}

/** Whether two authored positions are the same point, within `SAME_POINT`. */
function samePoint(a: Position, b: Position): boolean {
  return Math.abs(a.lat - b.lat) < SAME_POINT.lat && Math.abs(a.lon - b.lon) < SAME_POINT.lon;
}

/** The ids of the phases in which this unit carries a move whose head is at `to`. */
function phasesWithMoveTo(unitId: string, to: Position): string[] {
  return battle.phases
    .filter((phase) => moves(phase.id, unitId).some((move) => samePoint(move.to, to)))
    .map((phase) => phase.id);
}

/** The map's features of one kind, narrowed to that kind's geometry and properties. */
function featuresOfKind<K extends MapFeature["properties"]["kind"]>(
  kind: K,
): Extract<MapFeature, { properties: { kind: K } }>[] {
  return map.features.filter(
    (feature): feature is Extract<MapFeature, { properties: { kind: K } }> => feature.properties.kind === kind,
  );
}

/** The outer ring of every polygon of this kind, as `[lon, lat]` pairs. */
function rings(kind: "land" | "shoal"): LonLat[][] {
  return featuresOfKind(kind)
    .flatMap((feature) => (feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates))
    .map((polygon) => polygon[0]!);
}

/** Ray casting: is this battle-file point inside any ring of that map kind? */
function inside(kind: "land" | "shoal", point: Position): boolean {
  return rings(kind).some((ring) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > point.lat !== yj > point.lat && point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  });
}

/** The named point features of one kind, by name, in the battle file's lat/lon convention. */
function named(kind: "place" | "work"): Map<string, Position> {
  return new Map(
    featuresOfKind(kind).map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      return [feature.properties.name, { lat, lon }] as const;
    }),
  );
}

describe("data/battles/copenhagen.json", () => {
  it("plays over the copenhagen map, in nautical miles, ending at 17:00 under CC BY 4.0", () => {
    expect(battle.map).toBe("copenhagen");
    expect(battle.scale_unit).toBe("nmi");
    expect(battle.end).toBe("17:00");
    expect(battle.dates).toEqual(["2 April 1801"]);
    expect(battle.sort_date).toEqual({ year: 1801, month: 4, day: 2 });
    expect(battle.license).toBe("CC-BY-4.0");
    expect(battle.attribution).toContain("CC BY 4.0");
  });

  it("frames Parker's anchorage and Draco inside a landscape extent", () => {
    const { north, south, east, west } = battle.extent;
    // Landscape is a shape on the ground, not a difference in degrees: a degree of longitude is 56% of one of latitude here.
    expect((east - west) * METRES_PER_DEGREE_LON).toBeGreaterThan((north - south) * METRES_PER_DEGREE_LAT);
    for (const phase of battle.phases) {
      for (const unit of phase.units) {
        const where = `${phase.id}/${unit.id}`;
        expect(unit.position.lat, where).toBeGreaterThan(south);
        expect(unit.position.lat, where).toBeLessThan(north);
        expect(unit.position.lon, where).toBeGreaterThan(west);
        expect(unit.position.lon, where).toBeLessThan(east);
      }
    }
  });

  it("has the three-squadron roster, British first, every entry a ship with a short label", () => {
    expect(battle.units.map((unit) => [unit.id, unit.side, unit.commander, unit.short_label])).toEqual([
      ["nelsons-division", "British", "Nelson", "Nelson"],
      ["parkers-division", "British", "Parker", "Parker"],
      ["danish-line", "Danish", "Fischer", "Danish line"],
    ]);
    for (const unit of battle.units) {
      expect(unit.arm, unit.id).toBe("ship");
      expect(unit.parent, unit.id).toBeUndefined();
    }
    expect(battle.levels).toBeUndefined();
  });

  it("keeps the Trekroner out of the roster and on the map as a work", () => {
    for (const unit of battle.units) expect(unit.label.toLowerCase()).not.toContain("trekroner");
    expect(named("work").get("Trekroner")).toEqual({ lat: 55.7031, lon: 12.6144 });
  });

  it("has the eight phases at the researched times", () => {
    expect(battle.phases.map((phase) => [phase.id, phase.t])).toEqual(PHASES);
    for (const phase of battle.phases) expect(phase.day ?? 0, phase.id).toBe(0);
  });

  it("never turns a unit through more than a quarter circle between phases", () => {
    // schema.md 2.7: a bigger turn wants an intermediate phase, so the direction is authored not guessed.
    // Nelson's two turns sit exactly on the limit, which is why this is worth pinning.
    for (const unit of battle.units) {
      const headings = snapshots(unit.id).map((snapshot) => snapshot.heading);
      for (let index = 1; index < headings.length; index++) {
        const turn = Math.abs(((headings[index]! - headings[index - 1]! + 540) % 360) - 180);
        expect(turn, `${unit.id} phase ${index}`).toBeLessThanOrEqual(90);
      }
    }
  });

  it("carries a light south-south-easterly wind on every phase, never shifting", () => {
    for (const phase of battle.phases) expect(phase.wind, phase.id).toEqual({ from: 157.5, force: "light" });
  });

  it("references every phase with at least one verbatim quote, and explains it in notes", () => {
    for (const phase of battle.phases) {
      expect(phase.references.some((reference) => reference.quote !== undefined), phase.id).toBe(true);
      expect(phase.notes, phase.id).toBeTruthy();
    }
  });

  it("records the recall-signal dispute in the notes of the phase that carries it", () => {
    expect(phaseNotes("signal-39")).toMatch(/13:?30|half-past one/i);
  });

  it("lists only public-domain sources, and never a share-alike work", () => {
    for (const [id, source] of Object.entries(battle.sources)) {
      expect(source.license, id).toBe("public-domain");
      expect(source.url ?? "", id).not.toMatch(SHARE_ALIKE_WORKS);
    }
    for (const id of [
      "nelson-report",
      "parker-dispatch",
      "stewart-narrative",
      "nelson-to-the-crown-prince",
      "southey",
      "mahan",
      "clowes-1899",
      "brydon-1802",
    ]) {
      expect(battle.sources[id], id).toBeDefined();
    }
  });

  it("cites Nelson's report for the three phases the issue names, and the Crown Prince letter for the truce", () => {
    const cites = (phaseId: string, sourceId: string): boolean =>
      battle.phases[phaseIndex(phaseId)]!.references.some((reference) => reference.source === sourceId);
    for (const phaseId of ["weigh-in-succession", "bellona-and-russell-ground", "truce"]) {
      expect(cites(phaseId, "nelson-report"), phaseId).toBe(true);
    }
    for (const phaseId of ["fair-wind-at-dawn", "battle-general", "signal-39", "southern-wing-silenced", "withdrawal"]) {
      expect(cites(phaseId, "stewart-narrative"), phaseId).toBe(true);
    }
    expect(cites("southern-wing-silenced", "nelson-to-the-crown-prince")).toBe(true);
  });

  it("keeps the Danish line moored, broadside on the King's Deep, for the whole battle", () => {
    const danes = snapshots("danish-line");
    const first = danes[0]!.position;
    for (const [index, unit] of danes.entries()) {
      expect(unit.position, `phase ${index}`).toEqual(first);
      expect(unit.heading, `phase ${index}`).toBe(70);
      expect(unit.formation, `phase ${index}`).toBe("line");
    }
    expect(danes.map((unit) => unit.state)).toEqual([
      "intact", "intact", "engaged", "engaged", "engaged", "broken", "destroyed", "destroyed",
    ]);
    const strengths = danes.map((unit) => unit.strength ?? 1);
    expect(strengths).toEqual([1, 1, 1, 0.9, 0.6, 0.2, 0, 0]);
  });

  it("runs Nelson's division up the King's Deep, anchors it as a line on the Danes, and withdraws it north", () => {
    const nelson = snapshots("nelsons-division");
    // Phases 1-2 and 8 are a column on the course; 3-7 a line whose front is the Danish line.
    expect(nelson.map((unit) => unit.formation)).toEqual([
      "column", "column", "line", "line", "line", "line", "line", "column",
    ]);
    expect(nelson.map((unit) => unit.heading)).toEqual([340, 340, 250, 250, 250, 250, 250, 340]);
    // North up the channel from Draco, holding station once anchored, then north again past the Trekroner.
    for (let index = 1; index < nelson.length; index++) {
      expect(nelson[index]!.position.lat, `phase ${index}`).toBeGreaterThanOrEqual(nelson[index - 1]!.position.lat);
    }
    expect(nelson[7]!.position.lat).toBeGreaterThan(named("work").get("Trekroner")!.lat);
    expect(nelson.map((unit) => unit.state)).toEqual([
      "intact", "intact", "engaged", "engaged", "engaged", "engaged", "engaged", "engaged",
    ]);
    // Twelve of the line: Agamemnon, then Bellona and Russell, then Defiance and Elephant.
    expect(nelson.map((unit) => unit.strength ?? 1)).toEqual([1, 0.92, 0.75, 0.75, 0.75, 0.75, 0.75, 0.58]);
  });

  it("leaves each detached ship where it stopped for every phase after it stopped there", () => {
    expect(phasesWithMoveTo("nelsons-division", AGAMEMNON)).toEqual(PHASES.slice(1).map(([id]) => id));
    expect(phasesWithMoveTo("nelsons-division", BELLONA_AND_RUSSELL)).toEqual(PHASES.slice(2).map(([id]) => id));
  });

  it("grounds the Bellona and the Russell on the shoal, and anchors the Agamemnon short of it", () => {
    // Stewart has the two "ran aground" on the starboard shoal; Nelson has the Agamemnon unable to
    // weather the shoal's end and "obliged to anchor", so hers is the one arrow that is not on it.
    expect(inside("shoal", BELLONA_AND_RUSSELL)).toBe(true);
    expect(inside("shoal", AGAMEMNON)).toBe(false);
    expect(AGAMEMNON.lat).toBeLessThan(BELLONA_AND_RUSSELL.lat);
  });

  it("sends Riou to the Trekroner and hauls him off, and stations the bombs abreast the Elephant", () => {
    const riou = moves("battle-general", "nelsons-division").find((move) => move.to.lat > 55.7);
    expect(riou?.kind).toBe("detachment");
    expect(riou!.to.lat).toBeGreaterThan(named("work").get("Trekroner")!.lat);
    // In phase 5 the frigates have obeyed No. 39: the head has come back south from the Trekroner
    // toward the line, so it is still north of the division but nearer to it than it was.
    const hauledOff = moves("signal-39", "nelsons-division").filter((move) => move.to.lat > 55.69);
    expect(hauledOff).toHaveLength(1);
    expect(hauledOff[0]!.to.lat).toBeLessThan(riou!.to.lat);
    expect(hauledOff[0]!.to.lat).toBeGreaterThan(snapshot("signal-39", "nelsons-division").position.lat);
    // The bombs: on the shoal side of the line, from the battle becoming general until the truce.
    const bombPhases = ["battle-general", "signal-39", "southern-wing-silenced", "truce"];
    expect(phasesWithMoveTo("nelsons-division", BOMBS)).toEqual(bombPhases);
    for (const phaseId of bombPhases) {
      const bombs = moves(phaseId, "nelsons-division").find((move) => samePoint(move.to, BOMBS))!;
      expect(bombs.kind, phaseId).toBe("detachment");
      expect(bombs.to.lon, phaseId).toBeGreaterThan(snapshot(phaseId, "nelsons-division").position.lon);
    }
  });

  it("sends the flag of truce ashore, once, as an intent", () => {
    const ashore = battle.phases.filter((phase) =>
      moves(phase.id, "nelsons-division").some((move) => move.kind === "intent" && move.to.lon < 12.61),
    );
    expect(ashore.map((phase) => phase.id)).toEqual(["southern-wing-silenced"]);
    const truce = moves("southern-wing-silenced", "nelsons-division").find((move) => move.kind === "intent")!;
    expect(inside("land", truce.to)).toBe(true);
  });

  it("beats Parker up from the north-east without ever firing", () => {
    const parker = snapshots("parkers-division");
    for (const [index, unit] of parker.entries()) {
      expect(unit.state, `phase ${index}`).toBe("intact");
      expect(unit.strength ?? 1, `phase ${index}`).toBe(1);
      expect(unit.heading, `phase ${index}`).toBe(225);
    }
    // South-west the whole way, and never over the shoal.
    for (let index = 1; index < parker.length; index++) {
      expect(parker[index]!.position.lat, `phase ${index}`).toBeLessThan(parker[index - 1]!.position.lat);
      expect(parker[index]!.position.lon, `phase ${index}`).toBeLessThan(parker[index - 1]!.position.lon);
      expect(inside("shoal", parker[index]!.position), `phase ${index}`).toBe(false);
    }
    // An intent on the Trekroner while it works up; a line when it anchors at the close.
    expect(parker.map((unit) => unit.formation)).toEqual([
      "column", "column", "column", "column", "column", "column", "line", "line",
    ]);
    const trekroner = named("work").get("Trekroner")!;
    expect(phasesWithMoveTo("parkers-division", trekroner)).toEqual(PHASES.slice(0, 5).map(([id]) => id));
    // Ramillies and Defence work up alone, at the north end of the King's Deep.
    const detached = moves("southern-wing-silenced", "parkers-division");
    expect(detached.map((move) => move.kind)).toEqual(["detachment"]);
    expect(detached[0]!.to.lat).toBeGreaterThan(trekroner.lat);
    expect(inside("shoal", detached[0]!.to)).toBe(false);
    for (const phaseId of ["truce", "withdrawal"]) expect(moves(phaseId, "parkers-division")).toEqual([]);
  });

  it("plays the day in three to four minutes at 1x, the fight slower than the approach", () => {
    const seconds = wallDuration(battle).total;
    expect(seconds).toBeGreaterThan(180);
    expect(seconds).toBeLessThan(260);
    const firstFight = phaseIndex("bellona-and-russell-ground");
    const approachRates = battle.phases.slice(0, firstFight).map((phase) => phase.playback_rate);
    const fightRates = battle.phases.slice(firstFight).map((phase) => phase.playback_rate);
    expect(Math.min(...approachRates)).toBeGreaterThan(Math.max(...fightRates));
  });
});

describe("data/maps/copenhagen.geojson", () => {
  it("ships the project's own tracing under CC BY 4.0, crediting Natural Earth for the rest", () => {
    expect(map.license).toBe("CC-BY-4.0");
    expect(map.attribution).toContain("Natural Earth");
    expect(map.attribution).toContain("CC BY 4.0");
  });

  it("carries land, one shoal, one work and the six places, and nothing else", () => {
    const kinds = map.features.map((feature) => feature.properties.kind);
    expect(new Set(kinds)).toEqual(new Set(["land", "shoal", "place", "work"]));
    expect(kinds.filter((kind) => kind === "shoal")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "work")).toHaveLength(1);
    expect([...named("place").keys()].sort()).toEqual(
      ["Amager", "Copenhagen", "Draco (Dragør)", "King's Deep", "Middle Ground", "Saltholm"].sort(),
    );
  });

  it("is one moment: 1801, with no fort that was built after it", () => {
    // Middelgrundsfortet (1890-94) and Flakfortet are on the modern coastline and must not be here.
    for (const point of [
      { lat: 55.7203, lon: 12.6658 },
      { lat: 55.7036, lon: 12.7314 },
    ]) {
      expect(inside("land", point)).toBe(false);
    }
    // Trekroner's own islet is land under its work.
    expect(inside("land", named("work").get("Trekroner")!)).toBe(true);
  });

  it("reads as Copenhagen: the city, Amager, Dragør and Saltholm are land, the roads are sea", () => {
    for (const [name, point] of named("place")) {
      const shouldBeLand = ["Copenhagen", "Amager", "Draco (Dragør)", "Saltholm"].includes(name);
      expect(inside("land", point), name).toBe(shouldBeLand);
    }
    expect(inside("shoal", named("place").get("Middle Ground")!)).toBe(true);
    expect(inside("shoal", named("place").get("King's Deep")!)).toBe(false);
  });

  it("leaves the King's Deep clear between Amager and the Middle Ground", () => {
    for (const unitId of ["danish-line", "nelsons-division"]) {
      for (const phase of battle.phases) {
        const where = `${phase.id}/${unitId}`;
        const position = snapshot(phase.id, unitId).position;
        expect(inside("land", position), where).toBe(false);
        expect(inside("shoal", position), where).toBe(false);
      }
    }
    // The Danes lie inshore of the British, and the British inshore of the shoal.
    const danes = snapshot("battle-general", "danish-line").position;
    const british = snapshot("battle-general", "nelsons-division").position;
    expect(danes.lon).toBeLessThan(british.lon);
    expect(inside("shoal", { lat: british.lat, lon: british.lon + 0.012 })).toBe(true);
  });

  it("keeps every place label off the plate's crowded middle, one per named thing", () => {
    const places = [...named("place").values(), ...named("work").values()];
    for (const [index, one] of places.entries()) {
      for (const other of places.slice(index + 1)) expect(samePoint(one, other)).toBe(false);
    }
  });
});
