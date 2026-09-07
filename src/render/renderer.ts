/**
 * The renderer: one synchronous pass that draws the picture the timeline hands
 * it for one instant, in the **view** the viewer has picked (ADR-0014,
 * ADR-0021). No animation loop lives here; the player owns that and calls
 * `render` whenever the picture, the viewer's choices or the canvas changes.
 *
 * The viewer's state is as per-frame as the picture is — a view or a level may
 * be switched at any instant — so it is an argument to `render`, not
 * construction config. The renderer holds nothing but the canvas, its context,
 * where the labels stood last frame, and the ground buffer (and, inside the
 * plate's glyph, the one scratch canvas its smoke is composited on).
 *
 * The viewer's **level** is applied once, here, before any pass runs: the
 * timeline hands over every roster unit's picture and `level.ts` narrows it to
 * the units this level draws (schema.md 2.11). Nothing else in the frame
 * varies with it.
 *
 * The frame's **unit card**, when the viewer has one open, is the label pass's
 * business too: it is one unit's label unfolded, so it is measured before the
 * placer runs and drawn with the labels (#60). A card whose unit this level
 * does not draw is no card at all.
 *
 * `render` is also the only thing that knows where anything landed, so it
 * hands back the frame's **hit regions**: the boxes the player resolves a
 * pointer against to open a card.
 *
 * Sizing: each call reads the canvas's CSS size and the devicePixelRatio and
 * resizes the backing store when either changed, so resizes and zooms need
 * nothing more than another `render`.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { PLATE_MARGIN, sideColours } from "./anatomy.ts";
import { drawFurniture, furnitureBoxes } from "./drawFurniture.ts";
import { drawUnits, layoutUnits } from "./drawUnits.ts";
import { drawNamedThings, mapPoints } from "./ground.ts";
import { createGroundBuffer } from "./groundBuffer.ts";
import type { HitRegion } from "./hit.ts";
import { layoutMode } from "./layout.ts";
import {
  canvasMeasure,
  type CardContent,
  cardContent,
  drawLabels,
  glyphBox,
  type LabelMemory,
  type LabelUnit,
  type MapLabel,
  type Measure,
  NO_LABEL_MEMORY,
  type NumeralRow,
  numeralKey,
  type Placed,
  placeLabels,
  placeMapLabels,
} from "./labels/index.ts";
import { unitsDrawn } from "./level.ts";
import { fitProjection, type Rect } from "./projection.ts";
import { contourLevels } from "./relief.ts";
import type { Plate } from "./plate.ts";
import type { Viewer } from "./view.ts";
import { viewById } from "./views.ts";

export interface Renderer {
  /**
   * Draws the picture as this viewer has chosen to see it. Synchronous;
   * returns when the canvas holds it, with the frame's hit regions for the
   * player to resolve pointers against (#60).
   */
  render(battle: Battle, map: MapFile | undefined, picture: Picture, viewer: Viewer): HitRegion[];
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is not available in this browser");

  // The frame-to-frame state the renderer holds. First, where each label stood
  // last frame, so it does not move when it need not (#39). It is per battle —
  // the slots are keyed by roster id — so a new battle starts over.
  let labels: LabelMemory = NO_LABEL_MEMORY;
  let drawing: Battle | undefined;
  // Second, the ground: drawn once per view, battle, plate rectangle and device
  // pixel ratio, and blitted every frame after that (#138).
  const ground = createGroundBuffer();

  return {
    render(battle, map, picture, viewer) {
      if (battle !== drawing) {
        labels = NO_LABEL_MEMORY;
        drawing = battle;
      }
      const view = viewById(viewer.view);
      const { palette } = view;
      // Every box the placer judges is measured in the view's own face, so the
      // measurer is built per frame rather than per renderer (ADR-0021).
      const measure = canvasMeasure(ctx, view.type);
      const { width, height, dpr } = fitBackingStore(canvas, ctx);
      // One global rule about width, read once and handed to every pass that
      // answers to it: the furniture set, the band's anatomy, and the step the
      // labels start collapsing from (#86).
      const mode = layoutMode(width);

      // Ground: everything is the view's paper until the buffer or the band says otherwise.
      ctx.fillStyle = palette.paper;
      ctx.fillRect(0, 0, width, height);

      // The caption band's height comes first, so the plate fits above it. The
      // band is one of the view's own hands — measured and inked together,
      // because a view lays it out however it likes and the shared half knows
      // only that it runs the whole width below the plate (ADR-0021).
      const caption = view.furniture.caption.measure({ ctx, battle, picture, width, mode, palette, type: view.type });
      const plateHeight = Math.max(1, height - caption.height);

      const plateArea: Rect = {
        x: PLATE_MARGIN,
        y: PLATE_MARGIN,
        width: Math.max(1, width - PLATE_MARGIN * 2),
        height: Math.max(1, plateHeight - PLATE_MARGIN * 2),
      };
      const projection = fitProjection(battle.extent, plateArea);
      const { extentRect } = projection;

      // For the scale bar alone: a glyph's length is a plate constant and owes
      // nothing to the ground it stands on (ADR-0016).
      const centreLat = (battle.extent.north + battle.extent.south) / 2;
      const pixelsPerMetre = 1 / projection.metresPerPixel(centreLat);
      const plate: Plate = {
        ctx,
        view,
        mode,
        battle,
        map,
        picture,
        unitsDrawn: unitsDrawn(battle.units, picture.units, viewer.level),
        contourLevels: contourLevels(map),
        plateArea,
        projection,
        colours: sideColours(battle, palette),
        pixelsPerMetre,
      };

      // The ground — the letterbox, the sea, the land, the relief treatment and
      // the water — is blitted rather than drawn: it is the same picture on
      // every frame of this battle in this view at this size (#138).
      ground.paint(plate, { width, plateHeight }, dpr);

      // Everything else is laid out before anything is inked. The map's names,
      // the units' labels and the legend's numeral key each depend on the
      // others, and the names are drawn first of the three, so no pass can
      // settle its own question while it draws (#107).
      const laid = layoutUnits(plate);
      const layout = layoutPlate({ plate, units: laid.map(({ label }) => label), memory: labels, measure, card: openCard(plate, viewer) });
      const { names, placed, key } = layout;
      labels = layout.memory;

      // The picture is clipped to the extent; furniture is not.
      ctx.save();
      ctx.beginPath();
      ctx.rect(extentRect.x, extentRect.y, extentRect.width, extentRect.height);
      ctx.clip();
      drawNamedThings(plate, names);
      drawUnits(plate, laid);
      ctx.restore();

      // The unit labels go last, over the whole plate, because they must clear
      // the furniture as well as the glyphs (#39), and the furniture goes
      // before them because its legend carries a key for any numeral they end
      // up showing.
      const rows = drawFurniture(plate, key);
      drawLabels(ctx, placed, view);
      caption.draw(plateHeight);
      return hitRegions(placed, rows);
    },
  };
}

