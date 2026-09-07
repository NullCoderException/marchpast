/**
 * The engraved views' ground (ADR-0005, ADR-0012, #62, #138): the sea, the
 * land and its shore, the relief treatment, the water on the land, and the
 * marks the named things stand on. Everything is drawn in map space through
 * the projection; the shared half keeps the order and the clipping.
 *
 * The seventh kind, `rampart`, is **read and not drawn**. It reached the
 * format on #167 ahead of its ink, and every selector here picks its kind out
 * by name, so a map with ramparts on it loads and plays with the lines simply
 * not there. #170 puts them among the ground — after the water and before the
 * named things, which is where schema.md section 4 has them — here and in
 * Atlas's; #175 in the staff map's.
 *
 * How each kind is inked was decided on #62 against the design canvas: relief
 * as contour lines weighted by level and nothing else (no hachures, no
 * hillshade, no raster); a shoal as a dotted edge over a fine regular stipple,
 * carrying no colour of its own so it is neither land nor sea; a river as two
 * banks with the sea's material between them; a work as a bastioned-square
 * plan sign with its name in small capitals; a place, unchanged from v1, as a
 * dot with its name in italic.
 *
 * **Three grounds, one hand.** The chart plate and the night plate name the
 * same relief treatment under their own palettes — an inverted plate still
 * costs no drawing code, which was the seam's first claim (ADR-0014) — and
 * Atlas names the tinted one, which lays its bands under the same lines. #138
 * splits the night plate's off to illuminated contours and Atlas's off to a
 * hypsometric ramp; that is #170's, and this file is the shape it lands in.
 *
 * The marks are this hand's own; **where the names go is not**. The shared
 * half measures every named point in the face `naming` gives it and finds each
 * a slot, because a name has to clear the furniture and the other names, which
 * nothing inside the clip can see (#107).
 */
import type { LonLat, MapFile, MapFeature } from "../../../schema/types.ts";
import type { MapLabelKind } from "../../labels/index.ts";
import { seeded } from "../../primitives.ts";
import type { Projection } from "../../projection.ts";
import { indexLevels, tintBandLevels } from "../../relief.ts";
import type { Ground, GroundRequest, Naming, Palette } from "../../view.ts";
import { atAlpha } from "./ink.ts";
import { font } from "./type.ts";

/** Engraved shading inside the shoreline: wide faint strokes under a fine dark one. */
const COASTLINE_STROKES: ReadonlyArray<readonly [width: number, alpha: number]> = [
  [14, 0.05],
  [8, 0.08],
  [4, 0.14],
  [1.6, 0.6],
];

/** The two contour weights. Fixed across the engraved views; only their alphas are the view's (#62). */
const CONTOUR_WIDTH = 0.5;
const INDEX_CONTOUR_WIDTH = 0.9;

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

/** How a view shows height: the one part of the engraved ground the three views do not share. */
export type ReliefHand = (request: GroundRequest) => void;

/**
 * Contours weighted by level: every line at 0.5 px and every fifth at 0.9 px
 * and numbered, in the palette's own ink at the palette's own alphas. The
 * chart plate's answer on #62, and the night plate's until #170 lights it.
 */
export const weightedContours: ReliefHand = (request) => {
  const lines = contourLinesOf(request);
  if (lines === undefined) return;
  drawContours(request, lines);
};

/**
 * The same lines over tint bands: each band the region above its level, filled
 * in ink at `palette.relief.band`, stacking so the high ground is the darkest.
 * Atlas's, and the one view whose palette carries a band alpha at all (#62).
 */
export const tintedContours: ReliefHand = (request) => {
  const lines = contourLinesOf(request);
  if (lines === undefined) return;
  drawTintBands(request, lines);
  drawContours(request, lines);
};

/**
 * An engraved ground with one relief treatment in it. A view names this with
 * its own treatment and gets the sea, the land, the water and the named
 * things' marks with it — value reuse, never inheritance (ADR-0021).
 */
export function engravedGround(relief: ReliefHand): Ground {
  return {
    sea,
    land,
    relief,
    water,
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
function contourLinesOf({ map, contourLevels }: GroundRequest): Map<number, LonLat[][]> | undefined {
  if (map === undefined || contourLevels.length === 0) return undefined;
  return contourLines(map);
}

/**
 * Each band is the region above its level: the closed rings at that level,
 * filled together. An open line encloses nothing, so it is left out rather
 * than closed across the plate, and a plate whose lines run off the extent is
 * banded by whichever levels do close. Even-odd, so a hollow inside a hill is
 * a hole however the ring was wound. The bands stack, which is what makes the
 * high ground the darkest.
 */
function drawTintBands({ ctx, projection, palette, contourLevels }: GroundRequest, lines: Map<number, LonLat[][]>): void {
  if (palette.relief.band === undefined) return;
  ctx.fillStyle = atAlpha(palette.ink, palette.relief.band);
  for (const level of tintBandLevels(contourLevels)) {
    const closed = (lines.get(level) ?? []).filter(isClosed);
    if (closed.length === 0) continue;
    tracePolygons(ctx, projection, closed);
    ctx.fill("evenodd");
  }
}

/**
 * The contours themselves: every one of them 0.5 px and every fifth level
 * 0.9 px and numbered. Nothing is derived from the ground but the lines
 * themselves — the map file carries no slope and no raster, and by ADR-0012 it
 * never will.
 */
function drawContours(request: GroundRequest, lines: Map<number, LonLat[][]>): void {
  const { ctx, projection, palette, contourLevels } = request;
  const index = new Set(indexLevels(contourLevels));

  ctx.lineJoin = "round";
  for (const [width, alpha, wanted] of [
    [CONTOUR_WIDTH, palette.relief.contour, false],
    [INDEX_CONTOUR_WIDTH, palette.relief.index, true],
  ] as const) {
    ctx.beginPath();
    for (const [level, polylines] of lines) {
      if (index.has(level) !== wanted) continue;
      for (const line of polylines) tracePolyline(ctx, projection, line);
    }
    ctx.lineWidth = width;
    ctx.strokeStyle = atAlpha(palette.ink, alpha);
    ctx.stroke();
  }

  drawContourNumerals(request, lines, index);
}

/** Each index level's number, once, where its line comes nearest the numeral column. */
function drawContourNumerals(
  { ctx, projection, palette }: GroundRequest,
  lines: Map<number, LonLat[][]>,
  index: ReadonlySet<number>,
): void {
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
  ctx.strokeStyle = palette.paper;
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
function isClosed(line: LonLat[]): boolean {
  const first = line[0];
  const last = line[line.length - 1];
  if (first === undefined || last === undefined || line.length < 4) return false;
  return first[0] === last[0] && first[1] === last[1];
}

function tracePolygons(ctx: CanvasRenderingContext2D, projection: Projection, rings: LonLat[][]): void {
  ctx.beginPath();
  for (const ring of rings) {
    tracePolyline(ctx, projection, ring);
    ctx.closePath();
  }
}

/** Adds one polyline to the path already open; the caller begins and strokes it. */
function tracePolyline(ctx: CanvasRenderingContext2D, projection: Projection, line: LonLat[]): void {
  line.forEach(([lon, lat], i) => {
    const { x, y } = projection.project(lat, lon);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}

