/**
 * The units pass: every unit's track and moves first (so no arrow crosses a
 * glyph), then the ship-tick glyphs, then the labels. The caller has already
 * clipped to the extent, which is what clips a move head lying outside it
 * (ADR-0004).
 *
 * PROTOTYPE (#39): the labels are no longer placed here. `labels.ts` holds
 * three candidate placement algorithms and this pass only draws what one of
 * them returned, plus the leader, the numeral and (with `?boxes=1`) the
 * collision boxes. Throwaway; the v0.1 `drawLabel` is in git history.
 */
import type { UnitPicture } from "../timeline/picture.ts";
import { furniture, recordFrame, settings } from "../prototype/state.ts";
import type { LabelUnit, Placed } from "./labels.ts";
import { placeLabels } from "./labels.ts";
import type { Plate } from "./plate.ts";
import { drawArrow, drawGlyph, hashString, type Point } from "./primitives.ts";
import { toRadians } from "./projection.ts";
import { detachmentStyle, font, INK, INTENT_STYLE, TRACK_STYLE } from "./style.ts";

/** Below this many pixels a track is a dot under the glyph, not an arrow. */
const MIN_ARROW_PX = 6;

export function drawUnits(plate: Plate): void {
  const { ctx, battle, picture, projection } = plate;
  const roster = new Map(battle.units.map((unit) => [unit.id, unit]));

  const colourOf = (unit: UnitPicture): string => {
    const side = roster.get(unit.id)?.side;
    return (side === undefined ? undefined : plate.colours.get(side)) ?? INK;
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
      length: plate.glyphLength,
      formation: unit.formation,
      state: unit.state,
      strength: unit.strength,
      colour: colourOf(unit),
      seed: hashString(unit.id),
    });
    ctx.restore();
  }

  // Labels: placed by the prototype's chosen algorithm, then drawn.
  const placed = placeLabels({
    variant: settings.variant,
    units: labelUnits(plate),
    plate: projection.extentRect,
    measure: measurer(ctx),
    shortMode: settings.shortMode,
    floor: settings.floor,
    obstacles: settings.furniture ? furniture.boxes : [],
  });
  recordFrame(placed, picture.clock);
  for (const label of placed) drawLabel(plate, label);
  if (settings.boxes) for (const label of placed) drawBox(plate, label);
}

/** The measurer the placer uses: the real plate face at the real size. */
function measurer(ctx: CanvasRenderingContext2D) {
  return (text: string, size: number, italic: boolean): number => {
    ctx.save();
    ctx.font = font(size, italic);
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  };
}

/** Everything the placer needs about the units of one frame. */
export function labelUnits(plate: Plate): LabelUnit[] {
  const { battle, picture, projection } = plate;
  const roster = new Map(battle.units.map((unit) => [unit.id, unit]));
  const order = new Map(battle.units.map((unit, index) => [unit.id, index]));
  // The wind blows *from* `wind.from`, so the smoke goes to the opposite bearing.
  const windTo = picture.wind?.from === undefined ? undefined : (picture.wind.from + 180) % 360;

  return picture.units.map((unit) => {
    const entry = roster.get(unit.id);
    const side = entry?.side;
    const label: LabelUnit = {
      id: unit.id,
      name: entry?.label ?? unit.id,
      state: unit.state,
      strength: unit.strength,
      colour: (side === undefined ? undefined : plate.colours.get(side)) ?? INK,
      anchor: projection.project(unit.position.lat, unit.position.lon),
      heading: unit.heading,
      formation: unit.formation,
      length: plate.glyphLength,
      hasMove: unit.moves.length > 0,
      rosterIndex: order.get(unit.id) ?? 0,
    };
    if (entry?.commander !== undefined) label.commander = entry.commander;
    if (windTo !== undefined) label.windTo = windTo;
    return label;
  });
}

/** The two lines, and the leader back to the glyph when the label has left its flank. */
function drawLabel(plate: Plate, label: Placed): void {
  const { ctx } = plate;
  ctx.save();
  if (label.leader) drawLeader(ctx, label);

  ctx.textAlign = label.align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = label.unit.colour;
  ctx.font = font(14, true);
  ctx.fillText(label.name, label.x, label.y + (label.detail === undefined ? 0 : -8));
  if (label.detail !== undefined) {
    ctx.fillStyle = INK;
    ctx.font = font(12);
    ctx.fillText(label.detail, label.x, label.y + 8);
  }
  ctx.restore();
}

/** A 0.8px rule from the label's near edge to a 1.6 dot at the glyph's centre (#58). */
function drawLeader(ctx: CanvasRenderingContext2D, label: Placed): void {
  const centre = label.unit.anchor;
  const near: Point = {
    x: label.offset.x >= 0 ? label.box.x : label.box.x + label.box.width,
    y: Math.min(Math.max(centre.y, label.box.y), label.box.y + label.box.height),
  };
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(near.x, near.y);
  ctx.lineTo(centre.x, centre.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** PROTOTYPE: the collision box and the collapse step that produced it. */
function drawBox(plate: Plate, label: Placed): void {
  const { ctx } = plate;
  ctx.save();
  ctx.strokeStyle = "rgba(180,0,120,0.65)";
  ctx.lineWidth = 0.7;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(label.box.x, label.box.y, label.box.width, label.box.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(180,0,120,0.85)";
  ctx.font = "10px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(String(label.step), label.box.x + 1, label.box.y - 1);
  ctx.restore();
}
