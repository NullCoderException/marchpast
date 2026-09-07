/**
 * The label pass (#39): a placer that is pure functions over boxes, and a thin
 * drawing that uses it. The renderer holds the one piece of state the sticky
 * search needs — `LabelMemory` — and clears it when the battle changes.
 *
 * Two placers share the vocabulary and nothing else. `place.ts` puts the
 * unit labels, which move every frame and so are sticky and collapse;
 * `map.ts` puts the place and work names, which never move and so do neither
 * (#107). Both are boxes against boxes, and the map's boxes are obstacles to
 * the units' because the map is drawn first.
 */
export { type CardContent, cardContent, type CardLayout } from "./card.ts";
export { canvasMeasure, drawLabels } from "./draw.ts";
export type { Measure } from "./content.ts";
export type { LabelUnit } from "./geometry.ts";
export { glyphBox, smokeBox } from "./geometry.ts";
export { type MapLabel, type MapLabelKind, type MapPoint, placeMapLabels } from "./map.ts";
export {
  CARD_STEP,
  type LabelMemory,
  NO_LABEL_MEMORY,
  type NumeralRow,
  numeralKey,
  placeLabels,
  type Placed,
} from "./place.ts";
