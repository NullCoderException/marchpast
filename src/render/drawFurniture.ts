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
 * On a plate whose map carries contours the pieces sit on **paper panels**,
 * because relief runs under every corner, and the scale bar carries the
 * contour interval so the legend gains no row (#62). A naval plate — anything
 * whose map has no relief — is drawn exactly as it was.
 */
import type { Arm, Wind, WindForce } from "../schema/types.ts";
import type { Plate } from "./plate.ts";
import { drawArrow, drawPlateRule, type Point } from "./primitives.ts";
import type { Rect } from "./projection.ts";
import { toRadians } from "./projection.ts";
import { contourInterval } from "./relief.ts";
import { METRES_PER_UNIT, scaleBarCaption, scaleBarLength, type ScaleBarLength } from "./scaleBar.ts";
import { font, STATES } from "./style.ts";
import type { GlyphRequest } from "./view.ts";
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

export function drawFurniture(plate: Plate): void {
  drawPlateBorder(plate);
  const scale = layoutScaleBar(plate);
  const legendBottom = scale.labelTop - LEGEND_GAP;
  // Relief runs under every corner, so on a land plate the furniture is given
  // paper first. Unruled: the legend's own rule is the only one there is.
  if (plate.contourLevels.length > 0) drawPanels(plate, scale, legendBottom);
  drawCompassRose(plate, plate.picture.wind);
  drawTitle(plate);
  drawScaleBar(plate, scale);
  drawLegend(plate, legendBottom);
  drawCredit(plate);
}

/** Paper under the rose, the title, the scale bar with the legend, and the credit. Filled and never ruled (#62). */
function drawPanels(plate: Plate, scale: ScaleBarLayout, legendBottom: number): void {
  const { ctx } = plate;
  ctx.save();
  ctx.fillStyle = plate.view.palette.panel;
  for (const panel of [rosePanel(plate), titlePanel(plate), scalePanel(plate, scale, legendBottom), creditPanel(plate)]) {
    if (panel !== undefined) ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  }
  ctx.restore();
}

/** A double rule at the extent's edge, where the letterbox begins. */
function drawPlateBorder({ ctx, view, projection: { extentRect } }: Plate): void {
  drawPlateRule(ctx, extentRect, view.palette.ink);
}

/** Where the rose stands, and where the wind sentence starts beside it: the panel and the drawing have to agree. */
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
function rosePanel(plate: Plate): Rect {
  const frame = plate.projection.extentRect;
  const x = frame.x + 14;
  const y = frame.y + 14;
  const text = windText(plate.picture.wind);
  let right = x + 236;
  if (text !== undefined) {
    plate.ctx.save();
    plate.ctx.font = font(13, true);
    right = Math.max(right, windTextLeft(frame) + plate.ctx.measureText(text).width + PANEL_PAD);
    plate.ctx.restore();
  }
  return { x, y, width: right - x, height: 128 };
}

function drawCompassRose(plate: Plate, wind: Wind | undefined): void {
  const { ctx } = plate;
  const ink = plate.view.palette.ink;
  const frame = plate.projection.extentRect;
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
    ctx.font = font(13, true);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, windTextLeft(frame), windTextTop(frame));
    ctx.restore();
  }
}

const TITLE_SIZE = 22;
const TITLE_RIGHT_INSET = 22;
const TITLE_TOP = 18;

/** The battle's title, top right, as the plate's cartouche. */
function drawTitle({ ctx, battle, view, projection: { extentRect: frame } }: Plate): void {
  ctx.save();
  ctx.fillStyle = view.palette.ink;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = font(TITLE_SIZE);
  ctx.fillText(battle.title, frame.x + frame.width - TITLE_RIGHT_INSET, frame.y + TITLE_TOP);
  ctx.restore();
}

