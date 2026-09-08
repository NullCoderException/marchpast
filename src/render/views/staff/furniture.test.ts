/**
 * The wind barb: which feathers each of the five words is drawn with
 * (ADR-0008, #139). The shaft's bearing and the ink are judged by eye; what is
 * held here is the reading — a sheet's barb says the force in feathers, and a
 * force drawn one feather out is a lie about the weather.
 */
import { describe, expect, it } from "vitest";
import type { WindForce } from "../../../schema/types.ts";
import { barbFor } from "./furniture.ts";

const FORCES: readonly WindForce[] = ["calm", "light", "moderate", "fresh", "gale"];

describe("barbFor", () => {
  it("draws calm as the bare ring: no shaft, no feather, no pennant", () => {
    expect(barbFor("calm")).toEqual({ shaft: false, feathers: 0, half: false, pennant: false });
  });

  it("climbs a half barb, a barb and two barbs from it", () => {
    expect(barbFor("light")).toEqual({ shaft: true, feathers: 0, half: true, pennant: false });
    expect(barbFor("moderate")).toEqual({ shaft: true, feathers: 1, half: false, pennant: false });
    expect(barbFor("fresh")).toEqual({ shaft: true, feathers: 2, half: false, pennant: false });
  });

  it("draws a gale as the pennant, which is what four barbs are printed as", () => {
    expect(barbFor("gale")).toEqual({ shaft: true, feathers: 0, half: false, pennant: true });
  });

  it("gives every force a barb, and never two the same", () => {
    const drawn = FORCES.map((force) => JSON.stringify(barbFor(force)));
    expect(drawn).toHaveLength(FORCES.length);
    expect(new Set(drawn).size).toBe(FORCES.length);
  });

  it("never falls back as the force rises: each word is at least the last one's weather", () => {
    const weight = (force: WindForce): number => {
      const barb = barbFor(force);
      return (barb.pennant ? 4 : 0) + barb.feathers + (barb.half ? 0.5 : 0);
    };
    const climbed = FORCES.map(weight);
    expect([...climbed].sort((a, b) => a - b)).toEqual(climbed);
  });
});
