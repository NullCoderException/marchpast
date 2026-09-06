/**
 * The renderer: one synchronous pass that draws the picture the timeline hands
 * it for one instant, in the **view** the viewer has picked (ADR-0014). No
 * animation loop lives here; the player owns that and calls `render` whenever
 * the picture, the viewer's choices or the canvas changes.
 *
 * The viewer's state is as per-frame as the picture is — a view may be
 * switched at any instant — so it is an argument to `render`, not construction
 * config. The renderer holds nothing but the canvas and its context (and the
 * one scratch canvas the plate's smoke is composited on).
 *
 * Sizing: each call reads the canvas's CSS size and the devicePixelRatio and
 * resizes the backing store when either changed, so resizes and zooms need
 * nothing more than another `render`.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { drawCaption, layoutCaption } from "./drawCaption.ts";
import { drawFurniture } from "./drawFurniture.ts";
import { drawMap } from "./drawMap.ts";
import { drawUnits } from "./drawUnits.ts";
import { seeded } from "./primitives.ts";
import { fitProjection, type Rect } from "./projection.ts";
import type { Plate } from "./plate.ts";
import { METRES_PER_UNIT } from "./scaleBar.ts";
import { MIN_GLYPH_PX, NOMINAL_GLYPH_NMI, PLATE_MARGIN, sideColours } from "./style.ts";
import type { Viewer } from "./view.ts";
import { viewById } from "./views.ts";

export interface Renderer {
  /** Draws the picture as this viewer has chosen to see it. Synchronous; returns when the canvas holds it. */
  render(battle: Battle, map: MapFile | undefined, picture: Picture, viewer: Viewer): void;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is not available in this browser");

  return {
    render(battle, map, picture, viewer) {
      const view = viewById(viewer.view);
      const { palette } = view;
      const { width, height } = fitBackingStore(canvas, ctx);

      // Ground: everything is the view's paper until a land polygon says otherwise.
      ctx.fillStyle = palette.paper;
      ctx.fillRect(0, 0, width, height);

      // The caption band's height comes first, so the plate fits above it.
      const caption = layoutCaption(ctx, battle, picture, width);
      const plateHeight = Math.max(1, height - caption.height);

      const projection = fitProjection(battle.extent, {
        x: PLATE_MARGIN,
        y: PLATE_MARGIN,
        width: Math.max(1, width - PLATE_MARGIN * 2),
        height: Math.max(1, plateHeight - PLATE_MARGIN * 2),
      });
      const { extentRect } = projection;

      // Letterbox: another tone outside the extent, the plate itself back in the paper.
      ctx.fillStyle = palette.letterbox;
      ctx.fillRect(0, 0, width, plateHeight);
      ctx.fillStyle = palette.paper;
      ctx.fillRect(extentRect.x, extentRect.y, extentRect.width, extentRect.height);
      if (palette.stipple !== undefined) mottle(ctx, extentRect, palette.stipple);

      const centreLat = (battle.extent.north + battle.extent.south) / 2;
      const pixelsPerMetre = 1 / projection.metresPerPixel(centreLat);
      const plate: Plate = {
        ctx,
        view,
        battle,
        map,
        picture,
        projection,
        colours: sideColours(battle, palette),
        glyphLength: Math.max(MIN_GLYPH_PX, NOMINAL_GLYPH_NMI * METRES_PER_UNIT.nmi * pixelsPerMetre),
        pixelsPerMetre,
      };

      // The picture is clipped to the extent; furniture is not.
      ctx.save();
      ctx.beginPath();
      ctx.rect(extentRect.x, extentRect.y, extentRect.width, extentRect.height);
      ctx.clip();
      drawMap(plate);
      drawUnits(plate);
      ctx.restore();

      drawFurniture(plate);
      drawCaption(ctx, battle, picture, caption, plateHeight, width, palette);
    },
  };
}

/** Sizes the backing store to the canvas's CSS size at the current devicePixelRatio. Returns the CSS size. */
export function fitBackingStore(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { width: number; height: number } {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  const storeWidth = Math.round(width * dpr);
  const storeHeight = Math.round(height * dpr);
  if (canvas.width !== storeWidth || canvas.height !== storeHeight) {
    canvas.width = storeWidth;
    canvas.height = storeHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

/** A faint fixed mottle so the paper is not a flat fill. Seeded, so it never shimmers from one render to the next. */
function mottle(ctx: CanvasRenderingContext2D, { x, y, width, height }: Rect, stipple: string): void {
  const random = seeded(7);
  ctx.save();
  ctx.fillStyle = stipple;
  for (let i = 0; i < 900; i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.beginPath();
    ctx.arc(px, py, random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
