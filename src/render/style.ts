/**
 * The engraved system: what every view is built from and no view may change
 * (#58). The typeface and its ramp, the rule that sides take their ink by
 * roster order, the footprint of one sign and the glyph's fixed length, and
 * the plate's margin.
 *
 * The values a view *does* own — paper, ink, land, letterbox, panel, coast,
 * stipple, the side inks and the pens — live in `view.ts` and `views.ts`, so
 * no pass imports a colour by name. Nothing here comes from data.
 */
import { plateFont } from "../fonts/plate.ts";
import type { Battle, Formation, UnitState } from "../schema/types.ts";
import type { Point } from "./primitives.ts";
import type { Palette } from "./view.ts";

/** Margin between the canvas edge and the plate. */
export const PLATE_MARGIN = 20;

/** Signs a unit glyph shows at full strength, whatever its arm. A renderer constant: no data field carries a ship count (ADR-0016). */
export const SIGNS_PER_GLYPH = 8;
/**
 * A glyph's long axis, in pixels. A plate constant: the same on every screen,
 * for every arm, on Trafalgar's extent and on Cannae's, because a glyph is a
 * styled label and never geometry (ADR-0016, superseding ADR-0009's nominal
 * true length with a readable floor). The scale bar says how big the field is.
 */
export const GLYPH_PX = 72;
/** Half the footprint one sign fills, across and along the heading. Every arm's sign is drawn inside it. */
export const SIGN_HALF_WIDTH = 2.6;
export const SIGN_HALF_HEIGHT = 3.25;

export const STATES: readonly UnitState[] = ["intact", "engaged", "broken", "destroyed"];

/**
 * How far a unit's engaged mark reaches past its signs, downwind: Billow's
 * plume at its furthest, in plate pixels (#58). The plate's own cloud is drawn
 * in `glyphs/ticks.ts` and a test there holds it inside these numbers; Atlas
 * marks a unit with hatching that is narrower and already inside `halfWidth`.
 *
 * It lives here rather than with the cloud because the label pass is shared
 * across views and may not read one view's glyph (ADR-0014), and because
 * overstating it costs a label one displacement and never a word.
 */
export const MARK_REACH: Readonly<Record<UnitState, number>> = { intact: 0, engaged: 44, broken: 30, destroyed: 0 };

/**
 * A unit's own axes at the origin heading up: `along` its long axis, `across`
 * its flanks. A column runs in line ahead, so its length is the heading; a
 * line runs abreast, so its length is across it, and a mass — wider than it is
 * deep — lies the same way a line does.
 */
export function axes(formation: Formation): { along: Point; across: Point } {
  if (formation === "column") return { along: { x: 0, y: 1 }, across: { x: 1, y: 0 } };
  return { along: { x: 1, y: 0 }, across: { x: 0, y: 1 } };
}

/** How much of the wind's across-hull component survives at the least: the clamp that clears the signs. */
const MIN_ACROSS = 0.5;
/** How much of the wind along the hull survives: damped, so the cloud never runs the length of the unit. */
const ALONG_DAMPING = 0.35;

/**
 * Which flank is the lee one: downwind, but always clear of the signs. The
 * component across the unit's body is never less than half and the component
 * along it is damped, so smoke clears a column running dead downwind (#58,
 * ADR-0008).
 *
 * `windTo` is radians clockwise from the unit's own heading, and the unit is
 * drawn heading-up, so the wind is `(sin, -cos)` of it and nothing here knows
 * north. With no wind the cloud takes the flank the label does not — and that
 * pairing is why this is one answer both read rather than two that can
 * disagree: Billow drifts to it and the label pass prefers the other.
 */
export function leeDrift(windTo: number | undefined, formation: Formation): Point {
  const { along, across } = axes(formation);
  // Written out rather than negated from `across`, which would answer a negative zero.
  if (windTo === undefined) return formation === "column" ? { x: -1, y: 0 } : { x: 0, y: -1 };

  const wind = { x: Math.sin(windTo), y: -Math.cos(windTo) };
  const alongPart = (wind.x * along.x + wind.y * along.y) * ALONG_DAMPING;
  const acrossRaw = wind.x * across.x + wind.y * across.y;
  const acrossPart = Math.abs(acrossRaw) < MIN_ACROSS ? (acrossRaw < 0 ? -MIN_ACROSS : MIN_ACROSS) : acrossRaw;

  const x = along.x * alongPart + across.x * acrossPart;
  const y = along.y * alongPart + across.y * acrossPart;
  const magnitude = Math.hypot(x, y) || 1;
  return { x: x / magnitude, y: y / magnitude };
}

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
