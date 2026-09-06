/**
 * The renderer: one synchronous pass that draws the engraved chart plate
 * (ADR-0009) from a battle, an optional map, and the picture the timeline
 * hands it for one instant. No animation loop lives here; the controls slice
 * owns that and calls `render` whenever the picture or the canvas changes.
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
import { recordPlate } from "../prototype/plateRecord.ts";
import { seeded } from "./primitives.ts";
import { fitProjection, type Rect } from "./projection.ts";
import type { Plate } from "./plate.ts";
import { METRES_PER_UNIT } from "./scaleBar.ts";
import { LETTERBOX, MIN_GLYPH_PX, NOMINAL_GLYPH_NMI, PARCHMENT, PLATE_MARGIN, sideColours } from "./style.ts";

export interface Renderer {
  /** Draws the picture. Synchronous; returns when the canvas holds it. */
  render(battle: Battle, map: MapFile | undefined, picture: Picture): void;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is not available in this browser");

  return {
    render(battle, map, picture) {
      const { width, height } = fitBackingStore(canvas, ctx);

      // Ground: everything is parchment until a land polygon says otherwise.
      ctx.fillStyle = PARCHMENT;
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

      // Letterbox: a darker tone outside the extent, the plate itself back in parchment.
      ctx.fillStyle = LETTERBOX;
      ctx.fillRect(0, 0, width, plateHeight);
      ctx.fillStyle = PARCHMENT;
      ctx.fillRect(extentRect.x, extentRect.y, extentRect.width, extentRect.height);
      mottle(ctx, extentRect);

      const centreLat = (battle.extent.north + battle.extent.south) / 2;
      const pixelsPerMetre = 1 / projection.metresPerPixel(centreLat);
      const plate: Plate = {
        ctx,
        battle,
        map,
        picture,
        projection,
        colours: sideColours(battle),
        // PROTOTYPE (#39): the nominal glyph is a fleet's 1.6 nmi, which on Cannae's 6 km
        // extent draws a 560px unit. Until land units are decided (#49) a glyph is capped at
        // a twelfth of the plate, so the mocked land frame can be read at all.
        glyphLength: Math.max(
          MIN_GLYPH_PX,
          Math.min(NOMINAL_GLYPH_NMI * METRES_PER_UNIT.nmi * pixelsPerMetre, extentRect.width / 12),
        ),
        pixelsPerMetre,
      };

      recordPlate(plate);

      // The picture is clipped to the extent; furniture is not.
      ctx.save();
      ctx.beginPath();
      ctx.rect(extentRect.x, extentRect.y, extentRect.width, extentRect.height);
      ctx.clip();
      drawMap(plate);
      drawUnits(plate);
      ctx.restore();

      drawFurniture(plate);
      drawCaption(ctx, battle, picture, caption, plateHeight, width);
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
function mottle(ctx: CanvasRenderingContext2D, { x, y, width, height }: Rect): void {
  const random = seeded(7);
  ctx.save();
  ctx.fillStyle = "rgba(120,90,40,0.06)";
  for (let i = 0; i < 900; i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.beginPath();
    ctx.arc(px, py, random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
