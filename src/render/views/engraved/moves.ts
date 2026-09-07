/**
 * The engraved views' moves: the three motion styles as stroked arrows in the
 * view's own pens (ADR-0009, #58). All three engraved views name this one
 * hand — Atlas differs by thickening its pens, not by drawing a different
 * line, which is why `pens` survived `moves` being cut (#139).
 *
 * A wrapper around the shared arrow `primitive`, which is value reuse and not
 * inheritance: a view that draws a tapered polygon instead simply does not
 * call it.
 */
import { drawArrow } from "../../primitives.ts";
import type { MoveLine, MoveStyle, Moves } from "../../view.ts";

/** One motion style: the shaft, the dash and the head the view's pen carries, in the ink the anatomy gives it. */
const arrow: MoveLine = (ctx, from, to, { pen, colour }) => {
  drawArrow(ctx, from, to, pen, colour);
};

export const engravedMoves: Moves = { track: arrow, intent: arrow, detachment: arrow } satisfies Readonly<Record<MoveStyle, MoveLine>>;
