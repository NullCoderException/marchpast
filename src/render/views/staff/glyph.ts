/**
 * The staff map's glyph: **the frame is the frontage** (#139). A unit's whole
 * 72-pixel footprint is the glyph — a box tinted by the fraction still
 * fighting, with the arm's sign set in the middle and the leading edge drawn
 * heavy — where the engraved plate ranks eight ink signs inside the same
 * length and Atlas fills one solid block (ADR-0016, ADR-0021).
 *
 * **It has no `mark` half.** The engraved plate's Billow is a plume that
 * drifts off the hull and the Atlas hatching stands off the block, so both are
 * laid down before any body or a melee erases itself. This view's engaged mark
 * is the **contact serration along the unit's own front edge**, drawn inside
 * its footprint, so there is nothing to lay down first: `mark` is omitted and
 * `markReach` is zero in every state, which is exactly the case ADR-0021's
 * two-halved units pass was written to allow.
 *
 * Drawn at the origin heading up the negative y axis; the caller has rotated,
 * so no bearing ever reaches this file.
 */
import type { Arm, Formation } from "../../../schema/types.ts";
import { frontage, MASS_RANKS } from "../../glyphs/slots.ts";
import type { Glyph, GlyphRequest, Sign, SignBox } from "../../view.ts";

/** The footprint's depth across its long axis: 72 × 18 for a line, 18 × 72 for a column, 36 × 36 for a mass. */
const DEPTH = 18;

/** The tint: the fraction still fighting, flat, filled from the front. A broken unit keeps a thinner wash. */
const TINT_ALPHA = 0.22;
const BROKEN_TINT_ALPHA = 0.12;

/** The frame's own weight, and the two states that change it. */
const FRAME_WIDTH = 1.5;
const DESTROYED_FRAME_WIDTH = 1.1;
const DESTROYED_FRAME_ALPHA = 0.75;
const BROKEN_DASH: readonly number[] = [5, 3];

/** The leading edge, heavy: the sheet's way of saying which side is the front, where Atlas puts a barb. */
const FRONT_WIDTH = 3.2;

/** The contact serration: its weight, and the tooth pitch, which is clamped so a short front still shows teeth. */
const CONTACT_WIDTH = 2.4;
const CONTACT_TOOTH_MIN = 4;
const CONTACT_TOOTH_MAX = 6;
const CONTACT_TOOTH_SHARE = 12;
/** How far a tooth rises off the front edge, as a fraction of the pitch. */
const CONTACT_RISE = 0.8;
/** However short the front, a serration is never fewer teeth than this — two would read as a chevron. */
const MIN_TEETH = 3;

/** The strike that cancels a destroyed unit: the sheet crosses one out rather than hollowing it. */
const STRIKE_WIDTH = 1.6;

/** The arm sign's weight inside the frame, and how much of the box it is drawn in. */
const SIGN_WIDTH = 1.35;
const SIGN_INSET = 0.72;
/**
 * How much longer than its narrow side the sign's field may run. A diagonal
 * drawn corner to corner of a 72-by-18 box lies almost flat, and one flat line
 * is not tellable from two; kept near square, the sign is the cross and the
 * slash a reader brings to it, whatever shape the frame is.
 */
const SIGN_ASPECT = 1.35;

/** The clearance the label pass keeps off the footprint's flank. */
const LABEL_PAD = 4;

/** The aeroplane's arrowhead, as fractions of the sign's field: how far it spans and how deep its notch cuts. */
const ARROWHEAD_SPAN = 1.05;
const ARROWHEAD_DEPTH = 1.15;
const ARROWHEAD_NOTCH = 0.25;

/**
 * The staff map's sign for every arm (ADR-0015): foot the crossed diagonals
 * and horse the single one, which is what Atlas draws and what a reader brings
 * from a modern map; a ship a hull in plan, bow up, because a plain box would
 * say nothing on two naval battles out of seven; air the symbol tradition's
 * **stroked arrowhead** (#140).
 *
 * Every one of them is stroked, and the body pass has already set the ink and
 * the weight. `half` is the frame itself; `signField` cuts the near-square
 * field the shape is actually drawn in.
 */
const signs: Record<Arm, Sign> = {
  infantry: (ctx, half) => {
    const { x, y } = signField(half);
    ctx.beginPath();
    ctx.moveTo(-x, y);
    ctx.lineTo(x, -y);
    ctx.moveTo(-x, -y);
    ctx.lineTo(x, y);
    ctx.stroke();
  },
  cavalry: (ctx, half) => {
    const { x, y } = signField(half);
    ctx.beginPath();
    ctx.moveTo(-x, y);
    ctx.lineTo(x, -y);
    ctx.stroke();
  },
  /** A hull in plan, bow up: two quadratic flanks meeting fore and aft. */
  ship: (ctx, half) => {
    const { x, y } = signField(half);
    const beam = Math.min(x, y) * 0.95;
    const length = Math.min(x, y) * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.quadraticCurveTo(beam, 0, 0, length);
    ctx.quadraticCurveTo(-beam, 0, 0, -length);
    ctx.closePath();
    ctx.stroke();
  },
  /**
   * Air as the stroked arrowhead (#140): the symbol tradition's own mark for a
   * flight, open rather than filled, so it stays an outline among outlines and
   * never closes up into the ship's hull one row above it in the legend.
   */
  aircraft: (ctx, half) => {
    const field = signField(half);
    const span = Math.max(field.x, field.y) * ARROWHEAD_SPAN;
    const depth = Math.min(field.x, field.y) * ARROWHEAD_DEPTH;
    ctx.beginPath();
    ctx.moveTo(-span, depth);
    ctx.lineTo(0, -depth);
    ctx.lineTo(span, depth);
    ctx.lineTo(0, depth * ARROWHEAD_NOTCH);
    ctx.closePath();
    ctx.stroke();
  },
};

