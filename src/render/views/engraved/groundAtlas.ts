/**
 * Atlas's relief: a **hypsometric ramp** (#138).
 *
 * Five bands at 30, 50, 100, 150 and 200 m, each a colour off a ramp the view
 * carries rather than another coat of the same ink, laid under faint index
 * contours. Height becomes a hue instead of a density, which answers #62's own
 * worry about tint — that it "darkens the ground the side inks sit on" —
 * because the ramp can be kept lighter than five stacked alphas and every side
 * ink reads over every band. **The ramp stops at 30 m**, so a coast keeps the
 * plain land tone and the shore is as legible as it was.
 *
 * Nothing is derived but the rings and their levels (ADR-0012). A band is the
 * closed rings at its level filled together: an open line encloses nothing, so
 * it is left out rather than closed across the plate, and a plate whose lines
 * run off the extent is banded by whichever levels do close. Even-odd, so a
 * hollow inside a hill is a hole however the ring was wound.
 *
 * **A numeral knocks out to the ground it stands on** — the highest band at or
 * below its own level, never the paper. That is #138's closing note: on a
 * plate the ground under a numeral *is* the paper, which looked like anatomy
 * until a second treatment of the ground made it a pale box cut out of a
 * tinted band.
 */
import type { LonLat } from "../../../schema/types.ts";
import { bandIndexAt, tintBandLevels } from "../../relief.ts";
import type { GroundRequest, Palette } from "../../view.ts";
import { byWeight, contourLinesOf, drawContourNumerals, isClosed, type ReliefHand, strokeContours, tracePolygons } from "./ground.ts";

/**
 * The ramp Atlas carries, `#e6d9b4 → #c0a066`: one colour per threshold in
 * `TINT_BAND_LEVELS`, in the same order. It is five values of one drawing
 * rather than five decisions, so it is written here and named by the view,
 * which is where a hand reads it back from (#138's cost row: Atlas's ground is
 * a palette, not a pass).
 */
export const ATLAS_RAMP: readonly string[] = ["#e6d9b4", "#e0d0a4", "#d8c391", "#cdb37c", "#c0a066"];

/**
 * The one weight Atlas lays over its bands, and it is not the plate's 0.9: the
 * board thins the index line to 0.56 under the ramp, because a hue already
 * says the height and the line is only there to say where the step falls
 * (#138). The fine weight is not drawn at all.
 */
const INDEX_WIDTH = 0.56;

/**
 * The ramp under faint index contours: Atlas's ground, and no other view's. A
 * view whose palette carries no ramp lays no bands, which leaves the index
 * contours standing on the plain land tone.
 */
export const hypsometricRamp: ReliefHand = (request) => {
  const lines = contourLinesOf(request);
  if (lines === undefined) return;
  const { palette } = request;
  const laid = drawBands(request, lines);
  // The fine lines are left off, which is what keeps the ramp quiet under blocks.
  strokeContours(request, byWeight(lines, request.contourLevels).index, INDEX_WIDTH, palette.relief.index);
  drawContourNumerals(request, lines, (level) => groundAt(level, laid, palette));
};

/**
 * The bands, lowest first, so the high ground is laid last and a ring inside a
 * ring reads as the higher tone. A band takes its threshold's own place on the
 * ramp rather than its place among the levels the map happens to carry: a map
 * cut without a 100 m line still has its 150 m ground in the fourth colour.
 */
function drawBands({ ctx, projection, palette, contourLevels }: GroundRequest, lines: Map<number, LonLat[][]>): number[] {
  const { ramp } = palette.relief;
  if (ramp === undefined) return [];
  const laid: number[] = [];
  for (const level of tintBandLevels(contourLevels)) {
    const colour = ramp[bandIndexAt(level)];
    const closed = (lines.get(level) ?? []).filter(isClosed);
    if (colour === undefined || closed.length === 0) continue;
    ctx.fillStyle = colour;
    tracePolygons(ctx, projection, closed);
    ctx.fill("evenodd");
    laid.push(level);
  }
  return laid;
}

/**
 * The ground a numeral stands on: the highest band **actually laid** at or
 * below its level, and the plain land where none was. #138's note names the
 * highest band at or below the level; a threshold whose lines all run off the
 * extent lays no band at all, and knocking out to a colour that was never put
 * down would leave the box the note was raised about, in a different hue.
 */
function groundAt(level: number, laid: readonly number[], { relief, land }: Palette): string {
  let colour = land;
  for (const threshold of laid) if (threshold <= level) colour = relief.ramp?.[bandIndexAt(threshold)] ?? colour;
  return colour;
}
