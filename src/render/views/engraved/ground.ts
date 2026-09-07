/**
 * The engraved views' ground (ADR-0005, ADR-0012, #62, #138): the sea, the
 * land and its shore, the relief treatment, the water on the land, and the
 * marks the named things stand on. Everything is drawn in map space through
 * the projection; the shared half keeps the order and the clipping.
 *
 * The seventh kind, `rampart`, is drawn by `rampart.ts` in the idiom this
 * ground was built with, among the ground: after the water and before the
 * named things, which is where schema.md section 4 has it (#170). #175 gives
 * the staff map its third idiom.
 *
 * How each kind is inked was decided on #62 against the design canvas: relief
 * as contour lines weighted by level and nothing else (no hachures, no
 * hillshade, no raster); a shoal as a dotted edge over a fine regular stipple,
 * carrying no colour of its own so it is neither land nor sea; a river as two
 * banks with the sea's material between them; a work as a bastioned-square
 * plan sign with its name in small capitals; a place, unchanged from v1, as a
 * dot with its name in italic.
 *
 * **Three grounds, one frame.** #138 found that no relief treatment survives
 * the move from one view to the next: the chart plate keeps its contours
 * weighted by level (below), the night plate lights them from the north-west
 * (`groundNight.ts`) and Atlas lays a hypsometric ramp under them
 * (`groundAtlas.ts`). What is still shared is everything round the treatment —
 * the sea, the land and its shore, the water, the ramparts and the named
 * things' marks — which `engravedGround` hands out to all three by value and
 * never by inheritance (ADR-0021).
 *
 * The marks are this hand's own; **where the names go is not**. The shared
 * half measures every named point in the face `naming` gives it and finds each
 * a slot, because a name has to clear the furniture and the other names, which
 * nothing inside the clip can see (#107).
 */
import type { LonLat, MapFile, MapFeature } from "../../../schema/types.ts";
import type { MapLabelKind } from "../../labels/index.ts";
import { type Point, seeded } from "../../primitives.ts";
import type { Projection } from "../../projection.ts";
import { indexLevels } from "../../relief.ts";
import type { Ground, GroundRequest, Naming, Palette } from "../../view.ts";
import { atAlpha } from "./ink.ts";
import { drawRamparts, type RampartPen } from "./rampart.ts";
import { font } from "./type.ts";

/** Engraved shading inside the shoreline: wide faint strokes under a fine dark one. */
const COASTLINE_STROKES: ReadonlyArray<readonly [width: number, alpha: number]> = [
  [14, 0.05],
  [8, 0.08],
  [4, 0.14],
  [1.6, 0.6],
];

/**
 * The two contour weights, the chart plate's own (#62). The night plate draws
 * on both and scales them by the light; Atlas cuts its index line thinner
 * still and lays no fine one at all, so they are exported rather than copied
 * into each hand.
 */
export const CONTOUR_WIDTH = 0.5;
export const INDEX_CONTOUR_WIDTH = 0.9;

/** An index contour's numeral, on a knock-out of the paper wide enough to open the lines under it. */
const NUMERAL_SIZE = 10;
const NUMERAL_KNOCKOUT = 3;
/**
 * Where the numerals go: one column at the middle of the plate, in a band
 * across its foot, so they stay below the field and out of the unit labels.
 * Each index level is numbered where its own line comes nearest that column.
 */
const NUMERAL_BAND_TOP = 0.73;
const NUMERAL_BAND_BOTTOM_INSET = 20;
const NUMERAL_EDGE_INSET = 40;

/** The shoal: a dotted edge, and a fill dense and regular enough to tell from the sea's loose mottle. */
const SHOAL_EDGE_DASH: readonly number[] = [1, 3];
const SHOAL_DOT_GRID = 7;
const SHOAL_DOT_JITTER = 3;
const SHOAL_DOT_RADIUS = 0.8;
const SHOAL_DOT_ALPHA = 0.45;
/** Seeded so the stipple is the same on every frame and never shimmers. */
const SHOAL_SEED = 17;

