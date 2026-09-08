/**
 * The views there are: the three v0.2 views decided in #58 and the staff map
 * #139 drew, each one a palette, a set of pens and the five hands ADR-0021
 * settled.
 *
 * The first three are the **engraved** aesthetic, so all three name hands out
 * of `views/engraved/`. That sharing is by value and never by inheritance: each
 * names the plate's glyph or its own, the plate's type, furniture and moves,
 * and an engraved ground built round **its own relief treatment** — the plate's
 * contours weighted by level, the night plate's lit from the north-west,
 * Atlas's hypsometric ramp. #138 found that no treatment survives the move
 * from one view to the next, so the ground is three hands round one frame, and
 * neither of the two new ones costs anything outside this file and its own
 * module.
 *
 * The **staff map** is the second aesthetic, and it is what the seam was cut
 * for: a printed twentieth-century operations sheet on the unchanged anatomy.
 * It shares nothing below this file — its own face, its own five hands, its own
 * folder — and adding it cost a value here, an id, and `views/staff/`
 * (ADR-0021, #175).
 */
import { block } from "./glyphs/block.ts";
import { ticks } from "./glyphs/ticks.ts";
import type { Pens, View } from "./view.ts";
import { engravedFurniture } from "./views/engraved/furniture.ts";
import { engravedGround, weightedContours } from "./views/engraved/ground.ts";
import { ATLAS_RAMP, hypsometricRamp } from "./views/engraved/groundAtlas.ts";
import { illuminatedContours } from "./views/engraved/groundNight.ts";
import { engravedMoves } from "./views/engraved/moves.ts";
import { ATLAS_RAMPART, ENGRAVED_RAMPART } from "./views/engraved/rampart.ts";
import { engravedType } from "./views/engraved/type.ts";
import { staffFurniture } from "./views/staff/furniture.ts";
import { frame } from "./views/staff/glyph.ts";
import { staffGround } from "./views/staff/ground.ts";
import { staffMoves } from "./views/staff/moves.ts";
import { STAFF_PALETTE, STAFF_PENS } from "./views/staff/palette.ts";
import { staffType } from "./views/staff/type.ts";

/** The plate's pens: fine dotted track, dashed intent, solid detachment (ADR-0009, #58). */
const PLATE_PENS: Pens = {
  track: { width: 1.2, dash: [0.1, 4], head: "open", headSize: 7 },
  intent: { width: 1.2, dash: [8, 5], head: "open", headSize: 9 },
  detachment: { width: 1.8, dash: [], head: "filled", headSize: 11 },
};

/** Atlas thickens all three, and not by one factor: mass and motion at a glance (#58). */
const ATLAS_PENS: Pens = {
  track: { width: 1.6, dash: [0.1, 4], head: "open", headSize: 7 },
  intent: { width: 2.4, dash: [8, 5], head: "open", headSize: 9 },
  detachment: { width: 3.2, dash: [], head: "filled", headSize: 14 },
};

/** The default view: the engraved chart plate of ADR-0009, with the Billow engaged treatment. */
export const CHART_PLATE: View = {
  id: "plate",
  name: "Chart plate",
  palette: {
    ink: "#2b2418",
    paper: "#efe3c6",
    // An engraved chart's sea is the paper it is printed on, so the two are one
    // value here; the staff map is the first view they part company in (#175).
    water: "#efe3c6",
    land: "#e3d3ac",
    letterbox: "#d9c8a2",
    panel: "rgba(239,227,198,0.92)",
    coast: "#2b2418",
    stipple: "rgba(120,90,40,0.06)",
    relief: { contour: 0.32, index: 0.62, numeral: 0.75, ramp: undefined },
    sides: ["#8f2f24", "#24406b", "#3e5a2a", "#6b4a1e", "#5a3a6b", "#2f5f5a"],
  },
  pens: PLATE_PENS,
  glyph: ticks,
  type: engravedType,
  ground: engravedGround(weightedContours, ENGRAVED_RAMPART),
  furniture: engravedFurniture,
  moves: engravedMoves,
};

/** The plate inverted: parchment ink on an indigo ground, the side inks lifted to read on it. */
export const NIGHT_PLATE: View = {
  id: "night",
  name: "Night plate",
  palette: {
    ink: "#efe3c6",
    paper: "#1b2430",
    water: "#1b2430",
    land: "#2a3340",
    letterbox: "#111820",
    panel: "rgba(27,36,48,0.92)",
    coast: "#a9b6c6",
    stipple: "rgba(239,227,198,0.05)",
    relief: { contour: 0.22, index: 0.5, numeral: 0.65, ramp: undefined },
    sides: ["#e2685a", "#86a9e8", "#8fc08a", "#d3a765", "#b892d8", "#79c4bd"],
  },
  pens: PLATE_PENS,
  glyph: ticks,
  type: engravedType,
  // Its own ground: the same rings lit from one light low in the north-west,
  // so the hill is modelled by the lines and nothing is washed over the paper
  // (#138). It keeps the plate's engraved rampart, as a siege plan cuts one.
  ground: engravedGround(illuminatedContours, ENGRAVED_RAMPART),
  furniture: engravedFurniture,
  moves: engravedMoves,
};

/** Units as blocks, strength as the filled fraction, engaged as a hatched zone, arrows thickened. */
export const ATLAS: View = {
  id: "atlas",
  name: "Atlas",
  palette: {
    ...CHART_PLATE.palette,
    stipple: undefined,
    // The one view that lays height as tone, and since #138 as a hue rather
    // than a density: five colours off `#e6d9b4 → #c0a066`, under index
    // contours faint enough to stay quiet beneath the blocks. Atlas lays no
    // fine weight at all over its ramp, so `contour` goes unread here; it is
    // still answered for, because a view answers for every value there is.
    relief: { contour: 0.22, index: 0.32, numeral: 0.65, ramp: ATLAS_RAMP },
  },
  pens: ATLAS_PENS,
  glyph: block,
  type: engravedType,
  ground: engravedGround(hypsometricRamp, ATLAS_RAMPART),
  furniture: engravedFurniture,
  moves: engravedMoves,
};

/**
 * The fourth view and the second aesthetic: a printed operations sheet, in
 * Archivo at wdth 75, with the frame-to-frontage glyph, the `ops` ground and
 * its kilometre graticule, the block scale bar and the tapered arrows (#139).
 * Every hand is its own, which is what ADR-0021 predicted a second aesthetic
 * would cost and the whole of what it did cost.
 */
export const STAFF_MAP: View = {
  id: "staff",
  name: "Staff map",
  palette: STAFF_PALETTE,
  pens: STAFF_PENS,
  glyph: frame,
  type: staffType,
  ground: staffGround,
  furniture: staffFurniture,
  moves: staffMoves,
};

/** Every view, in the order the View chooser offers them. The first is the default. */
export const VIEWS: readonly View[] = [CHART_PLATE, NIGHT_PLATE, ATLAS, STAFF_MAP];

/** What a visit opens on, and what the notice is painted in before there is any player state (#47). */
export const DEFAULT_VIEW: View = CHART_PLATE;

/** The view an id names, or the default when the id is one no view carries. */
export function viewById(id: string | null | undefined): View {
  return VIEWS.find((view) => view.id === id) ?? DEFAULT_VIEW;
}
