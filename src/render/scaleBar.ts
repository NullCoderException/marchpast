/**
 * The scale bar's length: the largest round distance in the battle's
 * `scale_unit` that fits a pixel budget, computed from the projection's scale
 * at the extent's centre latitude. Pure maths; the drawing lives in the
 * furniture module.
 */
import type { Battle } from "../schema/types.ts";

/** Metres in one of each display unit. */
export const METRES_PER_UNIT: Readonly<Record<Battle["scale_unit"], number>> = {
  nmi: 1852,
  km: 1000,
};

/** How each unit is written on the bar. */
export const UNIT_LABEL: Readonly<Record<Battle["scale_unit"], { one: string; many: string }>> = {
  nmi: { one: "nautical mile", many: "nautical miles" },
  km: { one: "kilometre", many: "kilometres" },
};

const ROUND_MANTISSAS = [1, 2, 5] as const;

export interface ScaleBarLength {
  /** The distance the bar shows, in the battle's unit. */
  units: number;
  /** The bar's length on the canvas. */
  pixels: number;
  /** Which round number `units` is: 1, 2 or 5 times a power of ten. Decides how the bar is divided. */
  mantissa: 1 | 2 | 5;
}

/** The largest 1, 2 or 5 times a power of ten (in units) whose bar is at most `maxPixels` long. */
export function scaleBarLength({ pixelsPerUnit, maxPixels }: { pixelsPerUnit: number; maxPixels: number }): ScaleBarLength {
  const maxUnits = maxPixels / pixelsPerUnit;
  const exponent = Math.floor(Math.log10(maxUnits));
  // Nothing at this decade fits only when maxUnits is just under a power of ten; then 5 of the decade below does.
  let best: { units: number; mantissa: 1 | 2 | 5 } = { units: 10 ** (exponent - 1) * 5, mantissa: 5 };
  for (const mantissa of ROUND_MANTISSAS) {
    const candidate = mantissa * 10 ** exponent;
    // Compare in pixels with a little slack so an exact fit survives floating point.
    if (Math.round(candidate * pixelsPerUnit * 1e6) / 1e6 <= maxPixels) best = { units: candidate, mantissa };
  }
  const units = Number(best.units.toPrecision(12));
  return { units, pixels: Number((units * pixelsPerUnit).toPrecision(12)), mantissa: best.mantissa };
}
