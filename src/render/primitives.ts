/**
 * Pen strokes shared by every view: the arrows the three motion styles are
 * drawn with, the plate's edge rule, and the seeded generator that keeps
 * anything random from shimmering between frames.
 *
 * The unit glyph is *not* here: it is the one pass a view replaces, so it
 * lives in `glyphs/` and reaches the passes through `view.glyph` (ADR-0014).
 */
import type { Rect } from "./projection.ts";
import type { Pen } from "./view.ts";

export interface Point {
  x: number;
  y: number;
}

/** The plate's edge: a double rule just inside `frame`, where the letterbox begins (ADR-0009). */
export function drawPlateRule(ctx: CanvasRenderingContext2D, frame: Rect, ink: string): void {
  ctx.save();
  ctx.strokeStyle = ink;
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

/**
 * An arrow from `a` to `b` in a view's pen and a colour. The pen carries the
 * weight and head; the colour comes from the palette or the side ink, so a
 * view never restates a colour it has already declared. The shaft is trimmed
 * under a filled head so the barb's point is the head.
 */
export function drawArrow(ctx: CanvasRenderingContext2D, a: Point, b: Point, pen: Pen, colour: string): void {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const size = pen.headSize;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = pen.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([...pen.dash]);
  const trim = pen.head === "filled" ? size * 0.7 : 0;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x - Math.cos(angle) * trim, b.y - Math.sin(angle) * trim);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(b.x, b.y);
  ctx.rotate(angle);
  ctx.beginPath();
  if (pen.head === "filled") {
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
