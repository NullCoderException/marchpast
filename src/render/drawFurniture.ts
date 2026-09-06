/**
 * Furniture (ADR-0005, ADR-0009): the plate border, the compass rose with the
 * wind blowing across it, the battle title, the scale bar, the always-on
 * legend, and the map's credit line. North is always up. Drawn after the
 * picture, inside the frame, with nothing clipped.
 */
import type { Wind, WindForce } from "../schema/types.ts";
import type { Plate } from "./plate.ts";
import { drawArrow, drawGlyph, drawPlateRule, type Point } from "./primitives.ts";
import { toRadians } from "./projection.ts";
import { METRES_PER_UNIT, scaleBarLength, UNIT_LABEL } from "./scaleBar.ts";
import { detachmentStyle, font, INK, INTENT_STYLE, PARCHMENT_PANEL, STATES, TRACK_STYLE } from "./style.ts";
import { compassPoint } from "./text.ts";
import { lastFrame, recordFurniture } from "../prototype/state.ts";
import type { Rect } from "./projection.ts";

/** Feathers on the wind arrow's tail: none at calm, one for light through four for gale (ADR-0008). */
const FEATHERS: Readonly<Record<WindForce, number>> = { calm: 0, light: 1, moderate: 2, fresh: 3, gale: 4 };

const ROSE_RADIUS = 30;
/** Inset of the bottom-left furniture from the extent's edge. */
const MARGIN = 26;
/** Gap between the scale bar's label and the bar, and between the label and the legend above it. */
const SCALE_BAR_LABEL_GAP = 8;
const SCALE_BAR_LABEL_HEIGHT = 14;
const LEGEND_GAP = 14;

export function drawFurniture(plate: Plate): void {
  drawPlateBorder(plate);
  drawCompassRose(plate, plate.picture.wind);
  drawTitle(plate);
  const scaleTop = drawScaleBar(plate);
  drawLegend(plate, scaleTop - LEGEND_GAP);
  drawCredit(plate);
  // PROTOTYPE (#39): the furniture is what the labels have to share the plate with,
  // so its boxes are published for the placer. One frame behind, which nothing can see.
  recordFurniture(furnitureBoxes(plate, scaleTop));
}

/**
 * PROTOTYPE (#39): where the furniture sits, in the same arithmetic the draw
 * passes above use. Throwaway: if the placer keeps furniture in its collision
 * model, the real renderer should return these rather than recompute them.
 */
