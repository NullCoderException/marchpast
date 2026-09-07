/**
 * Furniture (ADR-0005, ADR-0009): the plate border, the compass rose with the
 * wind blowing across it, the battle title, the scale bar, the always-on
 * legend, and the map's credit line. North is always up. Drawn after the
 * picture, inside the frame, with nothing clipped.
 *
 * A **shared pass**: the furniture set and which corner each piece sits in are
 * fixed across views (#58), so no view replaces this. It draws in the view's
 * ink and, for the legend's samples and line rows, with the view's own glyph
 * and pens — which is the whole reason Atlas's legend shows blocks without
 * this file knowing Atlas exists (ADR-0014).
 *
 * What the *width* changes is a different question from what the view does,
 * and it is answered once in `layout.ts` (#86). On a phone the set thins: the
 * title goes to the caption band's date line, the rose becomes a north arrow
 * with the wind sentence beside it, the legend becomes a one-line strip of the
 * sides with its state, arm and line rows in the Details panel, and the credit
 * goes to Details too. The scale bar is the one piece that never goes: nothing
 * else says how big the ground is.
 *
 * A phone's furniture hangs from the **plate area** rather than the extent, as
 * the Phone board draws it: the extent letterboxes hard on a narrow screen,
 * and a scale bar laid inside it would cover the picture it measures. On a
 * desktop the two are all but the same rectangle, and the frame is the extent
 * as it always was.
 *
 * Every piece reports the box it stands in, because the label pass has to
 * clear the furniture as well as the glyphs: without that the very first
 * Cannae frame puts a unit's label across the compass rose (#39). Those boxes
 * are the same rectangles a land plate lays its paper on, so the ink and the
 * obstacle can never disagree about where a piece is.
 *
 * The legend's numeral rows are the one piece of furniture a pointer may act
 * on: a **click** on a numeral row opens that unit's card, which is what
 * rescues a unit whose label has collapsed all the way (#60). So this pass
 * reports their boxes as hit regions, in the same way it reports every piece's
 * box as an obstacle. They answer a click alone: the key is built from the
 * numerals the frame showed, so a card opening takes the numeral — and with it
 * the row — out from under a resting pointer.
 *
 * On a plate whose map carries contours the pieces sit on **paper panels**,
 * because relief runs under every corner, and the scale bar carries the
 * contour interval so the legend gains no row (#62). A naval plate — anything
 * whose map has no relief — is drawn exactly as it was.
 */
import type { Arm, Unit, UnitState, Wind, WindForce } from "../schema/types.ts";
import type { HitRegion } from "./hit.ts";
import { furnitureFor } from "./layout.ts";
import type { NumeralRow } from "./labels/index.ts";
import type { Plate } from "./plate.ts";
import { drawArrow, drawPlateRule, type Point } from "./primitives.ts";
import type { Rect } from "./projection.ts";
import { toRadians } from "./projection.ts";
import { contourInterval } from "./relief.ts";
import { METRES_PER_UNIT, scaleBarCaption, scaleBarLength, type ScaleBarLength } from "./scaleBar.ts";
import { font, STATES } from "./style.ts";
import type { GlyphRequest, Pens, View } from "./view.ts";
import { legendArm, legendArms } from "./glyphs/arms.ts";
import { compassPoint } from "./text.ts";

/** Feathers on the wind arrow's tail: none at calm, one for light through four for gale (ADR-0008). */
const FEATHERS: Readonly<Record<WindForce, number>> = { calm: 0, light: 1, moderate: 2, fresh: 3, gale: 4 };

const ROSE_RADIUS = 30;
/** Inset of the bottom-left furniture from the extent's edge. */
const MARGIN = 26;
/** Gap between the scale bar's label and the bar, and between the label and the legend above it. */
const SCALE_BAR_LABEL_GAP = 8;
const SCALE_BAR_LABEL_HEIGHT = 14;
const LEGEND_GAP = 14;

