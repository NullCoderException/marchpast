/**
 * The Atlas glyph (#58): a unit as a solid block with a heading barb, strength
 * as the filled fraction of it from the rear, broken as a dashed outline at
 * .55, destroyed as the outline alone, and engaged as a 45° hatched zone
 * around the block.
 *
 * One block for every arm, with the arm's sign inside it: crossed diagonals
 * for foot, a single diagonal for horse, nothing for a ship (ADR-0015). A
 * `mass` is the two-rank footprint, a block half the length of a line and
 * twice its thickness (ADR-0016).
 *
 * The second claim the seam makes (ADR-0014): a view that draws a unit in a
 * wholly different way replaces this one pass and nothing else. Drawn at the
 * origin heading up the negative y axis; the caller has rotated.
 */
import type { Arm, Formation } from "../../schema/types.ts";
import type { Glyph, GlyphRequest, Sign, SignBox } from "../view.ts";
import { frontage, MASS_RANKS } from "./slots.ts";
import { engravedMarkReach } from "./ticks.ts";

/** The block's thickness across its long axis. */
const THICKNESS = 10;
/** How far the engaged hatching stands off the block. */
const HATCH_PAD = 7;
/**
 * The heading barb: a small point on the leading edge, not a taper of the whole
 * block. A full-width nose turns the block into an arrow, and Atlas already has
 * three arrows of its own (ADR-0014).
 */
const BARB = 4;
const BARB_HALF_WIDTH = 2.5;
/** A broken unit is drawn at this much of full strength, outline and fill alike. */
const BROKEN_ALPHA = 0.55;
/** The engaged hatching: its ink, its weight, and the gap between its lines. */
const HATCH_ALPHA = 0.55;
const HATCH_WIDTH = 0.9;
const HATCH_STEP = 5;
/** The arm sign's weight inside the block: finer than the block's own edge, because it is detail, not outline. */
const SIGN_WIDTH = 1.2;
/**
 * How much longer than the block's thickness the sign's field may be. A
 * diagonal drawn corner to corner of a 72-by-10 block lies almost flat, and
 * one flat line is not tellable from two; kept near square, the sign is the
 * 45-degree cross and slash the atlases use, whatever shape the block is.
 */
const SIGN_ASPECT = 1.4;

/**
 * Atlas's sign for every arm (ADR-0015): the convention of nineteenth-century
 * battle atlases and of modern military map symbols alike, so a reader brings
 * it to the plate. Independent of formation; `half` is the block itself.
 */
const signs: Record<Arm, Sign> = {
  /** A ship is the plain block. */
  ship: () => undefined,
  /** Foot: crossed diagonals. */
  infantry: (ctx, half) => {
    diagonal(ctx, half, 1);
    diagonal(ctx, half, -1);
  },
  /** Horse: a single diagonal across the block. */
  cavalry: (ctx, half) => {
    diagonal(ctx, half, 1);
  },
  /**
   * Stopgap: the ship's own plain block, so Atlas compiles with the arm in the
   * allowlist. It is the wrong sign — a viewer cannot tell an aeroplane from a
   * ship. Written as a delegation, as the plate's is, so the two stopgaps read
   * alike and go together.
   */
  // TODO #171: draw the aircraft sign, here and in `ticks.ts`.
  aircraft: (ctx, half, scale) => signs.ship(ctx, half, scale),
};

/** One diagonal across the sign's field at the block's centre. `rise` picks which way it leans. */
function diagonal(ctx: CanvasRenderingContext2D, half: SignBox, rise: number): void {
  const { x, y } = signField(half);
  ctx.beginPath();
  ctx.moveTo(-x, rise * y);
  ctx.lineTo(x, -rise * y);
  ctx.stroke();
}

/** The field the sign is drawn in: the block's full thickness, and no more than `SIGN_ASPECT` of that along it. */
function signField(half: SignBox): SignBox {
  const across = Math.min(half.x, half.y);
  const along = Math.min(Math.max(half.x, half.y), across * SIGN_ASPECT);
  return half.x >= half.y ? { x: along, y: across } : { x: across, y: along };
}

export const block: Glyph = {
  signs,
  mark,
  body,
  // A mass is twice as thick, so the label clears the whole of it (ADR-0016).
  halfWidth: (scale, formation) => ((formation === "mass" ? THICKNESS * MASS_RANKS : THICKNESS) / 2 + HATCH_PAD) * scale,
  // The plate's reach, named rather than cut down to this hatching's own: see
  // `engravedMarkReach`. Value reuse, never inheritance.
  markReach: engravedMarkReach,
};