function furnitureBoxes(plate: Plate, scaleTop: number): Rect[] {
  const { ctx, battle, map } = plate;
  const frame = plate.projection.extentRect;
  const boxes: Rect[] = [];

  ctx.save();

  // The compass rose, its needle, the wind arrow across it and the wind sentence beside it.
  const cx = frame.x + 74;
  const cy = frame.y + 78;
  ctx.font = font(13, true);
  const wind = plate.picture.wind;
  const windText =
    wind === undefined ? 0 : ctx.measureText(wind.force === "calm" || wind.from === undefined ? "Wind calm" : "Wind WNW, moderate").width;
  const roseRight = windText === 0 ? cx + ROSE_RADIUS + 6 : cx + ROSE_RADIUS + 34 + windText + 6;
  boxes.push({ x: cx - ROSE_RADIUS - 28, y: cy - ROSE_RADIUS - 28, width: roseRight - (cx - ROSE_RADIUS - 28), height: (ROSE_RADIUS + 28) * 2 });

  // The title, top right.
  ctx.font = font(22);
  const titleWidth = ctx.measureText(battle.title).width;
  boxes.push({ x: frame.x + frame.width - 22 - titleWidth, y: frame.y + 14, width: titleWidth + 8, height: 32 });

  // The scale bar and its label, bottom left.
  const pixelsPerUnit = METRES_PER_UNIT[battle.scale_unit] * plate.pixelsPerMetre;
  const bar = scaleBarLength({ pixelsPerUnit, maxPixels: Math.max(40, Math.min(180, frame.width / 4)) });
  const barY = frame.y + frame.height - MARGIN;
  boxes.push({ x: frame.x + MARGIN, y: scaleTop, width: Math.max(bar.pixels, 90), height: barY + 8 - scaleTop });

  // The legend panel, sitting above the scale bar.
  const numerals = lastFrame.placed.filter((label) => label.numeral !== undefined).length;
  const rows = plate.colours.size + STATES.length + 3 + numerals;
  const height = rows * LEGEND_ROW + 16;
  const bottom = scaleTop - LEGEND_GAP;
  ctx.font = font(12, true);
  const keyWidth = lastFrame.placed
    .filter((label) => label.numeral !== undefined)
    .reduce((widest, label) => Math.max(widest, ctx.measureText(label.unit.name).width), 0);
  const panelWidth = Math.max(LEGEND_WIDTH, keyWidth + 12 + LEGEND_SAMPLE + 22);
  boxes.push({ x: frame.x + MARGIN, y: bottom - height, width: panelWidth, height });

  // The map credit, bottom right, when there is one.
  const credit = map?.attribution;
  if (credit !== undefined && credit !== "") {
    ctx.font = font(11, true);
    const creditWidth = ctx.measureText(credit).width;
    boxes.push({ x: frame.x + frame.width - 14 - creditWidth, y: frame.y + frame.height - 26, width: creditWidth + 6, height: 20 });
  }

  ctx.restore();
  return boxes;
}

/** A double ink rule at the extent's edge, where the letterbox begins. */
function drawPlateBorder({ ctx, projection: { extentRect } }: Plate): void {
  drawPlateRule(ctx, extentRect);
}

function drawCompassRose(plate: Plate, wind: Wind | undefined): void {
  const { ctx } = plate;
  const frame = plate.projection.extentRect;
  const cx = frame.x + 74;
  const cy = frame.y + 78;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
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
    ctx.strokeStyle = INK;
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

  if (wind !== undefined) {
    ctx.save();
    ctx.fillStyle = INK;
    ctx.font = font(13, true);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const text = wind.force === "calm" || wind.from === undefined ? "Wind calm" : `Wind ${compassPoint(wind.from)}, ${wind.force}`;
    ctx.fillText(text, cx + ROSE_RADIUS + 34, cy - 8);
    ctx.restore();
  }
}

/** The battle's title, top right, as the plate's cartouche. */
function drawTitle({ ctx, battle, projection: { extentRect: frame } }: Plate): void {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = font(22);
  ctx.fillText(battle.title, frame.x + frame.width - 22, frame.y + 18);
  ctx.restore();
}

/** The scale bar, bottom left, in the battle's unit. Returns the y of its label's top so the legend can sit above it. */
function drawScaleBar(plate: Plate): number {
  const { ctx, battle } = plate;
  const frame = plate.projection.extentRect;
  const unit = battle.scale_unit;
  const pixelsPerUnit = METRES_PER_UNIT[unit] * plate.pixelsPerMetre;
  const bar = scaleBarLength({ pixelsPerUnit, maxPixels: Math.max(40, Math.min(180, frame.width / 4)) });

  const x = frame.x + MARGIN;
  const y = frame.y + frame.height - MARGIN;
  const label = `${bar.units} ${bar.units === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many}`;

  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
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
  ctx.font = font(12, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x, y - SCALE_BAR_LABEL_GAP);
  ctx.restore();
  return y - SCALE_BAR_LABEL_GAP - SCALE_BAR_LABEL_HEIGHT;
}

const LEGEND_ROW = 18;
const LEGEND_WIDTH = 168;
const LEGEND_SAMPLE = 40;

