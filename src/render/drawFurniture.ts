/**
 * Furniture (ADR-0005, ADR-0009): the plate border, the compass rose with the
 * wind blowing across it, the battle title, the scale bar, the always-on
 * legend, and the map's credit line. North is always up. Drawn after the
 * picture, inside the frame, with nothing clipped.
 *
 * A **shared pass**: the furniture set and which corner each piece sits in are
 * fixed across views (#58), so no view replaces this. It draws in the view's
 * ink and, for the legend's samples and line rows, in the view's glyph and
 * pens — which is the whole reason Atlas's legend shows blocks without this
 * file knowing Atlas exists.
 */
import type { Wind, WindForce } from "../schema/types.ts";
import type { Plate } from "./plate.ts";
import { drawArrow, drawPlateRule, type Point } from "./primitives.ts";
import { toRadians } from "./projection.ts";
import { METRES_PER_UNIT, scaleBarLength, UNIT_LABEL } from "./scaleBar.ts";
import { font, STATES } from "./style.ts";
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

export function drawFurniture(plate: Plate): void {
  drawPlateBorder(plate);
  drawCompassRose(plate, plate.picture.wind);
  drawTitle(plate);
  const scaleTop = drawScaleBar(plate);
  drawLegend(plate, scaleTop - LEGEND_GAP);
  drawCredit(plate);
}

/** A double rule at the extent's edge, where the letterbox begins. */
function drawPlateBorder({ ctx, view, projection: { extentRect } }: Plate): void {
  drawPlateRule(ctx, extentRect, view.palette.ink);
}

function drawCompassRose(plate: Plate, wind: Wind | undefined): void {
  const { ctx } = plate;
  const ink = plate.view.palette.ink;
  const frame = plate.projection.extentRect;
  const cx = frame.x + 74;
  const cy = frame.y + 78;

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

  if (wind !== undefined) {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.font = font(13, true);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const text = wind.force === "calm" || wind.from === undefined ? "Wind calm" : `Wind ${compassPoint(wind.from)}, ${wind.force}`;
    ctx.fillText(text, cx + ROSE_RADIUS + 34, cy - 8);
    ctx.restore();
  }
}

/** The battle's title, top right, as the plate's cartouche. */
function drawTitle({ ctx, battle, view, projection: { extentRect: frame } }: Plate): void {
  ctx.save();
  ctx.fillStyle = view.palette.ink;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = font(22);
  ctx.fillText(battle.title, frame.x + frame.width - 22, frame.y + 18);
  ctx.restore();
}

/** The scale bar, bottom left, in the battle's unit. Returns the y of its label's top so the legend can sit above it. */
function drawScaleBar(plate: Plate): number {
  const { ctx, battle } = plate;
  const ink = plate.view.palette.ink;
  const frame = plate.projection.extentRect;
  const unit = battle.scale_unit;
  const pixelsPerUnit = METRES_PER_UNIT[unit] * plate.pixelsPerMetre;
  const bar = scaleBarLength({ pixelsPerUnit, maxPixels: Math.max(40, Math.min(180, frame.width / 4)) });

  const x = frame.x + MARGIN;
  const y = frame.y + frame.height - MARGIN;
  const label = `${bar.units} ${bar.units === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many}`;

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
/** The legend's samples are drawn small, so a glyph knows to leave off its finest detail. */
const LEGEND_SCALE = 0.75;

/** The always-on legend: each side's colour and name, the four state glyphs, the three line styles. Its bottom sits at `bottom`. */
function drawLegend(plate: Plate, bottom: number): void {
  const { ctx, colours, view } = plate;
  const { palette, pens, glyph } = view;
  const frame = plate.projection.extentRect;
  const rows = colours.size + STATES.length + 3;
  const height = rows * LEGEND_ROW + 16;
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

  /** A sample of the view's own glyph, laid across the row. No wind in the legend. */
  const sample = (state: (typeof STATES)[number], strength: number, colour: string, seed: number): void => {
    const c = sampleCentre();
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 2);
    const request = {
      length: LEGEND_SAMPLE - 6,
      formation: "column",
      state,
      strength,
      colour,
      seed,
      scale: LEGEND_SCALE,
      windTo: undefined,
      palette,
    } as const;
    glyph.mark?.(ctx, request);
    glyph.body(ctx, request);
    ctx.restore();
  };

  ctx.font = font(12, true);
  for (const [side, colour] of colours) {
    sample("intact", 1, colour, 1);
    ctx.fillStyle = colour;
    ctx.fillText(side, textX, rowY);
    rowY += LEGEND_ROW;
  }

  ctx.fillStyle = palette.ink;
  for (const state of STATES) {
    sample(state, state === "broken" ? 0.4 : 1, palette.ink, 3);
    ctx.fillStyle = palette.ink;
    ctx.fillText(state, textX, rowY);
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

/** The map file's attribution, bottom right, whenever a map is loaded and has one (ADR-0007). */
function drawCredit({ ctx, map, view, projection: { extentRect: frame } }: Plate): void {
  const credit = map?.attribution;
  if (credit === undefined || credit === "") return;
  ctx.save();
  ctx.fillStyle = view.palette.ink;
  ctx.font = font(11, true);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(credit, frame.x + frame.width - 14, frame.y + frame.height - 12);
  ctx.restore();
}
