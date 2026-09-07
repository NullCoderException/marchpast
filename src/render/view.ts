/**
 * What a view *is*: the seam itself (ADR-0021, which widens ADR-0014's palette,
 * pens and glyph). The views there are live in `views.ts`, so a hand module can
 * depend on this file without depending on the views built from it.
 *
 * A **view** is a named whole visual treatment of the picture that the viewer
 * picks. What is fixed is the **anatomy** — what the picture shows, where each
 * thing sits and what it means; what a view owns is the **aesthetic**, which is
 * how any of it is drawn. Every pass therefore splits in two: a shared half
 * that decides where things go, and a **hand** the view supplies that draws
 * them.
 *
 * A view is a palette, pens and five hands:
 *
 *   - a **palette**: the paper, ink, land, letterbox, panel, coast and stipple
 *     values, and the side inks re-tuned to them;
 *   - **pens**: the three motion line styles' weights and heads (never their
 *     colours, which come from the palette and the side inks);
 *   - a **glyph**: how a unit is drawn and, inside it, how engaged is shown;
 *   - **type**: the face and the size of each of the eight fixed roles, the
 *     device that tells a name from a fact, and the label's leader;
 *   - **ground**: the sea, the land, the relief treatment, the water and the
 *     named things' marks, drawn in map space through the projection;
 *   - **furniture**: the plate's edge and its five pieces, each handed the
 *     rectangle the shared layout anchored for it, plus the caption band;
 *   - **moves**: the three motion styles drawn between two points.
 *
 * The shared halves are parameterised by the palette and by these hands, and
 * no pass anywhere tests a view id. Nothing here comes from data: a battle
 * file names no view (ADR-0014, as amended on #153).
 */
import type { Arm, Battle, Formation, MapFile, UnitState } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import type { FaceId } from "../fonts/faces.ts";
import type { HitRegion } from "./hit.ts";
import type { MapLabelKind, NumeralRow } from "./labels/index.ts";
import type { LayoutMode } from "./layout.ts";
import type { Plate } from "./plate.ts";
import type { Point } from "./primitives.ts";
import type { Projection, Rect } from "./projection.ts";
import type { ScaleBarLength } from "./scaleBar.ts";

/** The view's key: what player state holds and the View chooser sets. */
export type ViewId = "plate" | "night" | "atlas";

/** The unit whose card is open, and whether a click pinned it there or the pointer is merely resting on it (#60). */
export interface CardTarget {
  /** The roster `units[].id`. */
  id: string;
  /** `true` when a click or tap pinned the card, so the pointer moving off no longer closes it. */
  pinned: boolean;
}

/**
 * What one viewer chose, for one frame. Per-frame viewer state, never renderer
 * state: the renderer holds nothing but its canvases, and two viewers of the
 * same instant hold the same picture and different viewers of it.
 */
export interface Viewer {
  view: ViewId;
  /**
   * The depth of the unit tree to draw: `0` is the coarsest. Every unit has a
   * picture at every level, so this narrows what is drawn and nothing else
   * (ADR-0017, schema.md 2.11).
   */
  level: number;
  /**
   * The unit card the viewer has open, when one is. Viewer-chosen and never
   * authored, like the view and the level; the renderer reads the id and
   * nothing else, since a pinned card and a hovered one are drawn alike (#60).
   */
  card?: CardTarget;
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
  /** How heavily relief is laid on: what a view re-tunes about a shared relief treatment. */
  relief: ReliefInks;
  /** Side inks by roster order. Order and hue family are fixed across views; the values are not. */
  sides: readonly string[];
}

/**
 * The alphas relief is inked at, all of them the palette's own ink (#62). The
 * two contour weights are fixed across the engraved views and only these
 * alphas move, which is why they sit on the palette: it keeps the plate, the
 * night plate and Atlas on one relief hand with no pass testing a view id.
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
export type MoveStyle = "track" | "intent" | "detachment";

/** The pen each motion style is drawn with. */
export type Pens = Readonly<Record<MoveStyle, Pen>>;

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
 * How a view draws a unit: the one pass a view has always replaced wholesale,
 * in two halves.
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
  /**
   * How far the unit's engaged mark reaches past the glyph, downwind: reach
   * along the axis, the same kind of fact as `halfWidth`'s reach across it.
   * It sits here rather than on the anatomy because one view's engaged mark is
   * nothing like another's — the plate's Billow is a plume, and a view whose
   * mark is drawn inside the unit's own footprint answers zero and has its
   * labels clear less (ADR-0021, #139).
   */
  markReach(scale: number, state: UnitState): number;
}

/* ------------------------------------------------------------------ type */

/**
 * The eight roles every view sets type in, in their fixed rank of size. The
 * roles and the rank are the anatomy's; the face, the sizes and the device are
 * the view's (ADR-0021). `TYPE_ROLES` in `anatomy.ts` is the list itself.
 */
export type TypeRole = "clock" | "title" | "caption" | "unitName" | "stateWord" | "legendLine" | "scaleCaption" | "credit";