/** The paper a piece of furniture is given to sit on where relief runs under it: how far the panel stands off the ink. */
const PANEL_PAD = 12;
/** Inset of the rose's panel from the extent's corner, and how deep it stands: the wind arrow's tail reaches past the rose. */
const ROSE_PANEL_INSET = 14;
const ROSE_PANEL_HEIGHT = 128;
/** The rose's panel is never narrower than this, so a calm plate's panel is the same shape as a windy one's. */
const ROSE_PANEL_MIN_WIDTH = 236;
/** Inset of the title's and the credit's panels from the extent's edge: less than the ink's own, so the paper reads as a panel. */
const CORNER_PANEL_INSET = 10;
/** How far a panel stands above and below the line of type it carries. */
const PANEL_LEAD = 6;

export function drawFurniture(plate: Plate, key: readonly NumeralRow[]): HitRegion[] {
  const set = furnitureFor(plate.mode);
  const frame = furnitureFrame(plate);
  drawPlateBorder(plate, frame);
  const scale = layoutScaleBar(plate, frame);
  // Relief runs under every corner, so on a land plate the furniture is given
  // paper first. Unruled: the legend's own rule is the only one there is.
  const onPanels = plate.contourLevels.length > 0;
  if (onPanels) drawPanels(plate, scale, key);

  if (set.compass === "rose") drawCompassRose(plate, frame, plate.picture.wind);
  else drawNorthArrow(plate, frame, plate.picture.wind);
  if (set.title) drawTitle(plate, frame);
  drawScaleBar(plate, scale);
  // Both forms of the legend key the frame's numerals, and both report those
  // rows as hit regions: a phone's strip is where a collapsed label is
  // rescued from, exactly as the desktop legend is (#60).
  const rows =
    set.legend === "full" ? drawLegend(plate, frame, legendBottom(scale), onPanels, key) : drawSideStrip(plate, frame, onPanels, key);
  if (set.credit) drawCredit(plate, frame);
  return rows;
}

/**
 * Every box the furniture occupies, for the label pass to clear (#39). Built
 * from the same rectangles `drawPanels` fills, which bound the ink whether or
 * not a plate paints them, and taking the frame's numeral key because the
 * legend is the one piece whose size the labels decide.
 */
export function furnitureBoxes(plate: Plate, key: readonly NumeralRow[]): Rect[] {
  return furniturePanels(plate, layoutScaleBar(plate, furnitureFrame(plate)), key);
}

/**
 * The rectangle a phone's or a desktop's furniture hangs from: the plate area
 * on a phone, where the extent letterboxes hard, and the extent itself
 * everywhere else.
 */
function furnitureFrame(plate: Plate): Rect {
  return plate.mode === "phone" ? plate.plateArea : plate.projection.extentRect;
}

/** Where the legend's bottom hangs from: the top of the scale bar's caption, a gap above it. */
function legendBottom(scale: ScaleBarLayout): number {
  return scale.labelTop - LEGEND_GAP;
}

/** Every box the mode's furniture stands in, which is both the paper it is laid on and the obstacle a label clears. */
function furniturePanels(plate: Plate, scale: ScaleBarLayout, key: readonly NumeralRow[]): Rect[] {
  const set = furnitureFor(plate.mode);
  const frame = furnitureFrame(plate);
  if (plate.mode === "phone") return [arrowPanel(plate, frame), scalePanelOnly(plate, scale), stripPanel(plate, frame, key)];

  const credit = creditPanel(plate, frame);
  const boxes = [rosePanel(plate, frame), titlePanel(plate, frame), scalePanel(plate, frame, scale, legendBottom(scale), key)];
  return set.credit && credit !== undefined ? [...boxes, credit] : boxes;
}

/** Paper under every piece the mode draws. Filled and never ruled (#62). */
function drawPanels(plate: Plate, scale: ScaleBarLayout, key: readonly NumeralRow[]): void {
  const { ctx } = plate;
  ctx.save();
  ctx.fillStyle = plate.view.palette.panel;
  for (const panel of furniturePanels(plate, scale, key)) ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.restore();
}

/** How wide a line of type runs in a font, without disturbing what the caller had set. */
function textWidth(ctx: CanvasRenderingContext2D, text: string, face: string): number {
  ctx.save();
  ctx.font = face;
  const { width } = ctx.measureText(text);
  ctx.restore();
  return width;
}

