/**
 * PROTOTYPE (#39) — THROWAWAY. Never merge to main.
 *
 * The last plate the renderer built, so the sweep harness can measure with the
 * very projection, glyph length and canvas the eye is looking at.
 */
import type { Plate } from "../render/plate.ts";

export const record: { plate?: Plate } = {};

export function recordPlate(plate: Plate): void {
  record.plate = plate;
}
