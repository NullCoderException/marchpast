/**
 * The plate with no battle on it: what the page shows while a battle loads and
 * what it shows when the battle cannot be played. The same materials as the
 * renderer (parchment, letterbox, double ink rule, the plate face; ADR-0009),
 * so the two states read as the app rather than as a browser page.
 *
 * Lines are word-wrapped to the plate; when they overrun, the last visible
 * line says how many more there are, since the full list is also logged.
 */
import { fitBackingStore } from "../render/index.ts";
import { INK, LETTERBOX, PARCHMENT, font } from "../render/style.ts";
import { wrapText } from "../render/text.ts";

/** Margin between the canvas edge and the plate, as the renderer's. */
const PLATE_MARGIN = 20;
/** Inset from the plate's rule to its text. */
const PAD = 36;
const HEADING_SIZE = 30;
const LINE_SIZE = 16;
const LINE_HEIGHT = 24;

/** What a notice says: a heading, then lines beneath it. An indented line (leading spaces) keeps its indent. */
export interface Notice {
  heading: string;
  lines: readonly string[];
}

/** Paints `notice` on the canvas at its current CSS size. Call again after a resize. */
export function paintNotice(canvas: HTMLCanvasElement, notice: Notice): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is not available in this browser");
  const { width, height } = fitBackingStore(canvas, ctx);

  const frame = {
    x: PLATE_MARGIN,
    y: PLATE_MARGIN,
    width: Math.max(1, width - PLATE_MARGIN * 2),
    height: Math.max(1, height - PLATE_MARGIN * 2),
  };

  ctx.fillStyle = LETTERBOX;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1);
  ctx.strokeRect(frame.x + 5.5, frame.y + 5.5, frame.width - 11, frame.height - 11);

  const left = frame.x + PAD;
  const maxWidth = Math.max(1, frame.width - PAD * 2);
  let y = frame.y + PAD;

  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = font(HEADING_SIZE);
  for (const line of wrapText(notice.heading, maxWidth, (text) => ctx.measureText(text).width)) {
    ctx.fillText(line, left, y);
    y += HEADING_SIZE * 1.25;
  }
  y += LINE_HEIGHT / 2;

  ctx.font = font(LINE_SIZE);
  const wrapped = notice.lines.flatMap((line) => wrapLine(line, maxWidth, (text) => ctx.measureText(text).width));
  const bottom = frame.y + frame.height - PAD;
  const room = Math.max(1, Math.floor((bottom - y) / LINE_HEIGHT));
  const shown = wrapped.length > room ? wrapped.slice(0, room - 1) : wrapped;
  for (const line of shown) {
    ctx.fillText(line, left, y);
    y += LINE_HEIGHT;
  }
  if (shown.length < wrapped.length) {
    ctx.font = font(LINE_SIZE, true);
    ctx.fillText(`… and ${wrapped.length - shown.length} more; see the console.`, left, y);
  }
}

/** Wraps one line, keeping its leading indent on every continuation line. */
function wrapLine(line: string, maxWidth: number, measure: (text: string) => number): string[] {
  const indent = line.match(/^\s*/)?.[0] ?? "";
  const indentWidth = measure(indent.replaceAll(" ", "\u00a0"));
  return wrapText(line, Math.max(1, maxWidth - indentWidth), measure).map((piece) => `${indent.replaceAll(" ", "\u00a0")}${piece}`);
}