/**
 * The block's own size: a line lies across the heading, a column along it, and
 * a mass is half a line's length and twice its thickness — the two-rank
 * footprint, so both views agree on what a mass is (ADR-0016).
 */
function blockSize(formation: Formation, length: number, scale: number): { w: number; h: number } {
  const thickness = THICKNESS * scale;
  if (formation === "mass") return { w: frontage(formation, length), h: thickness * MASS_RANKS };
  return formation === "column" ? { w: thickness, h: length } : { w: length, h: thickness };
}

/**
 * The part of the block strength fills, growing from the rear: astern for a
 * column and for a mass, from the left flank for a line.
 */
function filledRect(formation: Formation, w: number, h: number, filled: number): Box {
  if (formation === "line") return { x: -w / 2, y: -h / 2, w: w * filled, h };
  return { x: -w / 2, y: h / 2 - h * filled, w, h: h * filled };
}

/** A part of the block, from its top-left corner. Not `projection.ts`'s `Rect`: that one is on the plate, this one at the origin. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The hatched engaged zone, laid down before any unit's block so it never veils one. */
function mark(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  if (request.state !== "engaged") return;
  const { length, formation, scale, palette } = request;
  const { w, h } = blockSize(formation, length, scale);
  drawHatch(ctx, w, h, HATCH_PAD * scale, palette.ink, scale);
}

function body(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  const { length, formation, arm, state, strength, colour, scale, palette } = request;
  const { w, h } = blockSize(formation, length, scale);

  ctx.save();
  // A block has square corners, which is what the design canvas drew and what
  // tells it from the plate's rounded destroyed outline. Said here rather than
  // left to the context, because until #168 buffered the ground the relief
  // pass's own `lineJoin` leaked this far and rounded them on any plate that
  // carried contours — and on no other.
  ctx.lineJoin = "miter";
  if (state === "broken") ctx.globalAlpha = BROKEN_ALPHA;

  const filled = state === "destroyed" ? 0 : strength;
  const fill = filledRect(formation, w, h, filled);
  if (fill.w > 0 && fill.h > 0) {
    ctx.fillStyle = colour;
    ctx.fillRect(fill.x, fill.y, fill.w, fill.h);
  }

  // The arm's sign, laid inside the block before its edge is drawn over the
  // ends. Twice: the unit's ink on the bare part, the paper's over the filled
  // part, so one diagonal reads whichever ground it crosses.
  ctx.lineWidth = SIGN_WIDTH * scale;
  const half = { x: w / 2, y: h / 2 };
  const sign = signs[arm];
  paintSign(ctx, { x: -w / 2, y: -h / 2, w, h }, colour, () => sign(ctx, half, scale));
  if (fill.w > 0 && fill.h > 0) paintSign(ctx, fill, palette.paper, () => sign(ctx, half, scale));

  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.4 * scale;
  ctx.setLineDash(state === "broken" ? [3 * scale, 2 * scale] : []);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.setLineDash([]);

  // The heading barb, the same point whichever way the block runs.
  const barb = BARB * scale;
  const base = Math.min(w / 2, BARB_HALF_WIDTH * scale);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-base, -h / 2);
  ctx.lineTo(0, -h / 2 - barb);
  ctx.lineTo(base, -h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** One pass of the arm's sign, clipped to a part of the block and stroked in one ink. */
function paintSign(ctx: CanvasRenderingContext2D, clip: Box, ink: string, draw: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(clip.x, clip.y, clip.w, clip.h);
  ctx.clip();
  ctx.strokeStyle = ink;
  draw();
  ctx.restore();
}

/** A 45° hatched zone standing off the block: the Atlas engaged mark. */
function drawHatch(ctx: CanvasRenderingContext2D, w: number, h: number, pad: number, ink: string, scale: number): void {
  const left = -w / 2 - pad;
  const top = -h / 2 - pad;
  const width = w + pad * 2;
  const height = h + pad * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = HATCH_ALPHA;
  // The line thins with the sample; the gap does not, because closing it up
  // would give the legend's small block *more* detail to read, not less.
  ctx.lineWidth = HATCH_WIDTH * scale;
  const step = HATCH_STEP;
  // Lines at 45°: sweeping the intercept across the diagonal covers the whole rectangle.
  for (let d = left - height; d <= left + width; d += step) {
    ctx.beginPath();
    ctx.moveTo(d, top);
    ctx.lineTo(d + height, top + height);
    ctx.stroke();
  }
  ctx.restore();
}
