/**
 * Acceptance checks for the authored battle file `data/battles/trafalgar.json`
 * (issue #25): it validates, and it carries the roster, phases, wind,
 * citations and geometry the issue asked for. The validator proves shape;
 * these tests prove the authoring brief was met, so a later edit that drops a
 * quote or a wind entry fails here rather than in the driving dev's review.
 */
import { describe, expect, it } from "vitest";
import trafalgarRaw from "../../data/battles/trafalgar.json?raw";
import { validateBattle } from "../schema/validateBattle.ts";
import { parseBattleTime } from "../schema/time.ts";
import type { Battle, UnitSnapshot } from "../schema/types.ts";

const result = validateBattle(JSON.parse(trafalgarRaw));
const battle: Battle = result.ok ? result.battle : (undefined as never);

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

function snapshot(phaseIndex: number, unitId: string): UnitSnapshot {
  const found = battle.phases[phaseIndex]?.units.find((unit) => unit.id === unitId);
  if (found === undefined) throw new Error(`no snapshot for ${unitId} in phase ${phaseIndex}`);
  return found;
}

describe("data/battles/trafalgar.json", () => {
  it("validates against schema v1", () => {
    expect(result).toMatchObject({ ok: true });
  });

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

  it("cites every phase with at least one verbatim quote, and explains it in notes", () => {
    for (const phase of battle.phases) {
      expect(phase.references.some((reference) => reference.quote !== undefined), phase.id).toBe(true);
      expect(phase.notes, phase.id).toBeTruthy();
    }
  });

  it("lists only public-domain sources, and never the share-alike ones", () => {
    for (const [id, source] of Object.entries(battle.sources)) {
      expect(source.license, id).toBe("public-domain");
      expect(source.url, id).not.toMatch(/wikipedia\.org|Trafalgar_1200hr/);
    }
    for (const id of ["collingwood-dispatch", "nelson-memorandum", "southey", "mahan", "dodd-1805", "rmg-1805", "johnston-1848"]) {
      expect(battle.sources[id], id).toBeDefined();
    }
  });

  it("uses only column and line formations, and keeps every unit inside the extent", () => {
    const { north, south, east, west } = battle.extent;
    for (const phase of battle.phases) {
      for (const unit of phase.units) {
        expect(["column", "line"], `${phase.id}/${unit.id}`).toContain(unit.formation);
        expect(unit.position.lat, `${phase.id}/${unit.id}`).toBeGreaterThan(south);
        expect(unit.position.lat, `${phase.id}/${unit.id}`).toBeLessThan(north);
        expect(unit.position.lon, `${phase.id}/${unit.id}`).toBeGreaterThan(west);
        expect(unit.position.lon, `${phase.id}/${unit.id}`).toBeLessThan(east);
      }
    }
  });

  it("brings the British columns in from the west-north-west and keeps them engaged at full strength to the end", () => {
    for (const id of ["weather-column", "lee-column"]) {
      const snapshots = battle.phases.map((_, index) => snapshot(index, id));
      // Approach: longitude increases phase by phase until the line is broken.
      for (let index = 1; index <= 3; index++) {
        expect(snapshots[index]!.position.lon, `${id} phase ${index}`).toBeGreaterThan(snapshots[index - 1]!.position.lon);
      }
      // Never below full strength, never intact again once engaged.
      for (const [index, unit] of snapshots.entries()) {
        expect(unit.strength ?? 1, `${id} phase ${index}`).toBe(1);
      }
      const firstEngaged = snapshots.findIndex((unit) => unit.state === "engaged");
      expect(firstEngaged, id).toBeGreaterThan(0);
      for (const unit of snapshots.slice(firstEngaged)) expect(unit.state, id).toBe("engaged");
    }
    expect(snapshot(3, "lee-column").state).toBe("engaged");
    expect(snapshot(3, "weather-column").state).toBe("intact");
    expect(snapshot(4, "weather-column").state).toBe("engaged");
  });

  it("gives each British column an intent arrow toward its cut point during the approach", () => {
    for (const index of [1, 2]) {
      for (const id of ["weather-column", "lee-column"]) {
        const unit = snapshot(index, id);
        expect(unit.moves?.some((move) => move.kind === "intent"), `${id} phase ${index}`).toBe(true);
        for (const move of unit.moves ?? []) expect(move.to.lon, `${id} phase ${index}`).toBeGreaterThan(unit.position.lon);
      }
    }
  });

  it("breaks the Combined Fleet, retires the remnant toward Cadiz, and points a detachment arrow to seaward", () => {
    const fleet = battle.phases.map((_, index) => snapshot(index, "combined-fleet"));
    expect(fleet.slice(0, 3).map((unit) => unit.state)).toEqual(["intact", "intact", "intact"]);
    expect(fleet.slice(3, 5).map((unit) => unit.state)).toEqual(["engaged", "engaged"]);
    expect(fleet.slice(5).map((unit) => unit.state)).toEqual(["broken", "broken", "broken"]);
    expect(fleet[5]!.strength).toBeCloseTo(0.6, 1);
    expect(fleet[7]!.strength).toBe(0.33);
    // Wearing from south to north takes one phase; the front then faces the attack from the west.
    expect(fleet[0]!.heading).toBe(180);
    expect(fleet[2]!.formation).toBe("line");
    expect(fleet[2]!.heading).toBeGreaterThanOrEqual(260);
    expect(fleet[2]!.heading).toBeLessThanOrEqual(280);
    // The remnant moves north toward Cadiz from phase 7; Dumanoir's van is drawn as a detachment south-west.
    expect(fleet[6]!.position.lat).toBeGreaterThan(fleet[5]!.position.lat);
    expect(fleet[7]!.position.lat).toBeGreaterThan(fleet[6]!.position.lat);
    for (const unit of fleet.slice(6)) {
      const detachment = unit.moves?.find((move) => move.kind === "detachment");
      expect(detachment).toBeDefined();
      expect(detachment!.to.lat).toBeLessThan(unit.position.lat);
      expect(detachment!.to.lon).toBeLessThan(unit.position.lon);
    }
  });

  it("plays the day in three to four minutes at 1x, the fight slower than the approach", () => {
    let seconds = 0;
    battle.phases.forEach((phase, index) => {
      const nextT = battle.phases[index + 1]?.t ?? battle.end;
      seconds += ((parseBattleTime(nextT) - parseBattleTime(phase.t)) * 60) / phase.playback_rate;
    });
    expect(seconds).toBeGreaterThan(150);
    expect(seconds).toBeLessThan(260);
    const approachRates = battle.phases.slice(0, 3).map((phase) => phase.playback_rate);
    const fightRates = battle.phases.slice(3).map((phase) => phase.playback_rate);
    expect(Math.min(...approachRates)).toBeGreaterThan(Math.max(...fightRates));
  });
});
