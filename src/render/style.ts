/**
 * The engraved system: what every view is built from and no view may change
 * (#58). The typeface and its ramp, the rule that sides take their ink by
 * roster order, the glyph's footprint and how long a unit reads on the ground,
 * and the plate's margin.
 *
 * The values a view *does* own — paper, ink, land, letterbox, panel, coast,
 * stipple, the side inks and the pens — live in `view.ts` and `views.ts`, so
 * no pass imports a colour by name. Nothing here comes from data.
 */
import { plateFont } from "../fonts/plate.ts";
import type { Battle, UnitState } from "../schema/types.ts";
import type { Palette } from "./view.ts";

/** Margin between the canvas edge and the plate. */
export const PLATE_MARGIN = 20;

/** Ticks a unit glyph shows at full strength. A renderer constant: no data field carries a ship count. */
export const TICKS_PER_GLYPH = 8;
/** A glyph is never shorter than this on screen, whatever the extent (ADR-0009). */
export const MIN_GLYPH_PX = 72;
/** Nominal true length of a full-strength glyph: eight ships at two cables each. */
export const NOMINAL_GLYPH_NMI = 1.6;
/** Half the footprint of one ship tick, across and along the heading. */
export const TICK_HALF_WIDTH = 2.6;
export const TICK_HALF_HEIGHT = 3.25;

export const STATES: readonly UnitState[] = ["intact", "engaged", "broken", "destroyed"];

/**
 * Colour for every side, keyed by side name, in order of first appearance in
 * the roster. The order and the hue family are fixed across views; the values
 * are the view's, re-tuned to its paper.
 */
export function sideColours(battle: Battle, palette: Palette): Map<string, string> {
  const colours = new Map<string, string>();
  for (const unit of battle.units) {
    if (!colours.has(unit.side)) {
      colours.set(unit.side, palette.sides[colours.size % palette.sides.length] ?? palette.ink);
    }
  }
  return colours;
}

/** The plate face at a size, upright or italic. The bundled face is upright; the browser slants it. */
export function font(sizePx: number, italic = false): string {
  return italic ? `italic ${plateFont(sizePx)}` : plateFont(sizePx);
}

/** A hex colour at an alpha, for the coastline's inward shading. */
export function atAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
