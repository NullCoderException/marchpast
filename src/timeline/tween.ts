/**
 * The two interpolations the timeline is allowed to do (ADR-0002): position
 * and heading. Everything else about a phase steps, so nothing else belongs
 * here. Pure arithmetic on degrees; no battle, no clock.
 */
import type { Heading, Position } from "../schema/types.ts";

/** `degrees` folded into `[0, 360)`. */
function normalize(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * The heading `f` of the way from `a` to `b` along the shortest arc, in
 * `[0, 360)`. An exact 180 degree difference resolves clockwise: where the
 * turn's direction matters, the author adds a phase rather than a hint.
 */
export function lerpHeading(a: Heading, b: Heading, f: number): Heading {
  const forward = normalize(b - a);
  // Ties (exactly 180) keep the forward, clockwise arc.
  const shortest = forward > 180 ? forward - 360 : forward;
  return normalize(a + shortest * f);
}

/** The position `f` of the way from `from` to `to`, interpolated linearly in latitude and longitude degrees. */
export function lerpPosition(from: Position, to: Position, f: number): Position {
  return {
    lat: from.lat + (to.lat - from.lat) * f,
    lon: from.lon + (to.lon - from.lon) * f,
  };
}