export interface PlateLayout {
  /** The map's names, only those the placer found room for. */
  names: MapLabel[];
  /** The unit labels, in roster order. */
  placed: Placed[];
  /** The legend's numeral key, which the placed labels imply. */
  key: NumeralRow[];
  /** Where the unit labels stood, for the next frame's sticky search. */
  memory: LabelMemory;
}

export interface PlateLayoutOptions {
  plate: Plate;
  /** The units this level draws, as `layoutUnits` reported them. */
  units: readonly LabelUnit[];
  memory: LabelMemory;
  measure: Measure;
  /** The card the viewer has open, when its unit is one this level draws (#60). */
  card?: CardContent;
}

/**
 * Where every word on the plate goes. Three things depend on each other in one
 * direction only: the map's names clear the furniture, the units' labels clear
 * both, and the numeral a unit label collapses to adds a row to the legend —
 * which is a bigger obstacle for all of them. So a second pass settles it, and
 * the key the legend draws is always the key the placed labels imply.
 *
 * Out of `render` and exported because it is the whole of the ordering #107
 * decided, and the only part of a frame's layout that can be tested without a
 * canvas to draw on.
 */
export function layoutPlate({ plate, units, memory, measure, card }: PlateLayoutOptions): PlateLayout {
  const extentRect = plate.projection.extentRect;
  const points = mapPoints(plate);

  const place = (against: readonly NumeralRow[]) => {
    const furniture = furnitureBoxes(plate, against);
    // The names first: a place is where it is, so it takes precedence over a
    // unit label, which may be displaced or collapsed instead (#107).
    const names = placeMapLabels({ points, plate: extentRect, obstacles: furniture });
    const obstacles = [...furniture, ...names.map(({ box }) => box)];
    return { names, ...placeLabels({ units, plate: extentRect, obstacles, measure, memory, card, mode: plate.mode }) };
  };

  let placement = place([]);
  let key = numeralKey(placement.placed);

  if (key.length > 0) {
    placement = place(key);
    key = numeralKey(placement.placed);
  }

  return { names: placement.names, placed: placement.placed, key, memory: placement.memory };
}

/**
 * The card the viewer has open, or nothing: nothing when no card is open, and
 * nothing when this level does not draw its unit, which is the renderer's half
 * of the rule the player's `setLevel` keeps (#60, ADR-0017).
 */
function openCard(plate: Plate, viewer: Viewer): CardContent | undefined {
  const id = viewer.card?.id;
  if (id === undefined || !plate.unitsDrawn.some((unit) => unit.id === id)) return undefined;
  return cardContent(plate.battle.units, plate.picture.units, id);
}

/**
 * What the player resolves a pointer against: two boxes for every unit drawn —
 * its glyph, and whatever label or card that glyph carries — and one for each
 * of the legend's numeral rows, which a click opens the same card from. Two
 * boxes and never one around both: a label displaced a hundred pixels would
 * otherwise open a card from the bare plate between them.
 *
 * They go out **in the order they were drawn**, because the topmost region
 * containing a point is the one that answers: the glyphs, then the legend, then
 * the labels, and the frame's open card last of all, so a card that had to draw
 * over a label is what the pointer finds there.
 */
function hitRegions(placed: readonly Placed[], rows: readonly HitRegion[]): HitRegion[] {
  const box = (label: Placed, rect: Rect): HitRegion => ({ id: label.unit.id, box: rect, hover: true });
  const glyphs = placed.map((label) => box(label, glyphBox(label.unit)));
  const labels = placed.flatMap((label) => (label.card === undefined ? [box(label, label.box)] : []));
  const cards = placed.flatMap((label) => (label.card === undefined ? [] : [box(label, label.box)]));
  return [...glyphs, ...rows, ...labels, ...cards];
}

/**
 * Sizes the backing store to the canvas's CSS size at the current
 * devicePixelRatio. Answers the CSS size and the ratio it was fitted at, so
 * nothing downstream reads `window` again and finds a different one.
 */
export function fitBackingStore(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { width: number; height: number; dpr: number } {
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
  return { width, height, dpr };
}
