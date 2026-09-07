/**
 * The label pass (#39): a placer that is pure functions over boxes, and a thin
 * drawing that uses it. The renderer holds the one piece of state the sticky
 * search needs — `LabelMemory` — and clears it when the battle changes.
 */
export { type CardContent, cardContent, type CardLayout } from "./card.ts";
export { canvasMeasure, drawLabels } from "./draw.ts";
export type { Measure } from "./content.ts";
export type { LabelUnit } from "./geometry.ts";
export { glyphBox, smokeBox } from "./geometry.ts";
export {
  CARD_STEP,
  type LabelMemory,
  NO_LABEL_MEMORY,
  type NumeralRow,
  numeralKey,
  placeLabels,
  type Placed,
} from "./place.ts";
