/**
 * What every drawing layer receives for one frame: the context, the fitted
 * projection, the inputs, and the per-frame values derived from them once.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import type { Projection, Rect } from "./projection.ts";

export interface Scene {
  ctx: CanvasRenderingContext2D;
  battle: Battle;
  map: MapFile | undefined;
  picture: Picture;
  projection: Projection;
  /** The extent's rectangle on the canvas; furniture sits inside it. */
  frame: Rect;
  /** Side name to ink colour, by roster order. */
  colours: Map<string, string>;
  /** Long axis of a full-strength unit glyph in pixels, never below the readable minimum. */
  glyphLength: number;
  /** Pixels per nautical mile at the extent's centre latitude. */
  pixelsPerNmi: number;
}
