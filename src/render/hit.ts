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
 * both would open a card over bare plate between them. Where regions overlap
 * the smallest wins, so a numeral row inside the legend answers before the
 * legend does.
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
}

/** Whether a point falls inside a box, edges included. */
function contains(box: Rect, point: Point): boolean {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
}

/**
 * The unit a point falls on, or nothing at all. The smallest region containing
 * the point wins, so a small thing drawn inside a large one — a numeral row in
 * the legend, a glyph under a wide card — is what the pointer answers.
 */
export function unitAt(regions: readonly HitRegion[], point: Point): string | undefined {
  let best: HitRegion | undefined;
  let smallest = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    if (!contains(region.box, point)) continue;
    const area = region.box.width * region.box.height;
    if (area >= smallest) continue;
    smallest = area;
    best = region;
  }
  return best?.id;
}
