/**
 * The plate being drawn: what every drawing pass receives for one instant —
 * the context, the view, the fitted projection, the inputs, and the values
 * derived from them once per pass.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import type { LayoutMode } from "./layout.ts";
import type { Picture, UnitPicture } from "../timeline/picture.ts";
import type { Projection, Rect } from "./projection.ts";
import type { View } from "./view.ts";

export interface Plate {
  ctx: CanvasRenderingContext2D;
  /** The treatment this frame is drawn in: the passes read every colour, pen and glyph from here. */
  view: View;
  /**
   * How wide the plate is, as one global rule (`layout.ts`, #86): which
   * furniture is drawn, and how many words a label may spend. Derived from the
   * canvas's own width once per frame, so a resize is just another frame.
   */
  mode: LayoutMode;
  battle: Battle;
  map: MapFile | undefined;
  picture: Picture;
  /**
   * The picture's units the viewer's level draws, in roster order: what every
   * pass that puts a unit on the plate reads, so no two passes disagree about
   * what is there. `picture.units` stays every unit present at the instant,
   * which is what the labels' numerals are indexed by (schema.md 2.9, 2.11).
   */
  unitsDrawn: readonly UnitPicture[];
  /**
   * Every distinct level the map's contours are cut at, ascending; empty when
   * the map carries no relief, or there is no map. Derived once because two
   * passes read it: the map pass for the index levels and the tint bands, the
   * furniture for the panels a land plate needs and the interval its scale bar
   * carries (#62).
   */
  contourLevels: readonly number[];
  /**
   * The rectangle the projection was fitted into: the canvas above the caption
   * band, inset by the plate margin. The extent letterboxes inside it, and on
   * a phone this is where the furniture hangs from rather than the extent
   * (#86).
   */
  plateArea: Rect;
  projection: Projection;
  /** Side name to ink colour, by roster order, in the view's palette. */
  colours: Map<string, string>;
  /** Pixels per metre of ground at the extent's centre latitude, for the scale bar. */
  pixelsPerMetre: number;
}
