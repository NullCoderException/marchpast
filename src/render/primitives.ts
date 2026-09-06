/**
 * Pen strokes shared by the drawing passes: arrows in the three line styles,
 * and the unit glyph (ship-ticks, smoke, the destroyed outline) drawn at the
 * origin so the units pass and the legend draw the same thing at different sizes.
 */
import type { Formation, UnitState } from "../schema/types.ts";
import type { Rect } from "./projection.ts";
import { INK, SMOKE, TICK_HALF_HEIGHT, TICK_HALF_WIDTH, TICKS_PER_GLYPH, type LineStyle } from "./style.ts";

export interface Point {
  x: number;
  y: number;
}

/** The plate's edge: a double ink rule just inside `frame`, where the letterbox begins (ADR-0009). */
export function drawPlateRule(ctx: CanvasRenderingContext2D, frame: Rect): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1);
  ctx.strokeRect(frame.x + 5.5, frame.y + 5.5, frame.width - 11, frame.height - 11);
  ctx.restore();
}

/** A small deterministic generator so smoke and disorder do not flicker between frames. */
export function seeded(seed: number): () => number {
  let s = (Math.abs(Math.floor(seed)) * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** A small stable hash for seeding from a unit id. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/** An arrow from `a` to `b` in a line style. The shaft is trimmed under a filled head so the barb's point is the head. */
export function drawArrow(ctx: CanvasRenderingContext2D, a: Point, b: Point, style: LineStyle): void {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const size = style.headSize;
  ctx.save();
  ctx.strokeStyle = style.colour;
  ctx.fillStyle = style.colour;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(style.dash);
  const trim = style.head === "filled" ? size * 0.7 : 0;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x - Math.cos(angle) * trim, b.y - Math.sin(angle) * trim);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(b.x, b.y);
  ctx.rotate(angle);
  ctx.beginPath();
  if (style.head === "filled") {
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.5);
    ctx.lineTo(-size * 0.7, 0);
    ctx.lineTo(-size, size * 0.5);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.moveTo(-size, -size * 0.55);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

export interface GlyphOptions {
  /** The long axis in pixels. */
  length: number;
  formation: Formation;
  state: UnitState;
  /** `0` to `1`; sets how many of the ticks are shown. */
  strength: number;
  colour: string;
  /** Seeds the smoke and the disorder of a broken unit. */
  seed: number;
  /** Tick size multiplier: `1` on the plate, smaller in the legend. */
  scale?: number;
}

/** Ticks a glyph shows: `round(ticks * strength)`, at least one unless destroyed. */
export function shownTicks(state: UnitState, strength: number): number {
  if (state === "destroyed") return 0;
  return Math.max(1, Math.round(TICKS_PER_GLYPH * strength));
}

/**
 * The ship-tick glyph at the origin, heading up the negative y axis (the
 * caller rotates to the heading). `column` runs ticks in line ahead along
 * the axis; `line` runs them abreast across it. Smoke goes under the ticks.
 */
export function drawGlyph(ctx: CanvasRenderingContext2D, options: GlyphOptions): void {
  const { length, formation, state, strength, colour, seed } = options;
  const scale = options.scale ?? 1;
  const shown = shownTicks(state, strength);
  const random = seeded(seed);

  if (state === "engaged" || state === "broken") drawSmoke(ctx, length, formation, state, random, scale);

  // Slot centres along the long axis. A column's axis is the heading (y); a line's is across it (x).
  const slots: Point[] = [];
  for (let i = 0; i < TICKS_PER_GLYPH; i++) {
    const along = -length / 2 + ((i + 0.5) * length) / TICKS_PER_GLYPH;
    slots.push(formation === "column" ? { x: 0, y: along } : { x: along, y: 0 });
  }

  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.4 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (state === "destroyed") {
    drawHollowOutline(ctx, length, formation, scale);
  } else {
    const occupied = occupiedSlots(state, shown, random);
    for (const index of occupied) {
      const slot = slots[index];
      if (slot === undefined) continue;
      // A broken unit's ticks are knocked out of line as well as thinned out.
      const disorder = state === "broken" ? (random() - 0.5) * 0.9 : 0;
      drawTick(ctx, slot, disorder, scale);
    }
  }
  ctx.restore();
}

/** Which of the slots carry a tick: a centred contiguous run for a unit holding together, scattered with gaps when broken. */
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

/** One ship as a chevron pointing ahead (up the negative y axis). */
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

/** Grey smoke puffs along the unit: a full drift when engaged, thinner and fewer when broken. */
function drawSmoke(
  ctx: CanvasRenderingContext2D,
  length: number,
  formation: Formation,
  state: "engaged" | "broken",
  random: () => number,
  scale: number,
): void {
  // Fewer puffs at a smaller scale, so the legend's sample is a hint of smoke rather than a cloud.
  const puffs = Math.round((state === "broken" ? 10 : 22) * scale);
  const radiusBase = (state === "broken" ? 3 : 5) * scale;
  const radiusSpread = (state === "broken" ? 5 : 9) * scale;
  ctx.save();
  ctx.fillStyle = SMOKE;
  for (let i = 0; i < puffs; i++) {
    const along = (random() - 0.5) * length * 1.2;
    const across = (random() - 0.5) * 26 * scale - 8 * scale;
    const x = formation === "column" ? across : along;
    const y = formation === "column" ? along : across;
    ctx.beginPath();
    ctx.arc(x, y, radiusBase + random() * radiusSpread, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
