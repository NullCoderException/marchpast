/**
 * Relief's arithmetic: everything the map pass has to work out about contours
 * before it can ink a single one.
 *
 * The map file carries a level per contour and nothing else — no interval, no
 * index flag, because a flag saying "draw this one heavier" would be styling
 * in data (ADR-0012). So the renderer derives both: the **interval** is the
 * smallest gap between adjacent distinct levels, and an **index contour** is
 * every fifth level from there, which puts 10 m contours on the 50 m
 * multiples and 20 m contours on the 100 m ones (#62).
 *
 * Pure: nothing here touches a canvas, which is why it is the one part of the
 * relief pass that is unit-tested. The lines themselves are checked by eye
 * against the design canvas (ADR-0009).
 */
import type { MapFile } from "../schema/types.ts";
import type { Point } from "./primitives.ts";

/** How many levels apart an index contour falls: every fifth. */
const INDEX_EVERY = 5;

/** Floating-point slack for "is a multiple of": levels are metres, so this is far below anything a map means. */
const EPSILON = 1e-9;

/**
 * The five levels the atlas tints a band above, in metres. Unlike the index
 * contours these are **fixed heights, not derived from the interval**: #62
 * chose them as the tones a battlefield reads in, and a map bands by whichever
 * of the five it carries a line for. A map cut far above or below them goes
 * untinted rather than banded on some other ladder, which is a decision to
 * reopen on #62 when a battle needs it, not a rule to invent here.
 */
export const TINT_BAND_LEVELS: readonly number[] = [30, 50, 100, 150, 200];

/** Every distinct level a map's contours are cut at, ascending. Empty for a map with no relief, and for no map at all. */
export function contourLevels(map: MapFile | undefined): number[] {
  if (map === undefined) return [];
  const levels = new Set<number>();
  for (const feature of map.features) {
    if (feature.properties.kind === "contour") levels.add(feature.properties.elevation);
  }
  return [...levels].sort((a, b) => a - b);
}

/**
 * The interval the levels were cut at: the smallest gap between adjacent
 * distinct levels, so an incomplete or uneven set still names one. `undefined`
 * when there are fewer than two levels, which is a map with nothing to space.
 */
export function contourInterval(levels: readonly number[]): number | undefined {
  const sorted = [...new Set(levels)].sort((a, b) => a - b);
  if (sorted.length < 2) return undefined;
  let smallest = Infinity;
  for (let i = 1; i < sorted.length; i++) smallest = Math.min(smallest, sorted[i]! - sorted[i - 1]!);
  return smallest;
}

/**
 * The levels drawn heavy and numbered: every fifth one, found as the multiples
 * of five intervals. Uneven levels simply yield whichever of them land on a
 * multiple, and a map too thin to have an interval indexes nothing.
 */
export function indexLevels(levels: readonly number[]): number[] {
  const interval = contourInterval(levels);
  if (interval === undefined) return [];
  const step = interval * INDEX_EVERY;
  return [...new Set(levels)].sort((a, b) => a - b).filter((level) => isMultipleOf(level, step));
}

/** The tint bands a level list yields: the thresholds the data has a line at, in order. */
export function tintBandLevels(levels: readonly number[]): number[] {
  const present = new Set(levels);
  return TINT_BAND_LEVELS.filter((level) => present.has(level));
}

function isMultipleOf(value: number, step: number): boolean {
  const quotient = value / step;
  return Math.abs(quotient - Math.round(quotient)) < EPSILON;
}

/**
 * Which side of a closed ring's own direction of travel the ground rises to:
 * `1` for the left of it, `-1` for the right. Multiply the left normal
 * `(dy, -dx)` by it and the result points up the slope.
 *
 * A contourer winds its rings with the high ground on the left, and the signed
 * area recovers the same fact from the ring alone, which is what lets the
 * renderer read it off a file whatever tool cut it: a ring encloses a hill, so
 * uphill is inward, and the shoelace sign says which side inward is. In canvas
 * coordinates, where y runs down, a positive area is a ring wound clockwise on
 * the screen and its inside is on the right.
 *
 * A ring is the case. A line that runs off the extent encloses nothing, and
 * the honest answer for one is `uphillToward`, which searches the level above;
 * this one still answers, treating the line as closed back on itself, because
 * a caller with no level above it has nothing better to fall back on than the
 * contourer's own convention (#138, #170).
 */
export function uphillOf(ring: readonly Point[]): 1 | -1 {
  if (ring.length < 3) return 1;
  let twiceArea = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return twiceArea > 0 ? -1 : 1;
}

/** How many points along an open line are asked which way is up: enough to outvote a bend, cheap enough to run per line. */
const UPHILL_VOTES = 8;

/**
 * Which side of an **open** line's direction of travel the ground rises to,
 * taken from the level above it: `1` for the left, `-1` for the right, and
 * `undefined` when there is no level above to ask or the line's two sides
 * cannot be told apart.
 *
 * A closed ring carries the fact in its winding and `uphillOf` reads it off
 * the signed area. A line clipped by the extent does not: it is a C-shaped arc
 * whose implicit closure encloses an area that says nothing about the ground,
 * and on a real file most contours are that shape — Cannae's ships 52 open
 * lines against 10 closed. So the fallback is the one #138 named: the nearest
 * point on the contour above is up the slope, and which side of the line it
 * falls on is which way is up.
 *
 * Sampled along the line and voted rather than asked once, because a long
 * contour bends and one sample near a bend can answer for the whole of it.
 */
export function uphillToward(line: readonly Point[], above: readonly Point[]): 1 | -1 | undefined {
  if (line.length < 2 || above.length === 0) return undefined;
  let left = 0;
  let right = 0;
  const step = Math.max(1, Math.floor(line.length / UPHILL_VOTES));
  for (let i = 0; i < line.length; i += step) {
    const here = line[i]!;
    const before = line[Math.max(0, i - 1)]!;
    const after = line[Math.min(line.length - 1, i + 1)]!;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    if (Math.hypot(dx, dy) < 1e-9) continue;
    const near = nearestTo(here, above);
    // The left normal is `(dy, -dx)`: a point up the slope on that side scores it left.
    const side = (near.x - here.x) * dy - (near.y - here.y) * dx;
    if (side > 0) left++;
    else if (side < 0) right++;
  }
  if (left === right) return undefined;
  return left > right ? 1 : -1;
}

/** The nearest of `points` to `at`. Walked rather than indexed: it runs once per line when the ground is built, never per frame. */
function nearestTo(at: Point, points: readonly Point[]): Point {
  let best = points[0]!;
  let nearest = Infinity;
  for (const point of points) {
    const distance = (point.x - at.x) ** 2 + (point.y - at.y) ** 2;
    if (distance < nearest) {
      nearest = distance;
      best = point;
    }
  }
  return best;
}

/**
 * The band a level stands in: the index into `TINT_BAND_LEVELS` of the highest
 * threshold at or below it, and `-1` for a level below every one of them.
 *
 * It is the ground a contour numeral is standing on, which is what a view that
 * tints its ground has to knock the numeral out to rather than to the paper —
 * #138's closing note, found on the atlas board after the resolution.
 */
export function bandIndexAt(level: number): number {
  let index = -1;
  TINT_BAND_LEVELS.forEach((threshold, i) => {
    if (threshold <= level) index = i;
  });
  return index;
}
