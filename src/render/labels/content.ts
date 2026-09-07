/**
 * The label's anatomy and the collapse order it gives up (#58, #39): the name
 * 14px italic in the side ink, beneath it the state word 12px upright in ink
 * with the percentage when strength is below 1. The same anatomy in every
 * view; only the inks change.
 *
 * The collapse order, which the search walks in this order and no other:
 *
 *   0 full · 1 displaced · 2 no state · 3 `short_label` · 4 numeral
 *
 * Step 1 says the same words as step 0 somewhere else, so the two share their
 * content. Step 3 is skipped for a unit whose roster entry has no
 * `short_label`, which is why `contentAt` may answer nothing.
 *
 * Measuring is injected, so every one of these is testable without a canvas.
 */
import type { Point } from "../primitives.ts";
import type { Rect } from "../projection.ts";
import { boxSetback, type LabelUnit } from "./geometry.ts";

export const NAME_SIZE = 14;
export const DETAIL_SIZE = 12;
/** The last step of the collapse order: the numeral keyed in the legend. */
export const LAST_STEP = 4;

/** How far the name's baseline sits above the point the label hangs from, and the state word's below it. */
export const NAME_RISE = 8;
export const DETAIL_DROP = 8;

/** How far the box reaches above the point the label hangs from, and below it with and without the state word. */
const BOX_TOP = 19;
const BOX_BOTTOM_DETAIL = 17;
const BOX_BOTTOM_NAME = 5;

/** Measures a string at a size, upright or italic. Injected so the placer never touches a canvas. */
export type Measure = (text: string, sizePx: number, italic: boolean) => number;

/** Which side of its anchor a label's words run. */
export type Align = "left" | "right";

/** The words one step of the collapse order leaves standing. */
export interface LabelContent {
  name: string;
  /** The state word, with the percentage when strength is below 1. Gone from step 2 on. */
  detail?: string;
  /** Set only at the last step, where the name *is* the numeral and the legend carries the key. */
  numeral?: number;
}

/** What survives at `step`, or nothing when this unit skips that step. */
export function contentAt(unit: LabelUnit, step: number): LabelContent | undefined {
  if (step <= 1) {
    const state = unit.strength < 1 ? `${unit.state} · ${Math.round(unit.strength * 100)}%` : unit.state;
    return { name: unit.name, detail: state };
  }
  if (step === 2) return { name: unit.name };
  if (step === 3) return unit.shortLabel === undefined ? undefined : { name: unit.shortLabel };
  const numeral = unit.rosterIndex + 1;
  return { name: String(numeral), numeral };
}

/** The widest of the label's lines, each measured at its own size. */
export function contentWidth(content: LabelContent, measure: Measure): number {
  const name = measure(content.name, NAME_SIZE, true);
  return content.detail === undefined ? name : Math.max(name, measure(content.detail, DETAIL_SIZE, false));
}

/** The box the words occupy around the point they hang from. */
export function labelBox(at: Point, align: Align, width: number, hasDetail: boolean): Rect {
  return {
    x: align === "left" ? at.x : at.x - width,
    y: at.y - BOX_TOP,
    width,
    height: BOX_TOP + (hasDetail ? BOX_BOTTOM_DETAIL : BOX_BOTTOM_NAME),
  };
}

/**
 * How much further out the anchor must go for the box's **near edge** — not
 * its anchor — to stand the clearance off the glyph. Nothing when the label
 * hangs straight out sideways, since there the anchor *is* the near edge; a
 * whole box depth when it sits above or below; a whole width when it reaches
 * back across its anchor. The prototype measured from the anchor and a wide
 * label lay straight across its own unit (#39).
 */
export function nearEdgeSetback(align: Align, width: number, hasDetail: boolean, angle: number): number {
  return boxSetback(
    {
      left: align === "left" ? 0 : -width,
      right: align === "left" ? width : 0,
      top: -BOX_TOP,
      bottom: hasDetail ? BOX_BOTTOM_DETAIL : BOX_BOTTOM_NAME,
    },
    angle,
  );
}