/**
 * A double rule at the frame's edge. On a desktop that is the extent's edge,
 * where the letterbox begins; on a phone it is the plate area, so the rule
 * encloses the furniture that stands in the letterbox beside the picture.
 */
function drawPlateBorder({ ctx, view }: Plate, frame: Rect): void {
  drawPlateRule(ctx, frame, view.palette.ink);
}

/** Where the rose stands, and where the wind sentence starts beside it: the panel and the drawing have to agree. */
const WIND_TEXT_SIZE = 13;
const roseCentre = (frame: Rect): Point => ({ x: frame.x + 74, y: frame.y + 78 });
const windTextLeft = (frame: Rect): number => roseCentre(frame).x + ROSE_RADIUS + 34;
const windTextTop = (frame: Rect): number => roseCentre(frame).y - 8;

/** The wind as the rose writes it, or `undefined` when the battle does not track wind. */
function windText(wind: Wind | undefined): string | undefined {
  if (wind === undefined) return undefined;
  return wind.force === "calm" || wind.from === undefined ? "Wind calm" : `Wind ${compassPoint(wind.from)}, ${wind.force}`;
}

/**
 * Paper behind the rose and its wind sentence. Deep enough for the wind
 * arrow's tail, which reaches further than the rose itself, and wide enough
 * for whatever the sentence says.
 */
function rosePanel({ ctx, picture }: Plate, frame: Rect): Rect {
  const x = frame.x + ROSE_PANEL_INSET;
  const y = frame.y + ROSE_PANEL_INSET;
  const text = windText(picture.wind);
  const sentenceRight = text === undefined ? 0 : windTextLeft(frame) + textWidth(ctx, text, font(WIND_TEXT_SIZE, true)) + PANEL_PAD;
  const right = Math.max(x + ROSE_PANEL_MIN_WIDTH, sentenceRight);
  return { x, y, width: right - x, height: ROSE_PANEL_HEIGHT };
}

function drawCompassRose(plate: Plate, frame: Rect, wind: Wind | undefined): void {
  const { ctx } = plate;
  const ink = plate.view.palette.ink;
  const { x: cx, y: cy } = roseCentre(frame);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, ROSE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(0, -ROSE_RADIUS);
    ctx.lineTo(0, i % 4 === 0 ? -20 : -25);
    ctx.stroke();
    ctx.rotate(Math.PI / 8);
  }
  ctx.restore();
  // The north needle.
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(4, -8);
  ctx.lineTo(0, 0);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();
  ctx.font = font(13);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", 0, -46);

  // The wind as a pen arrow blowing across the rose: it points where the wind goes, so flip `from`.
  if (wind !== undefined && wind.force !== "calm" && wind.from !== undefined) {
    ctx.rotate(toRadians(wind.from + 180));
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    const tail = ROSE_RADIUS + 26;
    const head = -(ROSE_RADIUS + 14);
    ctx.beginPath();
    ctx.moveTo(0, tail);
    ctx.lineTo(0, head);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, head + 8);
    ctx.lineTo(0, head);
    ctx.lineTo(5, head + 8);
    ctx.stroke();
    for (let i = 0; i < FEATHERS[wind.force]; i++) {
      ctx.beginPath();
      ctx.moveTo(0, tail - 2 - i * 6);
      ctx.lineTo(-8, tail + 3 - i * 6);
      ctx.stroke();
    }
  }
  ctx.restore();

  const text = windText(wind);
  if (text !== undefined) {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.font = font(WIND_TEXT_SIZE, true);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, windTextLeft(frame), windTextTop(frame));
    ctx.restore();
  }
}

/**
 * The phone's compass: a north needle with its letter, and the wind as a
 * sentence beside it rather than an arrow across a rose (#86). The rose's
 * sixteen points and its feathered arrow need room a 390px plate has not got,
 * and what they say — which way is north, where the wind blows from and how
 * hard — these two say in a fifth of the width.
 */
const ARROW_N_SIZE = 10;
const ARROW_TEXT_SIZE = 11;
const arrowCentre = (frame: Rect): Point => ({ x: frame.x + 22, y: frame.y + 34 });
const arrowTextLeft = (frame: Rect): number => frame.x + 36;