/** Paper behind the title, cut to the title's own width. */
function titlePanel({ ctx, battle, projection: { extentRect: frame } }: Plate): Rect {
  ctx.save();
  ctx.font = font(TITLE_SIZE);
  const width = ctx.measureText(battle.title).width + PANEL_PAD * 2;
  ctx.restore();
  const right = frame.x + frame.width - 10;
  return { x: right - width, y: frame.y + TITLE_TOP - 6, width, height: TITLE_SIZE + 12 };
}

/** Where the scale bar goes and what it says, worked out before anything is drawn so its panel can be laid first. */
interface ScaleBarLayout {
  x: number;
  y: number;
  bar: ScaleBarLength;
  caption: string;
  /** The top of the caption, which is where the legend's bottom hangs from. */
  labelTop: number;
}

function layoutScaleBar(plate: Plate): ScaleBarLayout {
  const frame = plate.projection.extentRect;
  const unit = plate.battle.scale_unit;
  const pixelsPerUnit = METRES_PER_UNIT[unit] * plate.pixelsPerMetre;
  const bar = scaleBarLength({ pixelsPerUnit, maxPixels: Math.max(40, Math.min(180, frame.width / 4)) });
  const y = frame.y + frame.height - MARGIN;
  return {
    x: frame.x + MARGIN,
    y,
    bar,
    caption: scaleBarCaption({ units: bar.units, unit, contourInterval: contourInterval(plate.contourLevels) }),
    labelTop: y - SCALE_BAR_LABEL_GAP - SCALE_BAR_LABEL_HEIGHT,
  };
}

