/**
 * Reading a map file's geometry and putting it on a canvas: the arithmetic
 * every ground hand shares, whatever aesthetic it inks in.
 *
 * A view owns **how** the ground is drawn (ADR-0021), and nothing here draws:
 * it gathers the rings of the land, the polylines of the rivers and the
 * ramparts and the contours by level, projects them, opens a path along them,
 * and walks a rampart's teeth off the winding ADR-0026 fixed. Two aesthetics
 * ink those same points four different ways.
 *
 * It was inside `views/engraved/ground.ts` and `views/engraved/rampart.ts`,
 * which was the right place while every view was engraved. The staff map is
 * not (#175), and it reads exactly the same geometry, so the arithmetic comes
 * up one level rather than being copied into a second folder — value reuse,
 * never inheritance.
 */
import type { LonLat, MapFeature, MapFile } from "../schema/types.ts";
import type { Point } from "./primitives.ts";
import type { Projection } from "./projection.ts";
import { indexLevels } from "./relief.ts";
import type { GroundRequest } from "./view.ts";

/** Every ring of one area feature, whether it is a polygon or a multipolygon. */
export function areaRings(feature: MapFeature): LonLat[][] {
  const { geometry } = feature;
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

/** Every polyline of one line feature, whether it is a linestring or a multilinestring. */
export function lineStrings(feature: MapFeature): LonLat[][] {
  const { geometry } = feature;
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

/** Every ring of every land feature, outer and holes alike; even-odd filling sorts them out. */
export function landRings(map: MapFile): LonLat[][] {
  const rings: LonLat[][] = [];
  for (const feature of map.features) {
    // A shoal is a polygon too, so the kind is what selects; checking the geometry is what narrows the type.
    if (feature.properties.kind !== "land") continue;
    rings.push(...areaRings(feature));
  }
  return rings;
}

/** The map's contour polylines, gathered by level, ascending. */
export function contourLines(map: MapFile): Map<number, LonLat[][]> {
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

/** A ring: a polyline that comes back to where it started, so filling it encloses ground. */
export function isClosed(line: readonly LonLat[]): boolean {
  const first = line[0];
  const last = line[line.length - 1];
  if (first === undefined || last === undefined || line.length < 4) return false;
  return first[0] === last[0] && first[1] === last[1];
}

/** One polyline's points on the canvas. Projected once by a hand that walks the same line twice, as the lit contours and the ramparts both do. */
export function projectLine(projection: Projection, line: readonly LonLat[]): Point[] {
  return line.map(([lon, lat]) => projection.project(lat, lon));
}

/** Adds one polyline to the path already open; the caller begins and strokes it. */
export function tracePolyline(ctx: CanvasRenderingContext2D, projection: Projection, line: readonly LonLat[]): void {
  line.forEach(([lon, lat], i) => {
    const { x, y } = projection.project(lat, lon);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}

/** Every ring as one closed path, ready to be filled even-odd or clipped to. */
export function tracePolygons(ctx: CanvasRenderingContext2D, projection: Projection, rings: readonly LonLat[][]): void {
  ctx.beginPath();
  for (const ring of rings) {
    tracePolyline(ctx, projection, ring);
    ctx.closePath();
  }
}

/** One tooth of a rampart's ditch: where it leaves the line, and where it ends. */
export interface Tooth {
  from: Point;
  to: Point;
}

/**
 * The ditch's teeth along one run: a tooth every `spacing` of arc, `length`
 * long, hanging off the **right** of the direction of travel.
 *
 * **The teeth fall on the right of the direction the line is drawn in.**
 * Alesia's two lines run round the same hill facing opposite ways — the
 * contravallation inward at the town, the circumvallation outward at the
 * relief — and neither is a closed ring, so there is no inside to derive a
 * side from. ADR-0026 made the winding itself the fact: an author draws a
 * rampart keeping the side it faces on their right. Nothing in the format
 * checks it and only the plate will say so (schema.md 3.3, 3.6).
 *
 * The walk carries its distance across a vertex rather than restarting there,
 * so a line's teeth stay evenly spaced round a corner instead of bunching at
 * every bend the author traced. A segment of no length is stepped over, which
 * is what a repeated coordinate reduces to.
 */
export function rampartTeeth(line: readonly Point[], spacing: number, length: number): Tooth[] {
  const teeth: Tooth[] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const run = Math.hypot(dx, dy);
    if (run < 1e-9) continue;
    // The right of travel: in canvas coordinates, where y runs down, that is
    // the left normal turned about — walking east, the right hand points south.
    const nx = -dy / run;
    const ny = dx / run;
    for (let along = carry; along < run; along += spacing) {
      const from = { x: a.x + (dx * along) / run, y: a.y + (dy * along) / run };
      teeth.push({ from, to: { x: from.x + nx * length, y: from.y + ny * length } });
      carry = along + spacing;
    }
    carry -= run;
  }
  return teeth;
}

/**
 * Every rampart run on the map, projected: one polyline per `LineString` and
 * one per member of a `MultiLineString`, which is how Alesia's disjoint
 * stretches reach the plate as the separate runs they are (ADR-0026).
 *
 * Projected once here rather than twice, because the line and its teeth are
 * two passes over the same points.
 */
export function rampartRuns(map: MapFile, projection: Projection): Point[][] {
  const runs: Point[][] = [];
  for (const feature of map.features) {
    if (feature.properties.kind !== "rampart") continue;
    for (const line of lineStrings(feature)) runs.push(projectLine(projection, line));
  }
  return runs;
}
