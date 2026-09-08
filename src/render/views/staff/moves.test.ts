/**
 * The taper's geometry: the one part of the staff map's moves that is
 * arithmetic rather than ink (#139). What the arrow *looks* like is judged by
 * eye against the design canvas; what is held here is that it is **sized to
 * its own run**, which is the finding the hand was cut for — a short move drawn
 * at a long move's head is all head and no shaft, and swamps the unit it
 * belongs to.
 */
import { describe, expect, it } from "vitest";
import type { Point } from "../../primitives.ts";
import { STAFF_PENS } from "./palette.ts";
import { STAFF_TAPERS, taperPolygon } from "./moves.ts";

const FROM: Point = { x: 0, y: 0 };
/** Due east, so the polygon's half-widths read straight off the y axis and its run off the x. */
const east = (run: number): Point => ({ x: run, y: 0 });

/** The half-widths and the head's length, read back off a polygon drawn due east. */
function dimensions(
  run: number,
  taper = STAFF_TAPERS.intent,
  headHalf = STAFF_PENS.intent.headSize,
): { tail: number; shoulder: number; head: number; headLength: number } {
  const [tailCorner, shoulderCorner, headCorner, point] = taperPolygon(FROM, east(run), taper, headHalf) as Point[];
  return {
    tail: tailCorner!.y,
    shoulder: shoulderCorner!.y,
    head: headCorner!.y,
    headLength: point!.x - headCorner!.x,
  };
}

describe("taperPolygon", () => {
  it("closes seven points: the tail, the shoulder, the head's barbs and the point", () => {
    const points = taperPolygon(FROM, east(200), STAFF_TAPERS.intent, STAFF_PENS.intent.headSize);
    expect(points).toHaveLength(7);
    // The point is on the line the arrow runs along, and the tail's two corners straddle it.
    expect(points[3]).toEqual({ x: 200, y: 0 });
    expect(points[0]!.y).toBeCloseTo(-points[6]!.y, 10);
  });

  it("takes the head's half-width from the pen, which is the one value it shares with the other views' arrows", () => {
    expect(dimensions(200).head).toBe(STAFF_PENS.intent.headSize);
    expect(dimensions(200, STAFF_TAPERS.detachment, STAFF_PENS.detachment.headSize).head).toBe(STAFF_PENS.detachment.headSize);
  });

  it("draws its full dimensions at the run they were set for and above", () => {
    // At 150 px and beyond the scale is 1, so the dimensions are the table's
    // own and the head is nowhere near 45% of the run.
    expect(dimensions(150)).toEqual({ tail: 3, shoulder: 9, head: 17, headLength: 26 });
    expect(dimensions(400)).toEqual({ tail: 3, shoulder: 9, head: 17, headLength: 26 });
  });

  it("halves them for a short run, and never thins below that floor", () => {
    // 60 px is 0.4 of the full run, which the floor lifts to 0.5.
    expect(dimensions(60)).toEqual({ tail: 1.5, shoulder: 4.5, head: 8.5, headLength: 13 });
    expect(dimensions(20)).toMatchObject({ tail: 1.5, shoulder: 4.5, head: 8.5 });
  });

  it("caps the head at 45% of the run, however short", () => {
    // 20 px at half scale wants a 13 px head, which is two thirds of the move.
    expect(dimensions(20).headLength).toBeCloseTo(9, 10);
    for (const run of [10, 20, 30, 60, 150, 400]) {
      expect(dimensions(run).headLength).toBeLessThanOrEqual(run * 0.45 + 1e-9);
    }
  });

  it("draws a detachment broader than an intent at every run", () => {
    for (const run of [30, 150, 400]) {
      const intent = dimensions(run, STAFF_TAPERS.intent, STAFF_PENS.intent.headSize);
      const detachment = dimensions(run, STAFF_TAPERS.detachment, STAFF_PENS.detachment.headSize);
      expect(detachment.tail).toBeGreaterThan(intent.tail);
      expect(detachment.shoulder).toBeGreaterThan(intent.shoulder);
      expect(detachment.head).toBeGreaterThan(intent.head);
    }
  });

  it("draws nothing at all for a move that goes nowhere, which names no direction", () => {
    expect(taperPolygon(FROM, { x: 0, y: 0 }, STAFF_TAPERS.intent, STAFF_PENS.intent.headSize)).toEqual([]);
  });
});
