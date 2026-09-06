/**
 * The caption band (ADR-0009): full width along the bottom, ink-ruled, in the
 * plate face. Left, the battle clock and date; right, the phase label, the
 * caption word-wrapped, and beneath it the phase's reference source labels.
 * Part of the picture, so a screenshot stands alone.
 */
import type { Battle } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { font, INK, PARCHMENT } from "./style.ts";
import { formatClock, wrapText } from "./text.ts";

const PAD_X = 24;
const PAD_Y = 14;
const CLOCK_COLUMN = 150;
const LABEL_LINE = 18;
const CAPTION_LINE = 20;
const SOURCES_LINE = 18;
const CAPTION_SIZE = 15;
const MIN_HEIGHT = 74;

export interface CaptionLayout {
  height: number;
  lines: string[];
  sources: string;
}

/** Measures the band for a canvas `width`: wraps the caption so the height is known before the projection is fitted. */
export function layoutCaption(ctx: CanvasRenderingContext2D, battle: Battle, picture: Picture, width: number): CaptionLayout {
  ctx.save();
  ctx.font = font(CAPTION_SIZE);
  const textWidth = Math.max(80, width - PAD_X * 2 - CLOCK_COLUMN);
  const lines = wrapText(picture.caption, textWidth, (text) => ctx.measureText(text).width);
  ctx.restore();

  const labels = new Set<string>();
  for (const reference of picture.references) {
    labels.add(battle.sources[reference.source]?.label ?? reference.source);
  }
  const sources = [...labels].join(", ");

  const height = Math.max(MIN_HEIGHT, PAD_Y * 2 + LABEL_LINE + lines.length * CAPTION_LINE + (sources === "" ? 0 : SOURCES_LINE));
  return { height, lines, sources };
}

/** Draws the band across `[0, width]` with its top at `top`. */
export function drawCaption(
  ctx: CanvasRenderingContext2D,
  battle: Battle,
  picture: Picture,
  layout: CaptionLayout,
  top: number,
  width: number,
): void {
  ctx.save();
  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, top, width, layout.height);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, top + 0.5);
  ctx.lineTo(width, top + 0.5);
  ctx.moveTo(0, top + 3.5);
  ctx.lineTo(width, top + 3.5);
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Left: the clock, large, and the date beneath it.
  ctx.font = font(26);
  ctx.fillText(formatClock(picture.clock), PAD_X, top + PAD_Y + 2);
  ctx.font = font(13, true);
  ctx.fillText(battle.date, PAD_X, top + PAD_Y + 36);

  // Right: the phase label, the caption, the sources.
  const x = PAD_X + CLOCK_COLUMN;
  let y = top + PAD_Y;
  ctx.font = font(12);
  ctx.fillText(picture.label.toUpperCase(), x, y);
  y += LABEL_LINE;
  ctx.font = font(CAPTION_SIZE);
  for (const line of layout.lines) {
    ctx.fillText(line, x, y);
    y += CAPTION_LINE;
  }
  if (layout.sources !== "") {
    ctx.font = font(12, true);
    ctx.fillText(`— ${layout.sources}`, x, y + 2);
  }
  ctx.restore();
}
