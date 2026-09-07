/**
 * The still phase rule (ADR-0025): the phase a battle marks, or the metric
 * fallback. One rule, shared by the build that renders the still and by the
 * four shipped files' acceptance checks below.
 */
import { describe, expect, it } from "vitest";
import cannaeRaw from "../../data/battles/cannae.json?raw";
import copenhagenRaw from "../../data/battles/copenhagen.json?raw";
import nileRaw from "../../data/battles/nile.json?raw";
import trafalgarRaw from "../../data/battles/trafalgar.json?raw";
import { MINIMAL_BATTLE } from "./examples.ts";
import { stillPhase } from "./stillPhase.ts";
import type { Battle } from "./types.ts";
import { validateBattle } from "./validateBattle.ts";

/** The minimal example as a fresh deep copy, so a test can mark and re-state it freely. */
function battle(): Battle {
  return structuredClone(MINIMAL_BATTLE);
}

/** Sets every unit's state in phase `index`, by roster id; anything unnamed is left `intact`. */
function engage(b: Battle, index: number, ...ids: string[]): void {
  for (const snapshot of b.phases[index]!.units) snapshot.state = ids.includes(snapshot.id) ? "engaged" : "intact";
}

/** A shipped battle file, validated, so these tests read the same value the build will. */
function shipped(name: string, raw: string): Battle {
  const result = validateBattle(JSON.parse(raw));
  if (!result.ok) throw new Error(`${name}.json does not validate:\n${JSON.stringify(result.errors, null, 2)}`);
  return result.battle;
}

describe("stillPhase: the phase the battle marks", () => {
  it("takes the marked phase even when the metric would pick another", () => {
    const b = battle();
    b.phases[0]!.still = true;
    expect(stillPhase(b).id).toBe("dawn-sighting");
  });

  it("takes the marked phase wherever it sits", () => {
    const b = battle();
    b.phases[1]!.still = true;
    expect(stillPhase(b).id).toBe("melee");
  });
});

describe("stillPhase: the fallback", () => {
  it("takes the earliest phase at the battle's engaged maximum", () => {
    expect(stillPhase(battle()).id).toBe("melee");
  });

  it("breaks a tie on the earliest phase, because a battle that has not chosen has expressed no preference", () => {
    const b = battle();
    engage(b, 0, "weather-column");
    engage(b, 1, "lee-column");
    expect(stillPhase(b).id).toBe("dawn-sighting");
  });

  it("counts engaged over the whole roster rather than any drawn level", () => {
    const b = battle();
    // Level 0 draws the two columns and the fleet, so it sees one engaged unit
    // here and two in the melee; the whole roster sees three and two.
    engage(b, 0, "weather-van", "lee-van", "combined-fleet");
    engage(b, 1, "weather-column", "lee-column");
    expect(stillPhase(b).id).toBe("dawn-sighting");
  });

  it("takes the first phase of a battle with nothing engaged anywhere", () => {
    const b = battle();
    engage(b, 0);
    engage(b, 1);
    expect(stillPhase(b).id).toBe("dawn-sighting");
  });
});

describe("stillPhase: the four shipped battles", () => {
  it.each([
    ["cannae", cannaeRaw, "centre-gives-ground"],
    ["copenhagen", copenhagenRaw, "battle-general"],
    ["nile", nileRaw, "orient-explodes"],
    ["trafalgar", trafalgarRaw, "weather-column-breaks"],
  ])("%s marks the phase ADR-0025 names", (name, raw, id) => {
    expect(stillPhase(shipped(name, raw)).id).toBe(id);
  });
});
