/**
 * Acceptance checks for the authored battle file `data/battles/trafalgar.json`
 * (issue #25): it validates, and it carries the roster, phases, wind,
 * references and geometry the issue asked for. The validator proves shape;
 * these tests prove the authoring brief was met, so a later edit that drops a
 * quote or a wind entry fails here rather than in the driving dev's review.
 */
import { describe, expect, it } from "vitest";
import trafalgarRaw from "../../data/battles/trafalgar.json?raw";
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

  it("has the three-unit roster, British first, every entry with a commander", () => {
    expect(battle.units.map((unit) => [unit.id, unit.side, unit.commander])).toEqual([
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