export const frame: Glyph = {
  signs,
  body,
  // The frame's footprint plus the clearance a label keeps off its flank. A
  // mass is two ranks deep, so the label clears the rear one (ADR-0016).
  halfWidth: (scale, formation) => (formation === "mass" ? (DEPTH * MASS_RANKS) / 2 + LABEL_PAD : DEPTH / 2 + LABEL_PAD) * scale,
  // Zero in every state: this view's engaged mark is drawn inside the unit's
  // own footprint, so a label clears the glyph and nothing more.
  markReach: () => 0,
};

/** The box a formation fills, at the origin heading up. `length` is the glyph's own; the depth is scaled with the sample. */
export function frameSize(formation: Formation, length: number, scale = 1): { w: number; h: number } {
  const depth = DEPTH * scale;
  if (formation === "mass") return { w: frontage(formation, length), h: depth * MASS_RANKS };
  return formation === "column" ? { w: depth, h: length } : { w: length, h: depth };
}

function body(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  const { length, formation, arm, state, strength, colour, scale } = request;
  const { w, h } = frameSize(formation, length, scale);
  const dead = state === "destroyed";
  const broken = state === "broken";

  ctx.save();
  // Square corners, as a printed form rules them: said here rather than left
  // to the context, because the ground pass's own `lineJoin` has leaked this
  // far before (`block.ts`, #168).
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.strokeStyle = colour;

  // The tint, filled from the front: along the heading for a column and a
  // mass, which empty from the rear, and from the left flank for a line, whose
  // frontage is what it loses. Atlas's block fills the same way (`block.ts`).
  if (!dead && strength > 0) {
    ctx.save();
    ctx.globalAlpha = broken ? BROKEN_TINT_ALPHA : TINT_ALPHA;
    ctx.fillStyle = colour;
    const filled = formation === "line" ? { w: w * strength, h } : { w, h: h * strength };
    ctx.fillRect(-w / 2, -h / 2, filled.w, filled.h);
    ctx.restore();
  }

  ctx.save();
  if (dead) ctx.globalAlpha = DESTROYED_FRAME_ALPHA;
  ctx.lineWidth = dead ? DESTROYED_FRAME_WIDTH : FRAME_WIDTH;
  if (broken) ctx.setLineDash([...BROKEN_DASH].map((step) => step * scale));
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();

  // The front. An intact unit has the heavy leading edge; an engaged one has
  // the contact serration in its place; a broken or destroyed unit has no
  // front left to hold, and shows neither.
  if (state === "intact") {
    ctx.lineWidth = FRONT_WIDTH * scale;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.stroke();
    ctx.lineCap = "butt";
  } else if (state === "engaged") {
    drawContact(ctx, w, h, scale);
  }

  if (dead) {
    ctx.lineWidth = STRIKE_WIDTH * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.stroke();
  } else {
    ctx.lineWidth = SIGN_WIDTH * scale;
    ctx.lineJoin = "round";
    signs[arm](ctx, { x: w / 2, y: h / 2 }, scale);
  }
  ctx.restore();
}

/**
 * The contact line: the operations sheet's own device for two forces in touch,
 * a serration along the unit's front edge. It belongs to the unit's own
 * drawing rather than standing off it, which is why this glyph has no `mark`
 * half — the teeth rise `CONTACT_RISE` of a pitch off the edge, well inside
 * the clearance `halfWidth` already keeps for the label.
 */
function drawContact(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number): void {
  const tooth = Math.min(CONTACT_TOOTH_MAX, Math.max(CONTACT_TOOTH_MIN, w / CONTACT_TOOTH_SHARE));
  const teeth = Math.max(MIN_TEETH, Math.round(w / tooth));
  const y = -h / 2;
  ctx.save();
  ctx.lineWidth = CONTACT_WIDTH * scale;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-w / 2, y);
  for (let i = 0; i < teeth; i++) {
    ctx.lineTo(-w / 2 + (w * (i + 0.5)) / teeth, y - tooth * CONTACT_RISE);
    ctx.lineTo(-w / 2 + (w * (i + 1)) / teeth, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** The near-square field a sign is drawn in: the frame inset, and no more than `SIGN_ASPECT` of its narrow side along it. */
function signField(half: SignBox): SignBox {
  const box = { x: half.x * SIGN_INSET, y: half.y * SIGN_INSET };
  const across = Math.min(box.x, box.y);
  const along = Math.min(Math.max(box.x, box.y), across * SIGN_ASPECT);
  return box.x >= box.y ? { x: along, y: across } : { x: across, y: along };
}
