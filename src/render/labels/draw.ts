/**
 * The label pass: a thin drawing of what the placer decided (#39, #58). Every
 * question worth asking was answered in `place.ts` over boxes and angles; all
 * that is left here is ink.
 *
 * The frame's open **unit card** is drawn here too, and last of all: the
 * placer gives it the widest box and the highest priority, but where no slot
 * was free it draws over the least-bad one, and covering a label is only
 * covering it if the card goes on top (#60).
 *
 * A **shared pass**. The anatomy is the same in every view and only the inks
 * come from the palette, so no view replaces this (ADR-0014). It runs after
 * every glyph's body and after the furniture, because a label may sit over the
 * plate's paper but never under another unit's ships.
 */
import { CARD_PAD } from "./card.ts";
import { DETAIL_DROP, DETAIL_SIZE, NAME_RISE, NAME_SIZE } from "./content.ts";
import type { Measure } from "./content.ts";
import type { Placed } from "./place.ts";
import type { Palette } from "../view.ts";
import { font } from "../style.ts";

/** The leader's weight, and the dot it ends on at the glyph's centre: 1.6px across, twice the line (#58). */
const LEADER_WIDTH = 0.8;
const LEADER_DOT = 0.8;

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
    if (label.card !== undefined) continue;
    ctx.textAlign = label.align;
    ctx.font = font(NAME_SIZE, true);
    ctx.fillStyle = label.unit.colour;
    ctx.fillText(label.name, label.at.x, label.at.y - NAME_RISE);
    if (label.detail === undefined) continue;
    ctx.font = font(DETAIL_SIZE);
    ctx.fillStyle = palette.ink;
    ctx.fillText(label.detail, label.at.x, label.at.y + DETAIL_DROP);
  }

  for (const label of placed) {
    if (label.card !== undefined) drawCard(ctx, label, palette);
  }
  ctx.restore();
}

/**
 * One unit card: the legend's own panel — paper at .92 with a 1px ink rule —
 * and the lines the layout placed inside it, italic in the side ink for the
 * name and upright in the palette's for the facts and the tree (#60). No
 * badge, no glow, and nothing here that reads a view id: the Night plate's
 * card is dark because its palette is.
 */
function drawCard(ctx: CanvasRenderingContext2D, label: Placed, palette: Palette): void {
  const { box, card } = label;
  if (card === undefined) return;

  ctx.fillStyle = palette.panel;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);

  ctx.textAlign = "left";
  for (const line of card.lines) {
    ctx.font = font(line.size, line.italic);
    ctx.fillStyle = line.side ? label.unit.colour : palette.ink;
    ctx.fillText(line.text, box.x + CARD_PAD, box.y + line.y);
  }
}
