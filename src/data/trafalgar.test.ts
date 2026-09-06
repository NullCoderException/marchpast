/**
 * Acceptance checks for the authored battle file `data/battles/trafalgar.json`
 * (issues #25 and #87): it validates, and it carries the roster, phases, wind,
 * references and geometry the issues asked for. The validator proves shape;
 * these tests prove the authoring brief was met, so a later edit that drops a
 * quote or a wind entry fails here rather than in the driving dev's review.
 *
 * #87 grew the file in place to a second level, so the squadron block below
 * also pins what "played at Columns it is indistinguishable from v0.1" means:
 * the three columns' own pictures are frozen here, and the squadrons are only
 * ever added beneath them.
 */
import { describe, expect, it } from "vitest";
import trafalgarRaw from "../../data/battles/trafalgar.json?raw";
import { unitsAtLevel } from "../schema/hierarchy.ts";
import { validateBattle } from "../schema/validateBattle.ts";
import type { Battle, UnitSnapshot } from "../schema/types.ts";
import { wallDuration } from "../timeline/intervals.ts";

const result = validateBattle(JSON.parse(trafalgarRaw));
if (!result.ok) throw new Error(`trafalgar.json does not validate:\n${JSON.stringify(result.errors, null, 2)}`);
const battle: Battle = result.battle;

/** The eight phases the issue specified, in order, with their battle-clock times. */
const PHASES: ReadonlyArray<readonly [id: string, t: string]> = [
  ["dawn-sighting", "05:40"],
  ["bear-up-and-wear", "06:40"],
  ["slow-approach", "10:00"],
  ["lee-column-breaks", "12:00"],
  ["weather-column-breaks", "12:30"],
  ["melee", "13:30"],
  ["van-counterattack-and-retreat", "15:00"],
  ["last-shots", "16:45"],
];

/** The three columns, which are the roster's roots and the only units drawn at level 0. */
const COLUMNS = ["weather-column", "lee-column", "combined-fleet"] as const;

/** The eight squadrons #87 authored, each with the column it hangs from. */
const SQUADRONS: ReadonlyArray<readonly [id: string, parent: string]> = [
  ["weather-van", "weather-column"],
  ["weather-rear", "weather-column"],
  ["lee-van", "lee-column"],
  ["lee-rear", "lee-column"],
  ["combined-van", "combined-fleet"],
  ["combined-centre", "combined-fleet"],
  ["combined-rear", "combined-fleet"],
  ["observation-squadron", "combined-fleet"],
];

/**
 * The v0.1 picture of the three columns, `[lat, lon, heading]` per phase in
 * phase order. #87 forbids touching it: a squadron level is added beneath the
 * columns, never derived from them and never allowed to move them.
 */
const COLUMN_PICTURE: ReadonlyArray<ReadonlyArray<readonly [number, number, number]>> = [
  [[36.26, -6.47, 45], [36.235, -6.44, 45], [36.22, -6.29, 180]],
  [[36.275, -6.455, 75], [36.25, -6.425, 90], [36.225, -6.265, 5]],
  [[36.285, -6.35, 65], [36.235, -6.31, 90], [36.24, -6.225, 275]],
  [[36.275, -6.275, 65], [36.235, -6.236, 90], [36.25, -6.2, 275]],
  [[36.27, -6.255, 80], [36.23, -6.215, 90], [36.25, -6.197, 275]],
  [[36.265, -6.21, 90], [36.228, -6.2, 90], [36.245, -6.19, 275]],
  [[36.27, -6.2, 0], [36.225, -6.195, 90], [36.285, -6.175, 5]],
  [[36.275, -6.19, 0], [36.22, -6.19, 90], [36.345, -6.185, 340]],
];

/** The share-alike works the issue forbids as sources: the Wikipedia order of battle and the Commons `Trafalgar 1200hr.svg` diagram. */
const SHARE_ALIKE_WORKS = /wikipedia\.org|Trafalgar_1200hr/;

/** Index of the phase with this id in `battle.phases`; throws so a typo fails loudly rather than reading phase 0. */
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