function drawNorthArrow(plate: Plate, frame: Rect, wind: Wind | undefined): void {
  const { ctx } = plate;
  const ink = plate.view.palette.ink;
  const { x: cx, y: cy } = arrowCentre(frame);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(3, 4);
  ctx.lineTo(0, 0);
  ctx.lineTo(-3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = font(ARROW_N_SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", 0, -16);
  ctx.restore();

  const text = windText(wind);
  if (text === undefined) return;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.font = font(ARROW_TEXT_SIZE, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, arrowTextLeft(frame), cy - 2);
  ctx.restore();
}

/** Paper behind the north arrow and its wind sentence, cut to whatever the sentence says. */
function arrowPanel({ ctx, picture }: Plate, frame: Rect): Rect {
  const text = windText(picture.wind);
  const x = frame.x + 8;
  const sentenceRight = text === undefined ? 0 : arrowTextLeft(frame) + textWidth(ctx, text, font(ARROW_TEXT_SIZE, true)) + PANEL_PAD;
  const right = Math.max(x + 40, sentenceRight);
  return { x, y: frame.y + 4, width: right - x, height: 40 };
}

const TITLE_SIZE = 22;
/** Where the title's right edge sits and where its cap-line starts: the panel and the drawing have to agree. */
const titleRight = (frame: Rect): number => frame.x + frame.width - 22;
const titleTop = (frame: Rect): number => frame.y + 18;

/** The battle's title, top right, as the plate's cartouche. */
function drawTitle({ ctx, battle, view }: Plate, frame: Rect): void {
  ctx.save();
  ctx.fillStyle = view.palette.ink;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = font(TITLE_SIZE);
  ctx.fillText(battle.title, titleRight(frame), titleTop(frame));
  ctx.restore();
}

/** Paper behind the title, cut to the title's own width. */
function titlePanel({ ctx, battle }: Plate, frame: Rect): Rect {
  const width = textWidth(ctx, battle.title, font(TITLE_SIZE)) + PANEL_PAD * 2;
  const right = frame.x + frame.width - CORNER_PANEL_INSET;
  return { x: right - width, y: titleTop(frame) - PANEL_LEAD, width, height: TITLE_SIZE + PANEL_LEAD * 2 };
}

/** Where the scale bar goes and what it says, worked out before anything is drawn so its panel can be laid first. */
interface ScaleBarLayout {
  x: number;
  y: number;
  bar: ScaleBarLength;
  caption: string;
  /** The size the caption is set at: smaller on a phone, where it is the only line of type in its corner. */
  captionSize: number;
  /** The top of the caption, which is where the legend's bottom hangs from. */
  labelTop: number;
}

/** The phone's scale bar sits closer in than a desktop's: the corner it is in is a band, not a margin. */
const PHONE_SCALE_INSET_X = 14;
const PHONE_SCALE_INSET_Y = 17;
const PHONE_SCALE_LABEL_SIZE = 10;

function layoutScaleBar(plate: Plate, frame: Rect): ScaleBarLayout {
  const phone = plate.mode === "phone";
  const unit = plate.battle.scale_unit;
  const pixelsPerUnit = METRES_PER_UNIT[unit] * plate.pixelsPerMetre;
  const bar = scaleBarLength({ pixelsPerUnit, maxPixels: Math.max(40, Math.min(180, frame.width / 4)) });
  const y = frame.y + frame.height - (phone ? PHONE_SCALE_INSET_Y : MARGIN);
  const captionSize = phone ? PHONE_SCALE_LABEL_SIZE : SCALE_BAR_LABEL_SIZE;
  return {
    x: frame.x + (phone ? PHONE_SCALE_INSET_X : MARGIN),
    y,
    bar,
    caption: scaleBarCaption({ units: bar.units, unit, contourInterval: contourInterval(plate.contourLevels) }),
    captionSize,
    labelTop: y - SCALE_BAR_LABEL_GAP - (phone ? captionSize + 2 : SCALE_BAR_LABEL_HEIGHT),
  };
}

/** The scale bar, bottom left, in the battle's unit, captioned with the contour interval when the map has relief. */
function drawScaleBar(plate: Plate, { x, y, bar, caption, captionSize }: ScaleBarLayout): void {
  const { ctx } = plate;
  const ink = plate.view.palette.ink;

  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bar.pixels, y);
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 5);
  ctx.moveTo(x + bar.pixels, y - 5);
  ctx.lineTo(x + bar.pixels, y + 5);
  ctx.stroke();
  // A bar of 2 units divides into halves; 1 and 5 divide into fifths.
  const divisions = bar.mantissa === 2 ? 4 : 5;
  for (let i = 1; i < divisions; i++) {
    const tx = x + (bar.pixels * i) / divisions;
    ctx.beginPath();
    ctx.moveTo(tx, y - 3);
    ctx.lineTo(tx, y + 3);
    ctx.stroke();
  }
  ctx.font = font(captionSize, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(caption, x, y - SCALE_BAR_LABEL_GAP);
  ctx.restore();
}

const SCALE_BAR_LABEL_SIZE = 12;

/**
 * One panel behind the legend and the scale bar together: they stand in the
 * same corner, and two panels there would show their own seam.
 */
function scalePanel(plate: Plate, frame: Rect, scale: ScaleBarLayout, bottom: number, key: readonly NumeralRow[]): Rect {
  const captionWidth = textWidth(plate.ctx, scale.caption, font(scale.captionSize, true));
  const widest = Math.max(legendWidth(plate, key), scale.bar.pixels, captionWidth);
  const x = scale.x - PANEL_PAD;
  const top = bottom - legendHeight(plate, key) - PANEL_LEAD;
  // Down to the same corner inset the title's and the credit's panels take, which clears the bar's end ticks.
  const cornerBottom = frame.y + frame.height - CORNER_PANEL_INSET;
  return { x, y: top, width: scale.x + widest + PANEL_PAD - x, height: cornerBottom - top };
}

/** The phone's scale bar stands alone in its corner: the sides' strip is in the other one. */
function scalePanelOnly(plate: Plate, scale: ScaleBarLayout): Rect {
  const captionWidth = textWidth(plate.ctx, scale.caption, font(scale.captionSize, true));
  const widest = Math.max(scale.bar.pixels, captionWidth);
  const x = scale.x - PANEL_PAD / 2;
  const top = scale.labelTop - PANEL_LEAD / 2;
  return { x, y: top, width: scale.x + widest + PANEL_PAD / 2 - x, height: scale.y + 7 - top };
}

const LEGEND_ROW = 18;
const LEGEND_WIDTH = 168;
const LEGEND_SAMPLE = 40;
/** The legend's samples are drawn small, so a glyph knows to leave off its finest detail. */
const LEGEND_SCALE = 0.75;
/** The three motion styles, which the legend always keys: track, intent, detachment. */
const LEGEND_LINE_ROWS = 3;

/** The three motion styles, in the order the legend keys them. */
const LINES: readonly (keyof Pens)[] = ["track", "intent", "detachment"];

/**
 * One row of the plate's key: a sample of the view's own drawing and the word
 * it teaches. The desktop legend draws every kind; a phone's strip draws the
 * sides and the Details panel draws the rest (#86), and both go through this
 * one description so the two can never key the same thing differently.
 */
export type KeyRow =
  | { kind: "side"; side: string; colour: string }
  | { kind: "state"; state: UnitState }
  | { kind: "arm"; arm: Arm }
  | { kind: "line"; line: keyof Pens };

/** A row per side, in roster order, in its own ink. */
export function sideRows(colours: ReadonlyMap<string, string>): KeyRow[] {
  return [...colours].map(([side, colour]) => ({ kind: "side", side, colour }));
}

/**
 * The rows that are not about a side: the four states, one per arm the roster
 * keys (ADR-0015), and the three line styles. These are exactly the rows a
 * phone moves off the plate and into the Details panel (#86).
 */
export function plateKeyRows(units: readonly Unit[]): KeyRow[] {
  return [
    ...STATES.map((state): KeyRow => ({ kind: "state", state })),
    ...legendArms(units).map((arm): KeyRow => ({ kind: "arm", arm })),
    ...LINES.map((line): KeyRow => ({ kind: "line", line })),
  ];
}

/** The word a row teaches. */
export function keyRowLabel(row: KeyRow): string {
  if (row.kind === "side") return row.side;
  if (row.kind === "state") return row.state;
  if (row.kind === "arm") return row.arm;
  return row.line;
}

/** How wide a row's sample is drawn, which is also the length its glyph is given less its margin. */
export const KEY_SAMPLE_WIDTH = LEGEND_SAMPLE;
/** How deep one row stands, sample and word together. */
export const KEY_ROW_HEIGHT = LEGEND_ROW;
/** The scale a key's sample is drawn at, small enough that a glyph leaves off its finest detail. */
export const KEY_SAMPLE_SCALE = LEGEND_SCALE;

/** What a row's sample needs beyond the row itself: where it goes, and the two things a sample is not told by its kind. */
export interface KeySamplePlace {
  left: number;
  centreY: number;
  width: number;
  scale: number;
  /**
   * The arm the rows that are not about an arm are drawn in: the one most of
   * the battle is made of, so Cannae's states are not ship-ticks.
   */
  arm: Arm;
  /** The first side's ink, which the detachment pen is drawn in. */
  firstSide: string;
}

/**
 * A sample of the view's own glyph or pen, laid across a row. No wind reaches
 * a key, so nothing here drifts. Shared by the legend, the phone's side strip
 * and the Details panel, which is why it takes a place rather than reading one
 * off a plate.
 */
export function drawKeyRowSample(ctx: CanvasRenderingContext2D, view: View, row: KeyRow, at: KeySamplePlace): void {
  const { palette, pens, glyph } = view;
  if (row.kind === "line") {
    const colour = row.line === "detachment" ? at.firstSide : palette.ink;
    drawArrow(ctx, { x: at.left, y: at.centreY }, { x: at.left + at.width, y: at.centreY }, pens[row.line], colour);
    return;
  }

  const request: GlyphRequest = {
    length: at.width - 6,
    formation: "column",
    arm: row.kind === "arm" ? row.arm : at.arm,
    state: row.kind === "state" ? row.state : "intact",
    strength: row.kind === "state" && row.state === "broken" ? 0.4 : 1,
    colour: row.kind === "side" ? row.colour : palette.ink,
    seed: row.kind === "side" ? 1 : row.kind === "state" ? 3 : 5,
    scale: at.scale,
    windTo: undefined,
    palette,
  };
  ctx.save();
  ctx.translate(at.left + at.width / 2, at.centreY);
  ctx.rotate(Math.PI / 2);
  glyph.mark?.(ctx, request);
  glyph.body(ctx, request);
  ctx.restore();
}

/**
 * How tall the legend stands, in rows: one per side, one per state, one per arm
 * the roster keys, and one per line style. Exported because the arm rows are
 * the only ones whose count is a decision (ADR-0015), and a decision is worth a
 * test.
 */
export function legendRowCount(sides: number, arms: readonly Arm[], key = 0): number {
  return sides + STATES.length + arms.length + LEGEND_LINE_ROWS + key;
}

/** The same in pixels, padding and all: the panel a land plate lays under the legend has to know before either is drawn. */
function legendHeight(plate: Plate, key: readonly NumeralRow[]): number {
  return legendRowCount(plate.colours.size, legendArms(plate.battle.units), key.length) * LEGEND_ROW + 16;
}

/** Gap between the legend's edge and what it carries. */
const LEGEND_PAD = 12;

/** One row of the numeral key: the numeral the plate showed, and the name it stood in for. */
function keyRow(row: NumeralRow): string {
  return `${row.numeral} · ${row.label}`;
}

/** How wide the legend stands: its own width, or wider when the numeral key has a longer name to carry (#39). */
function legendWidth(plate: Plate, key: readonly NumeralRow[]): number {
  const longest = key.reduce((wide, row) => Math.max(wide, textWidth(plate.ctx, keyRow(row), font(12, true))), 0);
  return Math.max(LEGEND_WIDTH, longest + LEGEND_PAD * 2);
}

/**
 * The always-on legend: each side's colour and name, the four state glyphs, one
 * row per arm when the roster has two or more (ADR-0015), the three line
 * styles, and a row for every numeral a label showed this frame (#39). Its
 * bottom sits at `bottom`.
 *
 * `onPanel` says a land plate has already laid paper under this corner, so the
 * legend draws its rule and not a second ground: the panel is the paper at .92
 * once, not twice over (#62).
 *
 * Returns the numeral rows' boxes, which are the only rows a click opens
 * anything from: the side, state, arm and line rows do nothing (#60).
 */
function drawLegend(plate: Plate, frame: Rect, bottom: number, onPanel: boolean, key: readonly NumeralRow[]): HitRegion[] {
  const { ctx, colours, view } = plate;
  const { palette } = view;
  const place: Omit<KeySamplePlace, "centreY"> = {
    left: frame.x + MARGIN + 12,
    width: LEGEND_SAMPLE,
    scale: LEGEND_SCALE,
    // Trafalgar is all ships, so it keys no arm and its legend is unchanged.
    arm: legendArm(plate.battle.units),
    firstSide: colours.values().next().value ?? palette.ink,
  };
  const height = legendHeight(plate, key);
  const width = legendWidth(plate, key);
  const x = frame.x + MARGIN;
  const y = bottom - height;

  ctx.save();
  if (!onPanel) {
    ctx.fillStyle = palette.panel;
    ctx.fillRect(x, y, width, height);
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = font(12, true);
  const textX = x + 12 + LEGEND_SAMPLE + 10;
  let rowY = y + 8 + LEGEND_ROW / 2;

  for (const row of [...sideRows(colours), ...plateKeyRows(plate.battle.units)]) {
    drawKeyRowSample(ctx, view, row, { ...place, centreY: rowY });
    ctx.fillStyle = row.kind === "side" ? row.colour : palette.ink;
    ctx.fillText(keyRowLabel(row), textX, rowY);
    rowY += LEGEND_ROW;
  }

  // The numeral key: what a label that has collapsed all the way stands for.
  // Nothing is drawn when no label showed a numeral this frame (#39).
  ctx.fillStyle = palette.ink;
  const rows: HitRegion[] = [];
  for (const row of key) {
    ctx.fillText(keyRow(row), x + LEGEND_PAD, rowY);
    rows.push({ id: row.id, box: { x, y: rowY - LEGEND_ROW / 2, width, height: LEGEND_ROW }, hover: false });
    rowY += LEGEND_ROW;
  }
  ctx.restore();
  return rows;
}

/**
 * The phone's legend: one line of the sides, bottom right, opposite the scale
 * bar (#86). Everything else the legend keys — the states, the arms, the line
 * styles — is in the Details panel, which is where a reader who wants the
 * whole key goes. The numeral key is not one of those: a numeral on the plate
 * is unreadable without the name it stands for, so its rows stay here, stacked
 * above the sides, and on the frames where no label has collapsed that far the
 * strip is the one line the board draws.
 *
 * Returns those numeral rows' boxes, as the desktop legend returns its own: a
 * click on one opens that unit's card, which is what rescues a label that has
 * collapsed all the way (#60), and a phone collapses that far far more often.
 */
const STRIP_ROW = 18;
const STRIP_KEY_ROW = 14;
const STRIP_SAMPLE = 16;
const STRIP_SCALE = 0.45;
const STRIP_TEXT_SIZE = 10;
/** Between a side's sample and its name, and between one side's name and the next side's sample. */
const STRIP_SAMPLE_GAP = 4;
const STRIP_SIDE_GAP = 16;
const STRIP_PAD = 6;
/** How far the strip stands off the frame's bottom-right corner. */
const STRIP_INSET_X = 6;
const STRIP_INSET_Y = 12;

/** How wide one side's sample and name run together. */
function stripSideWidth(plate: Plate, side: string): number {
  return STRIP_SAMPLE + STRIP_SAMPLE_GAP + textWidth(plate.ctx, side, font(STRIP_TEXT_SIZE, true));
}

/** The strip's own rectangle, which is both the paper it is drawn on and the obstacle a label clears. */
function stripPanel(plate: Plate, frame: Rect, key: readonly NumeralRow[]): Rect {
  const sides = [...plate.colours.keys()];
  const sidesWidth = sides.reduce((wide, side) => wide + stripSideWidth(plate, side) + STRIP_SIDE_GAP, -STRIP_SIDE_GAP);
  const keyWidth = key.reduce((wide, row) => Math.max(wide, textWidth(plate.ctx, keyRow(row), font(STRIP_TEXT_SIZE, true))), 0);
  const width = Math.max(sidesWidth, keyWidth) + STRIP_PAD * 2;
  const height = STRIP_ROW + key.length * STRIP_KEY_ROW;
  return {
    x: frame.x + frame.width - STRIP_INSET_X - width,
    y: frame.y + frame.height - STRIP_INSET_Y - height,
    width,
    height,
  };
}

function drawSideStrip(plate: Plate, frame: Rect, onPanel: boolean, key: readonly NumeralRow[]): HitRegion[] {
  const { ctx, colours, view } = plate;
  const { palette } = view;
  const panel = stripPanel(plate, frame, key);

  ctx.save();
  if (!onPanel) {
    ctx.fillStyle = palette.panel;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.width - 1, panel.height - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = font(STRIP_TEXT_SIZE, true);

  // The numeral key first, stacked above the sides: the strip grows upward, so
  // the line of sides stays where it is however many numerals a frame shows.
  ctx.fillStyle = palette.ink;
  const rows: HitRegion[] = [];
  let rowY = panel.y + STRIP_KEY_ROW / 2;
  for (const row of key) {
    ctx.fillText(keyRow(row), panel.x + STRIP_PAD, rowY);
    rows.push({ id: row.id, box: { x: panel.x, y: rowY - STRIP_KEY_ROW / 2, width: panel.width, height: STRIP_KEY_ROW }, hover: false });
    rowY += STRIP_KEY_ROW;
  }

  const place: Omit<KeySamplePlace, "centreY" | "left"> = {
    width: STRIP_SAMPLE,
    scale: STRIP_SCALE,
    arm: legendArm(plate.battle.units),
    firstSide: colours.values().next().value ?? palette.ink,
  };
  let x = panel.x + STRIP_PAD;
  const centreY = panel.y + panel.height - STRIP_ROW / 2;
  for (const row of sideRows(colours)) {
    drawKeyRowSample(ctx, view, row, { ...place, left: x, centreY });
    ctx.fillStyle = row.kind === "side" ? row.colour : palette.ink;
    ctx.fillText(keyRowLabel(row), x + STRIP_SAMPLE + STRIP_SAMPLE_GAP, centreY);
    x += stripSideWidth(plate, keyRowLabel(row)) + STRIP_SIDE_GAP;
  }
  ctx.restore();
  return rows;
}

const CREDIT_SIZE = 11;
const creditRight = (frame: Rect): number => frame.x + frame.width - 14;
const creditBaseline = (frame: Rect): number => frame.y + frame.height - 12;

/** The map file's attribution, bottom right, whenever a map is loaded and has one (ADR-0007). */
function drawCredit({ ctx, map, view }: Plate, frame: Rect): void {
  const credit = map?.attribution;
  if (credit === undefined || credit === "") return;
  ctx.save();
  ctx.fillStyle = view.palette.ink;
  ctx.font = font(CREDIT_SIZE, true);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(credit, creditRight(frame), creditBaseline(frame));
  ctx.restore();
}

/** Paper behind the credit line, or nothing when the map carries no credit to draw. */
function creditPanel({ ctx, map }: Plate, frame: Rect): Rect | undefined {
  const credit = map?.attribution;
  if (credit === undefined || credit === "") return undefined;
  const width = textWidth(ctx, credit, font(CREDIT_SIZE, true)) + PANEL_PAD;
  const right = frame.x + frame.width - CORNER_PANEL_INSET;
  const baseline = creditBaseline(frame);
  // The credit sits on its baseline, so its panel hangs from the cap-line above it.
  return { x: right - width, y: baseline - CREDIT_SIZE - 2, width, height: CREDIT_SIZE + PANEL_LEAD };
}
