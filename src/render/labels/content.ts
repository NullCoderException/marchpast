/**
 * The label's anatomy and the collapse order it gives up (#58, #39, #86): the
 * name 14px italic in the side ink, beneath it the state word 12px upright in
 * ink with the percentage when strength is below 1. The same anatomy in every
 * view; only the inks change.
 *
 * The collapse order is one ladder of seven steps, which the search walks in
 * this order and no other. Each mode enters it at its own **floor**
 * (`layout.ts`) and every step above that floor says nothing, so a mode's own
 * order is exactly the rungs left beneath it:
 *
 *   0 full · 1 displaced · 2 no state
 *     - a desktop starts here
 *   3 short name with its state word · 4 displaced · 5 short name alone
 *     - a phone starts here
 *   6 numeral
 *
 * So a desktop reads `0 · 1 · 2 · 5 · 6` — full, displaced, no state,
 * `short_label`, numeral, unchanged from #39 — and a phone reads
 * `3 · 4 · 5 · 6`, the phone floor and then displaced, no state, numeral
 * (#86). The two share the rungs they both use, so a label that survives a
 * resize keeps its words rather than starting the search over.
 *
 * Steps 3 to 5 are skipped for a unit whose roster entry has no `short_label`
 * — on a desktop, where the short name is all those steps are; on a phone the
 * floor falls back to the full label rather than skipping, because a phone has
 * no rung above it to fall back to. That is why `contentAt` may answer
 * nothing.
 *
 * Measuring is injected, so every one of these is testable without a canvas.
 */
import type { LayoutMode } from "../layout.ts";
import type { Point } from "../primitives.ts";
import type { Rect } from "../projection.ts";
import { boxSetback, type LabelUnit } from "./geometry.ts";

export const NAME_SIZE = 14;
export const DETAIL_SIZE = 12;
/** The last step of the collapse order: the numeral keyed in the legend. */
export const LAST_STEP = 6;
/** The rung the short name keeps its state word on, which is the phone floor (`labelFloor`). */
const SHORT_WITH_STATE = 3;
/** The rung the short name stands alone on: the last words either mode has before the numeral. */
const SHORT_ALONE = 5;

/**
 * The rungs each mode spends, in the order it gives them up. The ladder is
 * shared and the modes take different rungs of it, so "one step at a time" has
 * to mean one rung of *this* mode's ladder: a desktop label giving back its
 * `short_label` climbs to the full name without its state word, and never to
 * the phone floor between them, which it cannot spend.
 *
 * The first rung is the mode's floor, which is what `labelFloor` reports; a
 * test holds the two together.
 */
const LADDER: Readonly<Record<LayoutMode, readonly number[]>> = {
  desktop: [0, 1, 2, SHORT_ALONE, LAST_STEP],
  phone: [SHORT_WITH_STATE, SHORT_WITH_STATE + 1, SHORT_ALONE, LAST_STEP],
};

/** The rungs this mode spends, coarsest last. */
export function labelLadder(mode: LayoutMode): readonly number[] {
  return LADDER[mode];
}

/**
 * The rung one above `step` on this mode's ladder — the step a label recovers
 * to when it has earned one back — or nothing when it is already at the top of
 * what this mode spends.
 */
export function rungAbove(step: number, mode: LayoutMode): number | undefined {
  const ladder = LADDER[mode];
  const at = ladder.indexOf(step);
  return at <= 0 ? undefined : ladder[at - 1];
}

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

/** What survives at `step` in this mode, or nothing when the mode skips that step. */
export function contentAt(unit: LabelUnit, step: number, mode: LayoutMode): LabelContent | undefined {
  if (step === LAST_STEP) {
    const numeral = unit.rosterIndex + 1;
    return { name: String(numeral), numeral };
  }

  // A phone never spends the full label: the three rungs above its floor say
  // nothing, so its search cannot climb back up to them after a resize.
  if (mode === "phone") {
    if (step < SHORT_WITH_STATE) return undefined;
    // The short name, or the full one when the roster gave none: a phone has
    // no rung above this to fall back to, so it never skips its own floor.
    const name = unit.shortLabel ?? unit.name;
    // The state word without its percentage: the digits are the first thing
    // that will not fit at 390px, and the word is what the plate is read for.
    return step === SHORT_ALONE ? { name } : { name, detail: unit.state };
  }

  if (step <= 1) {
    const state = unit.strength < 1 ? `${unit.state} · ${Math.round(unit.strength * 100)}%` : unit.state;
    return { name: unit.name, detail: state };
  }
  if (step === 2) return { name: unit.name };
  // The phone floor and its displacement are the phone's alone; a desktop
  // falls from its own no-state step straight to the bare short name.
  if (step < SHORT_ALONE) return undefined;
  return unit.shortLabel === undefined ? undefined : { name: unit.shortLabel };
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