/**
 * How a run of type reads: a thing's own **name**, or a **fact** about one.
 * The distinction is fixed and the device that carries it is the view's — the
 * engraved views slope a name, the staff map sets it in tracked capitals at
 * 600 (ADR-0021, #139).
 */
export type Voice = "name" | "fact";

/** One run of type as a view sets it: what goes on the context, and how the words are spelled. */
export interface Setting {
  /** For `ctx.font`. */
  font: string;
  /** The size the shared halves lead and measure from. */
  size: number;
  /** For `ctx.letterSpacing`; `"0px"` in a view that tracks nothing. */
  tracking: string;
  /** The words as this view spells them: the plate leaves them alone, a staff map capitalises a name. */
  spell(words: string): string;
}

/** What a leader is drawn between: the label that was placed, and the glyph it belongs to. */
export interface LeaderRequest {
  /** The point on the label's own box the leader leaves from. */
  from: Point;
  /** The whole box the label occupies, for a hand that squares its leader off it. */
  box: Rect;
  /** The glyph's centre, where the leader ends. */
  anchor: Point;
  palette: Palette;
}

/**
 * A view's type: its face, its ramp, its name/fact device and the one drawn
 * mark that is typography rather than picture — the label's leader, which
 * narrows ADR-0021's "the label pass gains no slot of its own" rather than
 * contradicting it (#139).
 */
export interface Type {
  /** The face this view sets everything in, as the face registry keys it. */
  face: FaceId;
  /** How this view sets one of the eight fixed roles, at a layout mode. */
  role(role: TypeRole, mode: LayoutMode): Setting;
  /**
   * The face at any size in one of the two voices: every run the picture sets
   * that is not one of the eight roles — a band's date line, a place's name,
   * a contour's numeral, a card's lines.
   */
  font(sizePx: number, voice: Voice): string;
  /** The line from a placed label to its glyph: the plate's hairline and dot, the staff map's elbow and tick. */
  leader(ctx: CanvasRenderingContext2D, request: LeaderRequest): void;
}

/* ---------------------------------------------------------------- ground */

/** What a ground hand is handed: the map, where it lands, and the materials. */
export interface GroundRequest {
  ctx: CanvasRenderingContext2D;
  /** The battle's map, or nothing when it names none — then only the sea is drawn. */
  map: MapFile | undefined;
  projection: Projection;
  palette: Palette;
  /** Every distinct level the contours are cut at, ascending; empty when the map carries no relief. */
  contourLevels: readonly number[];
}

/** How a view sets a named point's name, and how far the name stands off its mark. */
export interface Naming extends Setting {
  /** The gap between the mark and the name. */
  gap: number;
  /** Half the mark's own footprint, which the name is placed clear of. */
  half: number;
}

/**
 * How a view draws the ground: everything in map space, through the
 * projection, under the units. The shared half keeps the order — the sea,
 * the land, the relief treatment, the water, and the named things last — and
 * the clipping to the extent; every mark inside that order is the view's
 * (ADR-0021, #138).
 *
 * A staff map's kilometre graticule is ground too (#138), and it gets no slot
 * here: it runs over the whole of a ground its own hand draws, so that hand
 * lays it down, and a slot is cut for a view that exists rather than one that
 * might (ADR-0021).
 */
export interface Ground {
  /** The sea inside the extent: the plate's mottled paper, Atlas's flat paper. */
  sea(request: GroundRequest): void;
  /** The land itself and its shore. */
  land(request: GroundRequest): void;
  /** How height is shown: contours weighted by level, illuminated ones, a hypsometric ramp. */
  relief(request: GroundRequest): void;
  /** The water on the land: the shoals and the rivers. */
  water(request: GroundRequest): void;
  /** The mark a named point stands on, drawn at the origin: a place's dot, a work's plan sign. */
  mark(ctx: CanvasRenderingContext2D, kind: MapLabelKind, palette: Palette): void;
  /** How this view sets a named point's name. The placer measures with it and the pass draws with it, so the two cannot disagree. */
  naming(kind: MapLabelKind): Naming;
}

/* ------------------------------------------------------------- furniture */

/** What every furniture hand is handed: the plate being drawn, and the rectangle its corner is measured from. */
export interface FurniturePlace {
  plate: Plate;
  /**
   * The rectangle this mode's furniture hangs from: the extent, or the plate
   * area on a phone, where the extent letterboxes hard (#86).
   */
  frame: Rect;
}

/**
 * One piece of furniture: the paper it stands on — which is also the obstacle
 * a label clears (#39, #62) — and the ink. A view's type moves that box, which
 * is not the layout the anatomy protects; which corner it anchors to is
 * (ADR-0021).
 */
export interface Piece {
  /**
   * The paper this piece is laid on where the ground runs under it, which is
   * the same rectangle a label treats as an obstacle. Nothing when the frame
   * has nothing to put there, or when the piece shares another's corner panel.
   */
  panel(place: FurniturePlace): Rect | undefined;
  draw(place: FurniturePlace): void;
}

/** Where the scale bar landed and what it says, measured by the view before anything is inked. */
export interface ScaleBarPlace {
  /** The bar's left end. */
  x: number;
  /** The bar's own line. */
  y: number;
  /** How long it runs and what round number it shows. */
  bar: ScaleBarLength;
  /** What is written with it. */
  caption: string;
  /** The top of the caption: the key hangs above it in the same corner. */
  captionTop: number;
  /** How wide the caption runs in this view's own face. */
  captionWidth: number;
}

