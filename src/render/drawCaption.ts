/**
 * The caption band (ADR-0009): full width along the bottom, ink-ruled, in the
 * plate face. Left, the battle clock and the current phase's date; right, the
 * phase label, the caption word-wrapped, and beneath it the reference labels.
 * Part of the picture, so a screenshot stands alone.
 *
 * A **shared pass**: the band's anatomy is fixed across views (#58), so a view
 * changes only the paper and ink it is drawn in. What the *width* changes is a
 * different question, answered once in `layout.ts` (#86): on a phone the band
 * has no clock column to set the prose beside, so the clock takes a line of
 * its own with the date beside it — and the date line is where the battle's
 * title goes when it comes off the plate — and the label, the caption and the
 * sources run the whole width beneath.
 */
import type { Battle } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import type { LayoutMode } from "./layout.ts";
import { font } from "./style.ts";
import type { Palette } from "./view.ts";
import { formatClock, wrapText } from "./text.ts";

const PAD_X = 24;
const PAD_Y = 14;
const CLOCK_COLUMN = 150;
const LABEL_LINE = 18;
const CAPTION_LINE = 20;
const SOURCES_LINE = 18;
const CAPTION_SIZE = 15;
const MIN_HEIGHT = 74;

/**
 * The phone band, as the Phone board sets it: tighter pads, a smaller clock
 * with the date and title beside it on one header line, and the prose the
 * whole width beneath. The type is smaller than the desktop band's because the
 * measure is a third of the width; the unit card, which is read rather than
 * scanned, keeps its desktop sizes (#60).
 */
const PHONE_PAD_X = 14;
const PHONE_PAD_Y = 12;
const PHONE_CLOCK_SIZE = 20;
/** Where the date line starts: clear of the clock, which is the widest "23:59" runs. */
const PHONE_DATE_INDENT = 66;
const PHONE_DATE_SIZE = 12;
const PHONE_DATE_LINE = 15;
/** The header the clock and the date share, and the least it ever stands. */
const PHONE_HEADER = 30;
const PHONE_LABEL_SIZE = 11;
const PHONE_LABEL_LINE = 18;
const PHONE_CAPTION_SIZE = 13;
const PHONE_CAPTION_LINE = 17;
const PHONE_SOURCES_LINE = 16;

export interface CaptionLayout {
  height: number;
  lines: string[];
  /** The phase label, upper case and wrapped to the text column. */
  labelLines: string[];
  /** The sources credit, already wrapped to the text column; empty when the phase cites none. */
  sourceLines: string[];
  /**
   * The date line, wrapped: on a desktop the phase's date alone, on a phone
   * the date with the battle's title after it, because the title has left the
   * plate for the band (#86).
   */
  dateLines: string[];
  /** How deep the clock's line stands, which is what the prose beneath it hangs from. Phone only. */
  headerHeight: number;
}

/** The date of the day the phase falls on. Rule 5 gives a validated battle one `dates` entry per day, so the fallback is unreachable. */
function dateOf(battle: Battle, picture: Picture): string {
  return battle.dates[picture.phase.day ?? 0] ?? "";
}

/** Measures the band for a canvas `width`: wraps the caption so the height is known before the projection is fitted. */
export function layoutCaption(ctx: CanvasRenderingContext2D, battle: Battle, picture: Picture, width: number, mode: LayoutMode): CaptionLayout {
  const phone = mode === "phone";
  const padX = phone ? PHONE_PAD_X : PAD_X;
  ctx.save();
  const textWidth = phone ? Math.max(80, width - padX * 2) : Math.max(80, width - padX * 2 - CLOCK_COLUMN);
  const measure = (text: string): number => ctx.measureText(text).width;

  ctx.font = font(phone ? PHONE_LABEL_SIZE : 12);
  const labelLines = wrapText(picture.label.toUpperCase(), textWidth, measure);

  ctx.font = font(phone ? PHONE_CAPTION_SIZE : CAPTION_SIZE);
  const lines = wrapText(picture.caption, textWidth, measure);

  // The title rides the date line on a phone, and stays on the plate on a
  // desktop, where the date is the only thing this line ever says.
  const date = dateOf(battle, picture);
  ctx.font = font(PHONE_DATE_SIZE, true);
  const dateLines = phone ? wrapText(`${date} · ${battle.title}`, Math.max(80, width - padX * 2 - PHONE_DATE_INDENT), measure) : [date];

  const labels = new Set<string>();
  for (const reference of picture.references) {
    labels.add(battle.sources[reference.source]?.label ?? reference.source);
  }
  const sources = [...labels].join(", ");
  // The credit wraps like the caption: on a narrow plate it is longer than the
  // column, and an unwrapped line runs off the edge of the picture.
  ctx.font = font(12, true);
  const sourceLines = sources === "" ? [] : wrapText(`— ${sources}`, textWidth, measure);
  ctx.restore();

  // A phone's header is the clock's own line, or deeper when a long title has
  // wrapped the date beside it on to a second one.
  const headerHeight = phone ? Math.max(PHONE_HEADER, 6 + dateLines.length * PHONE_DATE_LINE) : 0;
  const height = phone
    ? Math.max(
        MIN_HEIGHT,
        PHONE_PAD_Y * 2 + headerHeight + labelLines.length * PHONE_LABEL_LINE + lines.length * PHONE_CAPTION_LINE + sourceLines.length * PHONE_SOURCES_LINE,
      )
    : Math.max(MIN_HEIGHT, PAD_Y * 2 + labelLines.length * LABEL_LINE + lines.length * CAPTION_LINE + sourceLines.length * SOURCES_LINE);
  return { height, lines, labelLines, sourceLines, dateLines, headerHeight };
}

