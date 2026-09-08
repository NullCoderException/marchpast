/**
 * The staff map's ground: the `ops` sheet #138 chose — a printed
 * twentieth-century operations sheet, drawn over exactly the anatomy the
 * engraved views draw and in a wholly different hand (ADR-0021).
 *
 * What is different, kind by kind:
 *
 *   - the **sea** is a flat body of water with a colour of its own, where an
 *     engraved chart's sea is the paper it is printed on;
 *   - the **land** takes one fine shore line, where the plate shades inward
 *     from it in four strokes;
 *   - **relief** is flat steps of olive buff under sienna contours, with the
 *     **height set into the line** — broken into it and turned to lie along
 *     it, at most twice a level — where the plate gathers its numerals in a
 *     column at the foot of the plate;
 *   - a **kilometre graticule** in slate runs over the whole of it with its
 *     edge numerals riding with it. It is ground and not furniture (ADR-0021),
 *     it gets no slot of its own, and this hand lays it down at the end of the
 *     relief step, which is the last thing under the water and the units;
 *   - a **shoal** is a tint of shallow water with a dashed edge, where the
 *     plate stipples one and gives it no colour at all: this view has a colour
 *     for shallow water, so it needs no texture;
 *   - a **river** is one stroke of that same shallow, where the plate lays ink
 *     with the paper back over its middle;
 *   - a **rampart** is an **obstacle**: one heavier line with cross ticks
 *     through it, both sides, where the engraved views hang a ditch's teeth off
 *     one side. Its own hand rather than a third `RampartPen`, because a cross
 *     tick is a different drawing and not a wider tooth (#138, #170);
 *   - a **work** is a square with a flagstaff, and a **place**'s name is set
 *     upright: there is no italic anywhere in this view.
 */
import type { LonLat, MapFile } from "../../../schema/types.ts";
import { atAlpha } from "../../ink.ts";
import type { MapLabelKind } from "../../labels/index.ts";
import {
  areaRings,
  byWeight,
  contourLinesOf,
  isClosed,
  landRings,
  lineStrings,
  projectLine,
  rampartRuns,
  rampartTeeth,
  tracePolygons,
  tracePolyline,
} from "../../mapGeometry.ts";
import type { Point } from "../../primitives.ts";
import { bandIndexAt, indexLevels, tintBandLevels } from "../../relief.ts";
import type { Ground, GroundRequest, Naming, Palette } from "../../view.ts";
import { graticule } from "./graticule.ts";
import { STAFF_CONTOUR, STAFF_GRID, STAFF_SHALLOW } from "./palette.ts";
import { font } from "./type.ts";

/** The shore: one fine line, and no inward shading — a printed sheet rules its coast rather than engraving it. */
const COAST_WIDTH = 1;

/** The two contour weights. Finer than the plate's fine line, heavier than its index one: sienna over tone, not ink over paper (#138). */
const CONTOUR_WIDTH = 0.45;
const INDEX_CONTOUR_WIDTH = 0.9;

/** The numeral set into the line: its size, the half-width of the knock-out per digit, and how deep the knock-out cuts. */
const NUMERAL_SIZE = 10;
const NUMERAL_DIGIT_HALF = 3.4;
const NUMERAL_PAD = 3;
const NUMERAL_KNOCKOUT_HEIGHT = 12;
/** How many times one level is numbered: as a sheet repeats a number round a long contour, and no more. */
const NUMERALS_PER_LEVEL = 2;
/** How far along a line the tangent is read, and how far in from the plate's edge a numeral may be set. */
const NUMERAL_TANGENT = 3;
const NUMERAL_EDGE_INSET = 40;
const NUMERAL_END_INSET = 30;
/** The least number of points a line must carry to be numbered at all: the tangent needs room either side. */
const NUMERAL_MARGIN = 6;
/** How often along a line a place is tried, and the least a line's two numerals stand apart, as a share of its length. */
const NUMERAL_STRIDE = 8;
const NUMERAL_SPREAD = 3;

