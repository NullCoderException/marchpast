/**
 * The **anatomy**: what the picture shows, where each thing sits and what it
 * means, which is the same in every view and no view may change (ADR-0021).
 * How any of it is *drawn* is the view's, and lives behind the hands in
 * `view.ts`.
 *
 * What is here is the part of the anatomy that is a number or a piece of
 * geometry rather than an order of drawing: the plate's margin, the glyph's
 * fixed length, the four states, the eight type roles in their fixed rank, a
 * unit's own axes, the lee flank a mark drifts to and the label does not, and
 * the rule that sides take their ink by roster order.
 *
 * This file was `style.ts`, "the engraved system: what every view is built
 * from and no view may change". It stopped being that when a view became an
 * aesthetic of its own: what fills a glyph's 72 pixels, what face a role is
 * set in and how far an engaged mark reaches are the engraved views' own
 * answers, and they have gone to the modules that draw them.
 */
import type { Battle, Formation, UnitState } from "../schema/types.ts";
import type { Point } from "./primitives.ts";
import type { MoveStyle, Palette, TypeRole } from "./view.ts";

/** Margin between the canvas edge and the plate. */
export const PLATE_MARGIN = 20;

/**
 * A glyph's long axis, in pixels. A plate constant: the same on every screen,
 * for every arm, on Trafalgar's extent and on Cannae's, because a glyph is a
 * styled label and never geometry (ADR-0016, superseding ADR-0009's nominal
 * true length with a readable floor). It is anatomy and not a view's, because
 * it is the comparability guarantee at unit scale — what makes Trafalgar at
 * 13:30 equally crowded in every view. The scale bar says how big the field is.
 */
export const GLYPH_PX = 72;

export const STATES: readonly UnitState[] = ["intact", "engaged", "broken", "destroyed"];

/**
 * The three motion styles, in the order the legend keys them. They must stay
 * tellable apart when they overlap (ADR-0009); what tells them apart — a pen,
 * or a hand that draws a polygon where another strokes a line — is the view's.
 */
export const MOVE_STYLES: readonly MoveStyle[] = ["track", "intent", "detachment"];

/**
 * The eight roles every view sets type in, in the fixed rank of size the
 * anatomy gives them (ADR-0021). A view answers for all eight — the sizes and
 * the face are its own — and the conformance test holds the rank.
 */
export const TYPE_ROLES: readonly TypeRole[] = [
  "clock",
  "title",
  "caption",
  "unitName",
  "stateWord",
  "legendLine",
  "scaleCaption",
  "credit",
];

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
 * north. With no wind the mark takes the flank the label does not — and that
 * pairing is why this is one answer both read rather than two that can
 * disagree: a mark drifts to it and the label pass prefers the other.
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
