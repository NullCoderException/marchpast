/**
 * The plate glyph: a unit as eight ink signs arranged by its formation
 * (ADR-0009, ADR-0016), with **Billow** as the engaged mark (#58) — outlined
 * puffs merging into one scalloped cloud that drifts to the lee flank under
 * the phase's wind.
 *
 * The sign is the arm's: a ship's chevron tick unchanged from v1, a solid rank
 * bar for foot, the same bar barred for horse (ADR-0015, ADR-0016). Where the
 * signs sit is `arrangement.ts`, which every view shares; this file is only
 * what they look like on paper.
 *
 * Used by both plate views: the Chart plate and the Night plate differ only in
 * their palettes, which is the seam's first claim (ADR-0014). Everything here
 * is drawn at the origin heading up the negative y axis; the caller has
 * rotated, so a bearing never reaches this file.
 */
import type { Arm } from "../../schema/arms.ts";
import type { Formation } from "../../schema/types.ts";
import { seeded } from "../primitives.ts";
import { GLYPH_PX, SIGN_HALF_HEIGHT, SIGN_HALF_WIDTH, SIGNS_PER_GLYPH } from "../style.ts";
import type { Glyph, GlyphRequest, Sign } from "../view.ts";
import { signPositions, signSlots } from "./arrangement.ts";

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

/** The rank bar's weight: solid, because hollow already means destroyed (ADR-0016). */
const RANK_BAR_THICKNESS = 2.6;
/** How far the outline of a destroyed unit stands off the footprint its signs would have filled. */
const OUTLINE_PAD = 2;
/** The pitch the signs sit on, from the glyph's fixed length: what the label pass measures a mass's depth in. */
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
};

export const ticks: Glyph = {
  signs,
  mark,
  body,
  // A mass is two ranks deep, so the label clears the rear one (ADR-0016).
  halfWidth: (scale, formation) => (formation === "mass" ? SIGN_PITCH / 2 + SIGN_HALF_HEIGHT : SIGN_HALF_WIDTH) * scale,
};

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
  const pad = (SIGN_HALF_WIDTH + OUTLINE_PAD) * scale;
  const w = Math.max(...slots.map((slot) => slot.x)) + pad;
  const h = Math.max(...slots.map((slot) => slot.y)) + pad;
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
  // A mass's frontage is half a line's, so its dust hangs over half the ground.
  const frontage = formation === "mass" ? length / 2 : length;

  const puffs: Puff[] = [];
  for (let i = 0; i < count; i++) {
    const out = i / Math.max(1, count - 1);
    // Narrow at the hull, broad downwind: the cloud fans out as it drifts.
    const spread = (random() - 0.5) * frontage * (0.5 + out * 0.5);
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

/**
 * Where the cloud goes: downwind, but always clear of the ticks. The component
 * across the unit's body is never less than half and the component along it is
 * damped, so smoke clears a column running dead downwind (#58, ADR-0008).
 *
 * `windTo` is radians clockwise from the unit's own heading, and the glyph is
 * heading-up, so the wind is `(sin, -cos)` of it and nothing here knows north.
 * With no wind the cloud takes the flank the label does not: `drawUnits` puts
 * the label beside a column and astern of a line.
 */
export function leeDrift(windTo: number | undefined, formation: Formation): Point {
  const { along, across } = axes(formation);
  // Written out rather than negated from `across`, which would answer a negative zero.
  if (windTo === undefined) return formation === "column" ? { x: -1, y: 0 } : { x: 0, y: -1 };

  const wind = { x: Math.sin(windTo), y: -Math.cos(windTo) };
  const alongPart = (wind.x * along.x + wind.y * along.y) * ALONG_DAMPING;
  const acrossRaw = wind.x * across.x + wind.y * across.y;
  const acrossPart = Math.abs(acrossRaw) < MIN_ACROSS ? (acrossRaw < 0 ? -MIN_ACROSS : MIN_ACROSS) : acrossRaw;

  const x = along.x * alongPart + across.x * acrossPart;
  const y = along.y * alongPart + across.y * acrossPart;
  const magnitude = Math.hypot(x, y) || 1;
  return { x: x / magnitude, y: y / magnitude };
}

/** How much of the wind's across-hull component survives at the least: the clamp that clears the ticks. */
const MIN_ACROSS = 0.5;
/** How much of the wind along the hull survives: damped, so the cloud never runs the length of the unit. */
const ALONG_DAMPING = 0.35;

/**
 * A unit's own axes at the origin heading up: `along` its long axis, `across`
 * its flanks. A column runs in line ahead, so its length is the heading; a
 * line runs abreast, so its length is across it, and a mass — wider than it is
 * deep — lies the same way a line does.
 */
function axes(formation: Formation): { along: Point; across: Point } {
  if (formation === "column") return { along: { x: 0, y: 1 }, across: { x: 1, y: 0 } };
  return { along: { x: 1, y: 0 }, across: { x: 0, y: 1 } };
}
