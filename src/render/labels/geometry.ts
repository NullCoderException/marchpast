/**
 * The field a label is placed on: what a unit's glyph occupies, how far a
 * label must stand off it in a given direction, which directions are offered
 * at all, and the collision test everything else is judged by (#39, #58).
 *
 * Pure geometry over boxes and angles — no canvas, no measuring — so the whole
 * search is unit-testable. An **angle** here is always radians clockwise from
 * north, the same convention `heading` uses, so the direction it names is
 * `(sin a, -cos a)` in canvas pixels.
 */
import type { Formation, UnitState } from "../../schema/types.ts";
import type { Point } from "../primitives.ts";
import { type Rect, toRadians } from "../projection.ts";
import { leeDrift, MARK_REACH } from "../style.ts";

/**
 * One unit as the placer sees it: the glyph it must clear and the words it may
 * show. Built by `drawUnits`, which is the only pass that knows where a unit
 * landed on the canvas and what ink its side takes.
 */
export interface LabelUnit {
  /** The roster `units[].id`. Keys the sticky memory. */
  id: string;
  /** Index into the **whole** roster, never the level's slice: the numeral is `rosterIndex + 1` (schema.md 2.11). */
  rosterIndex: number;
  /** The roster's `label`. */
  name: string;
  /** The roster's `short_label`, when it has one. Absent means collapse step 3 is skipped for this unit. */
  shortLabel?: string;
  state: UnitState;
  strength: number;
  /** The unit's side ink, already resolved from the view's palette. */
  colour: string;
  /** The glyph's centre in canvas pixels. */
  anchor: Point;
  /** Degrees true, as the picture carries it. */
  heading: number;
  formation: Formation;
  /** The glyph's long axis in pixels. */
  length: number;
  /** Half the glyph's extent across its long axis: the view's own `halfWidth` (ADR-0014). */
  halfWidth: number;
  hasMove: boolean;
  /**
   * Where the wind blows *to*, in radians clockwise from the unit's heading —
   * the same number the glyph is handed, so the label and the billow agree
   * about which flank is the lee one. Absent when the phase has no wind.
   */
  windTo?: number;
}

/** Clearance between a glyph's signs and its label, measured from the label's near edge (#58). */
export const LABEL_GAP = 30;
/** How far inside the plate's edge a label must stay. */
export const PLATE_INSET = 6;
/**
 * Slack around every box before two of them count as touching, so labels keep
 * a little air. It is a tolerance on the collision test only: the clearance a
 * label stands off its own glyph is `LABEL_GAP` exactly, which is further than
 * this and so never widened by it.
 */
export const BOX_PAD = 3;
/** Displacements tried beyond the clearance, exhausted before any word is dropped (#39). */
export const RING_RADII: readonly number[] = [0, 20, 44, 72, 104];
/** The ring's twenty-four directions. */
const RING_STEP = toRadians(15);
/**
 * Half-angle of the sector ahead of a unit, where its track and its moves run:
 * #81's "the forward 55° sector" read as the prototype's own constant, which
 * is a half-angle, so the sector is 110° wide. The narrower reading (55° all
 * told) leaves the track's own line inside it.
 */
const FORWARD_SECTOR = toRadians(55);

const TURN = Math.PI * 2;

/** An angle brought into `[0, 2π)`. */
export function normalise(angle: number): number {
  const turned = angle % TURN;
  return turned < 0 ? turned + TURN : turned;
}

/** Signed shortest difference between two angles, in radians. */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % TURN;
  if (d > Math.PI) d -= TURN;
  if (d < -Math.PI) d += TURN;
  return d;
}

/** The glyph's half-extents in its own frame: `x` across the heading, `y` along it. */
function glyphHalf(unit: LabelUnit): Point {
  const along = unit.length / 2;
  return unit.formation === "column" ? { x: unit.halfWidth, y: along } : { x: along, y: unit.halfWidth };
}

/** The glyph's axis-aligned box in canvas pixels: a hard obstacle for every label, its own included. */
export function glyphBox(unit: LabelUnit): Rect {
  const half = glyphHalf(unit);
  const heading = toRadians(unit.heading);
  const cos = Math.abs(Math.cos(heading));
  const sin = Math.abs(Math.sin(heading));
  const halfWidth = half.x * cos + half.y * sin;
  const halfHeight = half.x * sin + half.y * cos;
  return {
    x: unit.anchor.x - halfWidth,
    y: unit.anchor.y - halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  };
}

/** Where the unit's engaged mark drifts, as a unit vector in canvas pixels. */
export function leeDirection(unit: LabelUnit): Point {
  const local = leeDrift(unit.windTo, unit.formation);
  const heading = toRadians(unit.heading);
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  return { x: local.x * cos - local.y * sin, y: local.x * sin + local.y * cos };
}

/**
 * The glyph's box grown to leeward by its mark's reach: the **soft** obstacle.
 * Crossing another unit's smoke costs a displacement and never a word (#39).
 */
export function smokeBox(unit: LabelUnit): Rect {
  const box = glyphBox(unit);
  const reach = MARK_REACH[unit.state];
  if (reach === 0) return box;
  const lee = leeDirection(unit);
  const dx = lee.x * reach;
  const dy = lee.y * reach;
  return {
    x: box.x + Math.min(0, dx),
    y: box.y + Math.min(0, dy),
    width: box.width + Math.abs(dx),
    height: box.height + Math.abs(dy),
  };
}

/** Distance from the glyph's centre to the far side of its signs in direction `angle`. */
export function clearance(unit: LabelUnit, angle: number): number {
  const local = angle - toRadians(unit.heading);
  const dx = Math.abs(Math.sin(local));
  const dy = Math.abs(Math.cos(local));
  const half = glyphHalf(unit);
  const across = dx < 1e-9 ? Number.POSITIVE_INFINITY : half.x / dx;
  const along = dy < 1e-9 ? Number.POSITIVE_INFINITY : half.y / dy;
  return Math.min(across, along);
}

