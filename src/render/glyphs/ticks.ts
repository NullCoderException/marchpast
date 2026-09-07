/**
 * The plate glyph: a unit as eight ink signs arranged by its formation
 * (ADR-0009, ADR-0016), with **Billow** as the engaged mark (#58) — outlined
 * puffs merging into one scalloped cloud that drifts to the lee flank under
 * the phase's wind.
 *
 * The sign is the arm's: a ship's chevron tick unchanged from v1, a solid rank
 * bar for foot, the same bar barred for horse, and an aeroplane in plan for air
 * (ADR-0015, ADR-0016, #140). Where the signs sit is `slots.ts`, which every
 * view shares; this file is only what they look like on paper.
 *
 * Used by both plate views: the Chart plate and the Night plate differ only in
 * their palettes, which is the seam's first claim (ADR-0014). Everything here
 * is drawn at the origin heading up the negative y axis; the caller has
 * rotated, so a bearing never reaches this file.
 */
import type { Arm, Formation, UnitState } from "../../schema/types.ts";
import { seeded } from "../primitives.ts";
import { axes, GLYPH_PX, leeDrift } from "../anatomy.ts";
import type { Glyph, GlyphRequest, Sign } from "../view.ts";
import { frontage, signPositions, signSlots, SIGNS_PER_GLYPH } from "./slots.ts";

/**
 * Billow's two weights: a full cloud when a unit is engaged, the same cloud
 * thinned when it is broken (#58). Radii grow from `radius` at the hull by
 * `growth` over the cloud's `reach`.
 */
const BILLOW = {
  engaged: { puffs: 16, reach: 26, radius: 3.5, growth: 6.5 },
  broken: { puffs: 8, reach: 16, radius: 3, growth: 3.5 },
} as const;
/** However small the sample, a cloud is never fewer puffs than this. */
const MIN_PUFFS = 4;
/** Clearance between the ticks and the nearest puff, so the cloud starts off the hull. */
const HULL_CLEARANCE = 3;
/** The cloud's outline, in #58's engraved weight: 0.55 to 0.7px of ink, never finer. */
const OUTLINE_WIDTH = 0.7;
const MIN_OUTLINE_WIDTH = 0.55;
/** Where the three hatch chords cross a puff, as fractions of its radius, and how much of each chord is drawn. */
const CHORDS = [0.3, 0.52, 0.74];
const CHORD_LENGTH = 0.82;
/** Below this scale the chords are too fine to read, so the legend's sample leaves them off. */
const CHORD_MIN_SCALE = 0.9;

/**
 * Half the footprint one sign fills, across and along the heading. Every arm's
 * sign is drawn inside it. It says how a tick fills its share of the glyph's 72
 * pixels and means nothing to a view that draws a unit as one rectangle, so it
 * is the engraved glyph's and not the anatomy's (ADR-0021).
 */
const SIGN_HALF_WIDTH = 2.6;
const SIGN_HALF_HEIGHT = 3.25;

/**
 * The aeroplane in plan (#140), as fractions of the sign's own footprint: the
 * wing set forward of the middle, the tailplane short, aft, and drawn at this
 * much of the pen it was handed.
 */
const WING_Y = -0.18;
const TAILPLANE_Y = 0.72;
const TAILPLANE_SPAN = 0.46;
const TAILPLANE_PEN = 0.8;

/** The rank bar's weight: solid, because hollow already means destroyed (ADR-0016). */
const RANK_BAR_THICKNESS = 2.6;
/** How far the outline of a destroyed unit stands off the footprint its signs would have filled. */
const OUTLINE_PAD = 2;
/**
 * The pitch the signs sit on at the glyph's fixed length. `signSlots` takes its
 * pitch from the length it is handed, which is the same number on the plate and
 * a smaller one in the legend's sample; `halfWidth` is asked only by the label
 * pass, which is always on the plate, so the plate's pitch is the honest one
 * here and the legend never asks.
 */
const SIGN_PITCH = GLYPH_PX / SIGNS_PER_GLYPH;

/**
 * The plate's sign for every arm (ADR-0016). Each is drawn at the origin
 * heading up, inside `half` — the footprint one sign fills — in the ink and
 * weight the body pass has already set.
 *
 * Foot and horse follow the same convention Atlas uses inside its block, so a
 * viewer who switches views carries the same reading across: the bar is the
 * rank, the diagonal is the horse.
 */
