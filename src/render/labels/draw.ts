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
import { clearRun, runWidth, setRun } from "../run.ts";
import { CARD_PAD } from "./card.ts";
import { DETAIL_DROP, DETAIL_SIZE, NAME_RISE, NAME_SIZE } from "./content.ts";
import type { Measure } from "./content.ts";
import type { Placed } from "./place.ts";
import type { Type, View } from "../view.ts";

/**
 * Measures with the view's own run of type, for the placer, which never
 * touches a canvas itself. The words are spelled the way the view will draw
 * them and tracked the way it will track them, so a view that sets a name in
 * tracked capitals cannot measure it uncapitalised (ADR-0021, #139).
 */
export function canvasMeasure(ctx: CanvasRenderingContext2D, type: Type): Measure {
  return (text, size, voice) => runWidth(ctx, text, type.run(size, voice));
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
    ctx.fillStyle = label.unit.colour;
    ctx.fillText(setRun(ctx, type.run(NAME_SIZE, "name"), label.name), label.at.x, label.at.y - NAME_RISE);
    if (label.detail === undefined) continue;
    ctx.fillStyle = palette.ink;
    ctx.fillText(setRun(ctx, type.run(DETAIL_SIZE, "fact"), label.detail), label.at.x, label.at.y + DETAIL_DROP);
  }
  clearRun(ctx);

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

  // The panel is laid at full strength whatever the last run was set at.
  clearRun(ctx);
  ctx.fillStyle = palette.panel;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.width - 1, box.height - 1);

  ctx.textAlign = "left";
  for (const line of card.lines) {
    const words = setRun(ctx, type.run(line.size, line.voice), line.text);
    ctx.fillStyle = line.side ? label.unit.colour : palette.ink;
    ctx.fillText(words, box.x + CARD_PAD, box.y + line.y);
  }
  clearRun(ctx);
}
