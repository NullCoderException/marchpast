/**
 * The map pass (ADR-0005, ADR-0012): the six feature kinds the map file can
 * carry, drawn in the order land, shoal, contours, river, places and works, so
 * that relief lies over the shore, the river lies over the relief, and every
 * named thing lies over all of it. The caller has already clipped to the
 * extent.
 *
 * A **shared pass**: no view replaces it. Every colour it draws with comes off
 * the palette, which is how the Night plate gets a dark shore for nothing, and
 * the only thing a view re-tunes is how heavily relief is laid on — the alphas
 * on `palette.relief`, so no pass here tests a view id (ADR-0014, #62).
 *
 * How each kind is inked was decided on #62 against the design canvas: relief
 * as contour lines weighted by level and nothing else (no hachures, no
 * hillshade, no raster); a shoal as a dotted edge over a fine regular stipple,
 * carrying no colour of its own so it is neither land nor sea; a river as two
 * banks with the sea's material between them; a work as a bastioned-square
 * plan sign with its name in small capitals; a place, unchanged from v1, as a
 * dot with its name in italic.
 */
import type { LonLat, MapFile, MapFeature } from "../schema/types.ts";
import type { Projection } from "./projection.ts";
import type { Plate } from "./plate.ts";
import { seeded } from "./primitives.ts";
import { indexLevels, tintBandLevels } from "./relief.ts";
import { atAlpha, font } from "./style.ts";
import type { Palette } from "./view.ts";

/** Engraved shading inside the shoreline: wide faint strokes under a fine dark one. */
const COASTLINE_STROKES: ReadonlyArray<readonly [width: number, alpha: number]> = [
  [14, 0.05],
  [8, 0.08],
  [4, 0.14],
  [1.6, 0.6],
];

/** The two contour weights. Fixed across views; only their alphas are the view's (#62). */
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

/** The work's plan sign: an 8 px square with four bastions, 13 px across in all. */
const WORK_HALF = 4;
const WORK_BASTION_INNER = 1.5;
const WORK_BASTION_OUTER = 6.5;
const WORK_LABEL_GAP = 11;
const WORK_LABEL_SIZE = 11;
const WORK_LABEL_TRACKING = "0.5px";

export function drawMap(plate: Plate): void {
  const { ctx, map } = plate;
  const { palette } = plate.view;
  if (map === undefined) return;

  const land = landRings(map);
  drawLand(plate, land);
  drawShoals(plate, map);
  drawRelief(plate, map);
  drawRivers(plate, map, land);

  ctx.fillStyle = palette.ink;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  drawPlaces(plate, map);
  drawWorks(plate, map);
}

