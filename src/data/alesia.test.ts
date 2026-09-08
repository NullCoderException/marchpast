/**
 * Acceptance checks for the authored files `data/battles/alesia.json` and
 * `data/maps/alesia.geojson` (issue #178): they validate, and they carry the
 * roster, the twelve phases, the six-day clock, the references and the
 * geometry the issue asked for. The validators prove shape; these tests prove
 * the authoring brief was met, so a later edit that drops a quote, moves the
 * sixty thousand or winds a rampart the other way fails here rather than in
 * the driving dev's review.
 *
 * Alesia is the first battle to use ADR-0024's absence. Vercassivellaunus's
 * sixty thousand are picked out of the relief army on day 3 and do not exist
 * as a body before that, so the six phases before their night march say
 * nothing about them at all. The run below pins it: absent, then hidden
 * behind Mont Réa, then on the north camp, then broken and destroyed, and
 * never back.
 *
 * It is also the first map to carry a `rampart`, whose winding is meaning:
 * the teeth fall on the right of the direction the line is drawn in, so the
 * two lines run opposite ways round the same hill.
 */
import { describe, expect, it } from "vitest";
import alesiaRaw from "../../data/battles/alesia.json?raw";
import alesiaMapRaw from "../../data/maps/alesia.geojson?raw";
import type { Battle, LineGeometry, LonLat, MapFeature, MapFile, UnitSnapshot } from "../schema/types.ts";
import { validateBattle } from "../schema/validateBattle.ts";
import { validateMap } from "../schema/validateMap.ts";

const result = validateBattle(JSON.parse(alesiaRaw));
if (!result.ok) throw new Error(`alesia.json does not validate:\n${JSON.stringify(result.errors, null, 2)}`);
const battle: Battle = result.battle;

const mapResult = validateMap(JSON.parse(alesiaMapRaw));
if (!mapResult.ok) throw new Error(`alesia.geojson does not validate:\n${JSON.stringify(mapResult.errors, null, 2)}`);
const map: MapFile = mapResult.map;

/** The twelve phases the issue specified, in order, with the day and battle-clock time of each. */
const PHASES: ReadonlyArray<readonly [id: string, day: number, t: string]> = [
  ["relief-army-arrives", 0, "16:00"],
  ["relief-fills-the-plain", 1, "09:00"],
  ["cavalry-battle-noon", 1, "12:00"],
  ["germans-break-the-gallic-horse", 1, "17:30"],
  ["midnight-assault-on-the-plain", 3, "00:00"],
  ["dawn-repulse", 3, "05:30"],
  ["sixty-thousand-behind-rea", 4, "05:30"],
  ["noon-triple-assault", 4, "12:00"],
  ["crisis-at-the-north-camp", 4, "14:00"],
  ["caesar-rides-to-rea", 4, "16:00"],
  ["rout-and-withdrawal", 4, "18:00"],
  ["surrender", 5, "12:00"],
];

/** The nine units at the one level, Roman first so the red ink falls on Rome. */
const UNITS: ReadonlyArray<readonly [id: string, side: string]> = [
  ["plain-lines", "Roman"],
  ["north-camp", "Roman"],
  ["bussy-legions", "Roman"],
  ["flavigny-legions", "Roman"],
  ["roman-cavalry", "Roman"],
  ["besieged", "Gallic"],
  ["relief-foot", "Gallic"],
  ["relief-horse", "Gallic"],
  ["vercassivellaunus", "Gallic"],
];

/** The three times Caesar states outright; every other `t` in the file is an estimate and says so. */
const SOURCE_PINNED_TIMES = ["cavalry-battle-noon", "midnight-assault-on-the-plain", "noon-triple-assault"] as const;

/** Everything Caesar's army is drawn as: the four sectors of the ring, and the cavalry. */
const ROMAN_UNITS = ["plain-lines", "north-camp", "bussy-legions", "flavigny-legions", "roman-cavalry"] as const;

/**
 * Works the research note read and ruled out as sources, because their
 * transcription or their plate is share-alike: Wikipedia, Reddé's open-access
 * essays and Cristiano64's Commons plan. A guard rather than a proof — rule 12
 * is enforced on `license`, and this only stops one of these arriving later
 * under a `public-domain` label.
 */
const RULED_OUT_WORKS = /wikipedia\.org|una-editions|Si%C3%A8ge_Al%C3%A9sia/;

