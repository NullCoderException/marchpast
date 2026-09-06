/**
 * The units pass: every unit's track and moves first (so no arrow crosses a
 * glyph), then the glyphs, then the labels. The caller has already clipped to
 * the extent, which is what clips a move head lying outside it (ADR-0004).
 *
 * A **shared pass**, and the one that hands work to the view. It resolves the
 * side ink, turns the phase's wind into the one angle a glyph is allowed to
 * know, and calls the view's glyph — which is the whole of what changes
 * between the plate's ticks and Atlas's blocks. The label is drawn here, by
 * the same code, for every view: none of the three replaces it.
 */
import type { UnitPicture } from "../timeline/picture.ts";
import type { Plate } from "./plate.ts";
import { drawArrow, hashString, type Point } from "./primitives.ts";
import { toRadians } from "./projection.ts";
import { font } from "./style.ts";

/** Below this many pixels a track is a dot under the glyph, not an arrow. */
const MIN_ARROW_PX = 6;
/** Clearance between the glyph and its label. */
const LABEL_GAP = 30;

export function drawUnits(plate: Plate): void {
  const { ctx, battle, picture, projection, view } = plate;
  const { palette, pens } = view;
  const roster = new Map(battle.units.map((unit) => [unit.id, unit]));

  const colourOf = (unit: UnitPicture): string => {
    const side = roster.get(unit.id)?.side;
    return (side === undefined ? undefined : plate.colours.get(side)) ?? palette.ink;
  };

  // Tracks and moves.
  for (const unit of picture.units) {
    const here = projection.project(unit.position.lat, unit.position.lon);
    if (unit.track !== undefined) {
      const ahead = projection.project(unit.track.to.lat, unit.track.to.lon);
      if (Math.hypot(ahead.x - here.x, ahead.y - here.y) >= MIN_ARROW_PX) drawArrow(ctx, here, ahead, pens.track, palette.ink);
    }
    for (const move of unit.moves) {
      const to = projection.project(move.to.lat, move.to.lon);
      if (move.kind === "intent") drawArrow(ctx, here, to, pens.intent, palette.ink);
      else drawArrow(ctx, here, to, pens.detachment, colourOf(unit));
    }
  }

  // Glyphs, in two passes: every unit's mark, then every unit's body. One
  // unit's smoke must never cover the next unit's ships, and at 13:30 off
  // Trafalgar three units overlap.
  const windTo = windRelativeTo(plate);
  const requests = picture.units.map((unit) => ({
    unit,
    at: projection.project(unit.position.lat, unit.position.lon),
    request: {
      length: plate.glyphLength,
      formation: unit.formation,
      state: unit.state,
      strength: unit.strength,
      colour: colourOf(unit),
      seed: hashString(unit.id),
      scale: 1,
      windTo: windTo === undefined ? undefined : windTo - toRadians(unit.heading),
      palette,
    },
  }));

  const { mark, body } = view.glyph;
  for (const stroke of [mark, body]) {
    if (stroke === undefined) continue;
    for (const { unit, at, request } of requests) {
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.rotate(toRadians(unit.heading));
      stroke(ctx, request);
      ctx.restore();
    }
  }

  // Labels: the unit's name and beneath it the state word and, below full strength, the percentage.
  for (const unit of picture.units) {
    const here = projection.project(unit.position.lat, unit.position.lon);
    drawLabel(plate, unit, here, roster.get(unit.id)?.label ?? unit.id, colourOf(unit));
  }
}

/**
 * Where the phase's wind blows *to*, in radians clockwise from north, or
 * `undefined` when the battle tracks no wind or the wind is calm. The glyph is
 * handed this minus the unit's heading, so it never sees a compass bearing.
 */
function windRelativeTo({ picture }: Plate): number | undefined {
  const wind = picture.wind;
  if (wind === undefined || wind.force === "calm" || wind.from === undefined) return undefined;
  return toRadians(wind.from + 180);
}

function drawLabel(plate: Plate, unit: UnitPicture, at: Point, label: string, colour: string): void {
  const { ctx, view } = plate;
  const { extentRect } = plate.projection;
  const detail = unit.strength < 1 ? `${unit.state} · ${Math.round(unit.strength * 100)}%` : unit.state;

  // The label sits on the glyph's flank, across its long axis, where the track and moves (which run
  // ahead of the unit) never go. A column's flank is beside the heading; a line's is behind it.
  const heading = toRadians(unit.heading);
  const flank = unit.formation === "column" ? heading + Math.PI / 2 : heading + Math.PI;
  // The one thing the label needs from the view: how far the glyph reaches across its axis.
  const reach = view.glyph.halfWidth(1) + LABEL_GAP;

  ctx.save();
  ctx.font = font(12);
  const detailWidth = ctx.measureText(detail).width;
  ctx.font = font(14, true);
  const width = Math.max(ctx.measureText(label).width, detailWidth);
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
    if (left >= extentRect.x + 6 && left + width <= extentRect.x + extentRect.width - 6) {
      placed = { x, y, align };
      break;
    }
  }
  placed ??= { x: at.x + reach, y: at.y, align: "left" };

  ctx.textAlign = placed.align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = colour;
  ctx.fillText(label, placed.x, placed.y - 8);
  ctx.fillStyle = view.palette.ink;
  ctx.font = font(12);
  ctx.fillText(detail, placed.x, placed.y + 8);
  ctx.restore();
}
