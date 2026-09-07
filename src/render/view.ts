/**
 * What a view *is*: the seam itself (ADR-0014, which supersedes ADR-0009's
 * single chart plate). The views there are live in `views.ts`, so a glyph
 * module can depend on this file without depending on the views built from it.
 *
 * A **view** is a named whole visual treatment of the picture that the viewer
 * picks. Every view is built from the one engraved system (#58): the typeface
 * and ramp, the side order, the furniture set and its corners, the glyph's
 * meaning, north up. What a view owns is exactly what this file carries:
 *
 *   - a **palette**: the paper, ink, land, letterbox, panel, coast and stipple
 *     values, and the side inks re-tuned to them;
 *   - **pens**: the three motion line styles' weights and heads (never their
 *     colours, which come from the palette and the side inks);
 *   - a **glyph**: the one drawing pass a view replaces wholesale — how a unit
 *     is drawn and, inside it, how engaged is shown.
 *
 * Everything else is a shared pass parameterised by the palette. Nothing here
 * comes from data: a view is never authored in a battle file.
 */
import type { Arm, Formation, UnitState } from "../schema/types.ts";

/** The view's key: what player state holds and the View chooser sets. */
export type ViewId = "plate" | "night" | "atlas";

/**
 * What one viewer chose, for one frame. Per-frame viewer state, never renderer
 * state: the renderer holds nothing but its canvases, and two viewers of the
 * same instant hold the same picture and different viewers of it. The unit
 * card extends this object in its own slice.
 */
export interface Viewer {
  view: ViewId;
  /**
   * The depth of the unit tree to draw: `0` is the coarsest. Every unit has a
   * picture at every level, so this narrows what is drawn and nothing else
   * (ADR-0017, schema.md 2.11).
   */
  level: number;
}

/** The materials a view is drawn in. */
export interface Palette {
  ink: string;
  /** The sea, the caption band, and the canvas ground. */
  paper: string;
  land: string;
  /** Outside the extent, so the plate's edge reads. */
  letterbox: string;
  /** The legend's ground: the paper, nearly opaque. */
  panel: string;
  /** The coastline's stroke, and the tone its inward shading is built from. */
  coast: string;
  /** The sea's mottle; `undefined` leaves the paper flat. */
  stipple: string | undefined;
  /** How heavily relief is laid on: the one thing a view re-tunes about the map pass. */
  relief: ReliefInks;
  /** Side inks by roster order. Order and hue family are fixed across views; the values are not. */
  sides: readonly string[];
}

/**
 * The alphas relief is inked at, all of them the palette's own ink (#62). The
 * two contour weights are fixed across views and only these alphas move, which
 * is why they sit on the palette: it keeps the map pass shared, with no pass
 * anywhere testing a view id.
 */
export interface ReliefInks {
  /** Every contour, at the fine weight. */
  contour: number;
  /** Every fifth level, at the heavy weight. */
  index: number;
  /** The numeral an index contour is labelled with, on its paper knock-out. */
  numeral: number;
  /** Ink per tint band under the contours; `undefined` lays no bands, which is every view but Atlas. */
  band: number | undefined;
}

/** Arrow head shapes: `open` is two pen strokes, `filled` a solid barb. */
export type ArrowHead = "open" | "filled";

/** One motion line's weight and head. The colour is the palette's, never the pen's. */
export interface Pen {
  width: number;
  dash: readonly number[];
  head: ArrowHead;
  headSize: number;
}

/** The three motion styles, which must stay tellable apart when they overlap (ADR-0009). */
export interface Pens {
  track: Pen;
  intent: Pen;
  detachment: Pen;
}

/** What a glyph pass is handed for one unit, at the origin and heading up. */
export interface GlyphRequest {
  /** The long axis in pixels: the plate constant, the same for every arm on every screen (ADR-0016). */
  length: number;
  formation: Formation;
  /** What the unit is made of, so the glyph picks the sign it draws it in (ADR-0015). */
  arm: Arm;
  state: UnitState;
  /** `0` to `1`: the fraction of the unit still fighting. */
  strength: number;
  /** The unit's side ink, already resolved from the palette. */
  colour: string;
  /** Seeds anything random, so nothing shimmers from one frame to the next. */
  seed: number;
  /** Size multiplier: `1` on the plate, smaller for the legend's sample. */
  scale: number;
  /**
   * Where the wind blows *to*, in radians clockwise from the unit's heading.
   * The glyph is drawn heading-up at the origin, so this is the whole of what
   * it ever learns about the wind: no degrees true, no projection, no picture.
   * `undefined` when the phase has no wind, the wind is calm, or the caller is
   * the legend.
   */
  windTo: number | undefined;
  /** The view's materials, so a glyph can draw in the ink it sits on. */
  palette: Palette;
}

/** Half the box a sign is drawn inside, from its centre outward. */
export interface SignBox {
  x: number;
  y: number;
}

/**
 * The repeated shape one view draws one arm in, at the origin heading up, in
 * the ink and weight the caller has already set on the context. `half` is the
 * box it fills: one sign's footprint on the plate, the whole block in Atlas.
 */
export type Sign = (ctx: CanvasRenderingContext2D, half: SignBox, scale: number) => void;

/**
 * How a view draws a unit: the one pass a view replaces wholesale, in two
 * halves.
 *
 * The halves exist because an engaged mark is wider than the unit and, in the
 * plate's case, opaque — so a melee draws one unit's smoke over the next
 * unit's ships unless every mark is laid down before any body. The units pass
 * therefore runs `mark` for every unit, then `body` for every unit, which is
 * the difference between Trafalgar at 13:30 reading and not.
 */
export interface Glyph {
  /**
   * The view's sign for every arm there is. Keyed by `Arm`, so a new arm does
   * not compile until each view has drawn it: a view that cannot tell foot
   * from horse is a broken view, not a degraded one, and there is no fallback
   * sign (ADR-0015).
   */
  signs: Record<Arm, Sign>;
  /**
   * What the unit's state puts on the plate around it: the plate's smoke, the
   * Atlas hatching. Drawn under every unit's body, not just its own. Omitted
   * by a view whose glyph has nothing to lay down first.
   */
  mark?(ctx: CanvasRenderingContext2D, request: GlyphRequest): void;
  /** The unit itself, at the origin, heading up the negative y axis. The caller has rotated. */
  body(ctx: CanvasRenderingContext2D, request: GlyphRequest): void;
  /**
   * Half the glyph's extent across its long axis, in pixels: the one number
   * the shared label pass needs from a glyph in order to clear it. A `mass`
   * answers for two ranks, so the label clears the rear one (ADR-0016).
   */
  halfWidth(scale: number, formation: Formation): number;
}

/** A named whole visual treatment of the picture. */
export interface View {
  id: ViewId;
  /** What the View chooser shows. Never drawn on the plate. */
  name: string;
  palette: Palette;
  pens: Pens;
  glyph: Glyph;
}
