/**
 * Setting one run of type on a canvas, and measuring one the same way.
 *
 * A `Setting` is a face **and** a tracking **and** a spelling **and** how hard
 * it is laid (`view.ts`), and the rule every pass that uses one has to keep is
 * that **it measures what it will draw**: a hand that sets `ctx.font` alone to
 * wrap a line, and then draws that line tracked and capitalised, wraps it too
 * short. The engraved views track nothing and spell nothing, so the mistake is
 * invisible in three views out of four and quite visible in the fourth (#175).
 *
 * So the two halves are one pair here rather than a `ctx.font =` at each site.
 * The tracking and the alpha are drawing state that outlives the caller, so
 * `clearRun` puts both back; a browser that has not implemented
 * `letterSpacing` ignores it, which is the same bargain the canvas has always
 * offered for it.
 */
import type { Setting } from "./view.ts";

/** No tracking, and full strength: what a run leaves behind it. */
const NO_TRACKING = "0px";
const FULL = 1;

/** Sets the face, the tracking and the strength together, and answers the words as this view spells them. */
export function setRun(ctx: CanvasRenderingContext2D, setting: Setting, words = ""): string {
  ctx.font = setting.font;
  ctx.letterSpacing = setting.tracking;
  ctx.globalAlpha = setting.alpha ?? FULL;
  return setting.spell(words);
}

/** Puts the tracking and the strength back. `restore` does it too; this is for the site with no `save` around it. */
export function clearRun(ctx: CanvasRenderingContext2D): void {
  ctx.letterSpacing = NO_TRACKING;
  ctx.globalAlpha = FULL;
}

/** How wide a run stands, spelled and tracked as it will be drawn, without disturbing what the caller had set. */
export function runWidth(ctx: CanvasRenderingContext2D, text: string, setting: Setting): number {
  ctx.save();
  const { width } = ctx.measureText(setRun(ctx, setting, text));
  ctx.restore();
  clearRun(ctx);
  return width;
}
