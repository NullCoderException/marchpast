/**
 * The views there are: the three v0.2 views decided in #58, each one a palette,
 * a set of pens and a glyph over the shared passes. Adding a fourth view is
 * adding a value to this file — and, only if it draws a unit differently, one
 * glyph module.
 */
import { block } from "./glyphs/block.ts";
import { ticks } from "./glyphs/ticks.ts";
import type { Pens, View } from "./view.ts";

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
    land: "#e3d3ac",
    letterbox: "#d9c8a2",
    panel: "rgba(239,227,198,0.92)",
    coast: "#2b2418",
    stipple: "rgba(120,90,40,0.06)",
    relief: { contour: 0.32, index: 0.62, numeral: 0.75, band: undefined },
    sides: ["#8f2f24", "#24406b", "#3e5a2a", "#6b4a1e", "#5a3a6b", "#2f5f5a"],
  },
  pens: PLATE_PENS,
  glyph: ticks,
};

/** The plate inverted: parchment ink on an indigo ground, the side inks lifted to read on it. */
export const NIGHT_PLATE: View = {
  id: "night",
  name: "Night plate",
  palette: {
    ink: "#efe3c6",
    paper: "#1b2430",
    land: "#2a3340",
    letterbox: "#111820",
    panel: "rgba(27,36,48,0.92)",
    coast: "#a9b6c6",
    stipple: "rgba(239,227,198,0.05)",
    relief: { contour: 0.22, index: 0.5, numeral: 0.65, band: undefined },
    sides: ["#e2685a", "#86a9e8", "#8fc08a", "#d3a765", "#b892d8", "#79c4bd"],
  },
  pens: PLATE_PENS,
  glyph: ticks,
};

/** Units as blocks, strength as the filled fraction, engaged as a hatched zone, arrows thickened. */
export const ATLAS: View = {
  id: "atlas",
  name: "Atlas",
  palette: {
    ...CHART_PLATE.palette,
    stipple: undefined,
    // The one view that lays height as tone: a wash is quiet under blocks, and darkens the ground the side inks sit on anywhere else (#62).
    relief: { contour: 0.22, index: 0.45, numeral: 0.65, band: 0.075 },
  },
  pens: ATLAS_PENS,
  glyph: block,
};

/** Every view, in the order the View chooser offers them. The first is the default. */
export const VIEWS: readonly View[] = [CHART_PLATE, NIGHT_PLATE, ATLAS];

/** What a visit opens on, and what the notice is painted in before there is any player state (#47). */
export const DEFAULT_VIEW: View = CHART_PLATE;

/** The view an id names, or the default when the id is one no view carries. */
export function viewById(id: string | null | undefined): View {
  return VIEWS.find((view) => view.id === id) ?? DEFAULT_VIEW;
}
