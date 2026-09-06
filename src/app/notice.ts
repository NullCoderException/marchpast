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
import { drawPlateRule } from "../render/primitives.ts";
import { INK, LETTERBOX, PARCHMENT, PLATE_MARGIN, font } from "../render/style.ts";
import { wrapText } from "../render/text.ts";

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

/**
 * Shows `notice` on the canvas and keeps it painted through resizes and zooms.
 * Returns the function that takes it down again, before something else owns
 * the canvas.
 */
export function showNotice(canvas: HTMLCanvasElement, notice: Notice): () => void {
  const paint = (): void => paintNotice(canvas, notice);
  window.addEventListener("resize", paint);
  const stopWatching = watchDevicePixelRatio(paint);
  paint();
  return () => {
    window.removeEventListener("resize", paint);
    stopWatching();
  };
}

/** Paints `notice` once, at the canvas's current CSS size. */
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
  drawPlateRule(ctx, frame);

  const left = frame.x + PAD;
  const maxWidth = Math.max(1, frame.width - PAD * 2);
  const measure = (text: string): number => ctx.measureText(text).width;
  let y = frame.y + PAD;

  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = font(HEADING_SIZE);
  for (const line of wrapText(notice.heading, maxWidth, measure)) {
    ctx.fillText(line, left, y);
    y += HEADING_SIZE * 1.25;
  }
  y += LINE_HEIGHT / 2;

  ctx.font = font(LINE_SIZE);
  const wrapped = notice.lines.flatMap((line) => wrapLine(line, maxWidth, measure));
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

/** Wraps one line, keeping its leading indent on every continuation line. Canvas collapses nothing, but a no-break space measures reliably. */
function wrapLine(line: string, maxWidth: number, measure: (text: string) => number): string[] {
  const indent = (line.match(/^\s*/)?.[0] ?? "").replaceAll(" ", "\u00a0");
  return wrapText(line, Math.max(1, maxWidth - measure(indent)), measure).map((piece) => `${indent}${piece}`);
}

/** Calls `onChange` whenever devicePixelRatio changes (zoom, or a move between monitors), until the returned function is called. */
function watchDevicePixelRatio(onChange: () => void): () => void {
  let query: MediaQueryList | undefined;
  const listenForNextChange = (): void => {
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener("change", handleChange, { once: true });
  };
  const handleChange = (): void => {
    onChange();
    listenForNextChange();
  };
  listenForNextChange();
  return () => query?.removeEventListener("change", handleChange);
}
