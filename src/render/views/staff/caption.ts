/**
 * The staff map's caption band: full width along the bottom with the clock at
 * its left, which is the anatomy's, set as a printed form sets a header —
 * **one heavy rule** above it where the plate doubles a hairline, a **vertical
 * rule** ruling the clock's column off the prose, tabular figures on the clock,
 * and capitals for the date, the phase label and the credit. Not one italic
 * anywhere (#139).
 *
 * Measured and drawn by one hand because the plate is fitted *above* the band,
 * so its height has to be known before anything is inked (#107); the measure
 * carries its drawing back as a closure, which is what lets this view lay the
 * band out however it likes without the shared half learning its layout.
 *
 * On a phone the band has no column to set the prose beside, so the clock takes
 * a line of its own with the date and the battle's title beside it — the title
 * having come off the plate (`layout.ts`, #86) — and the label, the caption and
 * the sources run the whole width beneath.
 *
 * Every slot is measured and drawn through `run.ts`'s one pair, because this
 * band tracks and capitalises: wrapping a line to `ctx.font` alone and then
 * drawing it tracked wraps it short of the column (#175).
 */
import type { Battle } from "../../../schema/types.ts";
import type { Picture } from "../../../timeline/picture.ts";
import type { LayoutMode } from "../../layout.ts";
import { clearRun, setRun } from "../../run.ts";
import { formatClock, wrapText } from "../../text.ts";
import type { CaptionHand, CaptionRequest, MeasuredCaption, Palette, Type } from "../../view.ts";

const PAD_X = 24;
const PAD_Y = 14;
/** Where the rule between the clock's column and the prose stands, and where the prose starts beyond it. */
const CLOCK_RULE_X = 152;
const TEXT_X = 176;
const LABEL_LINE = 20;
const CAPTION_LINE = 20;
const SOURCES_LINE = 18;
const MIN_HEIGHT = 90;
/** How far below the clock's own line the date is set. */
const DATE_DROP = 40;

/** The band's head: one heavy rule, where the engraved plate cuts two hairlines. */
const HEAD_RULE = 3;
/** The column rule: fine and faint, as a printed form rules one field off another. */
const COLUMN_RULE = 0.7;
const COLUMN_RULE_ALPHA = 0.45;
const COLUMN_RULE_TOP = 14;
const COLUMN_RULE_BOTTOM = 12;

/** The phone band, as the collapse leaves it: tighter pads, and the clock's line carrying the date and title. */
const PHONE_PAD_X = 14;
const PHONE_PAD_Y = 12;
const PHONE_DATE_INDENT = 66;
const PHONE_DATE_LINE = 15;
const PHONE_HEADER = 30;
const PHONE_LABEL_LINE = 18;
const PHONE_CAPTION_LINE = 17;
const PHONE_SOURCES_LINE = 16;

/** The band as this view lays it out, before any of it is inked. Exported so this view's own test can read its line breaking. */
export interface CaptionLayout {
  height: number;
  lines: string[];
  labelLines: string[];
  sourceLines: string[];
  dateLines: string[];
  /** How deep the clock's own line stands, which is what the prose beneath it hangs from. Phone only. */
  headerHeight: number;
}

/** The date of the day the phase falls on. Rule 5 gives a validated battle one `dates` entry per day, so the fallback is unreachable. */
function dateOf(battle: Battle, picture: Picture): string {
  return battle.dates[picture.phase.day ?? 0] ?? "";
}

/** Measures the band for a canvas `width`: wraps the caption so the height is known before the projection is fitted. */
export function layoutCaption(
  ctx: CanvasRenderingContext2D,
  battle: Battle,
  picture: Picture,
  width: number,
  mode: LayoutMode,
  type: Type,
): CaptionLayout {
  const phone = mode === "phone";
  const padX = phone ? PHONE_PAD_X : PAD_X;
  const measure = (text: string): number => ctx.measureText(text).width;

  ctx.save();
  const textWidth = phone ? Math.max(80, width - padX * 2) : Math.max(80, width - TEXT_X - padX);

  const label = type.role("legendLine", mode);
  const labelLines = wrapText(setRun(ctx, label, picture.label), textWidth, measure);

  const body = type.role("caption", mode);
  const lines = wrapText(setRun(ctx, body, picture.caption), textWidth, measure);

  // The title rides the date line on a phone, and stays on the plate on a
  // desktop, where the date is the only thing this line ever says.
  const credit = type.role("credit", mode);
  const date = dateOf(battle, picture);
  const dateLine = setRun(ctx, credit, phone ? `${date} · ${battle.title}` : date);
  const dateLines = phone ? wrapText(dateLine, Math.max(80, width - padX * 2 - PHONE_DATE_INDENT), measure) : [dateLine];

  const labels = new Set<string>();
  for (const reference of picture.references) labels.add(battle.sources[reference.source]?.label ?? reference.source);
  const sources = [...labels].join(", ");
  const sourceLines = sources === "" ? [] : wrapText(setRun(ctx, credit, `— ${sources}`), textWidth, measure);
  ctx.restore();
  clearRun(ctx);

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
  type: Type,
): void {
  ctx.save();
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, top, width, layout.height);

  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = HEAD_RULE;
  ctx.beginPath();
  ctx.moveTo(0, top + HEAD_RULE / 2);
  ctx.lineTo(width, top + HEAD_RULE / 2);
  ctx.stroke();

  ctx.fillStyle = palette.ink;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  if (mode === "phone") drawPhoneBand(ctx, picture, layout, top, type);
  else drawDesktopBand(ctx, picture, layout, top, palette, type);
  ctx.restore();
}

