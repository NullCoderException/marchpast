/**
 * The plate glyph: a unit as ink ship-ticks (ADR-0009), with **Billow** as the
 * engaged mark (#58) — outlined puffs merging into one scalloped cloud that
 * drifts to the lee flank under the phase's wind.
 *
 * Used by both plate views: the Chart plate and the Night plate differ only in
 * their palettes, which is the seam's first claim (ADR-0014). Everything here
 * is drawn at the origin heading up the negative y axis; the caller has
 * rotated, so a bearing never reaches this file.
 */
import type { Formation, UnitState } from "../../schema/types.ts";
import { seeded } from "../primitives.ts";
import { TICK_HALF_HEIGHT, TICK_HALF_WIDTH, TICKS_PER_GLYPH } from "../style.ts";
import type { Glyph, GlyphRequest } from "../view.ts";

export const ticks: Glyph = { mark, body, halfWidth: (scale) => TICK_HALF_WIDTH * scale };

/** The smoke, laid down before any unit's ships so a melee does not erase itself. */
function mark(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  if (request.state !== "engaged" && request.state !== "broken") return;
  drawBillow(ctx, request, seeded(request.seed));
}

function body(ctx: CanvasRenderingContext2D, request: GlyphRequest): void {
  const { length, formation, state, strength, colour, seed, scale } = request;
  // Its own generator from the same seed: the body draws the same ticks whether
  // or not the mark ran before it, which is what lets the two halves be
  // separate passes over separate loops.
  const random = seeded(seed);

  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.4 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (state === "destroyed") {
    drawHollowOutline(ctx, length, formation, scale);
  } else {
    for (const index of occupiedSlots(state, shownTicks(state, strength), random)) {
      const along = -length / 2 + ((index + 0.5) * length) / TICKS_PER_GLYPH;
      const slot = formation === "column" ? { x: 0, y: along } : { x: along, y: 0 };
      // A broken unit's ticks are knocked out of line as well as thinned out.
      drawTick(ctx, slot, state === "broken" ? (random() - 0.5) * 0.9 : 0, scale);
    }
  }
  ctx.restore();
}

/** Ticks a glyph shows: `round(ticks * strength)`, at least one unless destroyed. */
function shownTicks(state: UnitState, strength: number): number {
  if (state === "destroyed") return 0;
  return Math.max(1, Math.round(TICKS_PER_GLYPH * strength));
}

/** Which slots carry a tick: a centred contiguous run when the unit holds together, scattered with gaps when broken. */
function occupiedSlots(state: UnitState, shown: number, random: () => number): number[] {
  if (state !== "broken") {
    const start = Math.floor((TICKS_PER_GLYPH - shown) / 2);
    return Array.from({ length: shown }, (_, i) => start + i);
  }
  // Spread the survivors over the whole length, each nudged into a neighbouring slot, so the gaps read as gaps.
  const indices = new Set<number>();
  for (let i = 0; i < shown; i++) {
    const ideal = ((i + 0.5) * TICKS_PER_GLYPH) / shown;
    const nudge = Math.floor(random() * 2) - 1;
    let index = Math.min(TICKS_PER_GLYPH - 1, Math.max(0, Math.floor(ideal) + nudge));
    while (indices.has(index) && index < TICKS_PER_GLYPH - 1) index++;
    indices.add(index);
  }
  return [...indices];
}

/** One ship as a chevron pointing ahead. */
function drawTick(ctx: CanvasRenderingContext2D, at: Point, rotation: number, scale: number): void {
  const w = TICK_HALF_WIDTH * scale;
  const h = TICK_HALF_HEIGHT * scale;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(-w, h);
  ctx.lineTo(0, -h);
  ctx.lineTo(w, h);
  ctx.stroke();
  ctx.restore();
}

/** The destroyed glyph: the outline the ticks would have filled, and nothing inside it. */
function drawHollowOutline(ctx: CanvasRenderingContext2D, length: number, formation: Formation, scale: number): void {
  const across = (TICK_HALF_WIDTH + 2) * scale;
  const along = length / 2;
  const w = formation === "column" ? across : along;
  const h = formation === "column" ? along : across;
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
  const thin = state === "broken";
  const drift = leeDrift(request.windTo, formation);

  // Along the unit's body, and away from it in the drift's direction. The cloud
  // starts clear of the ticks and widens as it goes, so it reads as a plume off
  // one flank rather than a halo the unit sits inside.
  const along = formation === "column" ? { x: 0, y: 1 } : { x: 1, y: 0 };
  const count = Math.max(4, Math.round((thin ? 8 : 16) * scale));
  const clearance = (TICK_HALF_WIDTH + 3) * scale;
  const reach = (thin ? 16 : 26) * scale;

  const puffs: Puff[] = [];
  for (let i = 0; i < count; i++) {
    const out = i / Math.max(1, count - 1);
    // Narrow at the hull, broad downwind: the cloud fans out as it drifts.
    const spread = (random() - 0.5) * length * (0.5 + out * 0.5);
    const distance = clearance + out * reach;
    puffs.push({
      x: along.x * spread + drift.x * distance,
      y: along.y * spread + drift.y * distance,
      r: ((thin ? 3 : 3.5) + out * (thin ? 3.5 : 6.5)) * scale,
    });
  }

  paintCloud(ctx, puffs, drift, Math.max(0.4, 0.7 * scale), scale, palette.ink);
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
  if (scale >= 0.9) {
    paint.strokeStyle = ink;
    paint.lineWidth = 0.55 * scale;
    for (const puff of puffs) {
      for (const fraction of [0.3, 0.52, 0.74]) {
        const offset = puff.r * fraction;
        const half = Math.sqrt(Math.max(0, puff.r * puff.r - offset * offset)) * 0.82;
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
  const along = formation === "column" ? { x: 0, y: 1 } : { x: 1, y: 0 };
  const across = formation === "column" ? { x: 1, y: 0 } : { x: 0, y: 1 };
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
