/**
 * The ground pass's shared half (ADR-0005, ADR-0012, ADR-0021, #138): the
 * order everything under the units is drawn in, the clipping, and where the
 * named things' names go. Every mark is the view's `ground` hand.
 *
 * The order is the anatomy's — **the sea, the land, the relief treatment, the
 * water, anything ruled over all of it, and the named things last** — and it
 * is the whole of what stays shared once every view supplies its own ground.
 * #138 found that out by drawing four: the night plate lights its contours,
 * Atlas ramps its bands, and a staff map sets its heights into the line, so
 * there is no shared hand left, only this frame.
 *
 * The sea is drawn **outside** the clip and everything else inside it: the
 * mottle's blots are centred inside the extent and spill a few pixels past it
 * on to the letterbox, which is the plate's own edge and not an accident.
 *
 * The marks are the hand's; **where the names go is not**. `mapPoints`
 * measures every named point in the face the hand names for it and
 * `labels/map.ts` finds each a slot, because a name has to clear the furniture
 * and the other names, which nothing inside the clip can see (#107). The names
 * are still drawn here, before the units, so a glyph covers a name and never
 * the other way about.
 */
import type { MapFile } from "../schema/types.ts";
import type { MapLabel, MapLabelKind, MapPoint } from "./labels/index.ts";
import type { Plate } from "./plate.ts";
import type { Point } from "./primitives.ts";
import type { Projection } from "./projection.ts";
import type { GroundRequest } from "./view.ts";

/** The two named kinds, in the order their marks are laid down (schema.md 3.5). */
const NAMED_KINDS: readonly MapLabelKind[] = ["place", "work"];

/** How much of the canvas the ground covers: the plate, which is everything above the caption band. */
export interface PlateSize {
  width: number;
  /** The canvas's height less the band's, which is what the projection was fitted inside. */
  plateHeight: number;
}

/**
 * The whole ground for one plate, on whatever context it is being built for —
 * the offscreen buffer in the ordinary case, the canvas itself when a buffer
 * could not be had (`groundBuffer.ts`).
 *
 * It is everything that does not change between the frames of one battle in
 * one view at one size, which is exactly why it can be buffered: the map file
 * does not change between phases and the extent is fixed for the whole picture
 * (ADR-0001).
 */
export function paintGround(ctx: CanvasRenderingContext2D, plate: Plate, size: PlateSize): void {
  const { view, projection, map, contourLevels } = plate;
  const { palette, ground } = view;

  // Letterbox: another tone outside the extent, so the plate's edge reads.
  ctx.fillStyle = palette.letterbox;
  ctx.fillRect(0, 0, size.width, size.plateHeight);

  const request: GroundRequest = { ctx, map, projection, palette, contourLevels };
  ground.sea(request);

  const { extentRect } = projection;
  ctx.save();
  ctx.beginPath();
  ctx.rect(extentRect.x, extentRect.y, extentRect.width, extentRect.height);
  ctx.clip();
  ground.land(request);
  ground.relief(request);
  ground.water(request);
  ground.graticule?.(request);
  ctx.restore();
}

/**
 * The named things: the mark on every named point, then the names the placer
 * found room for. Every mark is drawn whatever the placer said — a name it had
 * to drop leaves the thing on the plate and only the word off it (#107).
 *
 * Drawn per frame rather than into the ground buffer, because the names move
 * with the furniture and the furniture moves with the labels (#39).
 */
export function drawNamedThings(plate: Plate, labels: readonly MapLabel[]): void {
  const { ctx, map, projection, view } = plate;
  if (map === undefined) return;
  const { ground, palette } = view;

  for (const kind of NAMED_KINDS) {
    for (const { at } of namedPoints(map, projection, kind)) {
      ctx.save();
      ctx.translate(at.x, at.y);
      ground.mark(ctx, kind, palette);
      ctx.restore();
    }
  }
  drawMapLabels(plate, labels);
}

/**
 * The names, each where the placer put it, in the face and the tracking the
 * view's `naming` gives its kind, and on the middle they hang from. The face is
 * set per label rather than per pass because the two kinds are interleaved in
 * the map file's own order.
 */
function drawMapLabels({ ctx, view: { ground, palette } }: Plate, labels: readonly MapLabel[]): void {
  if (labels.length === 0) return;

  ctx.save();
  ctx.fillStyle = palette.ink;
  ctx.textBaseline = "middle";
  for (const { point, at, align } of labels) {
    const naming = ground.naming(point.kind);
    ctx.font = naming.font;
    ctx.letterSpacing = naming.tracking;
    ctx.textAlign = align;
    ctx.fillText(point.text, at.x, at.y);
  }
  // Tracking is part of the drawing state, so `restore` puts it back; it is
  // cleared here as well because a browser that has not implemented it would
  // otherwise leave every later label tracked.
  ctx.letterSpacing = "0px";
  ctx.restore();
}

/**
 * Every named point the map carries, measured in the face its view sets it in
 * and projected onto the plate: what `placeMapLabels` needs and only this pass
 * knows (#107). In the map file's own order across both kinds, which is the
 * order the placer treats as priority.
 *
 * A label's box is its measured width by its line's size, centred on the
 * middle the name is drawn on. The size is a shade taller than the ink — a
 * 15 px face does not reach 15 px from cap to descender — which is the way to
 * be wrong here: two names that only just clear each other are still two names.
 */
export function mapPoints({ ctx, map, projection, view }: Plate): MapPoint[] {
  if (map === undefined) return [];

  const points: MapPoint[] = [];
  ctx.save();
  for (const { geometry, properties } of map.features) {
    if (geometry.type !== "Point") continue;
    if (properties.kind !== "place" && properties.kind !== "work") continue;
    const { kind } = properties;
    const [lon, lat] = geometry.coordinates;
    const at = projection.project(lat, lon);
    const naming = view.ground.naming(kind);
    const text = naming.spell(properties.name);
    ctx.font = naming.font;
    ctx.letterSpacing = naming.tracking;
    points.push({
      kind,
      text,
      at,
      footprint: { x: at.x - naming.half, y: at.y - naming.half, width: naming.half * 2, height: naming.half * 2 },
      width: ctx.measureText(text).width,
      height: naming.size,
      gap: naming.gap,
    });
  }
  ctx.letterSpacing = "0px";
  ctx.restore();
  return points;
}


/** The named points of one kind, projected onto the plate. */
function namedPoints(map: MapFile, projection: Projection, kind: MapLabelKind): { at: Point }[] {
  const points: { at: Point }[] = [];
  for (const { geometry, properties } of map.features) {
    if (properties.kind !== kind || geometry.type !== "Point") continue;
    const [lon, lat] = geometry.coordinates;
    points.push({ at: projection.project(lat, lon) });
  }
  return points;
}
