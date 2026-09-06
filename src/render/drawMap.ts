/**
 * The map pass (ADR-0005): land polygons in the view's land tone with a fine
 * coastline shaded inward, and places as a small mark with the name in the
 * plate face. The caller has already clipped to the extent.
 *
 * A **shared pass**: no view replaces it. Every colour it draws with comes off
 * the palette, which is how the Night plate gets a dark shore for nothing.
 */
import type { LonLat, MapFile } from "../schema/types.ts";
import type { Projection } from "./projection.ts";
import type { Plate } from "./plate.ts";
import { atAlpha, font } from "./style.ts";

/** Engraved shading inside the shoreline: wide faint strokes under a fine dark one. */
const COASTLINE_STROKES: ReadonlyArray<readonly [width: number, alpha: number]> = [
  [14, 0.05],
  [8, 0.08],
  [4, 0.14],
  [1.6, 0.6],
];

export function drawMap(plate: Plate): void {
  const { ctx, map, projection } = plate;
  const { palette } = plate.view;
  if (map === undefined) return;

  const rings = landRings(map);
  if (rings.length > 0) {
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

  ctx.fillStyle = palette.ink;
  ctx.font = font(15, true);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
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

/** Every ring of every land feature, outer and holes alike; even-odd filling sorts them out. */
function landRings(map: MapFile): LonLat[][] {
  const rings: LonLat[][] = [];
  for (const feature of map.features) {
    // The kind and the geometry type agree by validation; checking the geometry is what narrows the type.
    const { geometry } = feature;
    if (geometry.type === "Polygon") rings.push(...geometry.coordinates);
    else if (geometry.type === "MultiPolygon") for (const polygon of geometry.coordinates) rings.push(...polygon);
  }
  return rings;
}

function tracePolygons(ctx: CanvasRenderingContext2D, projection: Projection, rings: LonLat[][]): void {
  ctx.beginPath();
  for (const ring of rings) {
    ring.forEach(([lon, lat], i) => {
      const { x, y } = projection.project(lat, lon);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
}
