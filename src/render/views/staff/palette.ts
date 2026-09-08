/**
 * The staff map's materials: the fourth view's palette and its pens (#139,
 * #175).
 *
 * The sheet's own colours were settled on #138 as the `ops` idiom — a printed
 * twentieth-century operations sheet, buff paper with a body of water that has
 * a colour of its own — and are not reopened here. What #139 added is the six
 * side inks retuned to buff, in the fixed hue order the anatomy keeps: red,
 * blue, green, brown, purple, teal (ADR-0021).
 *
 * It sits in its own file rather than inline in `views.ts` because two hands
 * read the ramp — the ground's steps and, through the palette, the contour
 * numerals' knock-out — and because the view is a palette plus five hands, all
 * of which are in this folder.
 */
import type { Palette, Pens } from "../../view.ts";

/**
 * Height as five flat steps of olive buff, `#d3cbab → #a6975e`: one colour per
 * threshold in `TINT_BAND_LEVELS`, in that order (#138). Flat colour where the
 * engraved plate stacks ink, which is the whole difference between a printed
 * sheet's ground and an engraving's.
 */
export const STAFF_RAMP: readonly string[] = ["#d3cbab", "#cbc199", "#c1b587", "#b5a771", "#a6975e"];

/** The contours' own ink: burnt sienna, not the sheet's slate (#138). */
export const STAFF_CONTOUR = "#8d6b43";

/** The graticule's ink: slate, laid under the units and over everything else the ground draws (#138). */
export const STAFF_GRID = "#4c5157";

/** Shallow water and reef: one tone darker than the open sea, which is what a sheet prints instead of a stipple (#138). */
export const STAFF_SHALLOW = "#93a9b6";

export const STAFF_PALETTE: Palette = {
  ink: "#2f3134",
  paper: "#ded7c2",
  water: "#b3c4cb",
  land: "#d9d2b8",
  letterbox: "#c8c1ab",
  panel: "rgba(222,215,194,0.94)",
  coast: "#7b8a93",
  // A printed sheet's sea is flat colour: the mottle is an engraver's texture,
  // and this view has none anywhere.
  stipple: undefined,
  // The sienna line is laid harder than the plate's ink, because it is a
  // lighter colour on a ground that already carries steps of tone (#138).
  relief: { contour: 0.45, index: 0.8, numeral: 0.95, ramp: STAFF_RAMP },
  sides: ["#9c3327", "#1f4f7a", "#3f6b32", "#7a5320", "#5f3f72", "#256762"],
};

/**
 * The pens the staff map's `moves` hand draws with. Two of the four values a
 * `Pen` carries reach it — the **width**, which is the outline weight of the
 * tapered polygon, and the **head size**, which is the head's own half-width —
 * and the **dash never does**: a taper is a filled polygon, and a dash along a
 * shaft whose width varies is not a thing an operations sheet draws (#139).
 * `pens` is unchanged as a value type; this view simply reads less of it.
 */
export const STAFF_PENS: Pens = {
  track: { width: 1.2, dash: [], head: "open", headSize: 8 },
  intent: { width: 1.5, dash: [], head: "open", headSize: 17 },
  detachment: { width: 1, dash: [], head: "filled", headSize: 20 },
};