/** The graticule: its weight, how hard the slate is laid, and the numerals riding with it. */
const GRID_WIDTH = 0.6;
const GRID_ALPHA = 0.5;
const GRID_NUMERAL_SIZE = 10;
const GRID_NUMERAL_TRACKING = "0.4px";
/**
 * Where a numeral rides beside its own line, and how far in from the frame's
 * edges the four of them sit. Clear of the neat line's inner rule, which is
 * 6.5 px in: a numeral set on it reads as a smudge on the border rather than a
 * square's number.
 */
const GRID_NUMERAL_OFFSET = 3;
const GRID_TOP_INSET = 15;
const GRID_BOTTOM_INSET = 12;
const GRID_LEFT_INSET = 10;
const GRID_RIGHT_INSET = 22;
const GRID_ROW_RISE = 6;

/** The shoal: a tint of shallow water under a dashed edge, in place of the plate's stipple. */
const SHOAL_EDGE_WIDTH = 1.2;
const SHOAL_EDGE_DASH: readonly number[] = [4, 3];

/** The river: one stroke of shallow water, where the plate lays two banks round the sea's own material. */
const RIVER_WIDTH = 3.6;

/** The rampart as an obstacle: a 2.2 px line with cross ticks both sides, at 16 px (#138). */
const RAMPART_WIDTH = 2.2;
const RAMPART_TICK_WIDTH = 1.1;
const RAMPART_TICK_LENGTH = 6;
const RAMPART_TICK_SPACING = 16;
/** How much of a tick falls on the far side of the line, as a fraction of its length: a cross, not a tooth. */
const RAMPART_TICK_BACK = 0.5;

/** A place: the dot, the gap before its name, and the size the name is set at. */
const PLACE_DOT_RADIUS = 2.5;
const PLACE_LABEL_GAP = 8;
const PLACE_LABEL_SIZE = 13;

/** The work's sign: a 9 px square with a flagstaff and a pennant, 13 px tall and 7 px wide of the staff. */
const WORK_HALF = 4.5;
const WORK_STAFF_TOP = -13;
const WORK_PENNANT_SPAN = 7;
const WORK_PENNANT_DROP = 4;
const WORK_SIGN_WIDTH = 1.2;
const WORK_LABEL_GAP = 12;
const WORK_LABEL_SIZE = 11;
const WORK_LABEL_WEIGHT = 500;
const WORK_LABEL_TRACKING = "0.6px";

export const staffGround: Ground = {
  sea,
  land,
  relief,
  water,
  rampart,
  // Always: the graticule runs over the whole extent, so every corner of this
  // view's furniture stands on ground and is given paper first (#62, #175).
  underFurniture: () => true,
  mark,
  naming,
};

/** The sea: a flat body of water inside the extent. No mottle anywhere — a texture is an engraver's, not a printer's. */
function sea({ ctx, projection, palette }: GroundRequest): void {
  const { x, y, width, height } = projection.extentRect;
  ctx.fillStyle = palette.water;
  ctx.fillRect(x, y, width, height);
}

/** The land in its own tone, ruled round with one fine shore line. */
function land({ ctx, map, projection, palette }: GroundRequest): void {
  if (map === undefined) return;
  const rings = landRings(map);
  if (rings.length === 0) return;
  ctx.save();
  tracePolygons(ctx, projection, rings);
  ctx.fillStyle = palette.land;
  ctx.fill("evenodd");
  ctx.lineWidth = COAST_WIDTH;
  ctx.lineJoin = "round";
  ctx.strokeStyle = palette.coast;
  ctx.stroke();
  ctx.restore();
}

/**
 * Height as flat steps under sienna contours, with the numerals set into the
 * lines — and the graticule over all of it, because the grid is ground and
 * this is the hand that draws the ground (ADR-0021, #138).
 *
 * The grid is laid last of the four so it rules across the steps rather than
 * disappearing under them, and it is drawn whether or not the map carries any
 * relief at all: a battle with no map still plays over kilometres.
 */
function relief(request: GroundRequest): void {
  const lines = contourLinesOf(request);
  if (lines !== undefined) {
    const laid = drawSteps(request, lines);
    strokeContours(request, lines);
    drawInlineNumerals(request, lines, laid);
  }
  drawGraticule(request);
}