const signs: Record<Arm, Sign> = {
  /** One ship as a chevron pointing ahead: v1's tick, unchanged. */
  ship: (ctx, half) => {
    ctx.beginPath();
    ctx.moveTo(-half.x, half.y);
    ctx.lineTo(0, -half.y);
    ctx.lineTo(half.x, half.y);
    ctx.stroke();
  },
  /** Foot as a short solid rank bar across the heading. */
  infantry: (ctx, half, scale) => {
    const thickness = RANK_BAR_THICKNESS * scale;
    ctx.fillRect(-half.x, -thickness / 2, half.x * 2, thickness);
  },
  /** Horse as the same bar with one diagonal through it. */
  cavalry: (ctx, half, scale) => {
    const thickness = RANK_BAR_THICKNESS * scale;
    ctx.fillRect(-half.x, -thickness / 2, half.x * 2, thickness);
    ctx.beginPath();
    ctx.moveTo(-half.x, half.y);
    ctx.lineTo(half.x, -half.y);
    ctx.stroke();
  },
  /**
   * Air as an aeroplane in plan: fuselage, wing, tailplane. At the plate's own
   * pen the tailplane merges into the fuselage and what is drawn is a **cross**
   * — which is the point rather than a loss, because a cross is in nothing
   * else's vocabulary, holds in a rank at the signs' own pitch, and survives
   * the legend's smaller sample. The sign is authored as the aeroplane and
   * drawn as what the pen allows, which is the relationship a rank bar already
   * has to five thousand men (#140, ADR-0016).
   *
   * Never a filled dart: at the legend's scale it closes up into the ship's
   * chevron one row above it. Never a ring: it does not point.
   */
  aircraft: (ctx, half) => {
    ctx.beginPath();
    ctx.moveTo(0, -half.y);
    ctx.lineTo(0, half.y);
    ctx.moveTo(-half.x, WING_Y * half.y);
    ctx.lineTo(half.x, WING_Y * half.y);
    ctx.stroke();
    // The tailplane is the one stroke drawn finer than the pen it was handed,
    // so that where there is room for both it reads as the smaller surface;
    // the pen is read back rather than named, because the body pass owns it.
    const pen = ctx.lineWidth;
    ctx.lineWidth = pen * TAILPLANE_PEN;
    ctx.beginPath();
    ctx.moveTo(-half.x * TAILPLANE_SPAN, TAILPLANE_Y * half.y);
    ctx.lineTo(half.x * TAILPLANE_SPAN, TAILPLANE_Y * half.y);
    ctx.stroke();
    ctx.lineWidth = pen;
  },
};

export const ticks: Glyph = {
  signs,
  mark,
  body,
  // A mass is two ranks deep, so the label clears the rear one (ADR-0016).
  halfWidth: (scale, formation) => (formation === "mass" ? SIGN_PITCH / 2 + SIGN_HALF_HEIGHT : SIGN_HALF_WIDTH) * scale,
  markReach: engravedMarkReach,
};

/**
 * How far the engraved engaged mark reaches past a unit's signs, downwind:
 * Billow's plume at its furthest, in plate pixels (#58). `billowReach` below is
 * held inside these numbers by a test, and the shared label pass clears them.
 *
 * It sits on the glyph rather than on the anatomy because one view's engaged
 * mark is nothing like another's, and a shared worst-case constant charged
 * every view for the plate's Billow (ADR-0021). Overstating it costs a label
 * one displacement and never a word, which is why it is a table of the cloud's
 * furthest reach rather than the cloud's own arithmetic.
 */
const MARK_REACH: Readonly<Record<UnitState, number>> = { intact: 0, engaged: 44, broken: 30, destroyed: 0 };

/**
 * The reach the engraved views clear. Atlas names it too: its hatching stands
 * only `HATCH_PAD` off the block and is narrower than this, but cutting it to
 * that moves every Atlas label, which is a drawing to judge and not a
 * refactor (#168, ADR-0021).
 */
export function engravedMarkReach(scale: number, state: UnitState): number {
  return MARK_REACH[state] * scale;
}

/**
 * How far the cloud reaches from the unit's centre, downwind: the hull
 * clearance, the drift, the furthest puff's radius and the outline it is drawn
 * with. Exported so a test can hold it inside `MARK_REACH`, which is the
 * number the shared label pass clears.
 */
