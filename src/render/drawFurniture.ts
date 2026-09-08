/**
 * The furniture pass's shared half (ADR-0005, ADR-0009, ADR-0021): the closed
 * set of pieces, which corner each anchors to, the order they are drawn in,
 * and the boxes they leave behind. Every mark is the view's `furniture` hand.
 *
 * **The anatomy this keeps.** There are five pieces — the compass with the
 * phase's wind on it, the battle title, the scale bar, the key, and the map's
 * credit — plus the plate's edge and the caption band. North is always up.
 * They are drawn after the picture and inside the frame, with nothing clipped,
 * and in the order below: the edge, then the paper any of them stand on, then
 * the pieces. A view that cannot draw a scale bar is broken, not degraded —
 * the same rule ADR-0015 sets for arms.
 *
 * What the *width* changes is a different question from what the view does, and
 * it is answered once in `layout.ts` (#86): on a phone the title goes to the
 * caption band's date line, the rose becomes a north arrow, the legend becomes
 * a one-line strip of the sides with the rest in Details, and the credit goes
 * to Details too. The scale bar is the one piece that never goes.
 *
 * A phone's furniture hangs from the **plate area** rather than the extent: the
 * extent letterboxes hard on a narrow screen, and a scale bar laid inside it
 * would cover the picture it measures. On a desktop the two are all but the
 * same rectangle.
 *
 * Every piece reports the **panel** it stands in, because the label pass has to
 * clear the furniture as well as the glyphs: without that the very first Cannae
 * frame puts a unit's label across the compass rose (#39). Those panels are the
 * same rectangles a plate with relief under a corner lays its paper on, so the
 * ink and the obstacle can never disagree about where a piece is.
 *
 * The key's numeral rows are the one piece of furniture a pointer may act on: a
 * **click** on a numeral row opens that unit's card, which is what rescues a
 * unit whose label has collapsed all the way (#60). So the hand answers with
 * their boxes, and this pass hands them on as hit regions.
 */
import type { HitRegion } from "./hit.ts";
import type { NumeralRow } from "./labels/index.ts";
import { type FurnitureSet, furnitureFor } from "./layout.ts";
import type { Plate } from "./plate.ts";
import type { Rect } from "./projection.ts";
import type { FurniturePlace, LegendPlace } from "./view.ts";

/**
 * The whole furniture for one frame, in the anatomy's order, answering with
 * the key's numeral rows.
 */
export function drawFurniture(plate: Plate, key: readonly NumeralRow[]): HitRegion[] {
  const { ctx, view } = plate;
  const { furniture, palette } = view;
  const set = furnitureFor(plate.mode);
  const place = furniturePlace(plate);

  furniture.border(ctx, place.frame, palette);

  const legend = legendPlace(place, key);
  // A ground runs under every corner where a plate carries relief, so the
  // furniture is given paper first. Unruled: the key's own rule is the only
  // one there is (#62).
  if (legend.onPanel) for (const panel of panels(place, set, legend)) furniture.panel(ctx, panel, palette);

  furniture.compass.draw(place);
  if (set.title) furniture.title.draw(place);
  if (set.scaleBar) furniture.scaleBar.draw(place, legend.bar);
  // Both forms of the key report their numeral rows: a phone's strip is where a
  // collapsed label is rescued from, exactly as the desktop legend is (#60).
  const rows = furniture.legend.draw(place, legend);
  if (set.credit) furniture.credit.draw(place);
  return rows;
}

/**
 * Every box the furniture occupies, for the label pass to clear (#39). The same
 * rectangles `drawFurniture` lays paper on, and taking the frame's numeral key
 * because the legend is the one piece whose size the labels decide.
 */
export function furnitureBoxes(plate: Plate, key: readonly NumeralRow[]): Rect[] {
  const set = furnitureFor(plate.mode);
  const place = furniturePlace(plate);
  return panels(place, set, legendPlace(place, key));
}

/**
 * The rectangle a phone's or a desktop's furniture hangs from: the plate area
 * on a phone, where the extent letterboxes hard, and the extent itself
 * everywhere else.
 */
function furniturePlace(plate: Plate): FurniturePlace {
  return { plate, frame: plate.mode === "phone" ? plate.plateArea : plate.projection.extentRect };
}

/** What the key is drawn against: the scale bar it shares a corner with, and the numerals this frame implies. */
function legendPlace(place: FurniturePlace, key: readonly NumeralRow[]): LegendPlace {
  const { view, contourLevels } = place.plate;
  const bar = view.furniture.scaleBar.layout(place);
  return { key, bar, onPanel: view.ground.underFurniture(contourLevels) };
}

/**
 * Every box the mode's furniture stands in, in the order the corners are
 * drawn. A piece answers with nothing where this mode does not draw it, where
 * the frame has nothing to put there, or where it stands on another piece's
 * corner panel.
 */
function panels(place: FurniturePlace, set: FurnitureSet, legend: LegendPlace): Rect[] {
  const { furniture } = place.plate.view;
  const boxes = [
    furniture.compass.panel(place),
    set.title ? furniture.title.panel(place) : undefined,
    set.scaleBar ? furniture.scaleBar.panel(place, legend) : undefined,
    furniture.legend.panel(place, legend),
    set.credit ? furniture.credit.panel(place) : undefined,
  ];
  return boxes.filter((box): box is Rect => box !== undefined);
}