/** The water on the land: every shoal's tint and dashed edge, then the rivers. */
function water(request: GroundRequest): void {
  const { map } = request;
  if (map === undefined) return;
  drawShoals(request, map);
  drawRivers(request, map);
}

/**
 * Every rampart as an obstacle: the line, and cross ticks through it. The
 * ticks are walked off the same winding the engraved ditch is (ADR-0026), so
 * the side a rampart faces is still the side it is drawn towards — a cross
 * tick simply says *obstacle* where a tooth says *ditch*, and stands both
 * sides of the line rather than one.
 */
function rampart({ ctx, map, projection, palette }: GroundRequest): void {
  if (map === undefined) return;
  const runs = rampartRuns(map, projection);
  if (runs.length === 0) return;

  ctx.save();
  ctx.strokeStyle = palette.ink;
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (const run of runs) run.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.lineWidth = RAMPART_WIDTH;
  ctx.stroke();

  ctx.beginPath();
  for (const run of runs) {
    for (const { from, to } of rampartTeeth(run, RAMPART_TICK_SPACING, RAMPART_TICK_LENGTH)) {
      // The walk gives the tooth from the line outward; a cross tick is the
      // same segment carried back through the line by `RAMPART_TICK_BACK`.
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      ctx.moveTo(from.x - dx * RAMPART_TICK_BACK, from.y - dy * RAMPART_TICK_BACK);
      ctx.lineTo(to.x, to.y);
    }
  }
  ctx.lineWidth = RAMPART_TICK_WIDTH;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

/** The mark a named point stands on: a place's dot, a work's square with its flagstaff. */
function mark(ctx: CanvasRenderingContext2D, kind: MapLabelKind, palette: Palette): void {
  ctx.save();
  if (kind === "place") {
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(0, 0, PLACE_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.lineWidth = WORK_SIGN_WIDTH;
  ctx.lineJoin = "miter";
  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = palette.paper;
  ctx.beginPath();
  ctx.rect(-WORK_HALF, -WORK_HALF, WORK_HALF * 2, WORK_HALF * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -WORK_HALF);
  ctx.lineTo(0, WORK_STAFF_TOP);
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.beginPath();
  ctx.moveTo(0, WORK_STAFF_TOP);
  ctx.lineTo(WORK_PENNANT_SPAN, WORK_STAFF_TOP + WORK_PENNANT_DROP / 2);
  ctx.lineTo(0, WORK_STAFF_TOP + WORK_PENNANT_DROP);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * How this view sets a named point's name: both upright, because it has no
 * italic — a place's as written, a work's in tracked capitals at 500, which is
 * the same case-and-tracking device the whole view tells a name from a fact
 * by (#139).
 */
function naming(kind: MapLabelKind): Naming {
  if (kind === "place") {
    return {
      font: font(PLACE_LABEL_SIZE),
      size: PLACE_LABEL_SIZE,
      tracking: "0px",
      spell: (name) => name,
      gap: PLACE_LABEL_GAP,
      half: PLACE_DOT_RADIUS,
    };
  }
  return {
    font: font(WORK_LABEL_SIZE, WORK_LABEL_WEIGHT),
    size: WORK_LABEL_SIZE,
    tracking: WORK_LABEL_TRACKING,
    spell: (name) => name.toUpperCase(),
    gap: WORK_LABEL_GAP,
    half: WORK_PENNANT_SPAN,
  };
}

/* ---------------------------------------------------------------- relief */

/**
 * The steps, lowest first, so the high ground is laid last and a ring inside a
 * ring reads as the higher tone. Flat colour, where Atlas's ramp is the same
 * arithmetic in a different palette and the plate lays no tone at all.
 *
 * Answers the levels actually laid, which is what a numeral knocks out to.
 */
function drawSteps({ ctx, projection, palette, contourLevels }: GroundRequest, lines: Map<number, LonLat[][]>): number[] {
  const { ramp } = palette.relief;
  if (ramp === undefined) return [];
  const laid: number[] = [];
  for (const level of tintBandLevels(contourLevels)) {
    const colour = ramp[bandIndexAt(level)];
    const closed = (lines.get(level) ?? []).filter(isClosed);
    if (colour === undefined || closed.length === 0) continue;
    ctx.fillStyle = colour;
    tracePolygons(ctx, projection, closed);
    ctx.fill("evenodd");
    laid.push(level);
  }
  return laid;
}

/** Every contour in sienna, the index levels heavier: the sheet's own line, not the palette's ink at an alpha. */
function strokeContours(request: GroundRequest, lines: Map<number, LonLat[][]>): void {
  const { ctx, projection, palette, contourLevels } = request;
  const { fine, index } = byWeight(lines, contourLevels);
  ctx.save();
  ctx.lineJoin = "round";
  for (const [polylines, width, alpha] of [
    [fine, CONTOUR_WIDTH, palette.relief.contour],
    [index, INDEX_CONTOUR_WIDTH, palette.relief.index],
  ] as const) {
    if (polylines.length === 0) continue;
    ctx.beginPath();
    for (const line of polylines) tracePolyline(ctx, projection, line);
    ctx.lineWidth = width;
    ctx.strokeStyle = atAlpha(STAFF_CONTOUR, alpha);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The height set into the line: a knock-out along the contour's own direction
 * with the figure turned to lie along it, upright-ish and never upside down,
 * at most twice a level and never within a plate's edge of the frame.
 *
 * The knock-out is the **ground the numeral stands on** — the highest step
 * actually laid at or below its own level, and the plain land where none was —
 * which is #138's closing note: a numeral knocked out to the paper would leave
 * a pale box cut out of a tinted step.
 */
function drawInlineNumerals(request: GroundRequest, lines: Map<number, LonLat[][]>, laid: readonly number[]): void {
  const { ctx, projection, palette, contourLevels } = request;
  const frame = projection.extentRect;
  const left = frame.x + NUMERAL_EDGE_INSET;
  const right = frame.x + frame.width - NUMERAL_EDGE_INSET;
  const top = frame.y + NUMERAL_END_INSET;
  const bottom = frame.y + frame.height - NUMERAL_END_INSET;

  ctx.save();
  ctx.font = font(NUMERAL_SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const level of indexLevels(contourLevels)) {
    const text = String(level);
    const half = text.length * NUMERAL_DIGIT_HALF + NUMERAL_PAD;
    let placed = 0;
    for (const line of lines.get(level) ?? []) {
      if (placed >= NUMERALS_PER_LEVEL) break;
      const points = projectLine(projection, line);
      // Two numerals on one contour stand a third of it apart, as a sheet
      // repeats a number round a long line; but every stride is *tried*,
      // because on a real file most of a contour runs off the extent and a
      // line sampled at its thirds alone would go unnumbered (#138).
      const apart = Math.max(NUMERAL_STRIDE, Math.floor(points.length / NUMERAL_SPREAD));
      let last = -Infinity;
      for (let i = NUMERAL_MARGIN; i < points.length - NUMERAL_MARGIN && placed < NUMERALS_PER_LEVEL; i += NUMERAL_STRIDE) {
        if (i - last < apart) continue;
        const at = points[i]!;
        if (at.x < left || at.x > right || at.y < top || at.y > bottom) continue;
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.rotate(alongLine(points[i - NUMERAL_TANGENT]!, points[i + NUMERAL_TANGENT]!));
        ctx.fillStyle = groundAt(level, laid, palette);
        ctx.fillRect(-half, -NUMERAL_KNOCKOUT_HEIGHT / 2, half * 2, NUMERAL_KNOCKOUT_HEIGHT);
        ctx.fillStyle = atAlpha(STAFF_CONTOUR, palette.relief.numeral);
        ctx.fillText(text, 0, 0);
        ctx.restore();
        placed++;
        last = i;
      }
    }
  }
  ctx.restore();
}

/** The angle a figure lies at to run along a line, turned into the upright half turn so it is never upside down. */
export function alongLine(before: Point, after: Point): number {
  const angle = Math.atan2(after.y - before.y, after.x - before.x);
  if (angle > Math.PI / 2) return angle - Math.PI;
  if (angle < -Math.PI / 2) return angle + Math.PI;
  return angle;
}

/** The step a numeral stands on: the highest one actually laid at or below its level, and the plain land where none was. */
function groundAt(level: number, laid: readonly number[], { relief, land: plain }: Palette): string {
  let colour = plain;
  for (const threshold of laid) if (threshold <= level) colour = relief.ramp?.[bandIndexAt(threshold)] ?? colour;
  return colour;
}

/** The kilometre squares, in slate under the units, with the numerals riding at both edges so a square can be named from either side. */
function drawGraticule({ ctx, projection, palette }: GroundRequest): void {
  const frame = projection.extentRect;
  const centre = projection.unproject(frame.x + frame.width / 2, frame.y + frame.height / 2);
  const grid = graticule(frame, projection.metresPerPixel(centre.lat));
  if (grid.kilometres === 0) return;

  ctx.save();
  ctx.strokeStyle = atAlpha(STAFF_GRID, GRID_ALPHA);
  ctx.lineWidth = GRID_WIDTH;
  ctx.beginPath();
  for (const { at } of grid.columns) {
    ctx.moveTo(at, frame.y);
    ctx.lineTo(at, frame.y + frame.height);
  }
  for (const { at } of grid.rows) {
    ctx.moveTo(frame.x, at);
    ctx.lineTo(frame.x + frame.width, at);
  }
  ctx.stroke();

  ctx.font = font(GRID_NUMERAL_SIZE);
  ctx.letterSpacing = GRID_NUMERAL_TRACKING;
  ctx.fillStyle = palette.ink;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (const { at, label } of grid.columns) {
    ctx.fillText(label, at + GRID_NUMERAL_OFFSET, frame.y + GRID_TOP_INSET);
    ctx.fillText(label, at + GRID_NUMERAL_OFFSET, frame.y + frame.height - GRID_BOTTOM_INSET);
  }
  for (const { at, label } of grid.rows) {
    ctx.fillText(label, frame.x + GRID_LEFT_INSET, at - GRID_ROW_RISE);
    ctx.fillText(label, frame.x + frame.width - GRID_RIGHT_INSET, at - GRID_ROW_RISE);
  }
  // Tracking is drawing state, so `restore` puts it back; cleared here as well
  // because a browser that has not implemented it would leave it set.
  ctx.letterSpacing = "0px";
  ctx.restore();
}

/* ----------------------------------------------------------------- water */

/** Every shoal: a tint of shallow water under a dashed edge. No stipple — this view has a colour for shallow water. */
function drawShoals({ ctx, projection, palette }: GroundRequest, map: MapFile): void {
  for (const feature of map.features) {
    if (feature.properties.kind !== "shoal") continue;
    const rings = areaRings(feature);
    if (rings.length === 0) continue;
    ctx.save();
    tracePolygons(ctx, projection, rings);
    ctx.fillStyle = STAFF_SHALLOW;
    ctx.fill("evenodd");
    ctx.lineWidth = SHOAL_EDGE_WIDTH;
    ctx.lineJoin = "round";
    ctx.setLineDash([...SHOAL_EDGE_DASH]);
    ctx.strokeStyle = palette.coast;
    ctx.stroke();
    ctx.restore();
  }
}

/** Every river: one stroke of shallow water, clipped to the land so a mouth merges into the sea. */
function drawRivers({ ctx, projection }: GroundRequest, map: MapFile): void {
  const rivers = map.features.filter((feature) => feature.properties.kind === "river").flatMap(lineStrings);
  if (rivers.length === 0) return;
  const rings = landRings(map);

  ctx.save();
  // A map with no land at all is all sea, and clipping to nothing would draw nothing.
  if (rings.length > 0) {
    tracePolygons(ctx, projection, rings);
    ctx.clip("evenodd");
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const line of rivers) tracePolyline(ctx, projection, line);
  ctx.lineWidth = RIVER_WIDTH;
  ctx.strokeStyle = STAFF_SHALLOW;
  ctx.stroke();
  ctx.restore();
}