export function billowReach(state: UnitState, scale: number): number {
  if (state !== "engaged" && state !== "broken") return 0;
  const cloud = state === "broken" ? BILLOW.broken : BILLOW.engaged;
  return (SIGN_HALF_WIDTH + HULL_CLEARANCE + cloud.reach + cloud.radius + cloud.growth + OUTLINE_WIDTH) * scale;
}

/** The smoke, laid down before any unit's ships so a melee does not erase itself. */
function mark(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  if (request.state !== "engaged" && request.state !== "broken") return;
  drawBillow(ctx, request, seeded(request.seed));
}

function body(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  const { length, formation, arm, state, strength, colour, seed, scale } = request;
  // Its own generator from the same seed: the body draws the same signs whether
  // or not the mark ran before it, which is what lets the two halves be
  // separate passes over separate loops.
  const random = seeded(seed);

  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 1.4 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (state === "destroyed") {
    drawHollowOutline(ctx, length, formation, scale);
  } else {
    const sign = signs[arm];
    const half = { x: SIGN_HALF_WIDTH * scale, y: SIGN_HALF_HEIGHT * scale };
    for (const slot of signPositions(formation, state, strength, length, random)) {
      ctx.save();
      ctx.translate(slot.x, slot.y);
      // A broken unit's signs are knocked out of rank as well as thinned out.
      if (state === "broken") ctx.rotate((random() - 0.5) * 0.9);
      sign(ctx, half, scale);
      ctx.restore();
    }
  }
  ctx.restore();
}

/**
 * The destroyed glyph: the outline the signs would have filled, and nothing
 * inside it. A `mass` therefore leaves the two-rank footprint behind it, which
 * is how a body that died where it stood is told from a line that did.
 */
function drawHollowOutline(ctx: CanvasRenderingContext2D, length: number, formation: Formation, scale: number): void {
  const slots = signSlots(formation, length);
  const pitch = length / SIGNS_PER_GLYPH;
  const pad = (SIGN_HALF_WIDTH + OUTLINE_PAD) * scale;
  // Along an axis the signs are ranked on, the outline takes each end sign's
  // own half-pitch, so a line is exactly the glyph's length and a mass exactly
  // half of it by two ranks. Across an axis they are not, it is the sign's
  // footprint and a little air.
  const half = (values: number[]): number => {
    const span = Math.max(...values);
    return span === 0 ? pad : span + pitch / 2;
  };
  const w = half(slots.map((slot) => slot.x));
  const h = half(slots.map((slot) => slot.y));
  ctx.save();
  ctx.lineWidth = 1 * scale;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.roundRect(-w, -h, 2 * w, 2 * h, Math.min(w, h));
  ctx.stroke();
  ctx.restore();
}

interface Point {
  x: number;
  y: number;
}

interface Puff extends Point {
  r: number;
}

/**
 * Billow: outlined puffs merging into one scalloped cloud, hatched on the lee
 * side of each puff, drifting off the unit's flank under the wind.
 *
 * The union outline is drawn as a band rather than as strokes, so no puff's
 * outline shows inside another: the union of the puffs is filled in ink and the
 * same union eroded by the line width is punched back out. That has to happen
 * on a scratch canvas — punching straight onto the plate would erase the sea
 * under it — and the reward is a cloud whose inside is genuinely empty, so at
 * Cannae a fighting wing does not sit in a paper hole in the ground.
 */
function drawBillow(ctx: CanvasRenderingContext2D, request: GlyphRequest, random: () => number): void {
  const { length, formation, state, scale, palette } = request;
  const cloud = state === "broken" ? BILLOW.broken : BILLOW.engaged;
  const drift = leeDrift(request.windTo, formation);

  // Along the unit's body, and away from it in the drift's direction. The cloud
  // starts clear of the ticks and widens as it goes, so it reads as a plume off
  // one flank rather than a halo the unit sits inside.
  const { along } = axes(formation);
  const count = Math.max(MIN_PUFFS, Math.round(cloud.puffs * scale));
  const clearance = ticks.halfWidth(scale, formation) + HULL_CLEARANCE * scale;
  // The dust hangs over the unit's own front, which for a mass is half a line's.
  const front = frontage(formation, length);

  const puffs: Puff[] = [];
  for (let i = 0; i < count; i++) {
    const out = i / Math.max(1, count - 1);
    // Narrow at the hull, broad downwind: the cloud fans out as it drifts.
    const spread = (random() - 0.5) * front * (0.5 + out * 0.5);
    const distance = clearance + out * cloud.reach * scale;
    puffs.push({
      x: along.x * spread + drift.x * distance,
      y: along.y * spread + drift.y * distance,
      r: (cloud.radius + out * cloud.growth) * scale,
    });
  }

  paintCloud(ctx, puffs, drift, Math.max(MIN_OUTLINE_WIDTH, OUTLINE_WIDTH * scale), scale, palette.ink);
}

