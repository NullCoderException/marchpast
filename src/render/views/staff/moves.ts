/**
 * The staff map's moves: the **taper** (#139).
 *
 * This is the hand ADR-0021's fifth-slot rule was cut against a drawing for. An
 * operations sheet's axis of advance is a broad arrow whose width varies along
 * the shaft — narrow at the tail, wider at the shoulder, opening into the head
 * — and that is a filled polygon, which no `Pen` value produces at any
 * weights. `pens` stays what a hand draws *with*; this is the hand, and what it
 * reads off the pen is the outline's weight and the head's size — the two
 * values it shares with every other view's arrows. The dash it ignores: there
 * is no dashing a polygon whose width varies.
 *
 * The three styles stay tellable apart as the anatomy requires, and each in its
 * own way rather than by three weights of one line: the **track** is a fine
 * line pipped where it starts and ticked along its run, the **intent** a hollow
 * broad arrow whose fill is the paper, and the **detachment** the same arrow
 * solid in the unit's own ink.
 *
 * **Sized to its own run.** A short move drawn at a long move's head is all
 * head and no shaft, which is what made the Cannae flanking arrows swamp the
 * units they belonged to. So the four dimensions scale by `clamp(len / 150,
 * 0.5, 1)` and the head is capped at 45% of the run.
 */
import type { Point } from "../../primitives.ts";
import type { MoveLine, MoveStyle, Moves, Pen } from "../../view.ts";

/** The run at which an arrow is drawn at its full size, and the floor it never shrinks below. */
const FULL_RUN = 150;
const MIN_SCALE = 0.5;
/** However short the run, the head never takes more than this much of it. */
const MAX_HEAD_SHARE = 0.45;

/**
 * A tapered arrow's shaft at full size: the half-widths at the tail and the
 * shoulder, and how far back from the point the head begins. The head's own
 * half-width is not here — it is the **pen's** `headSize`, which is the one
 * value of a `Pen` this hand shares with every other view's arrows, and
 * keeping it in two places is how the two would come to disagree.
 */
export interface Taper {
  tail: number;
  shoulder: number;
  headLength: number;
}

/** The intent's arrow: hollow, so what is inside it is the ground and not the side. */
const INTENT: Taper = { tail: 3, shoulder: 9, headLength: 26 };
/** The detachment's: a shade broader everywhere, and filled solid in the unit's ink. */
const DETACHMENT: Taper = { tail: 4, shoulder: 11, headLength: 30 };

/** How wide the track's open head opens, as a share of the length the pen gives it. */
const TRACK_HEAD_SPREAD = 0.5625;

/** The track: the pip it leaves from, and the ticks along its run. */
const PIP_RADIUS = 2.6;
/** Where the line starts, clear of the pip. */
const PIP_CLEARANCE = 4;
const TICK_PITCH = 26;
const TICK_HALF = 3.5;
const TICK_WIDTH = 1.1;
/** How far short of the head the last tick falls, so the two never touch. */
const TICK_TAIL_OFF = 8;

/**
 * The seven points of a tapered arrow from `from` to `to`, in order round the
 * polygon: the tail's two corners, the shoulder, the head's barbs, the point,
 * and back. Pure, and the whole of the arrow's geometry — the hand below only
 * fills and strokes it.
 *
 * A run of no length answers no polygon at all: two coincident points name no
 * direction, and an arrow drawn on one would be a spike of arbitrary bearing.
 */
export function taperPolygon(from: Point, to: Point, taper: Taper, headHalf: number): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const run = Math.hypot(dx, dy);
  if (run < 1e-9) return [];

  const scale = Math.max(MIN_SCALE, Math.min(1, run / FULL_RUN));
  const tail = taper.tail * scale;
  const shoulder = taper.shoulder * scale;
  const head = headHalf * scale;
  const headLength = Math.min(taper.headLength * scale, run * MAX_HEAD_SHARE);

  const ux = dx / run;
  const uy = dy / run;
  // The left normal in canvas coordinates, where y runs down.
  const nx = -uy;
  const ny = ux;
  const at = (along: number, across: number): Point => ({
    x: from.x + ux * along + nx * across,
    y: from.y + uy * along + ny * across,
  });

  const neck = Math.max(0, run - headLength);
  return [at(0, tail), at(neck, shoulder), at(neck, head), at(run, 0), at(neck, -head), at(neck, -shoulder), at(0, -tail)];
}

/** One tapered arrow, filled and outlined. The fill is what tells the intent from the detachment. */
function drawTaper(ctx: CanvasRenderingContext2D, from: Point, to: Point, taper: Taper, pen: Pen, fill: string, stroke: string): void {
  const points = taperPolygon(from, to, taper, pen.headSize);
  const first = points[0];
  if (first === undefined) return;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = pen.width;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

/** The track: a fine line pipped where the unit was and ticked along its run, ending in an open head. */
const track: MoveLine = (ctx, from, to, { pen, colour }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const run = Math.hypot(dx, dy);
  if (run < 1e-9) return;
  const ux = dx / run;
  const uy = dy / run;
  const nx = -uy;
  const ny = ux;

  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = pen.width;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(from.x, from.y, PIP_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(from.x + ux * PIP_CLEARANCE, from.y + uy * PIP_CLEARANCE);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.lineWidth = TICK_WIDTH;
  ctx.beginPath();
  for (let along = TICK_PITCH; along < run - TICK_TAIL_OFF; along += TICK_PITCH) {
    const x = from.x + ux * along;
    const y = from.y + uy * along;
    ctx.moveTo(x - nx * TICK_HALF, y - ny * TICK_HALF);
    ctx.lineTo(x + nx * TICK_HALF, y + ny * TICK_HALF);
  }
  ctx.stroke();

  ctx.lineWidth = pen.width;
  ctx.lineCap = "round";
  // The head's own length is the pen's, as it is for the two tapers.
  const back = pen.headSize;
  const half = pen.headSize * TRACK_HEAD_SPREAD;
  ctx.beginPath();
  ctx.moveTo(to.x - ux * back - nx * half, to.y - uy * back - ny * half);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - ux * back + nx * half, to.y - uy * back + ny * half);
  ctx.stroke();
  ctx.restore();
};

/** The intent: the broad arrow hollow, its fill the sheet's own paper, so the ground does not read through it. */
const intent: MoveLine = (ctx, from, to, { pen, colour, palette }) => {
  drawTaper(ctx, from, to, INTENT, pen, palette.paper, colour);
};

/** The detachment: the same arrow solid, in the unit's own side ink. */
const detachment: MoveLine = (ctx, from, to, { pen, colour }) => {
  drawTaper(ctx, from, to, DETACHMENT, pen, colour, colour);
};

export const staffMoves: Moves = { track, intent, detachment } satisfies Readonly<Record<MoveStyle, MoveLine>>;

/** The two tapers, for the test that holds their dimensions at three run lengths. */
export const STAFF_TAPERS = { intent: INTENT, detachment: DETACHMENT } as const;
