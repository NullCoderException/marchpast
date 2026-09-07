/**
 * The sweep: a synthetic melee played end to end at 60fps, which is the only
 * way the sticky search can be judged at all — every other test here looks at
 * one frame, and what #39 was about was what happens between them.
 *
 * Sixteen units converge from two lines, turn as they close, and half of them
 * come to grips with a wind blowing their smoke across the field. What must
 * hold over every frame of that: no label overlapping another label, a glyph,
 * the furniture or the plate's edge. At twelve units the stronger claim holds
 * too — nothing is ever dropped below step 1, so every unit keeps its name and
 * its state word all the way through.
 */
import { describe, expect, it } from "vitest";
import type { Measure } from "./content.ts";
import { glyphBox, insidePlate, type LabelUnit, overlapArea } from "./geometry.ts";
import { type LabelMemory, NO_LABEL_MEMORY, type Placed, placeLabels } from "./place.ts";
import type { Rect } from "../projection.ts";

/** Square pixels of overlap the collapse could not clear: what the sweep holds to zero. */
function residualOverlap(placed: readonly Placed[], hard: readonly Rect[]): number {
  let total = 0;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a !== undefined && b !== undefined) total += overlapArea(a.box, b.box);
    }
  }
  for (const label of placed) for (const box of hard) total += overlapArea(label.box, box);
  return total;
}

/** The plate a 1200x700 canvas leaves once the caption band and the margin are off it. */
const PLATE: Rect = { x: 20, y: 20, width: 1160, height: 620 };

/** The furniture, in the corners it always takes: rose and wind sentence, title, legend, scale bar, credit. */
const FURNITURE: Rect[] = [
  { x: 46, y: 48, width: 232, height: 96 },
  { x: 900, y: 38, width: 258, height: 34 },
  { x: 46, y: 372, width: 168, height: 212 },
  { x: 46, y: 596, width: 148, height: 30 },
  { x: 962, y: 604, width: 196, height: 22 },
];

/** A measurer with no canvas, near enough to the plate face's widths to be worth measuring against. */
const measure: Measure = (text, size, italic) => text.length * size * (italic ? 0.47 : 0.5);

const SIDES = ["British", "Combined"] as const;
const NAMES = [
  "Weather column",
  "Lee column",
  "Van squadron",
  "Centre squadron",
  "Rear squadron",
  "Observation squadron",
  "Advanced division",
  "Reserve division",
];
const SHORT = ["Weather", "Lee", "Van", "Centre", "Rear", "Observation", "Advanced", "Reserve"];

/** Sixteen units, eight a side, facing each other across the plate. */
function roster(): LabelUnit[] {
  const units: LabelUnit[] = [];
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 8; i++) {
      const index = side * 8 + i;
      units.push({
        id: `${SIDES[side]}-${i}`,
        rosterIndex: index,
        name: `${NAMES[i] ?? "Squadron"} (${SIDES[side]})`,
        shortLabel: SHORT[i],
        state: "intact",
        strength: 1,
        colour: side === 0 ? "#8c2f24" : "#2c4f7c",
        anchor: { x: 0, y: 0 },
        heading: side === 0 ? 90 : 270,
        formation: "line",
        length: 64,
        halfWidth: 2.6,
        hasMove: false,
      });
    }
  }
  return units;
}

/**
 * The fixture at a moment, `t` running 0 to 1: the two lines close, every unit
 * turns forty-five degrees as it comes on, and from halfway the leading four a
 * side are engaged and losing strength with the smoke blowing across them.
 */
function frame(units: readonly LabelUnit[], t: number): LabelUnit[] {
  return units.map((unit) => {
    const side = unit.rosterIndex < 8 ? 0 : 1;
    const i = unit.rosterIndex % 8;
    const from = side === 0 ? 250 : 950;
    const to = side === 0 ? 500 : 700;
    const fighting = t > 0.5 && i < 4;
    const next: LabelUnit = {
      ...unit,
      anchor: { x: from + (to - from) * t, y: 96 + i * 66 + (side === 0 ? 0 : 33) },
      heading: (unit.heading + (side === 0 ? 45 : -45) * t + 360) % 360,
      state: fighting ? "engaged" : "intact",
      strength: fighting ? 1 - (t - 0.5) * 0.7 : 1,
      hasMove: i === 0,
      // The wind blows to the south-east; what a unit is handed is that
      // bearing seen from its own heading, exactly as the glyph is.
      windTo: (((135 - unit.heading) % 360) + 360) % 360 * (Math.PI / 180),
    };
    return next;
  });
}

/** Plays the fixture at 60fps and returns what every frame's labels did. */
function sweep(units: readonly LabelUnit[], frames: number) {
  let memory: LabelMemory = NO_LABEL_MEMORY;
  let overlap = 0;
  let offPlate = 0;
  let deepest = 0;
  /** Label-frames at each step of the collapse order, so a fixture that never crowds shows itself. */
  const steps = [0, 0, 0, 0, 0];
  /** Label-frames where the slot changed: what the stickiness is there to keep down. */
  let moved = 0;

  for (let f = 0; f < frames; f++) {
    const now = frame(units, f / (frames - 1));
    const hard = [...FURNITURE, ...now.map(glyphBox)];
    const { placed, memory: after } = placeLabels({ units: now, plate: PLATE, obstacles: FURNITURE, measure, memory });

    overlap += residualOverlap(placed, hard);
    for (const label of placed) {
      if (!insidePlate(label.box, PLATE)) offPlate++;
      deepest = Math.max(deepest, label.step);
      steps[label.step] = (steps[label.step] ?? 0) + 1;
      if (f > 0 && after.get(label.unit.id)?.clean === 0) moved++;
    }
    memory = after;
  }
  return { overlap, offPlate, deepest, steps, moved, labelFrames: frames * units.length };
}

/** Six seconds of playback: long enough for a label to earn a collapse step back twice over. */
const FRAMES = 360;

describe("the sweep", () => {
  it("holds sixteen units with no label overlapping anything hard", () => {
    const { overlap, offPlate } = sweep(roster(), FRAMES);
    expect(overlap).toBe(0);
    expect(offPlate).toBe(0);
  });

  it("crowds sixteen units hard enough to be worth sweeping", () => {
    // Guards the two claims above: a fixture nothing ever collapses in, or one
    // where every label is thrown about every frame, would prove neither.
    const { steps, moved, labelFrames } = sweep(roster(), FRAMES);
    expect(steps.slice(1).reduce((a, b) => a + b, 0)).toBeGreaterThan(labelFrames * 0.05);
    expect(moved / labelFrames).toBeLessThan(0.1);
  });

  it("keeps every one of twelve units' names and state words, dropping nothing below step 1", () => {
    const { overlap, offPlate, deepest } = sweep(roster().slice(0, 12), FRAMES);
    expect(overlap).toBe(0);
    expect(offPlate).toBe(0);
    expect(deepest).toBeLessThanOrEqual(1);
  });
});
