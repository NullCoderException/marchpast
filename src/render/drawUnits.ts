/**
 * The units pass: every unit's track and moves first (so no arrow crosses a
 * glyph), then the glyphs. The caller has already clipped to the extent, which
 * is what clips a move head lying outside it (ADR-0004).
 *
 * A **shared pass**, and the one that hands work to the view. It resolves the
 * side ink, turns the phase's wind into the one angle a glyph is allowed to
 * know, and calls the view's glyph — which is the whole of what changes
 * between the plate's ticks and Atlas's blocks.
 *
 * Laid out first, drawn second. `layoutUnits` says where every glyph will land
 * and what the placer will be told about it; `drawUnits` inks that. The two
 * are separate because the whole plate is laid out before anything is drawn:
 * the map's names clear the units' labels and the units' labels clear the
 * map's names, and the map is drawn first (#107).
 *
 * It does **not** draw the labels. Placing them needs the furniture's boxes as
 * well as the glyphs', so that pass runs last, unclipped, over what this one
 * reports: every drawn unit as the placer sees it — where its glyph landed,
 * how far it reaches, and the words its roster entry offers (#39).
 *
 * It draws `plate.unitsDrawn`, not the whole picture: which units a level puts
 * on the plate is settled once, in `level.ts`, before any pass runs (ADR-0017).
 */
import type { Arm } from "../schema/types.ts";
import type { Picture, UnitPicture } from "../timeline/picture.ts";
import type { LabelUnit } from "./labels/index.ts";
import type { Plate } from "./plate.ts";
import { hashString, type Point } from "./primitives.ts";
import { toRadians } from "./projection.ts";
import { GLYPH_PX } from "./anatomy.ts";
import type { GlyphRequest, MoveRequest, MoveStyle } from "./view.ts";

/** Below this many pixels a track is a dot under the glyph, not an arrow. */
const MIN_ARROW_PX = 6;

/**
 * One unit ready to be inked: where it landed, what it asks the view's glyph
 * for, and the label it offers the placer. Laid out before anything is drawn,
 * because the map's names have to clear the units' labels and the map is drawn
 * first (#107).
 */
export interface LaidOutUnit {
  unit: UnitPicture;
  at: Point;
  /** Radians, as the canvas is rotated by. */
  heading: number;
  request: GlyphRequest;
  label: LabelUnit;
}

/** Works out where every unit this level draws will land, and what the label pass will be told about it. */
export function layoutUnits(plate: Plate): LaidOutUnit[] {
  const { battle, picture, unitsDrawn, projection, view } = plate;
  const { palette } = view;
  // The whole roster, never the level's slice of it: a unit's label — and the
  // numeral that will key it in the legend (#39) — is its whole-roster entry
  // at every level (schema.md 2.11).
  const roster = new Map(battle.units.map((unit, rosterIndex) => [unit.id, { unit, rosterIndex }]));

  const colourOf = (unit: UnitPicture): string => {
    const side = roster.get(unit.id)?.unit.side;
    return (side === undefined ? undefined : plate.colours.get(side)) ?? palette.ink;
  };

  // The arm is roster identity, never per-phase state (ADR-0015), so it is
  // looked up here rather than carried on the picture. There is no fallback
  // sign and so no fallback arm: a unit the roster does not hold is a picture
  // that was never built from this battle, and it fails the way a missing
  // snapshot does in `pictureAt` rather than drawing foot as ships.
  const armOf = (unit: UnitPicture): Arm => {
    const arm = roster.get(unit.id)?.unit.arm;
    if (arm === undefined) throw new RangeError(`The roster has no unit ${JSON.stringify(unit.id)}`);
    return arm;
  };

  const windFrom = blowingWind(picture);
  return unitsDrawn.map((unit) => {
    const at = projection.project(unit.position.lat, unit.position.lon);
    const request: GlyphRequest = {
      length: GLYPH_PX,
      formation: unit.formation,
      arm: armOf(unit),
      state: unit.state,
      strength: unit.strength,
      colour: colourOf(unit),
      seed: hashString(unit.id),
      scale: 1,
      windTo: windFrom === undefined ? undefined : windToRelative(unit.heading, windFrom),
      palette,
    };

    // What the label pass needs and only this pass knows: where each glyph
    // landed, how far it reaches across its axis, and the roster entry behind it.
    const entry = roster.get(unit.id);
    const label: LabelUnit = {
      id: unit.id,
      rosterIndex: entry?.rosterIndex ?? 0,
      name: entry?.unit.label ?? unit.id,
      state: unit.state,
      strength: unit.strength,
      colour: request.colour,
      anchor: at,
      heading: unit.heading,
      formation: unit.formation,
      length: request.length,
      halfWidth: view.glyph.halfWidth(request.scale, unit.formation),
      markReach: view.glyph.markReach(request.scale, unit.state),
      hasMove: unit.moves.length > 0,
    };
    if (entry?.unit.short_label !== undefined) label.shortLabel = entry.unit.short_label;
    if (request.windTo !== undefined) label.windTo = request.windTo;
    return { unit, at, heading: toRadians(unit.heading), request, label };
  });
}

/** Draws what `layoutUnits` worked out, in the order the plate reads: every arrow, then every glyph. */
export function drawUnits(plate: Plate, laid: readonly LaidOutUnit[]): void {
  const { ctx, projection, view } = plate;
  const { palette, pens, moves } = view;

  // A track and an intent take the palette's ink; a detachment takes the
  // unit's own side, which is the whole of what the anatomy says about their
  // colour (ADR-0014). The pen is the view's, and so is the hand that uses it.
  const inInk = (style: MoveStyle): MoveRequest => ({ pen: pens[style], colour: palette.ink, palette });

  // Tracks and moves. A track runs wherever the tween takes it: heading is the
  // front, so a unit retiring in good order draws its track back through its
  // own rear (ADR-0016). Nothing here assumes it runs ahead.
  for (const { unit, at: here, request } of laid) {
    if (unit.track !== undefined) {
      const ahead = projection.project(unit.track.to.lat, unit.track.to.lon);
      if (Math.hypot(ahead.x - here.x, ahead.y - here.y) >= MIN_ARROW_PX) moves.track(ctx, here, ahead, inInk("track"));
    }
    for (const move of unit.moves) {
      const to = projection.project(move.to.lat, move.to.lon);
      if (move.kind === "intent") moves.intent(ctx, here, to, inInk("intent"));
      else moves.detachment(ctx, here, to, { pen: pens.detachment, colour: request.colour, palette });
    }
  }

  // Glyphs, in two passes: every unit's mark, then every unit's body. One
  // unit's smoke must never cover the next unit's ships, and at 13:30 off
  // Trafalgar three units overlap (ADR-0014).
  for (const half of ["mark", "body"] as const) {
    if (view.glyph[half] === undefined) continue;
    for (const { at, heading, request } of laid) {
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.rotate(heading);
      view.glyph[half]?.(ctx, request);
      ctx.restore();
    }
  }
}

/** The bearing the phase's wind blows from, or `undefined` when there is no wind to speak of (ADR-0008). */
function blowingWind(picture: Picture): number | undefined {
  const wind = picture.wind;
  if (wind === undefined || wind.force === "calm" || wind.from === undefined) return undefined;
  return wind.from;
}

/**
 * Where the wind blows *to*, in radians clockwise from a unit's own heading:
 * the whole of what a glyph ever learns about the wind, so no glyph handles a
 * compass bearing. Both arguments are degrees true; the answer is one turn.
 */
export function windToRelative(heading: number, windFrom: number): number {
  return toRadians((((windFrom + 180 - heading) % 360) + 360) % 360);
}
