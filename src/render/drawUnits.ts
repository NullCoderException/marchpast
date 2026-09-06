/**
 * The units layer: every unit's track and moves first (so no arrow crosses a
 * glyph), then the ship-tick glyphs, then the labels. The caller has already
 * clipped to the extent, which is what clips a move head lying outside it
 * (ADR-0004).
 */
import type { UnitPicture } from "../timeline/picture.ts";
import { drawArrow, drawGlyph, hashString, type Point } from "./primitives.ts";
import type { Scene } from "./scene.ts";
import { detachmentStyle, font, INK, INTENT_STYLE, STATE_WORDS, TICK_HALF_WIDTH, TRACK_STYLE } from "./style.ts";

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Below this many pixels a track is a dot under the glyph, not an arrow. */
const MIN_ARROW_PX = 6;
/** Clearance between the glyph's ticks and smoke and its label. */
const LABEL_GAP = 30;

export function drawUnits(scene: Scene): void {
  const { ctx, battle, picture, projection } = scene;
  const roster = new Map(battle.units.map((unit) => [unit.id, unit]));

  const colourOf = (unit: UnitPicture): string => {
    const side = roster.get(unit.id)?.side;
    return (side === undefined ? undefined : scene.colours.get(side)) ?? INK;
  };

  // Tracks and moves.
  for (const unit of picture.units) {
    const here = projection.project(unit.position.lat, unit.position.lon);
    if (unit.track !== undefined) {
      const ahead = projection.project(unit.track.to.lat, unit.track.to.lon);
      if (Math.hypot(ahead.x - here.x, ahead.y - here.y) >= MIN_ARROW_PX) drawArrow(ctx, here, ahead, TRACK_STYLE);
    }
    for (const move of unit.moves) {
      const to = projection.project(move.to.lat, move.to.lon);
      drawArrow(ctx, here, to, move.kind === "intent" ? INTENT_STYLE : detachmentStyle(colourOf(unit)));
    }
  }

  // Glyphs.
  for (const unit of picture.units) {
    const here = projection.project(unit.position.lat, unit.position.lon);
    ctx.save();
    ctx.translate(here.x, here.y);
    ctx.rotate(toRadians(unit.heading));
    drawGlyph(ctx, {
      length: scene.glyphLength,
      formation: unit.formation,
      state: unit.state,
      strength: unit.strength,
      colour: colourOf(unit),
      seed: hashString(unit.id),
    });
    ctx.restore();
  }

  // Labels: the unit's name and beneath it the state word and, below full strength, the percentage.
  for (const unit of picture.units) {
    const here = projection.project(unit.position.lat, unit.position.lon);
    drawLabel(scene, unit, here, roster.get(unit.id)?.label ?? unit.id, colourOf(unit));
  }
}

function drawLabel(scene: Scene, unit: UnitPicture, at: Point, label: string, colour: string): void {
  const { ctx, frame } = scene;
  const state = STATE_WORDS[unit.state];
  const detail = unit.strength < 1 ? `${state} · ${Math.round(unit.strength * 100)}%` : state;

  // The label sits on the glyph's flank, across its long axis, where the track and moves (which run
  // ahead of the unit) never go. A column's flank is beside the heading; a line's is behind it.
  const heading = toRadians(unit.heading);
  const flank = unit.formation === "column" ? heading + Math.PI / 2 : heading + Math.PI;
  const reach = TICK_HALF_WIDTH + LABEL_GAP;

  ctx.save();
  ctx.font = font(14, true);
  const width = Math.max(ctx.measureText(label).width, ctx.measureText(detail).width);
  // Try the flank that puts the label rightward first, then the other, so it stays on the plate.
  const candidates = [flank, flank + Math.PI].sort((a, b) => Math.sin(b) - Math.sin(a));
  let placed: { x: number; y: number; align: CanvasTextAlign } | undefined;
  for (const angle of candidates) {
    const dx = Math.sin(angle);
    const dy = -Math.cos(angle);
    const align: CanvasTextAlign = dx >= -0.05 ? "left" : "right";
    const x = at.x + dx * reach;
    const y = at.y + dy * reach;
    const left = align === "left" ? x : x - width;
    if (left >= frame.x + 6 && left + width <= frame.x + frame.width - 6) {
      placed = { x, y, align };
      break;
    }
  }
  placed ??= { x: at.x + reach, y: at.y, align: "left" };

  ctx.textAlign = placed.align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = colour;
  ctx.fillText(label, placed.x, placed.y - 8);
  ctx.fillStyle = INK;
  ctx.font = font(12);
  ctx.fillText(detail, placed.x, placed.y + 8);
  ctx.restore();
}