/** Land polygons in the view's land tone, with a fine coastline shaded inward. */
function drawLand({ ctx, projection, view: { palette } }: Plate, rings: LonLat[][]): void {
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

/**
 * Every shoal: a stipple of fine dots on a jittered grid, clipped to the
 * polygon, under a dotted edge. It carries no fill colour at all — what tells
 * it from the sea is the density and regularity of the dots, and what tells it
 * from the land is that it has no material of its own (#62).
 */
function drawShoals(plate: Plate, map: MapFile): void {
  const { ctx, projection } = plate;
  const { palette } = plate.view;
  const random = seeded(SHOAL_SEED);
  for (const feature of map.features) {
    if (feature.properties.kind !== "shoal") continue;
    const rings = areaRings(feature);
    if (rings.length === 0) continue;
    const points = rings.flat().map(([lon, lat]) => projection.project(lat, lon));

    ctx.save();
    tracePolygons(ctx, projection, rings);
    ctx.clip("evenodd");
    ctx.fillStyle = atAlpha(palette.ink, SHOAL_DOT_ALPHA);
    // The grid is anchored to the plate, not to the shoal's own corner, so two
    // shoals on one plate carry the same sand rather than two offset ones.
    const anchor = plate.projection.extentRect;
    const left = gridStart(Math.min(...points.map((p) => p.x)), anchor.x);
    const top = gridStart(Math.min(...points.map((p) => p.y)), anchor.y);
    const right = Math.max(...points.map((p) => p.x));
    const bottom = Math.max(...points.map((p) => p.y));
    for (let y = top; y <= bottom; y += SHOAL_DOT_GRID) {
      for (let x = left; x <= right; x += SHOAL_DOT_GRID) {
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

/**
 * Relief: the contours, every one of them 0.5 px and every fifth level 0.9 px
 * and numbered, with the atlas's tint bands under them. Nothing is derived
 * from the ground but the lines themselves — the map file carries no slope and
 * no raster, and by ADR-0012 it never will.
 */
function drawRelief(plate: Plate, map: MapFile): void {
  const { ctx, contourLevels, projection } = plate;
  const { palette } = plate.view;
  if (contourLevels.length === 0) return;

  const lines = contourLines(map);
  const index = new Set(indexLevels(contourLevels));

  // The bands go first, so the lines read over their own tone.
  if (palette.relief.band !== undefined) {
    ctx.fillStyle = atAlpha(palette.ink, palette.relief.band);
    for (const level of tintBandLevels(contourLevels)) {
      // Each band is the region above its level: the closed rings at that
      // level, filled together. An open line encloses nothing, so it is left
      // out rather than closed across the plate, and a plate whose lines run
      // off the extent is banded by whichever levels do close. Even-odd, so a
      // hollow inside a hill is a hole however the ring was wound. The bands
      // stack, which is what makes the high ground the darkest.
      const closed = (lines.get(level) ?? []).filter(isClosed);
      if (closed.length === 0) continue;
      tracePolygons(ctx, projection, closed);
      ctx.fill("evenodd");
    }
  }

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

  drawContourNumerals(plate, lines, index);
}

/** Each index level's number, once, where its line comes nearest the numeral column. */
function drawContourNumerals(plate: Plate, lines: Map<number, LonLat[][]>, index: ReadonlySet<number>): void {
  const { ctx, projection } = plate;
  const { palette } = plate.view;
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
 * Every river: one ink stroke with the paper laid back over its middle, which
 * leaves two fine banks with the sea's own material between them. Clipped to
 * the land, so a mouth merges into the sea and the coastline stays the heavier
 * line where the two meet (#62).
 */
function drawRivers(plate: Plate, map: MapFile, land: LonLat[][]): void {
  const { ctx, projection } = plate;
  const { palette } = plate.view;
  const rivers = map.features.filter((feature) => feature.properties.kind === "river").flatMap(lineStrings);
  if (rivers.length === 0) return;

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

/** A place: a small mark with the name in the plate face. Unchanged from v1. */
function drawPlaces({ ctx, projection }: Plate, map: MapFile): void {
  ctx.font = font(15, true);
  for (const feature of map.features) {
    const { geometry, properties } = feature;
    if (properties.kind !== "place" || geometry.type !== "Point") continue;
    const [lon, lat] = geometry.coordinates;
    const { x, y } = projection.project(lat, lon);
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(properties.name, x + 7, y);
  }
}

/**
 * A work: the bastioned-square plan sign, and its name beside it upright in
 * tracked capitals. One sign for a fort, a battery and a camp alike — what
 * they differ in is the name, which is authoring, not schema (ADR-0012).
 */
function drawWorks(plate: Plate, map: MapFile): void {
  const { ctx, projection } = plate;
  const { palette } = plate.view;
  const works = map.features.filter((feature) => feature.properties.kind === "work");
  if (works.length === 0) return;

  ctx.font = font(WORK_LABEL_SIZE);
  ctx.letterSpacing = WORK_LABEL_TRACKING;
  for (const { geometry, properties } of works) {
    if (properties.kind !== "work" || geometry.type !== "Point") continue;
    const [lon, lat] = geometry.coordinates;
    const { x, y } = projection.project(lat, lon);
    drawWorkSign(ctx, x, y, palette);
    ctx.fillStyle = palette.ink;
    ctx.fillText(properties.name.toUpperCase(), x + WORK_LABEL_GAP, y);
  }
  ctx.letterSpacing = "0px";
}

/** The sign itself: a square with a bastion at each corner, filled paper and outlined in ink, so it reads over relief. */
function drawWorkSign(ctx: CanvasRenderingContext2D, x: number, y: number, palette: Palette): void {
  ctx.save();
  ctx.translate(x, y);
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
