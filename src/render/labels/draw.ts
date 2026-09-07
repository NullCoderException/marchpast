/**
 * The label pass's drawing: a thin inking of what the placer decided (#39,
 * #58). Every question worth asking was answered in `place.ts` over boxes and
 * angles; all that is left here is ink.
 *
 * The frame's open **unit card** is drawn here too, and last of all: the
 * placer gives it the widest box and the highest priority, but where no slot
 * was free it draws over the least-bad one, and covering a label is only
 * covering it if the card goes on top (#60).
 *
 * A **shared half**. The anatomy is the same in every view — two lines on the
 * glyph's flank, never ahead of it, collapsing in one order — and the label
 * pass gains no hand of its own. What it takes from the view is its type: the
 * face each of the two lines is set in, and the **leader**, which is the one
 * drawn mark on a label and is typography rather than picture (ADR-0021 as
 * narrowed on #139).
 *
 * It runs after every glyph's body and after the furniture, because a label
 * may sit over the plate's paper but never under another unit's ships.
 */
import { CARD_PAD } from "./card.ts";
import { DETAIL_DROP, DETAIL_SIZE, NAME_RISE, NAME_SIZE } from "./content.ts";
import type { Measure } from "./content.ts";
import type { Placed } from "./place.ts";
import type { Type, View } from "../view.ts";

/** Measures with the view's own face, for the placer, which never touches a canvas itself. */
export function canvasMeasure(ctx: CanvasRenderingContext2D, type: Type): Measure {
  return (text, size, voice) => {
    ctx.font = type.font(size, voice);
    return ctx.measureText(text).width;
  };
}

export function drawLabels(ctx: CanvasRenderingContext2D, placed: readonly Placed[], view: View): void {
  const { palette, type } = view;
  ctx.save();
  ctx.textBaseline = "middle";

  // Leaders first, so no line is drawn over the words it belongs to.
  for (const label of placed) {
    if (label.leader === undefined) continue;
    type.leader(ctx, { from: label.leader, box: label.box, anchor: label.unit.anchor, palette });
  }

  for (const label of placed) {
    if (label.card !== undefined) continue;
    ctx.textAlign = label.align;
    ctx.font = type.font(NAME_SIZE, "name");
    ctx.fillStyle = label.unit.colour;
    ctx.fillText(label.name, label.at.x, label.at.y - NAME_RISE);
    if (label.detail === undefined) continue;
    ctx.font = type.font(DETAIL_SIZE, "fact");
    ctx.fillStyle = palette.ink;
    ctx.fillText(label.detail, label.at.x, label.at.y + DETAIL_DROP);
  }

  for (const label of placed) {
    if (label.card !== undefined) drawCard(ctx, label, view);
  }
  ctx.restore();
}

/**
 * One unit card: the legend's own panel — the palette's panel tone with a 1px
 * ink rule — and the lines the layout placed inside it, in the name voice and
 * the side ink for the name and in the fact voice and the palette's ink for
 * the facts and the tree (#60). No badge, no glow, and nothing here that reads
 * a view id: the Night plate's card is dark because its palette is.
 */
function drawCard(ctx: CanvasRenderingContext2D, label: Placed, { palette, type }: View): void {
  const { box, card } = label;
  if (card === undefined) return;

  ctx.fillStyle = palette.panel;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);

  ctx.textAlign = "left";
  for (const line of card.lines) {
    ctx.font = type.font(line.size, line.voice);
    ctx.fillStyle = line.side ? label.unit.colour : palette.ink;
    ctx.fillText(line.text, box.x + CARD_PAD, box.y + line.y);
  }
}