/** The always-on legend: each side's colour and name, the four state glyphs, the three line styles. Its bottom sits at `bottom`. */
function drawLegend(plate: Plate, bottom: number): void {
  const { ctx, colours } = plate;
  const frame = plate.projection.extentRect;
  // PROTOTYPE (#39): collapse step 5 puts a numeral beside the glyph, which only
  // means anything if the legend keys it — per frame, for the units collapsed that far.
  const numerals = lastFrame.placed
    .filter((label) => label.numeral !== undefined)
    .sort((a, b) => (a.numeral ?? 0) - (b.numeral ?? 0));
  const rows = colours.size + STATES.length + 3 + numerals.length;
  const height = rows * LEGEND_ROW + 16;
  const x = frame.x + MARGIN;
  const y = bottom - height;
  ctx.save();
  ctx.font = font(12, true);
  const keyWidth = numerals.reduce((widest, label) => Math.max(widest, ctx.measureText(label.unit.name).width), 0);
  ctx.restore();
  const panelWidth = Math.max(LEGEND_WIDTH, keyWidth + 12 + LEGEND_SAMPLE + 22);

  ctx.save();
  ctx.fillStyle = PARCHMENT_PANEL;
  ctx.fillRect(x, y, panelWidth, height);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, panelWidth - 1, height - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const textX = x + 12 + LEGEND_SAMPLE + 10;
  let rowY = y + 8 + LEGEND_ROW / 2;
  const sampleCentre = (): Point => ({ x: x + 12 + LEGEND_SAMPLE / 2, y: rowY });

  ctx.font = font(12, true);
  for (const [side, colour] of colours) {
    const c = sampleCentre();
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 2);
    drawGlyph(ctx, { length: LEGEND_SAMPLE - 6, formation: "column", state: "intact", strength: 1, colour, seed: 1, scale: 0.75 });
    ctx.restore();
    ctx.fillStyle = colour;
    ctx.fillText(side, textX, rowY);
    rowY += LEGEND_ROW;
  }

  ctx.fillStyle = INK;
  for (const state of STATES) {
    const c = sampleCentre();
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 2);
    drawGlyph(ctx, {
      length: LEGEND_SAMPLE - 6,
      formation: "column",
      state,
      strength: state === "broken" ? 0.4 : 1,
      colour: INK,
      seed: 3,
      scale: 0.75,
    });
    ctx.restore();
    ctx.fillText(state, textX, rowY);
    rowY += LEGEND_ROW;
  }

  const firstSide = colours.values().next().value ?? INK;
  const lines: ReadonlyArray<readonly [label: string, style: typeof TRACK_STYLE]> = [
    ["track", TRACK_STYLE],
    ["intent", INTENT_STYLE],
    ["detachment", detachmentStyle(firstSide)],
  ];
  for (const [label, style] of lines) {
    drawArrow(ctx, { x: x + 12, y: rowY }, { x: x + 12 + LEGEND_SAMPLE, y: rowY }, style);
    ctx.fillStyle = INK;
    ctx.fillText(label, textX, rowY);
    rowY += LEGEND_ROW;
  }

  // The numeral key, when any label collapsed that far.
  for (const label of numerals) {
    ctx.font = font(13, true);
    ctx.fillStyle = label.unit.colour;
    ctx.textAlign = "center";
    ctx.fillText(String(label.numeral), x + 12 + LEGEND_SAMPLE / 2, rowY);
    ctx.textAlign = "left";
    ctx.font = font(12, true);
    ctx.fillText(label.unit.name, textX, rowY);
    rowY += LEGEND_ROW;
  }
  ctx.restore();
}

/** The map file's attribution, bottom right, whenever a map is loaded and has one (ADR-0007). */
function drawCredit({ ctx, map, projection: { extentRect: frame } }: Plate): void {
  const credit = map?.attribution;
  if (credit === undefined || credit === "") return;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = font(11, true);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(credit, frame.x + frame.width - 14, frame.y + frame.height - 12);
  ctx.restore();
}