/**
 * Left, the clock and the date under it, in their own ruled column; right, the
 * phase label, the caption and the sources. The rule between them is what a
 * printed form does and an engraved plate does not.
 */
function drawDesktopBand(
  ctx: CanvasRenderingContext2D,
  picture: Picture,
  layout: CaptionLayout,
  top: number,
  palette: Palette,
  type: Type,
): void {
  ctx.save();
  ctx.globalAlpha = COLUMN_RULE_ALPHA;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = COLUMN_RULE;
  ctx.beginPath();
  ctx.moveTo(CLOCK_RULE_X, top + COLUMN_RULE_TOP);
  ctx.lineTo(CLOCK_RULE_X, top + layout.height - COLUMN_RULE_BOTTOM);
  ctx.stroke();
  ctx.restore();

  setRun(ctx, type.role("clock", "desktop"));
  ctx.fillText(formatClock(picture.clock), PAD_X, top + PAD_Y);

  const credit = type.role("credit", "desktop");
  setRun(ctx, credit);
  ctx.fillText(layout.dateLines[0] ?? "", PAD_X, top + PAD_Y + DATE_DROP);

  let y = top + PAD_Y;
  setRun(ctx, type.role("legendLine", "desktop"));
  for (const line of layout.labelLines) {
    ctx.fillText(line, TEXT_X, y);
    y += LABEL_LINE;
  }
  setRun(ctx, type.role("caption", "desktop"));
  for (const line of layout.lines) {
    ctx.fillText(line, TEXT_X, y);
    y += CAPTION_LINE;
  }
  setRun(ctx, credit);
  y += 2;
  for (const line of layout.sourceLines) {
    ctx.fillText(line, TEXT_X, y);
    y += SOURCES_LINE;
  }
  clearRun(ctx);
}

/** The clock on its own line with the date and the title beside it, and the prose the whole width beneath (#86). */
function drawPhoneBand(ctx: CanvasRenderingContext2D, picture: Picture, layout: CaptionLayout, top: number, type: Type): void {
  setRun(ctx, type.role("clock", "phone"));
  ctx.fillText(formatClock(picture.clock), PHONE_PAD_X, top + PHONE_PAD_Y);

  const credit = type.role("credit", "phone");
  setRun(ctx, credit);
  let dateY = top + PHONE_PAD_Y + 5;
  for (const line of layout.dateLines) {
    ctx.fillText(line, PHONE_PAD_X + PHONE_DATE_INDENT, dateY);
    dateY += PHONE_DATE_LINE;
  }

  let y = top + PHONE_PAD_Y + layout.headerHeight;
  setRun(ctx, type.role("legendLine", "phone"));
  for (const line of layout.labelLines) {
    ctx.fillText(line, PHONE_PAD_X, y);
    y += PHONE_LABEL_LINE;
  }
  setRun(ctx, type.role("caption", "phone"));
  for (const line of layout.lines) {
    ctx.fillText(line, PHONE_PAD_X, y);
    y += PHONE_CAPTION_LINE;
  }
  setRun(ctx, credit);
  y += 2;
  for (const line of layout.sourceLines) {
    ctx.fillText(line, PHONE_PAD_X, y);
    y += PHONE_SOURCES_LINE;
  }
  clearRun(ctx);
}

export const staffCaption: CaptionHand = {
  measure({ ctx, battle, picture, width, mode, palette, type }: CaptionRequest): MeasuredCaption {
    const layout = layoutCaption(ctx, battle, picture, width, mode, type);
    return {
      height: layout.height,
      draw: (top) => drawCaption(ctx, picture, layout, top, width, palette, mode, type),
    };
  },
};
