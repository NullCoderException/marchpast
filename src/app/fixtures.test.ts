/**
 * A fixture is held to one thing: the schema. It never passes the validator on
 * the way to the plate — the player takes it straight — so this is the only
 * place that stops one drifting out of the shape a battle file has.
 */
import { describe, expect, it } from "vitest";
import { validateBattle } from "../schema/validateBattle.ts";
import { fixtureNameFrom, FIXTURES } from "./fixtures.ts";

describe("every fixture", () => {
  it.each(Object.keys(FIXTURES))("%s validates as a battle file", (name) => {
    const result = validateBattle(FIXTURES[name]);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });
});

describe("the Cannae fixture", () => {
  const battle = FIXTURES["cannae-deployment"];

  it("holds the research note's eight wing-level units, Rome first so the red ink falls on her", () => {
    expect(battle?.units.map((unit) => unit.id)).toEqual([
      "roman-cavalry",
      "roman-infantry",
      "allied-cavalry",
      "hasdrubal-cavalry",
      "libyans-left",
      "spanish-gallic-centre",
      "libyans-right",
      "numidians",
    ]);
    expect(battle?.units[0]?.side).toBe("Roman");
  });

  it("draws the Roman foot as a mass, and horse on both Roman flanks", () => {
    const arms = new Map(battle?.units.map((unit) => [unit.id, unit.arm]));
    expect(arms.get("roman-infantry")).toBe("infantry");
    expect(arms.get("roman-cavalry")).toBe("cavalry");
    expect(arms.get("allied-cavalry")).toBe("cavalry");
    for (const phase of battle?.phases ?? []) {
      expect(phase.units.find((unit) => unit.id === "roman-infantry")?.formation).toBe("mass");
    }
  });

  it("breaks one unit at a fifth, so the knock-out is on the plate to look at", () => {
    const broken = battle?.phases.flatMap((phase) => phase.units).filter((unit) => unit.state === "broken") ?? [];
    expect(broken).toHaveLength(1);
    expect(broken[0]?.strength).toBe(0.2);
  });

  it("keeps the broken unit's heading while its position retires, so its track runs behind it", () => {
    const [deployment, clash] = battle?.phases ?? [];
    const at = (phase: typeof deployment, id: string): { lat: number; lon: number } | undefined =>
      phase?.units.find((unit) => unit.id === id)?.position;
    const heading = (phase: typeof deployment, id: string): number | undefined =>
      phase?.units.find((unit) => unit.id === id)?.heading;

    expect(heading(deployment, "roman-cavalry")).toBe(heading(clash, "roman-cavalry"));
    // Facing south-south-west, and going north-west: the tween runs out behind the front.
    expect(heading(clash, "roman-cavalry")).toBe(200);
    expect(at(clash, "roman-cavalry")?.lat).toBeGreaterThan(at(deployment, "roman-cavalry")?.lat ?? 0);
  });

  it("blows the wind from the south-east in every phase, so the dust reads as Livy's Volturnus", () => {
    for (const phase of battle?.phases ?? []) expect(phase.wind).toEqual({ from: 135, force: "fresh" });
  });
});

describe("fixtureNameFrom", () => {
  it("reads the fixture the URL names", () => {
    expect(fixtureNameFrom("?fixture=cannae-deployment")).toBe("cannae-deployment");
    expect(fixtureNameFrom("?battle=trafalgar&fixture=cannae-deployment")).toBe("cannae-deployment");
  });

  it("answers nothing when the URL names none, so the ordinary battle path runs", () => {
    expect(fixtureNameFrom("")).toBeUndefined();
    expect(fixtureNameFrom("?battle=trafalgar")).toBeUndefined();
    expect(fixtureNameFrom("?fixture=")).toBeUndefined();
    expect(fixtureNameFrom("?fixture=%20%20")).toBeUndefined();
  });
});
