/**
 * The graticule's line set for an extent: which pitch a plate is gridded at,
 * how many lines that leaves, and what each carries.
 *
 * A map file holds no grid (ADR-0012), so the squares are chosen from the
 * scale alone — which makes this arithmetic rather than ink, and the one part
 * of the staff map's ground a test can hold. What the slate looks like over
 * the steps is judged by eye against the design canvas.
 */
import { describe, expect, it } from "vitest";
import type { Rect } from "../../projection.ts";
import { graticule } from "./graticule.ts";

/** A 1080 × 520 plate, which is the extent the boards were drawn at. */
const PLATE: Rect = { x: 20, y: 20, width: 1080, height: 520 };

/** The metres a pixel covers when `across` kilometres fill the plate's width. */
const forWidth = (across: number): number => (across * 1000) / PLATE.width;

describe("graticule", () => {
  it("cuts a seventy-kilometre extent at ten kilometres", () => {
    // Trafalgar's: 70 km at 1 km would be seventy lines, at 5 km fourteen, at
    // 10 km seven — the smallest round pitch that stays under the cap.
    expect(graticule(PLATE, forWidth(70)).kilometres).toBe(10);
  });

  it("cuts a ten-kilometre extent at one, and an ocean at a hundred", () => {
    // Cannae's, and Midway's.
    expect(graticule(PLATE, forWidth(10)).kilometres).toBe(1);
    expect(graticule(PLATE, forWidth(900)).kilometres).toBe(100);
  });

  it("never leaves more than twelve lines across the plate", () => {
    for (const across of [3, 8, 10, 25, 70, 140, 400, 900, 3000]) {
      expect(graticule(PLATE, forWidth(across)).columns.length).toBeLessThanOrEqual(12);
    }
  });

  it("stands its lines a pitch apart, starting a pitch in from the frame's own edges", () => {
    const grid = graticule(PLATE, forWidth(70));
    const pitch = (grid.kilometres * 1000) / forWidth(70);
    expect(grid.columns[0]?.at).toBeCloseTo(PLATE.x + pitch, 9);
    expect(grid.columns[1]!.at - grid.columns[0]!.at).toBeCloseTo(pitch, 9);
    // The last line falls inside the frame, never on its neat line.
    expect(grid.columns[grid.columns.length - 1]!.at).toBeLessThan(PLATE.x + PLATE.width);
  });

  it("numbers a line by its own distance from the extent's corner, east and north", () => {
    const grid = graticule(PLATE, forWidth(70));
    expect(grid.columns.map((line) => line.label)).toEqual(["10", "20", "30", "40", "50", "60"]);
    // The rows count north, so the first one is a pitch up from the foot.
    expect(grid.rows[0]?.label).toBe("10");
    expect(grid.rows[0]!.at).toBeLessThan(PLATE.y + PLATE.height);
    expect(grid.rows[1]!.at).toBeLessThan(grid.rows[0]!.at);
  });

  it("pads a single-figure count to two, as a sheet sets a square's number", () => {
    expect(graticule(PLATE, forWidth(70)).rows.every((line) => line.label.length >= 2)).toBe(true);
    expect(graticule(PLATE, forWidth(8)).columns[0]?.label).toBe("01");
  });

  it("leaves a field narrower than a kilometre ungridded rather than gridded with no lines", () => {
    // Four hundred metres across: the one-kilometre floor is wider than the
    // whole plate, so there is no grid rather than an empty one.
    expect(graticule(PLATE, forWidth(0.4))).toEqual({ kilometres: 0, columns: [], rows: [] });
  });

  it("answers nothing for a scale or a frame that says nothing", () => {
    for (const scale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(graticule(PLATE, scale).kilometres).toBe(0);
    }
    expect(graticule({ x: 0, y: 0, width: 0, height: 0 }, forWidth(10)).kilometres).toBe(0);
  });
});
