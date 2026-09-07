/**
 * The night plate's relief: **illuminated contours**, Tanaka's method (#138).
 *
 * One light low in the north-west. Each contour segment is lit or shaded by
 * the angle its uphill normal makes with the light: the lit side runs in
 * parchment, wide and bright; the shaded side thins toward the ground and all
 * but goes out. The hill is modelled by the lines themselves, so nothing is
 * washed over the paper and the side inks keep the ground they sit on — which
 * is what the plate's flat weighting cannot give and a hillshade would take
 * away.
 *
 * **Everything comes off the contour polylines and their levels.** The map
 * file carries no slope, no aspect and no raster, and by ADR-0012 it never
 * will. Uphill comes from the ring: a contourer winds its rings with the high
 * ground on the left, and `uphillOf` recovers the same fact from the signed
 * area whatever tool cut the file.
 *
 * A line clipped by the extent is not a ring and its implicit closure says
 * nothing, so those take #138's own fallback instead — the nearest point on
 * the contour above is up the slope, and which side of the line it falls on is
 * which way is up (`uphillToward`). That is not the rare case: Cannae ships 52
 * open lines against 10 closed, so on a real file the fallback draws most of
 * the hill and the signed area draws the summits.
 *
 * The cost is measurement: **on the shaded side a height cannot be read**.
 * That is the bargain the night plate makes and the plate does not, and the
 * index numerals still stand in their column at the foot, so the levels a
 * plate reader learned are still named (#138).
 *
 * Some 1 250 segments on Cannae, each its own stroke. It is drawn once per
 * view, battle, plate rectangle and device pixel ratio into the ground buffer
 * and blitted thereafter, never per frame (`groundBuffer.ts`).
 */
import type { LonLat } from "../../../schema/types.ts";
import type { Point } from "../../primitives.ts";
import { indexLevels, uphillOf, uphillToward } from "../../relief.ts";
import type { GroundRequest, Palette } from "../../view.ts";
import { CONTOUR_WIDTH, contourLinesOf, drawContourNumerals, INDEX_CONTOUR_WIDTH, isClosed, projectLine, type ReliefHand } from "./ground.ts";
import { atAlpha } from "./ink.ts";

/** Where the light stands, in degrees true: low in the north-west, as Tanaka sets it. */
const LIGHT_AZIMUTH = 315;

/** The direction the light comes *from*, as a unit vector on the canvas: north is up the negative y axis. */
export const LIGHT: Point = {
  x: Math.sin((LIGHT_AZIMUTH * Math.PI) / 180),
  y: -Math.cos((LIGHT_AZIMUTH * Math.PI) / 180),
};

/** How much wider than its flat weight a fully lit segment runs, and how far below it a fully shaded one thins. */
const WIDTH_FLOOR = 0.5;
const WIDTH_GAIN = 2.4;

/** The same for the ink: a shaded line keeps a third of its alpha, a lit one is carried well past it. */
const ALPHA_FLOOR = 0.35;
const ALPHA_GAIN = 1.5;

/** Below this a segment is shorter than the pen and says nothing about which way the ground faces. */
const MIN_SEGMENT = 0.4;

/**
 * How lit an uphill normal is: `1` where the slope rises straight at the
 * light, `0` where it rises straight away from it, and `0.5` at either normal
 * across the beam. The cosine mapped on to nought-to-one, because it scales a
 * weight and an alpha and neither has a negative side.
 */
export function litFactor(uphill: Point, light: Point = LIGHT): number {
  return (uphill.x * light.x + uphill.y * light.y + 1) / 2;
}

/**
 * Illuminated contours: the night plate's ground, and no other view's. The
 * numerals are the plate's, in their column at the foot, knocked out to the
 * paper — the night plate lays no tint, so the ground under a numeral is the
 * paper as it is on a plate.
 */
export const illuminatedContours: ReliefHand = (request) => {
  const lines = contourLinesOf(request);
  if (lines === undefined) return;
  const { ctx, palette, contourLevels } = request;
  const drawn = levelsOf(request, lines);
  const index = new Set(indexLevels(contourLevels));

  ctx.save();
  ctx.lineCap = "round";
  drawn.forEach(({ level, polylines }, i) => {
    const base = index.has(level) ? INDEX_CONTOUR_WIDTH : CONTOUR_WIDTH;
    const alpha = index.has(level) ? palette.relief.index : palette.relief.contour;
    // The level above, flattened once for the whole of this one: an open line
    // asks it which way is up, and the topmost level has nothing to ask.
    const above = drawn[i + 1]?.polylines.flatMap(({ points }) => points) ?? [];
    for (const { points, closed } of polylines) {
      const uphill = closed ? uphillOf(points) : (uphillToward(points, above) ?? uphillOf(points));
      drawLitLine(ctx, points, uphill, base, alpha, palette);
    }
  });
  ctx.restore();

  drawContourNumerals(request, lines, () => palette.paper);
};

/** One level's polylines on the canvas, each knowing whether it closed, ascending by level. */
function levelsOf(
  { projection }: GroundRequest,
  lines: Map<number, LonLat[][]>,
): { level: number; polylines: { points: Point[]; closed: boolean }[] }[] {
  return [...lines].map(([level, polylines]) => ({
    level,
    polylines: polylines.map((line) => ({ points: projectLine(projection, line), closed: isClosed(line) })),
  }));
}

/**
 * One line, segment by segment: the uphill side belongs to the whole line, so
 * it is settled once by the caller and every segment's normal is the left
 * normal turned that way.
 *
 * Each segment is its own stroke because each carries its own weight and its
 * own ink — which is the whole treatment, and the reason this ground is
 * buffered rather than redrawn.
 */
function drawLitLine(
  ctx: CanvasRenderingContext2D,
  ring: readonly Point[],
  uphill: 1 | -1,
  base: number,
  alpha: number,
  palette: Palette,
): void {
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const run = Math.hypot(dx, dy);
    if (run < MIN_SEGMENT) continue;
    const factor = litFactor({ x: (dy / run) * uphill, y: (-dx / run) * uphill });

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = base * (WIDTH_FLOOR + factor * WIDTH_GAIN);
    // The lit side is the palette's own ink — parchment on the night plate —
    // and the shaded side is the tone outside the plate, so a line facing away
    // thins *into* the ground rather than merely going pale.
    ctx.strokeStyle = atAlpha(factor >= 0.5 ? palette.ink : palette.letterbox, Math.min(1, alpha * (ALPHA_FLOOR + factor * ALPHA_GAIN)));
    ctx.stroke();
  }
}


