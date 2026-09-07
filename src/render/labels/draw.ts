/**
 * The label pass: a thin drawing of what the placer decided (#39, #58). Every
 * question worth asking was answered in `place.ts` over boxes and angles; all
 * that is left here is ink.
 *
 * A **shared pass**. The anatomy is the same in every view and only the inks
 * come from the palette, so no view replaces this (ADR-0014). It runs after
 * every glyph's body and after the furniture, because a label may sit over the
 * plate's paper but never under another unit's ships.
 */
import { DETAIL_SIZE, NAME_SIZE } from "./content.ts";
import type { Measure } from "./content.ts";
import type { Placed } from "./place.ts";
import type { Palette } from "../view.ts";
import { font } from "../style.ts";

/** The leader's weight, and the dot it ends on at the glyph's centre: 1.6px across, twice the line (#58). */
const LEADER_WIDTH = 0.8;
const LEADER_DOT = 0.8;
/** How far the name's baseline sits above the point the label hangs from, and the state word's below it. */
const NAME_RISE = 8;
const DETAIL_DROP = 8;

/** Measures with the plate's own face, for the placer, which never touches a canvas itself. */
export function canvasMeasure(ctx: CanvasRenderingContext2D): Measure {
  return (text, size, italic) => {
    ctx.font = font(size, italic);
    return ctx.measureText(text).width;
  };
}

export function drawLabels(ctx: CanvasRenderingContext2D, placed: readonly Placed[], palette: Palette): void {
  ctx.save();
  ctx.textBaseline = "middle";

  // Leaders first, so no line is drawn over the words it belongs to.
  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = palette.ink;
  ctx.lineWidth = LEADER_WIDTH;
  for (const label of placed) {
    if (label.leader === undefined) continue;
    const { anchor } = label.unit;
    ctx.beginPath();
    ctx.moveTo(label.leader.x, label.leader.y);
    ctx.lineTo(anchor.x, anchor.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, LEADER_DOT, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const label of placed) {
    ctx.textAlign = label.align;
    ctx.font = font(NAME_SIZE, true);
    ctx.fillStyle = label.unit.colour;
    ctx.fillText(label.name, label.at.x, label.at.y - NAME_RISE);
    if (label.detail === undefined) continue;
    ctx.font = font(DETAIL_SIZE);
    ctx.fillStyle = palette.ink;
    ctx.fillText(label.detail, label.at.x, label.at.y + DETAIL_DROP);
  }
  ctx.restore();
}
