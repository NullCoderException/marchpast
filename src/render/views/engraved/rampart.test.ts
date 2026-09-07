/**
 * The one fact about a rampart that is arithmetic rather than ink: **which
 * side the teeth fall on**. ADR-0026 fixed it as the right of the direction
 * the line is drawn in, because Alesia's lines are not closed rings and there
 * is no inside to derive it from — the author draws a rampart keeping the side
 * it faces on their right, and nothing in the format checks them (schema.md
 * 3.3, 3.6).
 *
 * How thick the line is and how long the teeth are is the view's, judged by
 * eye against the design canvas (#138); what is tested here is the side, in
 * both idioms, because a rampart with its teeth reversed is a lie about what
 * the works faced.
 */
import { describe, expect, it } from "vitest";
import type { Point } from "../../primitives.ts";
import { rampartTeeth } from "./rampart.ts";

/** A unit square in canvas coordinates (y down), given clockwise on the screen. */
const CLOCKWISE: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
  { x: 0, y: 0 },
];
const ANTICLOCKWISE = [...CLOCKWISE].reverse();

/** Whether a tooth's tip fell inside the square it hangs off, rather than out of it. */
const inside = ({ to }: { to: Point }): boolean => to.x > -0.001 && to.x < 100.001 && to.y > -0.001 && to.y < 100.001;

describe("rampartTeeth", () => {
  it("hangs a tooth every `spacing` along the run, each `length` long", () => {
    const teeth = rampartTeeth(CLOCKWISE, 10, 4.5);
    expect(teeth.length).toBe(40);
    for (const { from, to } of teeth) expect(Math.hypot(to.x - from.x, to.y - from.y)).toBeCloseTo(4.5);
  });

  it("puts the teeth on the right of the direction of travel, which is inside a clockwise line", () => {
    const teeth = rampartTeeth(CLOCKWISE, 10, 6);
    expect(teeth.every(inside)).toBe(true);
  });

  it("puts them outside the same line drawn anticlockwise, because the side it faces is the winding", () => {
    const teeth = rampartTeeth(ANTICLOCKWISE, 10, 6);
    expect(teeth.some(inside)).toBe(false);
  });

  it("takes the side from the segment it stands on, so a tooth turns with the line", () => {
    // Due east along the top, so the right hand points due south, down the canvas.
    const [first] = rampartTeeth([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10, 5);
    expect(first?.to.x).toBeCloseTo(first?.from.x ?? 0);
    expect(first?.to.y).toBeCloseTo((first?.from.y ?? 0) + 5);
  });

  it("carries the spacing across a corner rather than restarting at each vertex", () => {
    // Two 100 px legs at 30 px apart: the teeth run 0, 30, 60, 90, 120, 150, 180.
    const teeth = rampartTeeth([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 30, 5);
    expect(teeth.length).toBe(7);
    expect(teeth[4]?.from).toEqual({ x: 100, y: 20 });
  });

  it("hangs nothing off a run too short to stand a tooth on, and nothing off a repeated point", () => {
    expect(rampartTeeth([{ x: 5, y: 5 }], 9, 4.5)).toEqual([]);
    expect(rampartTeeth([{ x: 5, y: 5 }, { x: 5, y: 5 }], 9, 4.5)).toEqual([]);
  });
});