/** The river: an ink stroke with the paper laid back over its middle, leaving two banks of (3.4 - 2) / 2. */
const RIVER_WIDTH = 3.4;
const RIVER_WATER_WIDTH = 2;

/** A place, exactly as v1 drew it: the mark, the gap before the name, and the name's size. */
const PLACE_DOT_RADIUS = 2.2;
const PLACE_LABEL_GAP = 7;
const PLACE_LABEL_SIZE = 15;

/** The work's plan sign: an 8 px square with four bastions, 13 px across in all. */
const WORK_HALF = 4;
const WORK_BASTION_INNER = 1.5;
const WORK_BASTION_OUTER = 6.5;
const WORK_LABEL_GAP = 11;
const WORK_LABEL_SIZE = 11;
const WORK_LABEL_TRACKING = "0.5px";

/** The sea's mottle: how many blots, and the seed that keeps them still from one frame to the next. */
const MOTTLE_BLOTS = 900;
const MOTTLE_SEED = 7;
const MOTTLE_MAX_RADIUS = 6;

/** How a view shows height: the one part of the engraved ground the three views do not share (#138). */
export type ReliefHand = (request: GroundRequest) => void;

/**
 * Contours weighted by level: every line at 0.5 px and every fifth at 0.9 px
 * and numbered, in the palette's own ink at the palette's own alphas. The
 * chart plate's answer on #62, kept on #138 on new grounds — hachures come off
 * the same rings and cost no schema change, but they gather into a dark band
 * exactly where the units are, and the plate is the view the other two are
 * compared against.
 *
 * On a plate the ground under a numeral *is* the paper, so that is what it
 * knocks out to. It looked like anatomy until Atlas tinted its ground, and it
 * was the plate's own drawing all along (#138's closing note).
 */
export const weightedContours: ReliefHand = (request) => {
  const lines = contourLinesOf(request);
  if (lines === undefined) return;
  const { palette } = request;
  const { fine, index } = byWeight(lines, request.contourLevels);
  strokeContours(request, fine, CONTOUR_WIDTH, palette.relief.contour);
  strokeContours(request, index, INDEX_CONTOUR_WIDTH, palette.relief.index);
  drawContourNumerals(request, lines, () => palette.paper);
};

/**
 * An engraved ground with one relief treatment and one rampart idiom in it. A
 * view names those two and gets the sea, the land, the water and the named
 * things' marks with them — value reuse, never inheritance (ADR-0021).
 */
export function engravedGround(relief: ReliefHand, rampart: RampartPen): Ground {
  return {
    sea,
    land,
    relief,
    water,
    rampart: (request) => drawRamparts(request, rampart),
    mark,
    naming,
  };
}

/**
 * The sea: the view's paper inside the extent, with a faint fixed mottle on it
 * where the palette carries a stipple. Seeded, so it never shimmers from one
 * render to the next, and blank paper in Atlas, which carries none (#138).
 */