/** Index of the phase with this id in `battle.phases`; throws so a typo fails loudly rather than reading phase 0. */
function phaseIndex(id: string): number {
  const index = battle.phases.findIndex((phase) => phase.id === id);
  if (index === -1) throw new Error(`no phase ${id}`);
  return index;
}

/** The snapshot of one unit in one phase; throws when the unit is absent from it, which is a bug wherever it is called. */
function snapshot(phaseId: string, unitId: string): UnitSnapshot {
  const found = battle.phases[phaseIndex(phaseId)]?.units.find((unit) => unit.id === unitId);
  if (found === undefined) throw new Error(`no snapshot for ${unitId} in phase ${phaseId}`);
  return found;
}

/** The phases one unit is on the plate in, by index into `battle.phases`, in order. */
function phasesOf(unitId: string): number[] {
  return battle.phases.flatMap((phase, index) => (phase.units.some((unit) => unit.id === unitId) ? [index] : []));
}

/** One unit's snapshots, in phase order, across the phases it is present in. */
function snapshots(unitId: string): UnitSnapshot[] {
  return phasesOf(unitId).map((index) => snapshot(battle.phases[index]!.id, unitId));
}

/** Every feature of one kind, narrowed to it, as `copenhagen.test.ts` reads its map. */
function featuresOfKind<K extends MapFeature["properties"]["kind"]>(kind: K): Extract<MapFeature, { properties: { kind: K } }>[] {
  return map.features.filter((feature): feature is Extract<MapFeature, { properties: { kind: K } }> => feature.properties.kind === kind);
}

/** Every named point of one kind, by name. */
function named(kind: "place" | "work"): Map<string, LonLat> {
  return new Map(featuresOfKind(kind).map((feature) => [feature.properties.name, feature.geometry.coordinates] as const));
}

/** Every run of one feature drawn as a line. */
function lines(feature: { geometry: LineGeometry }): LonLat[][] {
  const geometry = feature.geometry;
  return geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates];
}

/** Two points within a metre of each other, which on this map means the same point. */
function samePoint(one: LonLat, other: LonLat): boolean {
  return Math.abs(one[0] - other[0]) < 1e-5 && Math.abs(one[1] - other[1]) < 1e-5;
}

/**
 * The signed area a rampart's runs enclose when read as one ring, in square
 * degrees. Negative is clockwise in the lon/lat frame, which is the winding
 * that puts the ground it encloses — and so its teeth — on the right of the
 * direction of travel.
 */
function signedArea(feature: { geometry: LineGeometry }): number {
  const ring = lines(feature).flat();
  let twice = 0;
  for (const [index, point] of ring.entries()) {
    const next = ring[(index + 1) % ring.length]!;
    twice += point[0] * next[1] - next[0] * point[1];
  }
  return twice / 2;
}

/** The contour levels the map carries, in metres, ascending. */
function contourLevels(): number[] {
  return featuresOfKind("contour")
    .map((feature) => feature.properties.elevation)
    .sort((one, other) => one - other);
}

