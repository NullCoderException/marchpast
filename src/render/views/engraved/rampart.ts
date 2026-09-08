/**
 * The rampart, drawn (ADR-0026, #138, #170): a built line on the ground with
 * its ditch, the teeth on the side it faces. The seventh map kind reached the
 * format on #167 ahead of its ink; this is the ink.
 *
 * **The teeth fall on the right of the direction the line is drawn in**
 * (ADR-0026, and `mapGeometry.ts`, which walks them).
 *
 * Two idioms, both off the same walk (#138): **engraved**, a fine line with
 * the ditch's teeth as a siege plan cuts it, which the chart plate and the
 * night plate both name; **atlas**, one heavier line with heavier teeth
 * further apart, mass at a glance the way its pens are. The staff map's — an
 * obstacle with cross ticks both sides — is a hand of its own in
 * `views/staff/ground.ts` (#175), because its cross tick is a different
 * drawing rather than a wider tooth: the two here are whole pens, and a third
 * pen could not have drawn it.
 *
 * The walk itself — the runs, and the teeth off the winding — is every ground
 * hand's, and lives in `mapGeometry.ts`.
 */
import { rampartRuns, rampartTeeth } from "../../mapGeometry.ts";
import type { GroundRequest } from "../../view.ts";

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
