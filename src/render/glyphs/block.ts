/**
 * The Atlas glyph (#58): a unit as a solid block with a heading nose, strength
 * as the filled fraction of it, broken as a dashed outline, destroyed as the
 * outline alone, and engaged as a 45° hatched zone around the block.
 *
 * The second claim the seam makes: a view that draws a unit in a wholly
 * different way replaces this one pass and nothing else. Drawn at the origin
 * heading up the negative y axis; the caller has rotated.
 */
import type { Glyph, GlyphRequest } from "../view.ts";

/** The block's thickness across its long axis. */
const THICKNESS = 10;
/** How far the engaged hatching stands off the block. */
const HATCH_PAD = 7;
/** The heading nose: a small barb on the leading edge, not a taper of the whole
 * block. A full-width nose turns the block into an arrow, and Atlas already has
 * three arrows of its own. */
const NOSE = 4;
const NOSE_HALF_WIDTH = 2.5;

export const block: Glyph = { mark, body, halfWidth: (scale) => (THICKNESS / 2 + HATCH_PAD) * scale };

/** The hatched engaged zone, laid down before any unit's block so it never veils one. */
function mark(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  if (request.state !== "engaged") return;
  const { length, formation, scale, palette } = request;
  const thickness = THICKNESS * scale;
  const w = formation === "column" ? thickness : length;
  const h = formation === "column" ? length : thickness;
  drawHatch(ctx, w, h, HATCH_PAD * scale, palette.ink);
}

function body(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  const { length, formation, state, strength, colour, scale } = request;
  const thickness = THICKNESS * scale;
  const column = formation === "column";
  const w = column ? thickness : length;
  const h = column ? length : thickness;

  ctx.save();
  // The filled fraction grows from the unit's rear: astern for a column, from the left for a line.
  const filled = state === "destroyed" ? 0 : strength;
  if (filled > 0) {
    ctx.save();
    if (state === "broken") ctx.globalAlpha = 0.55;
    ctx.fillStyle = colour;
    if (column) ctx.fillRect(-w / 2, h / 2 - h * filled, w, h * filled);
    else ctx.fillRect(-w / 2, -h / 2, w * filled, h);
    ctx.restore();
  }

  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.4 * scale;
  ctx.setLineDash(state === "broken" ? [3 * scale, 2 * scale] : []);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  // The heading nose, the same barb whichever way the block runs.
  const nose = NOSE * scale;
  const base = Math.min(w / 2, NOSE_HALF_WIDTH * scale);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-base, -h / 2);
  ctx.lineTo(0, -h / 2 - nose);
  ctx.lineTo(base, -h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A 45° hatched zone standing off the block: the Atlas engaged mark. */
function drawHatch(ctx: CanvasRenderingContext2D, w: number, h: number, pad: number, ink: string): void {
  const left = -w / 2 - pad;
  const top = -h / 2 - pad;
  const width = w + pad * 2;
  const height = h + pad * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 0.9;
  const step = 5;
  // Lines at 45°: sweeping the intercept across the diagonal covers the whole rectangle.
  for (let d = left - height; d <= left + width; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, top);
    ctx.lineTo(d + height, top + height);
    ctx.stroke();
  }
  ctx.restore();
}
