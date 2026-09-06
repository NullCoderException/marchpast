/**
 * The plate being drawn: what every drawing pass receives for one instant,
 * the context, the fitted projection, the inputs, and the values derived
 * from them once per pass.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import type { Projection } from "./projection.ts";

export interface Plate {
  ctx: CanvasRenderingContext2D;
  battle: Battle;
  map: MapFile | undefined;
  picture: Picture;
  projection: Projection;
  /** Side name to ink colour, by roster order. */
  colours: Map<string, string>;
  /** Long axis of a full-strength unit glyph in pixels, never below the readable minimum. */
  glyphLength: number;
  /** Pixels per metre of ground at the extent's centre latitude, for the scale bar and glyph length. */
  pixelsPerMetre: number;
}