describe("data/battles/trafalgar.json", () => {
  it("plays over the cadiz map, in nautical miles, ending at 17:30 under CC BY 4.0", () => {
    expect(battle.map).toBe("cadiz");
    expect(battle.scale_unit).toBe("nmi");
    expect(battle.end).toBe("17:30");
    expect(battle.license).toBe("CC-BY-4.0");
    expect(battle.attribution).toContain("CC BY 4.0");
  });

  it("has the three columns, British first, every one with a commander", () => {
    const columns = battle.units.filter((unit) => unit.parent === undefined);
    expect(columns.map((unit) => [unit.id, unit.side, unit.commander])).toEqual([
      ["weather-column", "British", "Nelson"],
      ["lee-column", "British", "Collingwood"],
      ["combined-fleet", "Combined Fleet", "Villeneuve"],
    ]);
  });

  it("has the eight phases at the researched times", () => {
    expect(battle.phases.map((phase) => [phase.id, phase.t])).toEqual(PHASES);
  });

  it("carries a light west-north-west wind on every phase", () => {
    for (const phase of battle.phases) expect(phase.wind, phase.id).toEqual({ from: 292.5, force: "light" });
  });

  it("references every phase with at least one verbatim quote, and explains it in notes", () => {
    for (const phase of battle.phases) {
      expect(phase.references.some((reference) => reference.quote !== undefined), phase.id).toBe(true);
      expect(phase.notes, phase.id).toBeTruthy();
    }
  });

  it("lists only public-domain sources, and never the share-alike ones", () => {
    for (const [id, source] of Object.entries(battle.sources)) {
      expect(source.license, id).toBe("public-domain");
      expect(source.url, id).not.toMatch(SHARE_ALIKE_WORKS);
    }
    for (const id of ["collingwood-dispatch", "nelson-memorandum", "southey", "mahan", "dodd-1805", "rmg-1805", "johnston-1848"]) {
      expect(battle.sources[id], id).toBeDefined();
    }
  });

  it("uses only column and line formations, and keeps every unit inside the extent", () => {
    const { north, south, east, west } = battle.extent;
    for (const phase of battle.phases) {
      for (const unit of phase.units) {
        const where = `${phase.id}/${unit.id}`;
        expect(["column", "line"], where).toContain(unit.formation);
        expect(unit.position.lat, where).toBeGreaterThan(south);
        expect(unit.position.lat, where).toBeLessThan(north);
        expect(unit.position.lon, where).toBeGreaterThan(west);
        expect(unit.position.lon, where).toBeLessThan(east);
      }
    }
  });

  it("brings the British columns in from the west-north-west and keeps them engaged at full strength to the end", () => {
    for (const id of ["weather-column", "lee-column"]) {
      const column = snapshots(id);
      // Approach: longitude increases phase by phase until the line is broken.
      for (let index = 1; index <= phaseIndex("lee-column-breaks"); index++) {
        expect(column[index]!.position.lon, `${id} phase ${index}`).toBeGreaterThan(column[index - 1]!.position.lon);
      }
      // Never below full strength, never intact again once engaged.
      for (const [index, unit] of column.entries()) expect(unit.strength ?? 1, `${id} phase ${index}`).toBe(1);
      const firstEngaged = column.findIndex((unit) => unit.state === "engaged");
      expect(firstEngaged, id).toBeGreaterThan(0);
      for (const unit of column.slice(firstEngaged)) expect(unit.state, id).toBe("engaged");
    }
    expect(snapshot("lee-column-breaks", "lee-column").state).toBe("engaged");
    expect(snapshot("lee-column-breaks", "weather-column").state).toBe("intact");
    expect(snapshot("weather-column-breaks", "weather-column").state).toBe("engaged");
  });

  it("gives each British column an intent move toward its cut point during the approach", () => {
    for (const phaseId of ["bear-up-and-wear", "slow-approach"]) {
      for (const id of ["weather-column", "lee-column"]) {
        const unit = snapshot(phaseId, id);
        expect(unit.moves?.some((move) => move.kind === "intent"), `${id} ${phaseId}`).toBe(true);
        for (const move of unit.moves ?? []) expect(move.to.lon, `${id} ${phaseId}`).toBeGreaterThan(unit.position.lon);
      }
    }
  });

  it("breaks the Combined Fleet, retires the remnant toward Cadiz, and points a detachment move to seaward", () => {
    const fleet = snapshots("combined-fleet");
    expect(fleet.map((unit) => unit.state)).toEqual([
      "intact", "intact", "intact", "engaged", "engaged", "broken", "broken", "broken",
    ]);
    expect(snapshot("melee", "combined-fleet").strength).toBeCloseTo(0.6, 1);
    expect(snapshot("last-shots", "combined-fleet").strength).toBe(0.33);
    // Wearing from south to north takes one phase; the front then faces the attack from the west.
    expect(snapshot("dawn-sighting", "combined-fleet").heading).toBe(180);
    const crescent = snapshot("slow-approach", "combined-fleet");
    expect(crescent.formation).toBe("line");
    expect(crescent.heading).toBeGreaterThanOrEqual(260);
    expect(crescent.heading).toBeLessThanOrEqual(280);
    // The remnant moves north toward Cadiz from phase 7; Dumanoir's van is drawn as a detachment south-west.
    const retreat = phaseIndex("van-counterattack-and-retreat");
    expect(fleet[retreat]!.position.lat).toBeGreaterThan(fleet[retreat - 1]!.position.lat);
    expect(fleet[retreat + 1]!.position.lat).toBeGreaterThan(fleet[retreat]!.position.lat);
    for (const unit of fleet.slice(retreat)) {
      const detachment = unit.moves?.find((move) => move.kind === "detachment");
      expect(detachment).toBeDefined();
      expect(detachment!.to.lat).toBeLessThan(unit.position.lat);
      expect(detachment!.to.lon).toBeLessThan(unit.position.lon);
    }
  });

  it("plays the day in three to four minutes at 1x, the fight slower than the approach", () => {
    const seconds = wallDuration(battle).total;
    expect(seconds).toBeGreaterThan(150);
    expect(seconds).toBeLessThan(260);
    const firstFight = phaseIndex("lee-column-breaks");
    const approachRates = battle.phases.slice(0, firstFight).map((phase) => phase.playback_rate);
    const fightRates = battle.phases.slice(firstFight).map((phase) => phase.playback_rate);
    expect(Math.min(...approachRates)).toBeGreaterThan(Math.max(...fightRates));
  });
});