function sea({ ctx, projection, palette }: GroundRequest): void {
  const { x, y, width, height } = projection.extentRect;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(x, y, width, height);
  if (palette.stipple === undefined) return;

  const random = seeded(MOTTLE_SEED);
  ctx.save();
  ctx.fillStyle = palette.stipple;
  for (let i = 0; i < MOTTLE_BLOTS; i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.beginPath();
    ctx.arc(px, py, random() * MOTTLE_MAX_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Land polygons in the view's land tone, with a fine coastline shaded inward. */
function land({ ctx, map, projection, palette }: GroundRequest): void {
  if (map === undefined) return;
  const rings = landRings(map);
  if (rings.length === 0) return;
  tracePolygons(ctx, projection, rings);
  ctx.fillStyle = palette.land;
  ctx.fill("evenodd");

  // Shade inward only: clip to the land so the strokes never spill into the sea.
  ctx.save();
  tracePolygons(ctx, projection, rings);
  ctx.clip("evenodd");
  for (const [width, alpha] of COASTLINE_STROKES) {
    tracePolygons(ctx, projection, rings);
    ctx.lineWidth = width;
    ctx.strokeStyle = atAlpha(palette.coast, alpha);
    ctx.stroke();
  }
  ctx.restore();
}

/** The water on the land: every shoal's stipple and dotted edge, then the rivers. */
function water(request: GroundRequest): void {
  const { map } = request;
  if (map === undefined) return;
  drawShoals(request, map);
  drawRivers(request, map);
}

/** The mark a named point stands on, at the origin: a place's dot, a work's bastioned-square plan sign. */
function mark(ctx: CanvasRenderingContext2D, kind: MapLabelKind, palette: Palette): void {
  if (kind === "place") {
    ctx.save();
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(0, 0, PLACE_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  drawWorkSign(ctx, palette);
}

/**
 * How the engraved views set a named point's name: a place's in italic, a
 * work's upright in tracked capitals, both hanging off the middle of the mark
 * (#62). One answer for measuring and for drawing, so the two cannot disagree.
 */
function naming(kind: MapLabelKind): Naming {
  if (kind === "place") {
    return { font: font(PLACE_LABEL_SIZE, true), size: PLACE_LABEL_SIZE, tracking: "0px", spell: (name) => name, gap: PLACE_LABEL_GAP, half: PLACE_DOT_RADIUS };
  }
  return {
    font: font(WORK_LABEL_SIZE),
    size: WORK_LABEL_SIZE,
    tracking: WORK_LABEL_TRACKING,
    spell: (name) => name.toUpperCase(),
    gap: WORK_LABEL_GAP,
    half: WORK_BASTION_OUTER,
  };
}

/** The map's contour polylines gathered by level, or nothing when the map carries no relief. */
export function contourLinesOf({ map, contourLevels }: GroundRequest): Map<number, LonLat[][]> | undefined {
  if (map === undefined || contourLevels.length === 0) return undefined;
  return contourLines(map);
}

/**
 * The contours split by the weight they are drawn at: the levels indexed every
 * fifth, and all the rest. Nothing here is derived from the ground but the
 * lines themselves — the map file carries no slope and no raster, and by
 * ADR-0012 it never will (#138).
 */
export function byWeight(lines: Map<number, LonLat[][]>, contourLevels: readonly number[]): { fine: LonLat[][]; index: LonLat[][] } {
  const heavy = new Set(indexLevels(contourLevels));
  const fine: LonLat[][] = [];
  const index: LonLat[][] = [];
  for (const [level, polylines] of lines) (heavy.has(level) ? index : fine).push(...polylines);
  return { fine, index };
}

/** One set of contour polylines at a weight, in the palette's own ink at one of its own alphas. */
export function strokeContours({ ctx, projection, palette }: GroundRequest, lines: readonly LonLat[][], width: number, alpha: number): void {
  if (lines.length === 0) return;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const line of lines) tracePolyline(ctx, projection, line);
  ctx.lineWidth = width;
  ctx.strokeStyle = atAlpha(palette.ink, alpha);
  ctx.stroke();
  ctx.restore();
}

/**
 * Each index level's number, once, where its line comes nearest the numeral
 * column: a band across the foot of the plate, so the numbers stay below the
 * field and out of the unit labels (#62). The night plate keeps them in the
 * same column, which is what still names the levels where the shaded side of a
 * hill has all but gone out (#138).
 *
 * `knockout` is the ground the numeral stands on — what the figure is stroked
 * in under its own fill, so the lines beneath it are opened up: the paper on a
 * plate, the band it stands in under Atlas's ramp.
 */
export function drawContourNumerals(
  { ctx, projection, palette, contourLevels }: GroundRequest,
  lines: Map<number, LonLat[][]>,
  knockout: (level: number) => string,
): void {
  const index = new Set(indexLevels(contourLevels));
  const frame = projection.extentRect;
  const column = frame.x + frame.width / 2;
  const top = frame.y + frame.height * NUMERAL_BAND_TOP;
  const bottom = frame.y + frame.height - NUMERAL_BAND_BOTTOM_INSET;
  const left = frame.x + NUMERAL_EDGE_INSET;
  const right = frame.x + frame.width - NUMERAL_EDGE_INSET;

  ctx.save();
  ctx.font = font(NUMERAL_SIZE, true);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = atAlpha(palette.ink, palette.relief.numeral);
  ctx.lineWidth = NUMERAL_KNOCKOUT;
  ctx.lineJoin = "round";
  for (const level of index) {
    let best: { x: number; y: number } | undefined;
    let nearest = Infinity;
    for (const line of lines.get(level) ?? []) {
      for (const [lon, lat] of line) {
        const point = projection.project(lat, lon);
        if (point.y < top || point.y > bottom || point.x < left || point.x > right) continue;
        const distance = Math.abs(point.x - column);
        if (distance < nearest) {
          nearest = distance;
          best = point;
        }
      }
    }
    // A level whose line never crosses the band goes unnumbered rather than
    // being labelled up among the units.
    if (best === undefined) continue;
    const text = String(level);
    ctx.strokeStyle = knockout(level);
    ctx.strokeText(text, best.x, best.y);
    ctx.fillText(text, best.x, best.y);
  }
  ctx.restore();
}

/**
 * Every shoal: a stipple of fine dots on a jittered grid, clipped to the
 * polygon, under a dotted edge. It carries no fill colour at all — what tells
 * it from the sea is the density and regularity of the dots, and what tells it
 * from the land is that it has no material of its own (#62).
 */
function drawShoals({ ctx, projection, palette }: GroundRequest, map: MapFile): void {
  const random = seeded(SHOAL_SEED);
  for (const feature of map.features) {
    if (feature.properties.kind !== "shoal") continue;
    const rings = areaRings(feature);
    if (rings.length === 0) continue;
    const box = boundingBox(projection, rings);
    if (box === undefined) continue;

    ctx.save();
    tracePolygons(ctx, projection, rings);
    ctx.clip("evenodd");
    ctx.fillStyle = atAlpha(palette.ink, SHOAL_DOT_ALPHA);
    // The grid is anchored to the plate, not to the shoal's own corner, so two
    // shoals on one plate carry the same sand rather than two offset ones.
    const anchor = projection.extentRect;
    const left = gridStart(box.left, anchor.x);
    const top = gridStart(box.top, anchor.y);
    for (let y = top; y <= box.bottom; y += SHOAL_DOT_GRID) {
      for (let x = left; x <= box.right; x += SHOAL_DOT_GRID) {
        ctx.beginPath();
        ctx.arc(x + (random() - 0.5) * SHOAL_DOT_JITTER, y + (random() - 0.5) * SHOAL_DOT_JITTER, SHOAL_DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    tracePolygons(ctx, projection, rings);
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.setLineDash([...SHOAL_EDGE_DASH]);
    ctx.strokeStyle = palette.ink;
    ctx.stroke();
    ctx.restore();
  }
}

/** The first grid line at or before `value`, counted from `anchor`. */
function gridStart(value: number, anchor: number): number {
  return anchor + Math.floor((value - anchor) / SHOAL_DOT_GRID) * SHOAL_DOT_GRID;
}

/** The rings' box on the canvas, or `undefined` when they hold no point. Walked rather than spread: a traced shoal can run to many thousands of vertices. */
function boundingBox(projection: Projection, rings: LonLat[][]): { left: number; top: number; right: number; bottom: number } | undefined {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      const { x, y } = projection.project(lat, lon);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return left === Infinity ? undefined : { left, top, right, bottom };
}

/**
 * Every river: one ink stroke with the paper laid back over its middle, which
 * leaves two fine banks with the sea's own material between them. Clipped to
 * the land, so a mouth merges into the sea and the coastline stays the heavier
 * line where the two meet (#62).
 */
function drawRivers({ ctx, projection, palette }: GroundRequest, map: MapFile): void {
  const rivers = map.features.filter((feature) => feature.properties.kind === "river").flatMap(lineStrings);
  if (rivers.length === 0) return;
  const land = landRings(map);

  ctx.save();
  // A map with no land at all is all sea, and clipping to nothing would draw nothing.
  if (land.length > 0) {
    tracePolygons(ctx, projection, land);
    ctx.clip("evenodd");
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [width, colour] of [
    [RIVER_WIDTH, palette.ink],
    [RIVER_WATER_WIDTH, palette.paper],
  ] as const) {
    ctx.beginPath();
    for (const line of rivers) tracePolyline(ctx, projection, line);
    ctx.lineWidth = width;
    ctx.strokeStyle = colour;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The work's sign at the origin: a square with a bastion at each corner,
 * filled paper and outlined in ink, so it reads over relief. One sign for a
 * fort, a battery and a camp alike — what they differ in is the name, which is
 * authoring, not schema (ADR-0012).
 */
function drawWorkSign(ctx: CanvasRenderingContext2D, palette: Palette): void {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.fillStyle = palette.paper;
  ctx.strokeStyle = palette.ink;
  ctx.beginPath();
  ctx.rect(-WORK_HALF, -WORK_HALF, WORK_HALF * 2, WORK_HALF * 2);
  ctx.fill();
  ctx.stroke();
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(sx * WORK_HALF, sy * WORK_BASTION_INNER);
    ctx.lineTo(sx * WORK_BASTION_OUTER, sy * WORK_BASTION_OUTER);
    ctx.lineTo(sx * WORK_BASTION_INNER, sy * WORK_HALF);
    // `fill` closes the spur back across the corner; `stroke` leaves it open, so
    // the square's own side is not drawn twice.
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Every ring of every land feature, outer and holes alike; even-odd filling sorts them out. */
function landRings(map: MapFile): LonLat[][] {
  const rings: LonLat[][] = [];
  for (const feature of map.features) {
    // A shoal is a polygon too, so the kind is what selects; checking the geometry is what narrows the type.
    if (feature.properties.kind !== "land") continue;
    rings.push(...areaRings(feature));
  }
  return rings;
}

/** Every ring of one area feature, whether it is a polygon or a multipolygon. */
function areaRings(feature: MapFeature): LonLat[][] {
  const { geometry } = feature;
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

/** Every polyline of one line feature, whether it is a linestring or a multilinestring. */
function lineStrings(feature: MapFeature): LonLat[][] {
  const { geometry } = feature;
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

/** The map's contour polylines, gathered by level, ascending. */
function contourLines(map: MapFile): Map<number, LonLat[][]> {
  const byLevel = new Map<number, LonLat[][]>();
  for (const feature of map.features) {
    if (feature.properties.kind !== "contour") continue;
    const level = feature.properties.elevation;
    const lines = byLevel.get(level) ?? [];
    lines.push(...lineStrings(feature));
    byLevel.set(level, lines);
  }
  return new Map([...byLevel].sort(([a], [b]) => a - b));
}

/** A ring: a polyline that comes back to where it started, so filling it encloses ground. */
export function isClosed(line: readonly LonLat[]): boolean {
  const first = line[0];
  const last = line[line.length - 1];
  if (first === undefined || last === undefined || line.length < 4) return false;
  return first[0] === last[0] && first[1] === last[1];
}

export function tracePolygons(ctx: CanvasRenderingContext2D, projection: Projection, rings: readonly LonLat[][]): void {
  ctx.beginPath();
  for (const ring of rings) {
    tracePolyline(ctx, projection, ring);
    ctx.closePath();
  }
}

/** One polyline's points on the canvas. Projected once by a hand that walks the same line twice, as the lit contours and the ramparts both do. */
export function projectLine(projection: Projection, line: readonly LonLat[]): Point[] {
  return line.map(([lon, lat]) => projection.project(lat, lon));
}

/** Adds one polyline to the path already open; the caller begins and strokes it. */
function tracePolyline(ctx: CanvasRenderingContext2D, projection: Projection, line: readonly LonLat[]): void {
  line.forEach(([lon, lat], i) => {
    const { x, y } = projection.project(lat, lon);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}