describe("data/battles/alesia.json", () => {
  it("plays over the alesia map, in kilometres, ending at 15:00 on the sixth day under CC BY 4.0", () => {
    expect(battle.map).toBe("alesia");
    expect(battle.scale_unit).toBe("km");
    expect(battle.end).toBe("15:00");
    expect(battle.end_day).toBe(5);
    expect(battle.license).toBe("CC-BY-4.0");
    expect(battle.attribution).toContain("CC BY 4.0");
    expect(battle.sort_date).toEqual({ year: -52, month: 9, day: 20 });
  });

  it("has the twelve phases on the researched day and time sequence, with day 2 empty", () => {
    expect(battle.phases.map((phase) => [phase.id, phase.day ?? 0, phase.t])).toEqual(PHASES);
    const days = new Set(battle.phases.map((phase) => phase.day ?? 0));
    expect([...days].sort((one, other) => one - other)).toEqual([0, 1, 3, 4, 5]);
  });

  it("dates the days it plays and never the calendar", () => {
    expect(battle.dates[0]).toBe("September 52 BC");
    for (const date of battle.dates.slice(1)) expect(date).toMatch(/^\(\w+ day\)$/);
  });

  it("has the nine units at one level, Roman first, and no hierarchy", () => {
    expect(battle.units.map((unit) => [unit.id, unit.side])).toEqual(UNITS);
    expect(battle.levels).toBeUndefined();
    for (const unit of battle.units) expect(unit.parent, unit.id).toBeUndefined();
  });

  it("shows every unit in every phase but the sixty thousand, who are absent until they are chosen", () => {
    const everyPhase = [...battle.phases.keys()];
    for (const [id] of UNITS) {
      const expected = id === "vercassivellaunus" ? everyPhase.slice(phaseIndex("sixty-thousand-behind-rea")) : everyPhase;
      expect(phasesOf(id), id).toEqual(expected);
    }
  });

  it("marks the noon assault as the still, and only that phase", () => {
    const stills = battle.phases.filter((phase) => phase.still === true).map((phase) => phase.id);
    expect(stills).toEqual(["noon-triple-assault"]);
  });

  it("references every phase with at least one verbatim quote, and explains it in notes", () => {
    for (const phase of battle.phases) {
      expect(phase.references.some((reference) => reference.quote !== undefined), phase.id).toBe(true);
      expect(phase.notes, phase.id).toContain("Positions:");
    }
  });

  it("says which times are Caesar's and which are estimates, on every phase", () => {
    for (const phase of battle.phases) {
      const pinned = (SOURCE_PINNED_TIMES as readonly string[]).includes(phase.id);
      expect(phase.notes.startsWith(pinned ? "Time: Caesar's own." : "Time: "), phase.id).toBe(true);
      if (!pinned) expect(phase.notes, phase.id).toMatch(/Time: (an estimate|Caesar's words)/);
    }
  });

  it("lists only public-domain sources, and never a work the research note ruled out", () => {
    for (const [id, source] of Object.entries(battle.sources)) {
      expect(source.license, id).toBe("public-domain");
      expect(source.url, id).not.toMatch(RULED_OUT_WORKS);
      expect(source.license_note, id).toBeTruthy();
    }
    for (const id of ["caesar-mcdevitte", "caesar-latin", "caesar-edwards", "plutarch-perrin", "dio-cary", "napoleon-iii", "stoffel-plan"]) {
      expect(battle.sources[id], id).toBeDefined();
    }
  });

  it("keeps every position and every arrow head inside the extent", () => {
    const { north, south, east, west } = battle.extent;
    for (const phase of battle.phases) {
      for (const unit of phase.units) {
        const where = `${phase.id}/${unit.id}`;
        for (const point of [unit.position, ...(unit.moves ?? []).map((move) => move.to)]) {
          expect(point.lat, where).toBeGreaterThan(south);
          expect(point.lat, where).toBeLessThan(north);
          expect(point.lon, where).toBeGreaterThan(west);
          expect(point.lon, where).toBeLessThan(east);
        }
      }
    }
  });

  it("tracks no wind: no source gives one for Alesia", () => {
    for (const phase of battle.phases) expect(phase.wind, phase.id).toBeUndefined();
  });

  it("runs the sixty thousand from behind Mont Réa to destroyed on its slope", () => {
    // They reach the plate hidden north of the mountain: north of everything else drawn
    // then, faced south-east at the camp they are to storm.
    const behind = snapshot("sixty-thousand-behind-rea", "vercassivellaunus");
    expect(behind.state).toBe("intact");
    expect(behind.heading).toBe(135);
    for (const other of battle.phases[phaseIndex("sixty-thousand-behind-rea")]!.units) {
      if (other.id !== "vercassivellaunus") expect(behind.position.lat, other.id).toBeGreaterThan(other.position.lat);
    }
    // Then engaged on the north camp, then broken, then destroyed, and never intact again.
    const onTheCamp = snapshot("noon-triple-assault", "vercassivellaunus");
    expect(onTheCamp.state).toBe("engaged");
    expect(onTheCamp.position.lat).toBeLessThan(behind.position.lat);
    expect(snapshot("caesar-rides-to-rea", "vercassivellaunus").state).toBe("broken");
    expect(snapshot("caesar-rides-to-rea", "vercassivellaunus").strength).toBe(0.4);
    for (const phaseId of ["rout-and-withdrawal", "surrender"]) {
      expect(snapshot(phaseId, "vercassivellaunus").state, phaseId).toBe("destroyed");
      expect(snapshot(phaseId, "vercassivellaunus").strength, phaseId).toBe(0.1);
    }
    for (const unit of snapshots("vercassivellaunus").slice(1)) expect(unit.state).not.toBe("intact");
  });

  it("keeps the besieged intact while they are shut in, and destroys them only at the surrender", () => {
    const track = snapshots("besieged");
    const assault = phaseIndex("noon-triple-assault");
    for (const [index, unit] of track.entries()) {
      if (index < assault) expect(unit.state, `phase ${index}`).toBe("intact");
      else if (index < track.length - 1) expect(unit.state, `phase ${index}`).toBe("engaged");
    }
    const surrender = snapshot("surrender", "besieged");
    expect(surrender.state).toBe("destroyed");
    expect(surrender.strength).toBe(0);
    // The aborted midnight sally is an intent arrow, not a state.
    const sally = snapshot("midnight-assault-on-the-plain", "besieged");
    expect(sally.state).toBe("intact");
    expect(sally.moves?.map((move) => move.kind)).toEqual(["intent"]);
  });

  it("holds every Roman unit at full strength from intact to engaged and never back", () => {
    for (const id of ROMAN_UNITS) {
      const track = snapshots(id);
      for (const [index, unit] of track.entries()) expect(unit.strength ?? 1, `${id} phase ${index}`).toBe(1);
      const firstEngaged = track.findIndex((unit) => unit.state === "engaged");
      expect(firstEngaged, id).toBeGreaterThan(-1);
      for (const unit of track.slice(firstEngaged)) expect(unit.state, id).toBe("engaged");
      for (const unit of track.slice(0, firstEngaged)) expect(unit.state, id).toBe("intact");
    }
  });

  it("draws every cohort draft as a detachment arrow, and no other kind", () => {
    const drafts: ReadonlyArray<readonly [phase: string, unit: string]> = [
      ["midnight-assault-on-the-plain", "bussy-legions"],
      ["midnight-assault-on-the-plain", "flavigny-legions"],
      ["crisis-at-the-north-camp", "flavigny-legions"],
      ["caesar-rides-to-rea", "flavigny-legions"],
      ["caesar-rides-to-rea", "roman-cavalry"],
      ["rout-and-withdrawal", "roman-cavalry"],
    ];
    for (const [phaseId, unitId] of drafts) {
      const moves = snapshot(phaseId, unitId).moves ?? [];
      expect(moves.map((move) => move.kind), `${phaseId}/${unitId}`).toEqual(["detachment"]);
    }
  });

  it("takes the relief army west and south off the field once it breaks", () => {
    for (const id of ["relief-foot", "relief-horse"]) {
      const rout = snapshot("rout-and-withdrawal", id);
      const before = snapshot("caesar-rides-to-rea", id);
      expect(rout.state, id).toBe("broken");
      expect(rout.strength, id).toBe(0.5);
      expect(rout.position.lon, id).toBeLessThan(before.position.lon);
      expect(rout.position.lat, id).toBeLessThan(before.position.lat);
      const gone = snapshot("surrender", id);
      expect(gone.state, id).toBe("destroyed");
      expect(gone.position.lon, id).toBeLessThan(rout.position.lon);
    }
  });

  it("never turns a unit more than a quarter circle between phases, but for the two authored half-turns", () => {
    // The besieged turn from the inner line to the plain when the relief army appears, and
    // the Flavigny sector turns from its outer face to its inner one when Vercingetorix
    // attacks the steep ground below it. Both resolve clockwise; both are argued in the
    // phase's own notes.
    const allowed = new Set(["besieged:relief-fills-the-plain", "flavigny-legions:crisis-at-the-north-camp"]);
    for (const unit of battle.units) {
      const present = phasesOf(unit.id);
      const track = snapshots(unit.id);
      for (let index = 1; index < track.length; index++) {
        const at = battle.phases[present[index]!]!.id;
        if (allowed.has(`${unit.id}:${at}`)) continue;
        const turn = Math.abs(((track[index]!.heading - track[index - 1]!.heading + 540) % 360) - 180);
        expect(turn, `${unit.id} at ${at}`).toBeLessThanOrEqual(90);
      }
    }
    expect(snapshot("relief-army-arrives", "besieged").heading).toBe(90);
    expect(snapshot("relief-fills-the-plain", "besieged").heading).toBe(270);
    expect(snapshot("noon-triple-assault", "flavigny-legions").heading).toBe(180);
    expect(snapshot("crisis-at-the-north-camp", "flavigny-legions").heading).toBe(0);
  });
});

describe("data/maps/alesia.geojson", () => {
  it("is public domain, crediting the tile it was cut from and the plate it was traced from", () => {
    expect(map.license).toBe("public-domain");
    expect(map.attribution).toContain("SRTM");
    expect(map.attribution).toContain("planche 25");
  });

  it("carries land, the three rivers, the contours, the two lines, the works and the places, and nothing else", () => {
    const kinds = map.features.map((feature) => feature.properties.kind);
    expect(new Set(kinds)).toEqual(new Set(["land", "river", "contour", "rampart", "work", "place"]));
    expect(kinds.filter((kind) => kind === "land")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "river")).toHaveLength(3);
    expect(kinds.filter((kind) => kind === "rampart")).toHaveLength(2);
    expect([...named("place").keys()].sort()).toEqual(
      ["Alesia", "Circumvallation", "Contravallation", "Mont Réa", "Montagne de Bussy", "Montagne de Flavigny", "Plain of Les Laumes"].sort(),
    );
    expect([...named("work").keys()].sort()).toEqual(
      ["Camp A", "Camp B", "Camp C", "Castellum 11", "Castellum 18", "The Gallic camp", "The north camp"].sort(),
    );
  });

  it("covers the extent with one five-vertex land polygon that overhangs it on every side", () => {
    const land = featuresOfKind("land")[0]!;
    if (land.geometry.type !== "Polygon") throw new Error("the land is not one polygon");
    const ring = land.geometry.coordinates[0]!;
    expect(samePoint(ring[0]!, ring.at(-1)!)).toBe(true);
    expect(ring).toHaveLength(6); // five vertices, the first repeated to close the ring
    const { north, south, east, west } = battle.extent;
    expect(Math.min(...ring.map(([lon]) => lon))).toBeLessThan(west);
    expect(Math.max(...ring.map(([lon]) => lon))).toBeGreaterThan(east);
    expect(Math.min(...ring.map(([, lat]) => lat))).toBeLessThan(south);
    expect(Math.max(...ring.map(([, lat]) => lat))).toBeGreaterThan(north);
  });

  it("cuts its contours at ten metres, with no closed ring under eight vertices", () => {
    const levels = contourLevels();
    expect(levels.length).toBeGreaterThan(15);
    for (const [index, level] of levels.entries()) {
      expect(level % 10, `level ${level}`).toBe(0);
      if (index > 0) expect(level - levels[index - 1]!, `level ${level}`).toBe(10);
    }
    for (const feature of featuresOfKind("contour")) {
      for (const line of lines(feature)) {
        expect(samePoint(line[0]!, line.at(-1)!) && line.length < 8, `contour ${feature.properties.elevation}`).toBe(false);
      }
    }
  });

  it("winds the contravallation at the town and the circumvallation at the relief, and closes neither", () => {
    const [contravallation, circumvallation] = featuresOfKind("rampart");
    // Winding is meaning for this kind and no other (schema.md 3.3): the teeth fall on the
    // right of travel, so the line facing the hill runs clockwise round it and the line
    // facing outward runs the other way.
    expect(signedArea(contravallation!)).toBeLessThan(0);
    expect(signedArea(circumvallation!)).toBeGreaterThan(0);
    // The contravallation is the inner ring, so it encloses the smaller ground of the two.
    expect(Math.abs(signedArea(contravallation!))).toBeLessThan(Math.abs(signedArea(circumvallation!)));
    // Disjoint runs where the excavators say the trace is unknown; no ring closed on a guess.
    expect(lines(contravallation!)).toHaveLength(2);
    expect(lines(circumvallation!)).toHaveLength(1);
    for (const feature of [contravallation!, circumvallation!]) {
      for (const run of lines(feature)) expect(samePoint(run[0]!, run.at(-1)!)).toBe(false);
    }
  });

  it("keeps every named thing inside the extent, one point per name", () => {
    const points = [...named("place"), ...named("work")];
    const { north, south, east, west } = battle.extent;
    for (const [name, [lon, lat]] of points) {
      expect(lon, name).toBeGreaterThan(west);
      expect(lon, name).toBeLessThan(east);
      expect(lat, name).toBeGreaterThan(south);
      expect(lat, name).toBeLessThan(north);
    }
    for (const [index, [, one]] of points.entries()) {
      for (const [, other] of points.slice(index + 1)) expect(samePoint(one, other)).toBe(false);
    }
  });
});
