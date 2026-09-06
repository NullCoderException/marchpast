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

/** How many levels apart an index contour falls: every fifth. */
const INDEX_EVERY = 5;

/** Floating-point slack for "is a multiple of": levels are metres, so this is far below anything a map means. */
const EPSILON = 1e-9;

/**
 * The five levels the atlas tints a band above, in metres (#62). A map bands
 * by the ones it actually carries a closed line for; the rest go untinted.
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
