/**
 * The ground buffer (#138's cost row): the plate's ground drawn **once** to an
 * offscreen canvas and blitted every frame after that.
 *
 * `render` used to draw the whole map inside the per-frame pass with no cache.
 * On Trafalgar that is a coastline; on Cannae it is 44 contour paths; and #138
 * settled grounds that are far heavier than either — the night plate's
 * illuminated contours are some 1 250 lit segments, and a staff map's ground is
 * tints, a graticule, contours and numerals set into the lines. All of them
 * would otherwise run sixty times a second for a picture that does not change.
 *
 * It can be cached because the ground is **invariant across a battle**: the map
 * file does not change between phases and the extent is fixed for the whole
 * picture (ADR-0001). What it is keyed by is therefore everything that *can*
 * move it — the view, the battle and its map, the plate's own rectangle, and
 * the device pixel ratio — and the caption band's height is inside that
 * rectangle, so a phase whose caption wraps to another line rebuilds it.
 *
 * The buffer holds the ground **opaque**, letterbox and all, and is blitted at
 * exactly one device pixel to one. That is what makes it pixel-for-pixel the
 * same picture as drawing straight onto the canvas: a transparent buffer would
 * composite its antialiased edges twice and round differently.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import { paintGround, type PlateSize } from "./ground.ts";
import type { Plate } from "./plate.ts";

/** One renderer's ground, kept between frames. */
export interface GroundBuffer {
  /** Puts the ground on the plate's canvas, building the buffer first if anything it depends on has changed. */
  paint(plate: Plate, size: PlateSize, dpr: number): void;
}

/** Everything the ground's *shape* depends on: a frame whose key matches the last one is a frame that can blit. */
function keyOf(plate: Plate, size: PlateSize, dpr: number): string {
  const { x, y, width, height } = plate.projection.extentRect;
  return [plate.view.id, size.width, size.plateHeight, dpr, x, y, width, height].join("|");
}

export function createGroundBuffer(): GroundBuffer {
  let canvas: HTMLCanvasElement | undefined;
  let key: string | undefined;
  /** What the buffer holds, by identity: a new battle or a new map file is a new ground whatever its extent. */
  let drawn: { battle: Battle; map: MapFile | undefined } | undefined;

  return {
    paint(plate, size, dpr) {
      const sheet = (canvas ??= document.createElement("canvas"));
      const wanted = keyOf(plate, size, dpr);
      const deviceWidth = Math.max(1, Math.round(size.width * dpr));
      const deviceHeight = Math.max(1, Math.round(size.plateHeight * dpr));
      const stale =
        key !== wanted ||
        drawn?.battle !== plate.battle ||
        drawn?.map !== plate.map ||
        sheet.width !== deviceWidth ||
        sheet.height !== deviceHeight;

      if (stale) {
        // Setting either dimension clears the sheet and its state, which is why
        // the transform is set after and not before.
        sheet.width = deviceWidth;
        sheet.height = deviceHeight;
        const paint = sheet.getContext("2d");
        if (paint === null) {
          // No second context to be had: draw the ground straight onto the
          // plate and try again next frame rather than show bare canvas.
          key = undefined;
          paintGround(plate.ctx, plate, size);
          return;
        }
        paint.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintGround(paint, plate, size);
        key = wanted;
        drawn = { battle: plate.battle, map: plate.map };
      }

      // One device pixel to one, so the blit is a copy and not a resample.
      const { ctx } = plate;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(sheet, 0, 0);
      ctx.restore();
    },
  };
}
