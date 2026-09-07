/**
 * The rampart, drawn (ADR-0026, #138, #170): a built line on the ground with
 * its ditch, the teeth on the side it faces. The seventh map kind reached the
 * format on #167 ahead of its ink; this is the ink.
 *
 * **The teeth fall on the right of the direction the line is drawn in.**
 * Alesia's two lines run round the same hill facing opposite ways — the
 * contravallation inward at the town, the circumvallation outward at the
 * relief — and neither is a closed ring, so there is no inside to derive a
 * side from. ADR-0026 made the winding itself the fact: an author draws a
 * rampart keeping the side it faces on their right. Nothing in the format
 * checks it and only the plate will say so (schema.md 3.3, 3.6).
 *
 * Two idioms, both off the same walk (#138): **engraved**, a fine line with
 * the ditch's teeth as a siege plan cuts it, which the chart plate and the
 * night plate both name; **atlas**, one heavier line with heavier teeth
 * further apart, mass at a glance the way its pens are. The staff map's — an
 * obstacle with cross ticks both sides — is #175's, and its cross tick is a
 * different drawing rather than a wider tooth, which is why the two here are
 * whole pens and the third will be a hand of its own.
 */
import type { LonLat, MapFile } from "../../../schema/types.ts";
import type { Point } from "../../primitives.ts";
import type { Projection } from "../../projection.ts";
import type { GroundRequest } from "../../view.ts";
import { projectLine } from "./ground.ts";

/** One tooth of the ditch: where it leaves the line, and where it ends. */
export interface Tooth {
  from: Point;
  to: Point;
}

/**
 * The weights one view cuts a rampart at: the line's own, and the teeth's
 * weight, length and spacing. Named for `Pen`, which is what a view already
 * carries for a motion line, and not for the aesthetic the glossary calls an
 * idiom (`CONTEXT.md`, **Aesthetic**) — all three views here are drawn in the
 * one engraved idiom and cut their ramparts two different ways inside it.
 */
export interface RampartPen {
  lineWidth: number;
  toothWidth: number;
  length: number;
  spacing: number;
}

/** The plate's and the night plate's: a 1.3 px line with 4.5 px teeth at 9 px, as a siege plan cuts it (#138). */
export const ENGRAVED_RAMPART: RampartPen = { lineWidth: 1.3, toothWidth: 0.7, length: 4.5, spacing: 9 };

/** Atlas's: one 2.6 px line with heavier teeth further apart, so the works read at a glance (#138). */
export const ATLAS_RAMPART: RampartPen = { lineWidth: 2.6, toothWidth: 1.6, length: 5, spacing: 13 };

/**
 * The ditch's teeth along one run: a tooth every `spacing` of arc, `length`
 * long, hanging off the **right** of the direction of travel.
 *
 * The walk carries its distance across a vertex rather than restarting there,
 * so a line's teeth stay evenly spaced round a corner instead of bunching at
 * every bend the author traced. A segment of no length is stepped over, which
 * is what a repeated coordinate reduces to.
 */
export function rampartTeeth(line: readonly Point[], spacing: number, length: number): Tooth[] {
  const teeth: Tooth[] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const run = Math.hypot(dx, dy);
    if (run < 1e-9) continue;
    // The right of travel: in canvas coordinates, where y runs down, that is
    // the left normal turned about — walking east, the right hand points south.
    const nx = -dy / run;
    const ny = dx / run;
    for (let along = carry; along < run; along += spacing) {
      const from = { x: a.x + (dx * along) / run, y: a.y + (dy * along) / run };
      teeth.push({ from, to: { x: from.x + nx * length, y: from.y + ny * length } });
      carry = along + spacing;
    }
    carry -= run;
  }
  return teeth;
}

/**
 * Every rampart on the map, in one idiom: the lines first and the teeth over
 * them, so a tooth is never half-covered by the run it hangs off.
 *
 * Drawn among the ground — after the relief and the water, before the named
 * things — and clipped to the extent by the shared half, which is where
 * schema.md section 4 puts it.
 */
export function drawRamparts({ ctx, map, projection, palette }: GroundRequest, pen: RampartPen): void {
  if (map === undefined) return;
  const runs = rampartRuns(map, projection);
  if (runs.length === 0) return;

  ctx.save();
  ctx.strokeStyle = palette.ink;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (const run of runs) {
    run.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  }
  ctx.lineWidth = pen.lineWidth;
  ctx.stroke();

  ctx.beginPath();
  for (const run of runs) {
    for (const { from, to } of rampartTeeth(run, pen.spacing, pen.length)) {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    }
  }
  ctx.lineWidth = pen.toothWidth;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

/**
 * Every rampart run on the map, projected: one polyline per `LineString` and
 * one per member of a `MultiLineString`, which is how Alesia's disjoint
 * stretches reach the plate as the separate runs they are (ADR-0026).
 *
 * Projected once here rather than twice, because the line and its teeth are
 * two passes over the same points.
 */
function rampartRuns(map: MapFile, projection: Projection): Point[][] {
  const runs: Point[][] = [];
  for (const { geometry, properties } of map.features) {
    if (properties.kind !== "rampart") continue;
    const lines: LonLat[][] =
      geometry.type === "LineString" ? [geometry.coordinates] : geometry.type === "MultiLineString" ? geometry.coordinates : [];
    for (const line of lines) runs.push(projectLine(projection, line));
  }
  return runs;
}