/**
 * Paints the cloud through a scratch canvas: the union in ink, the eroded union
 * punched out of it, then the hatching, and the result stamped onto the plate.
 * `destination-out` on the plate itself would take the sea with it.
 */
function paintCloud(
  ctx: CanvasRenderingContext2D,
  puffs: readonly Puff[],
  drift: Point,
  width: number,
  scale: number,
  ink: string,
): void {
  const margin = 2;
  const left = Math.min(...puffs.map((p) => p.x - p.r)) - margin;
  const top = Math.min(...puffs.map((p) => p.y - p.r)) - margin;
  const right = Math.max(...puffs.map((p) => p.x + p.r)) + margin;
  const bottom = Math.max(...puffs.map((p) => p.y + p.r)) + margin;
  const cloudWidth = right - left;
  const cloudHeight = bottom - top;
  if (cloudWidth <= 0 || cloudHeight <= 0) return;

  // The plate's transform carries the device pixel ratio and the unit's
  // rotation; the scratch is rendered at the same density so the outline stays
  // a hairline rather than a smear.
  const transform = ctx.getTransform();
  const density = Math.max(1, Math.hypot(transform.a, transform.b));
  const deviceWidth = Math.ceil(cloudWidth * density);
  const deviceHeight = Math.ceil(cloudHeight * density);
  const scratch = scratchCanvas(deviceWidth, deviceHeight);
  const paint = scratch.getContext("2d");
  if (paint === null) return;

  paint.setTransform(density, 0, 0, density, -left * density, -top * density);
  paint.clearRect(left, top, cloudWidth, cloudHeight);

  tracePuffs(paint, puffs, 0);
  paint.fillStyle = ink;
  paint.fill();
  paint.globalCompositeOperation = "destination-out";
  tracePuffs(paint, puffs, -width);
  paint.fill();
  paint.globalCompositeOperation = "source-over";

  // Three chords on each puff's lee side. Too fine to read in the legend's sample, so skipped there.
  if (scale >= CHORD_MIN_SCALE) {
    paint.strokeStyle = ink;
    paint.lineWidth = MIN_OUTLINE_WIDTH * scale;
    for (const puff of puffs) {
      for (const fraction of CHORDS) {
        const offset = puff.r * fraction;
        const half = Math.sqrt(Math.max(0, puff.r * puff.r - offset * offset)) * CHORD_LENGTH;
        const cx = puff.x + drift.x * offset;
        const cy = puff.y + drift.y * offset;
        paint.beginPath();
        paint.moveTo(cx - drift.y * half, cy + drift.x * half);
        paint.lineTo(cx + drift.y * half, cy - drift.x * half);
        paint.stroke();
      }
    }
  }

  // Only the corner just painted: the scratch is shared and only ever grows.
  ctx.drawImage(scratch, 0, 0, deviceWidth, deviceHeight, left, top, cloudWidth, cloudHeight);
}

/** One scratch canvas for every cloud on every frame, grown to the largest asked for (ADR-0014). */
let sharedScratch: HTMLCanvasElement | undefined;
function scratchCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = (sharedScratch ??= document.createElement("canvas"));
  if (canvas.width < width) canvas.width = width;
  if (canvas.height < height) canvas.height = height;
  return canvas;
}

/** Every puff in one path, so a non-zero fill paints their union. `grow` erodes or dilates each radius. */
function tracePuffs(ctx: CanvasRenderingContext2D, puffs: readonly Puff[], grow: number): void {
  ctx.beginPath();
  for (const { x, y, r } of puffs) {
    const radius = Math.max(0.1, r + grow);
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
}
