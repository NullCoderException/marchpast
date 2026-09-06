/**
 * The chart plate's materials and constants (ADR-0009): parchment and ink,
 * side colours by roster order, the tick count per glyph, line styles for the
 * track and the two kinds of move. Nothing here comes from data.
 */
import { plateFont } from "../fonts/plate.ts";
import type { Battle, UnitState } from "../schema/types.ts";

export const INK = "#2b2418";
/** `INK` as an rgb triple, for strokes at an alpha. */
export const INK_RGB = "43,36,24";
/** The sea, and the ground of the whole canvas. */
export const PARCHMENT = "#efe3c6";
/** `PARCHMENT` nearly opaque, for a panel laid over the picture. */
export const PARCHMENT_PANEL = "rgba(239,227,198,0.92)";
/** Land: slightly darker parchment. */
export const LAND = "#e3d3ac";
/** The letterbox outside the extent: a darker tone so the plate's edge reads. */
export const LETTERBOX = "#d9c8a2";
/** Engaged smoke. */
export const SMOKE = "rgba(60,55,50,0.13)";

/** Red ink for the first side in roster order, blue for the second, then a short fixed list. */
const SIDE_INKS = ["#8f2f24", "#24406b", "#3e5a2a", "#6b4a1e", "#5a3a6b", "#2f5f5a"] as const;

/** Colour for every side, keyed by side name, in order of first appearance in the roster. */
export function sideColours(battle: Battle): Map<string, string> {
  const colours = new Map<string, string>();
  for (const unit of battle.units) {
    if (!colours.has(unit.side)) {
      colours.set(unit.side, SIDE_INKS[colours.size % SIDE_INKS.length] ?? INK);
    }
  }
  return colours;
}

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

/** Arrow head shapes: `open` is two pen strokes, `filled` a solid barb. */
export type ArrowHead = "open" | "filled";

export interface LineStyle {
  colour: string;
  width: number;
  dash: number[];
  head: ArrowHead;
  headSize: number;
}

/** The track: a fine dotted ink line with an open head. */
export const TRACK_STYLE: LineStyle = { colour: INK, width: 1.2, dash: [0.1, 4], head: "open", headSize: 7 };
/** An `intent` move: a dashed ink line with an open head. */
export const INTENT_STYLE: LineStyle = { colour: INK, width: 1.2, dash: [8, 5], head: "open", headSize: 9 };
/** A `detachment` move: solid in the side colour with a filled head. */
export function detachmentStyle(sideColour: string): LineStyle {
  return { colour: sideColour, width: 1.8, dash: [], head: "filled", headSize: 11 };
}

/** The plate face at a size, upright or italic. The bundled face is upright; the browser slants it. */
export function font(sizePx: number, italic = false): string {
  return italic ? `italic ${plateFont(sizePx)}` : plateFont(sizePx);
}