/** Draws the band across `[0, width]` with its top at `top`. */
export function drawCaption(
  ctx: CanvasRenderingContext2D,
  picture: Picture,
  layout: CaptionLayout,
  top: number,
  width: number,
  palette: Palette,
  mode: LayoutMode,
): void {
  ctx.save();
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, top, width, layout.height);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, top + 0.5);
  ctx.lineTo(width, top + 0.5);
  ctx.moveTo(0, top + 3.5);
  ctx.lineTo(width, top + 3.5);
  ctx.stroke();

  ctx.fillStyle = palette.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  if (mode === "phone") drawPhoneBand(ctx, picture, layout, top);
  else drawDesktopBand(ctx, picture, layout, top);
  ctx.restore();
}

/**
 * Left, the clock, large, and the date beneath it. The date is the current
 * phase's day, so it advances with a battle that crosses midnight (ADR-0013).
 * Right, the phase label, the caption, the sources.
 */
function drawDesktopBand(ctx: CanvasRenderingContext2D, picture: Picture, layout: CaptionLayout, top: number): void {
  ctx.font = font(26);
  ctx.fillText(formatClock(picture.clock), PAD_X, top + PAD_Y + 2);
  ctx.font = font(13, true);
  ctx.fillText(layout.dateLines[0] ?? "", PAD_X, top + PAD_Y + 36);

  const x = PAD_X + CLOCK_COLUMN;
  let y = top + PAD_Y;
  ctx.font = font(12);
  for (const line of layout.labelLines) {
    ctx.fillText(line, x, y);
    y += LABEL_LINE;
  }
  ctx.font = font(CAPTION_SIZE);
  for (const line of layout.lines) {
    ctx.fillText(line, x, y);
    y += CAPTION_LINE;
  }
  ctx.font = font(12, true);
  y += 2;
  for (const line of layout.sourceLines) {
    ctx.fillText(line, x, y);
    y += SOURCES_LINE;
  }
}

/**
 * The clock on its own line with the date and the title beside it, and the
 * label, the caption and the sources the whole width beneath (#86). Nothing is
 * dropped: a phone reads the same band a desktop does, set down the page
 * instead of across it.
 */
function drawPhoneBand(ctx: CanvasRenderingContext2D, picture: Picture, layout: CaptionLayout, top: number): void {
  ctx.font = font(PHONE_CLOCK_SIZE);
  ctx.fillText(formatClock(picture.clock), PHONE_PAD_X, top + PHONE_PAD_Y);

  ctx.font = font(PHONE_DATE_SIZE, true);
  let dateY = top + PHONE_PAD_Y + 5;
  for (const line of layout.dateLines) {
    ctx.fillText(line, PHONE_PAD_X + PHONE_DATE_INDENT, dateY);
    dateY += PHONE_DATE_LINE;
  }

  let y = top + PHONE_PAD_Y + layout.headerHeight;
  ctx.font = font(PHONE_LABEL_SIZE);
  for (const line of layout.labelLines) {
    ctx.fillText(line, PHONE_PAD_X, y);
    y += PHONE_LABEL_LINE;
  }
  ctx.font = font(PHONE_CAPTION_SIZE);
  for (const line of layout.lines) {
    ctx.fillText(line, PHONE_PAD_X, y);
    y += PHONE_CAPTION_LINE;
  }
  ctx.font = font(12, true);
  y += 2;
  for (const line of layout.sourceLines) {
    ctx.fillText(line, PHONE_PAD_X, y);
    y += PHONE_SOURCES_LINE;
  }
}
