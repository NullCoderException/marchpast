/**
 * The projection: Web Mercator (ADR-0001), fitted so the battle's extent fills
 * a viewport while preserving aspect ratio, letterboxing the rest. North is
 * always up. Pure maths: nothing here touches a canvas, so it is unit-tested
 * while the drawing is checked by eye (ADR-0009).
 */
import type { Extent } from "../schema/types.ts";

/** A rectangle in canvas pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Projection {
  /** Canvas pixel for a position. Positions outside the extent land outside the frame. */
  project(lat: number, lon: number): { x: number; y: number };
  /** The position under a canvas pixel: the inverse of `project`. */
  unproject(x: number, y: number): { lat: number; lon: number };
  /** Where the extent lands inside the viewport: the plate's picture rectangle. */
  frame: Rect;
  /** Ground distance covered by one pixel at `lat`, for the scale bar. */
  metresPerPixel(lat: number): number;
}

/** WGS84 semi-major axis, the radius spherical Web Mercator uses. */
const EARTH_RADIUS_METRES = 6378137;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/** Mercator northing for a latitude, in earth radii. */
const mercator = (latDegrees: number): number => Math.log(Math.tan(Math.PI / 4 + toRadians(latDegrees) / 2));

/** Fits `extent` inside `viewport`, centred, at the largest scale that keeps the whole extent visible. */
export function fitProjection(extent: Extent, viewport: Rect): Projection {
  const west = toRadians(extent.west);
  const north = mercator(extent.north);
  const spanX = toRadians(extent.east) - west;
  const spanY = north - mercator(extent.south);

  // Pixels per earth radius: the smaller of the two fits so both spans stay inside.
  const scale = Math.min(viewport.width / spanX, viewport.height / spanY);
  const width = spanX * scale;
  const height = spanY * scale;
  const frame: Rect = {
    x: viewport.x + (viewport.width - width) / 2,
    y: viewport.y + (viewport.height - height) / 2,
    width,
    height,
  };

  return {
    frame,
    project(lat, lon) {
      return {
        x: frame.x + (toRadians(lon) - west) * scale,
        y: frame.y + (north - mercator(lat)) * scale,
      };
    },
    unproject(x, y) {
      const northing = north - (y - frame.y) / scale;
      return {
        lat: toDegrees(2 * Math.atan(Math.exp(northing)) - Math.PI / 2),
        lon: toDegrees(west + (x - frame.x) / scale),
      };
    },
    metresPerPixel(lat) {
      // One pixel is 1/scale earth radii of Mercator easting; on the ground that is shortened by cos(lat).
      return (EARTH_RADIUS_METRES * Math.cos(toRadians(lat))) / scale;
    },
  };
}
