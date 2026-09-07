/**
 * Hit regions (#60, #84): what one rendered frame leaves behind so the player
 * can turn a pointer into a unit id.
 *
 * The canvas listened to nothing before the unit card, and the renderer threw
 * every screen box away as soon as it had drawn it. `render` now hands them
 * back: a region for every drawn unit's glyph, one for the label or card that
 * glyph carries, and one for each of the legend's numeral rows — because the
 * numeral row opens the same card, which is what rescues a unit whose label
 * has collapsed all the way (#39).
 *
 * A unit contributes **two boxes and never their bounding box**: a displaced
 * label can stand a hundred pixels off its glyph, and one rectangle around
 * both would open a card over bare plate between them.
 *
 * The regions arrive in **draw order, bottom to top, and the topmost one
 * containing the point wins**. That is the whole of the resolution rule, and
 * it is the drawing's own answer: a card that had to draw over a label
 * answers for itself rather than for what it covered, and two glyphs
 * overlapping in a melee answer in the order the melee was drawn.
 *
 * A region also says whether the pointer merely **resting** on it opens the
 * card. The glyph and its label do; the legend's numeral row does not. #60
 * scopes hover to "the glyph's box or its own label" and gives the legend row
 * the click, and the row could not answer to hover in any case: the key is
 * built from the numerals the frame showed, so a card opening takes the
 * numeral — and with it the row — out from under the pointer.
 *
 * Nothing here knows about the DOM: the player turns a pointer event into a
 * canvas point, and this resolves the point.
 */
import type { Point } from "./primitives.ts";
import type { Rect } from "./projection.ts";

/** One box of the last frame that opens a unit's card. */
export interface HitRegion {
  /** The roster id of the unit whose card this region opens. */
  id: string;
  box: Rect;
  /** Whether the pointer resting here shows the card, or only a click opens it. */
  hover: boolean;
}

/** Whether a point falls inside a box, edges included. */
function contains(box: Rect, point: Point): boolean {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
}

/** The last region of the frame that holds the point, which is the one drawn over all the others. */
function topmost(regions: readonly HitRegion[], point: Point, restingOnly: boolean): string | undefined {
  for (let i = regions.length - 1; i >= 0; i--) {
    const region = regions[i];
    if (region === undefined) continue;
    if (restingOnly && !region.hover) continue;
    if (contains(region.box, point)) return region.id;
  }
  return undefined;
}

/** The unit a click at this point pins the card to, or nothing at all: every region answers a click. */
export function unitAt(regions: readonly HitRegion[], point: Point): string | undefined {
  return topmost(regions, point, false);
}

/** The unit a pointer resting at this point shows the card for: the glyphs and their labels, never the legend's rows. */
export function hoverAt(regions: readonly HitRegion[], point: Point): string | undefined {
  return topmost(regions, point, true);
}