describe("data/battles/trafalgar.json at squadron level", () => {
  it("names two levels and draws three columns then eight squadrons, never more than nine on the plate", () => {
    expect(battle.levels).toEqual(["Columns", "Squadrons"]);
    expect(unitsAtLevel(battle.units, 0).map((unit) => unit.id)).toEqual([...COLUMNS]);
    expect(unitsAtLevel(battle.units, 1).map((unit) => unit.id)).toEqual(SQUADRONS.map(([id]) => id));
    for (const level of battle.levels!.keys()) expect(unitsAtLevel(battle.units, level).length).toBeLessThanOrEqual(9);
  });

  it("lists each column immediately before its own squadrons, British first", () => {
    expect(battle.units.map((unit) => [unit.id, unit.parent])).toEqual([
      ["weather-column", undefined],
      ["weather-van", "weather-column"],
      ["weather-rear", "weather-column"],
      ["lee-column", undefined],
      ["lee-van", "lee-column"],
      ["lee-rear", "lee-column"],
      ["combined-fleet", undefined],
      ["combined-van", "combined-fleet"],
      ["combined-centre", "combined-fleet"],
      ["combined-rear", "combined-fleet"],
      ["observation-squadron", "combined-fleet"],
    ]);
    for (const unit of battle.units) expect(unit.arm, unit.id).toBe("ship");
  });

  it("gives every unit a short label, distinct within the level it is drawn at", () => {
    for (const unit of battle.units) expect(unit.short_label, unit.id).toBeTruthy();
    for (const level of battle.levels!.keys()) {
      const shortLabels = unitsAtLevel(battle.units, level).map((unit) => unit.short_label);
      expect(new Set(shortLabels).size, `level ${level}`).toBe(shortLabels.length);
    }
  });

  it("leaves the three columns' v0.1 picture untouched", () => {
    for (const [index, phase] of battle.phases.entries()) {
      const picture = COLUMNS.map((id) => {
        const unit = snapshot(phase.id, id);
        return [unit.position.lat, unit.position.lon, unit.heading];
      });
      expect(picture, phase.id).toEqual(COLUMN_PICTURE[index]);
    }
  });

  it("keeps every squadron on its parent's side, in every phase, at a strength the schema allows", () => {
    const sides = new Map(battle.units.map((unit) => [unit.id, unit.side]));
    for (const [id, parent] of SQUADRONS) {
      expect(sides.get(id), id).toBe(sides.get(parent));
      const squadron = snapshots(id);
      expect(squadron.length, id).toBe(PHASES.length);
      for (const [index, unit] of squadron.entries()) {
        const strength = unit.strength ?? 1;
        expect(strength, `${id} phase ${index}`).toBeGreaterThanOrEqual(0);
        expect(strength, `${id} phase ${index}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("advances each British column as a van half ahead of its rear half, both at full strength", () => {
    for (const [van, rear] of [["weather-van", "weather-rear"], ["lee-van", "lee-rear"]]) {
      for (const phase of battle.phases) {
        expect(snapshot(phase.id, van!).position.lon, `${van} ${phase.id}`).toBeGreaterThan(
          snapshot(phase.id, rear!).position.lon,
        );
      }
      for (const id of [van!, rear!]) {
        for (const [index, unit] of snapshots(id).entries()) expect(unit.strength ?? 1, `${id} phase ${index}`).toBe(1);
      }
    }
    // The lee column's van cuts the line first; every other half is still out of the action at noon.
    expect(snapshot("lee-column-breaks", "lee-van").state).toBe("engaged");
    for (const id of ["lee-rear", "weather-van", "weather-rear"]) {
      expect(snapshot("lee-column-breaks", id).state, id).toBe("intact");
    }
    // Mahan's two ships of Nelson's column "as yet not engaged" arrive in the melee.
    expect(snapshot("weather-column-breaks", "weather-rear").state).toBe("intact");
    expect(snapshot("melee", "weather-rear").state).toBe("engaged");
  });

  it("holds Dumanoir's van intact until it wears, then hands it the detachment to seaward", () => {
    const van = snapshots("combined-van");
    expect(van.slice(0, phaseIndex("van-counterattack-and-retreat")).map((unit) => unit.state)).toEqual(
      ["intact", "intact", "intact", "intact", "intact", "intact"],
    );
    // Standing on north out of the action from noon: its own heading and formation, not the line's.
    for (const phaseId of ["lee-column-breaks", "weather-column-breaks"]) {
      expect(snapshot(phaseId, "combined-van").formation, phaseId).toBe("column");
      expect(snapshot(phaseId, "combined-van").heading, phaseId).toBe(5);
    }
    expect(snapshot("melee", "combined-van").position.lat).toBeGreaterThan(
      snapshot("weather-column-breaks", "combined-van").position.lat,
    );
    // It wears at 15:00 and takes over the detachment; the parent keeps its own arrow.
    for (const phaseId of ["van-counterattack-and-retreat", "last-shots"]) {
      const unit = snapshot(phaseId, "combined-van");
      expect(unit.state, phaseId).toBe("broken");
      expect(unit.heading, phaseId).toBeGreaterThan(180);
      expect(unit.heading, phaseId).toBeLessThan(270);
      const detachment = unit.moves?.find((move) => move.kind === "detachment");
      expect(detachment, phaseId).toBeDefined();
      expect(detachment!.to.lat, phaseId).toBeLessThan(unit.position.lat);
      expect(detachment!.to.lon, phaseId).toBeLessThan(unit.position.lon);
    }
    // No other squadron carries a move: the arrow belongs to the unit the four ships leave.
    for (const [id] of SQUADRONS.filter(([id]) => id !== "combined-van")) {
      for (const phase of battle.phases) {
        expect(snapshot(phase.id, id).moves?.some((move) => move.kind === "detachment") ?? false, `${id} ${phase.id}`).toBe(false);
      }
    }
  });

  it("breaks the Combined Fleet's rear before its centre and destroys both", () => {
    expect(snapshots("combined-rear").map((unit) => unit.state)).toEqual([
      "intact", "intact", "intact", "engaged", "broken", "broken", "broken", "destroyed",
    ]);
    expect(snapshots("combined-centre").map((unit) => unit.state)).toEqual([
      "intact", "intact", "intact", "engaged", "engaged", "broken", "broken", "destroyed",
    ]);
    // Strength only ever falls, and both squadrons end with nothing fighting as part of them.
    for (const id of ["combined-rear", "combined-centre"]) {
      const strengths = snapshots(id).map((unit) => unit.strength ?? 1);
      for (let index = 1; index < strengths.length; index++) {
        expect(strengths[index]!, `${id} phase ${index}`).toBeLessThanOrEqual(strengths[index - 1]!);
      }
      expect(strengths.at(-1), id).toBe(0);
    }
  });

  it("keeps Gravina's squadron in the southern horn, then retires it toward Cadiz, low but never destroyed", () => {
    const gravina = snapshots("observation-squadron");
    expect(gravina.map((unit) => unit.state)).toEqual([
      "intact", "intact", "intact", "intact", "engaged", "engaged", "engaged", "broken",
    ]);
    // Rearmost of the line all morning, so south of every other Combined Fleet squadron.
    for (const phase of battle.phases.slice(0, phaseIndex("van-counterattack-and-retreat"))) {
      for (const id of ["combined-van", "combined-centre", "combined-rear"]) {
        expect(snapshot(phase.id, "observation-squadron").position.lat, `${id} ${phase.id}`).toBeLessThan(
          snapshot(phase.id, id).position.lat,
        );
      }
    }
    // Then north for Cadiz, ending low.
    const retreat = phaseIndex("van-counterattack-and-retreat");
    expect(gravina[retreat]!.position.lat).toBeGreaterThan(gravina[retreat - 1]!.position.lat);
    expect(gravina[retreat + 1]!.position.lat).toBeGreaterThan(gravina[retreat]!.position.lat);
    expect(gravina.at(-1)!.strength).toBeLessThanOrEqual(0.5);
    expect(gravina.at(-1)!.strength).toBeGreaterThan(0);
  });

  it("says in every phase's notes how that phase's squadron positions were constructed", () => {
    for (const phase of battle.phases) expect(phase.notes, phase.id).toContain("Squadrons:");
  });
});