/** What the key is drawn against, and what the scale bar's corner has to make room for. */
export interface LegendPlace {
  /** A row per numeral a label collapsed to this frame (#39). */
  key: readonly NumeralRow[];
  /** Where the scale bar landed: the two share a corner, and the key hangs above its caption. */
  bar: ScaleBarPlace;
  /** A ground that runs under this corner has already been given paper, so the key lays no second one (#62). */
  onPanel: boolean;
}

/** The scale bar: the one piece no mode ever drops, because nothing else says how big the ground is. */
export interface ScaleBarHand {
  /** Where it goes and what it says. Measured first: the key hangs off its caption. */
  layout(place: FurniturePlace): ScaleBarPlace;
  /** The corner's paper. On a desktop it is the bar's corner **and** the key's, because two panels there would show their own seam (#62). */
  panel(place: FurniturePlace, legend: LegendPlace): Rect;
  draw(place: FurniturePlace, bar: ScaleBarPlace): void;
}

/** The key: the full legend on a desktop, the one-line strip of the sides on a phone (#86). */
export interface LegendHand {
  /** The strip's own paper on a phone; nothing on a desktop, where the key stands on the scale bar's corner panel. */
  panel(place: FurniturePlace, legend: LegendPlace): Rect | undefined;
  /** Ink it, and answer the numeral rows' boxes: the one furniture a click acts on (#60). */
  draw(place: FurniturePlace, legend: LegendPlace): HitRegion[];
}

/** What the caption band is measured from. */
export interface CaptionRequest {
  ctx: CanvasRenderingContext2D;
  battle: Battle;
  picture: Picture;
  /** The canvas's whole width: the band runs all of it. */
  width: number;
  mode: LayoutMode;
  palette: Palette;
  /** The view's own type: the clock and the caption are two of the eight roles. */
  type: Type;
}

/**
 * A measured caption band: how deep it stands, and the hand that inks it. The
 * plate is fitted above the band, so the height has to be known before
 * anything is drawn (#107) — and carrying the drawing back as a closure is
 * what lets a view lay the band out however it likes without the shared half
 * learning its layout.
 */
export interface MeasuredCaption {
  /** How deep the band stands. */
  height: number;
  /** Draws it across the canvas's whole width with its top at `top`. */
  draw(top: number): void;
}

/** The caption band: full width below the plate with the clock at the left, drawn however this view sets it. */
export interface CaptionHand {
  measure(request: CaptionRequest): MeasuredCaption;
}

/**
 * How a view draws the furniture: the plate's edge, the paper a piece stands
 * on where the ground runs under it, the five pieces of the closed set, and
 * the caption band. The set and the corner each piece anchors to are the
 * anatomy's; every mark is the view's (ADR-0021).
 */
export interface Furniture {
  /** The plate's edge round the frame: the engraved double rule, a staff map's neat line. */
  border(ctx: CanvasRenderingContext2D, frame: Rect, palette: Palette): void;
  /** The paper a piece is laid on where the ground runs under it (#62). */
  panel(ctx: CanvasRenderingContext2D, box: Rect, palette: Palette): void;
  /** North, with the phase's wind on it: the whole rose, or a needle and a sentence on a phone. */
  compass: Piece;
  /** The battle's title. */
  title: Piece;
  /** The scale bar and its caption. */
  scaleBar: ScaleBarHand;
  /** The key. */
  legend: LegendHand;
  /** The map file's attribution. */
  credit: Piece;
  /** The caption band. */
  caption: CaptionHand;
}

/* ----------------------------------------------------------------- moves */

/** What one motion line is drawn with: the view's own pen for that style, and the ink the anatomy gives it. */
export interface MoveRequest {
  /** This view's pen for this style. A hand whose line is a polygon may ignore the dash. */
  pen: Pen;
  /** The ink: the palette's for a track and an intent, the unit's side for a detachment. */
  colour: string;
  palette: Palette;
}

/** One motion style drawn between two points on the canvas. */
export type MoveLine = (ctx: CanvasRenderingContext2D, from: Point, to: Point, request: MoveRequest) => void;

/**
 * How a view draws the three motion styles. Cut as its own hand on #139
 * against a drawing, exactly as ADR-0021's fifth-slot rule provides: a tapered
 * operations arrow is a width that varies along the shaft, which no `Pen`
 * value produces. `pens` stays what a hand draws *with*; this is the hand.
 * The legend's three line rows sample it, as they already sample the glyph.
 */
export type Moves = Readonly<Record<MoveStyle, MoveLine>>;

/* ------------------------------------------------------------------ view */

/** A named whole visual treatment of the picture. */
export interface View {
  id: ViewId;
  /** What the View chooser shows. Never drawn on the plate. */
  name: string;
  palette: Palette;
  pens: Pens;
  glyph: Glyph;
  type: Type;
  ground: Ground;
  furniture: Furniture;
  moves: Moves;
}