/** Whether `angle` lies in the sector ahead of the unit, where the track and the moves run. */
export function isForward(unit: LabelUnit, angle: number): boolean {
  return Math.abs(angleDelta(angle, toRadians(unit.heading))) < FORWARD_SECTOR;
}

/**
 * The flanks the label belongs on, windward first. A column's flanks are
 * abeam; a line's is astern, its ends second. Windward first is the whole of
 * how a label keeps out of its own smoke (#39): with no wind at all
 * `leeDrift` puts the mark on the flank this leaves free, and both read the
 * one answer in `style.ts` rather than two that can disagree.
 */
export function preferredAngles(unit: LabelUnit): number[] {
  const heading = toRadians(unit.heading);
  const flanks =
    unit.formation === "column"
      ? [heading + Math.PI / 2, heading - Math.PI / 2]
      : [heading + Math.PI, heading + Math.PI / 2, heading - Math.PI / 2];
  const lee = leeDrift(unit.windTo, unit.formation);
  const windward = normalise(Math.atan2(-lee.x, lee.y) + heading);
  return flanks
    .map(normalise)
    .filter((angle) => !isForward(unit, angle))
    .sort((a, b) => Math.abs(angleDelta(a, windward)) - Math.abs(angleDelta(b, windward)) || Math.sin(b) - Math.sin(a));
}

/**
 * Every direction a displaced label may take, the forward sector dropped. With
 * `from`, the whole ring sweeps outward from the angle the label already had,
 * which is what keeps a label that must move from crossing its unit to do it.
 * Without it, the preferred flanks lead and the rest fan out from the first.
 */
export function ringAngles(unit: LabelUnit, from?: number): number[] {
  const preferred = preferredAngles(unit);
  const rest: number[] = [];
  for (let i = 0; i < TURN / RING_STEP; i++) {
    const angle = normalise(i * RING_STEP);
    if (isForward(unit, angle)) continue;
    if (preferred.some((flank) => Math.abs(angleDelta(flank, angle)) < RING_STEP / 2)) continue;
    rest.push(angle);
  }
  if (from !== undefined) {
    return [...preferred, ...rest].sort((a, b) => Math.abs(angleDelta(a, from)) - Math.abs(angleDelta(b, from)));
  }
  const best = preferred[0] ?? 0;
  rest.sort((a, b) => Math.abs(angleDelta(a, best)) - Math.abs(angleDelta(b, best)));
  return [...preferred, ...rest];
}

/** Whether two boxes touch, with the pad that keeps a little air between them. */
export function overlaps(a: Rect, b: Rect): boolean {
  return overlapArea(a, b) > 0;
}

/**
 * Whether two boxes share a pixel, with no slack at all. What a map label is
 * judged by against a mark: a name stands off its own point by a gap narrower
 * than the pad, so padding there would refuse the slot every map label has
 * always taken (#107).
 */
export function touches(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The square pixels two boxes share, pad included: nothing if they are clear of each other. */
export function overlapArea(a: Rect, b: Rect): number {
  const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) + BOX_PAD * 2;
  const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) + BOX_PAD * 2;
  return x <= 0 || y <= 0 ? 0 : x * y;
}

/** Whether a box sits wholly inside the plate, off its edge by the inset. */
export function insidePlate(box: Rect, plate: Rect): boolean {
  return (
    box.x >= plate.x + PLATE_INSET &&
    box.y >= plate.y + PLATE_INSET &&
    box.x + box.width <= plate.x + plate.width - PLATE_INSET &&
    box.y + box.height <= plate.y + plate.height - PLATE_INSET
  );
}

/**
 * How many square pixels of a box fall outside the plate, the inset included:
 * what leaving the plate costs a placement with no free slot to take. Nothing
 * for a box wholly inside, which is what `insidePlate` answers as a rule.
 */
export function areaOutside(box: Rect, plate: Rect): number {
  const left = plate.x + PLATE_INSET;
  const top = plate.y + PLATE_INSET;
  const right = plate.x + plate.width - PLATE_INSET;
  const bottom = plate.y + plate.height - PLATE_INSET;
  const width = Math.max(0, Math.min(box.x + box.width, right) - Math.max(box.x, left));
  const height = Math.max(0, Math.min(box.y + box.height, bottom) - Math.max(box.y, top));
  return box.width * box.height - width * height;
}

/** Distance from a point to a box; zero inside it. */
export function distanceToRect(point: Point, rect: Rect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

/**
 * How much further out an anchor must go for the **near edge** of the box hung
 * on it — not its anchor — to stand a given clearance off the glyph. The four
 * edges are signed offsets from the anchor, so a box that reaches back across
 * it costs its whole width. Nothing when the box hangs straight out sideways,
 * since there the anchor *is* the near edge; a whole box depth when it sits
 * above or below.
 *
 * The label and the unit card both hang from a point on the glyph's flank and
 * both must clear it by `LABEL_GAP` exactly, so the arithmetic lives here
 * once rather than twice over.
 */
export function boxSetback(edges: { left: number; right: number; top: number; bottom: number }, angle: number): number {
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return Math.max(-edges.left * sx, -edges.right * sx) + Math.max(-edges.top * sy, -edges.bottom * sy);
}

/** The point of `rect` nearest `point`: where a leader leaves its label. */
export function nearestPointOnRect(rect: Rect, point: Point): Point {
  return {
    x: Math.min(Math.max(point.x, rect.x), rect.x + rect.width),
    y: Math.min(Math.max(point.y, rect.y), rect.y + rect.height),
  };
}