/** The scale bar, bottom left, in the battle's unit, captioned with the contour interval when the map has relief. */
function drawScaleBar(plate: Plate, { x, y, bar, caption }: ScaleBarLayout): void {
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
  ctx.font = font(SCALE_BAR_LABEL_SIZE, true);
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
function scalePanel(plate: Plate, scale: ScaleBarLayout, legendBottom: number): Rect {
  const { ctx } = plate;
  ctx.save();
  ctx.font = font(SCALE_BAR_LABEL_SIZE, true);
  const captionWidth = ctx.measureText(scale.caption).width;
  ctx.restore();
  const x = scale.x - PANEL_PAD;
  const right = Math.max(scale.x + LEGEND_WIDTH, scale.x + scale.bar.pixels, scale.x + captionWidth) + PANEL_PAD;
  const top = legendBottom - legendHeight(plate) - 8;
  return { x, y: top, width: right - x, height: scale.y + 16 - top };
}

const LEGEND_ROW = 18;
const LEGEND_WIDTH = 168;
const LEGEND_SAMPLE = 40;
/** The legend's samples are drawn small, so a glyph knows to leave off its finest detail. */
const LEGEND_SCALE = 0.75;
/** The three motion styles, which the legend always keys: track, intent, detachment. */
const LEGEND_LINE_ROWS = 3;

/**
 * How tall the legend stands, in rows: one per side, one per state, one per arm
 * the roster keys, and one per line style. Exported because the arm rows are
 * the only ones whose count is a decision (ADR-0015), and a decision is worth a
 * test.
 */
export function legendRowCount(sides: number, arms: readonly Arm[]): number {
  return sides + STATES.length + arms.length + LEGEND_LINE_ROWS;
}

/** The same in pixels, padding and all: the panel a land plate lays under the legend has to know before either is drawn. */
function legendHeight(plate: Plate): number {
  return legendRowCount(plate.colours.size, legendArms(plate.battle.units)) * LEGEND_ROW + 16;
}

/**
 * The always-on legend: each side's colour and name, the four state glyphs, one
 * row per arm when the roster has two or more (ADR-0015), and the three line
 * styles. Its bottom sits at `bottom`.
 */
function drawLegend(plate: Plate, bottom: number): void {
  const { ctx, colours, view } = plate;
  const { palette, pens, glyph } = view;
  const frame = plate.projection.extentRect;
  // Trafalgar is all ships, so it keys no arm and its legend is unchanged.
  const arms = legendArms(plate.battle.units);
  // The rows that are not about an arm still have to be drawn in one: the arm
  // most of the battle is made of, so Cannae's states are not ship-ticks.
  const ordinary = legendArm(plate.battle.units);
  const height = legendHeight(plate);
  const x = frame.x + MARGIN;
  const y = bottom - height;

  ctx.save();
  ctx.fillStyle = palette.panel;
  ctx.fillRect(x, y, LEGEND_WIDTH, height);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, LEGEND_WIDTH - 1, height - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const textX = x + 12 + LEGEND_SAMPLE + 10;
  let rowY = y + 8 + LEGEND_ROW / 2;
  const sampleCentre = (): Point => ({ x: x + 12 + LEGEND_SAMPLE / 2, y: rowY });

  /** A sample of the view's own glyph, laid across the row. No wind reaches the legend. */
  const sample = (state: (typeof STATES)[number], strength: number, colour: string, seed: number, arm: Arm): void => {
    const centre = sampleCentre();
    const request: GlyphRequest = {
      length: LEGEND_SAMPLE - 6,
      formation: "column",
      arm,
      state,
      strength,
      colour,
      seed,
      scale: LEGEND_SCALE,
      windTo: undefined,
      palette,
    };
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.rotate(Math.PI / 2);
    glyph.mark?.(ctx, request);
    glyph.body(ctx, request);
    ctx.restore();
  };

  ctx.font = font(12, true);
  for (const [side, colour] of colours) {
    sample("intact", 1, colour, 1, ordinary);
    ctx.fillStyle = colour;
    ctx.fillText(side, textX, rowY);
    rowY += LEGEND_ROW;
  }

  for (const state of STATES) {
    sample(state, state === "broken" ? 0.4 : 1, palette.ink, 3, ordinary);
    ctx.fillStyle = palette.ink;
    ctx.fillText(state, textX, rowY);
    rowY += LEGEND_ROW;
  }

  // Sampled from the view's own glyph, like the state rows: the whole point is
  // that a reader learns this view's foot from this view's horse.
  for (const arm of arms) {
    sample("intact", 1, palette.ink, 5, arm);
    ctx.fillStyle = palette.ink;
    ctx.fillText(arm, textX, rowY);
    rowY += LEGEND_ROW;
  }

  const firstSide = colours.values().next().value ?? palette.ink;
  const lines = [
    ["track", pens.track, palette.ink],
    ["intent", pens.intent, palette.ink],
    ["detachment", pens.detachment, firstSide],
  ] as const;
  for (const [label, pen, colour] of lines) {
    drawArrow(ctx, { x: x + 12, y: rowY }, { x: x + 12 + LEGEND_SAMPLE, y: rowY }, pen, colour);
    ctx.fillStyle = palette.ink;
    ctx.fillText(label, textX, rowY);
    rowY += LEGEND_ROW;
  }
  ctx.restore();
}

const CREDIT_SIZE = 11;
const creditRight = (frame: Rect): number => frame.x + frame.width - 14;
const creditBaseline = (frame: Rect): number => frame.y + frame.height - 12;

/** The map file's attribution, bottom right, whenever a map is loaded and has one (ADR-0007). */
function drawCredit({ ctx, map, view, projection: { extentRect: frame } }: Plate): void {
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
function creditPanel({ ctx, map, projection: { extentRect: frame } }: Plate): Rect | undefined {
  const credit = map?.attribution;
  if (credit === undefined || credit === "") return undefined;
  ctx.save();
  ctx.font = font(CREDIT_SIZE, true);
  const width = ctx.measureText(credit).width + PANEL_PAD;
  ctx.restore();
  const right = creditRight(frame) + 6;
  const baseline = creditBaseline(frame);
  return { x: right - width, y: baseline - CREDIT_SIZE - 2, width, height: CREDIT_SIZE + 6 };
}
