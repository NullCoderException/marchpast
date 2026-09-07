/**
 * The renderer: one synchronous pass that draws the picture the timeline hands
 * it for one instant, in the **view** the viewer has picked (ADR-0014). No
 * animation loop lives here; the player owns that and calls `render` whenever
 * the picture, the viewer's choices or the canvas changes.
 *
 * The viewer's state is as per-frame as the picture is — a view or a level may
 * be switched at any instant — so it is an argument to `render`, not
 * construction config. The renderer holds nothing but the canvas and its
 * context (and the one scratch canvas the plate's smoke is composited on).
 *
 * The viewer's **level** is applied once, here, before any pass runs: the
 * timeline hands over every roster unit's picture and `level.ts` narrows it to
 * the units this level draws (schema.md 2.11). Nothing else in the frame
 * varies with it.
 *
 * Sizing: each call reads the canvas's CSS size and the devicePixelRatio and
 * resizes the backing store when either changed, so resizes and zooms need
 * nothing more than another `render`.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { drawCaption, layoutCaption } from "./drawCaption.ts";
import { drawFurniture, furnitureBoxes } from "./drawFurniture.ts";
import { drawMap } from "./drawMap.ts";
import { drawUnits } from "./drawUnits.ts";
import { canvasMeasure, drawLabels, type LabelMemory, type LabelUnit, type Measure, NO_LABEL_MEMORY, type NumeralRow, numeralKey, type Placed, placeLabels } from "./labels/index.ts";
import { unitsDrawn } from "./level.ts";
import { seeded } from "./primitives.ts";
import { fitProjection, type Rect } from "./projection.ts";
import { contourLevels } from "./relief.ts";
import type { Plate } from "./plate.ts";
import { PLATE_MARGIN, sideColours } from "./style.ts";
import type { Viewer } from "./view.ts";
import { viewById } from "./views.ts";

export interface Renderer {
  /** Draws the picture as this viewer has chosen to see it. Synchronous; returns when the canvas holds it. */
  render(battle: Battle, map: MapFile | undefined, picture: Picture, viewer: Viewer): void;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is not available in this browser");
  const measure = canvasMeasure(ctx);

  // The one piece of frame-to-frame state the renderer holds: where each
  // label stood last frame, so it does not move when it need not (#39). It is
  // per battle — the slots are keyed by roster id — so a new battle starts
  // over.
  let labels: LabelMemory = NO_LABEL_MEMORY;
  let drawing: Battle | undefined;

  return {
    render(battle, map, picture, viewer) {
      if (battle !== drawing) {
        labels = NO_LABEL_MEMORY;
        drawing = battle;
      }
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

      // For the scale bar alone: a glyph's length is a plate constant and owes
      // nothing to the ground it stands on (ADR-0016).
      const centreLat = (battle.extent.north + battle.extent.south) / 2;
      const pixelsPerMetre = 1 / projection.metresPerPixel(centreLat);
      const plate: Plate = {
        ctx,
        view,
        battle,
        map,
        picture,
        unitsDrawn: unitsDrawn(battle.units, picture.units, viewer.level),
        contourLevels: contourLevels(map),
        projection,
        colours: sideColours(battle, palette),
        pixelsPerMetre,
      };

      // The picture is clipped to the extent; furniture is not.
      ctx.save();
      ctx.beginPath();
      ctx.rect(extentRect.x, extentRect.y, extentRect.width, extentRect.height);
      ctx.clip();
      drawMap(plate);
      const units = drawUnits(plate);
      ctx.restore();

      // The labels go last, over the whole plate, because they must clear the
      // furniture as well as the glyphs (#39). The furniture is measured
      // first, drawn after: its legend carries a key for any numeral the
      // labels end up showing, and a bigger legend is a bigger obstacle.
      const { placed, key } = layoutLabels(plate, units, extentRect, labels, measure);
      drawFurniture(plate, key);
      drawLabels(ctx, placed, palette);
      drawCaption(ctx, battle, picture, caption, plateHeight, width, palette);
    },
  };

  /**
   * Places the frame's labels against the furniture, and the furniture against
   * the frame's labels. The two depend on each other in one direction only —
   * the numeral is the last resort of the collapse order, and every numeral
   * shown adds a row to the legend — so a second pass settles it, and the key
   * the legend draws is always the key the placed labels imply.
   */
  function layoutLabels(
    plate: Plate,
    units: readonly LabelUnit[],
    extentRect: Rect,
    memory: LabelMemory,
    measureText: Measure,
  ): { placed: Placed[]; key: NumeralRow[] } {
    const place = (against: readonly NumeralRow[]) =>
      placeLabels({ units, plate: extentRect, obstacles: furnitureBoxes(plate, against), measure: measureText, memory });

    let placement = place([]);
    let key = numeralKey(placement.placed);

    if (key.length > 0) {
      placement = place(key);
      key = numeralKey(placement.placed);
    }

    labels = placement.memory;
    return { placed: placement.placed, key };
  }
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
