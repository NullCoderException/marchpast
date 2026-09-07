/**
 * How wide the plate is, as one global rule (#86). A narrow screen collapses
 * the plate's furniture, the caption band and the labels together — one
 * threshold on the plate's width, read by every pass that has to answer to it,
 * so there is no per-view rule and no small-screen floor below which the site
 * refuses to draw.
 *
 * The plate itself never shrinks with the screen: it keeps its extent and
 * letterboxes, and a glyph stays the plate constant it is on every screen
 * (ADR-0016). What collapses is the furniture around the picture, the band
 * beneath it, and how many words a label may spend.
 *
 * Three answers, three functions, all pure: which mode a width is in, what
 * furniture that mode draws, and which step of the collapse order its labels
 * start at.
 */

/** The two widths the app is drawn at. */
export type LayoutMode = "desktop" | "phone";

/** The phone floor's step in the collapse order (`content.ts`'s ladder). */
const PHONE_FLOOR = 3;

/**
 * The widest plate that still collapses, in CSS pixels. Chosen to sit above
 * every phone in portrait — 390 is the Phone board's own width, 430 the widest
 * handset — and below every tablet in portrait, the narrowest of which is 600.
 * `player.css` and `library.css` carry the same number in their media queries,
 * copied rather than published, as they already copy the plate's colours.
 */
export const PHONE_MAX_WIDTH = 560;

/** The mode a plate of this CSS width is drawn in. */
export function layoutMode(width: number): LayoutMode {
  return width <= PHONE_MAX_WIDTH ? "phone" : "desktop";
}

/** Which furniture a mode draws, and in what form (#58, #86). */
export interface FurnitureSet {
  /** The whole rose, or the north arrow with the wind sentence beside it. */
  compass: "rose" | "arrow";
  /** The battle's title on the plate. A phone gives it to the band's date line instead. */
  title: boolean;
  /** Every row, or the one-line strip of the sides with the rest in Details. */
  legend: "full" | "sides";
  /** The map's credit line on the plate. A phone gives it to Details. */
  credit: boolean;
  /** True in both modes: the one piece that answers how big the ground is, which nothing else says. */
  scaleBar: boolean;
}

const SETS: Readonly<Record<LayoutMode, FurnitureSet>> = {
  desktop: { compass: "rose", title: true, legend: "full", credit: true, scaleBar: true },
  phone: { compass: "arrow", title: false, legend: "sides", credit: false, scaleBar: true },
};

/** The furniture this mode draws. */
export function furnitureFor(mode: LayoutMode): FurnitureSet {
  return SETS[mode];
}

/**
 * The step of the collapse order this mode's labels start at (`content.ts`).
 * A desktop starts at the top with the full label; a phone starts at the
 * **phone floor** — the short name with its state word — and collapses onward
 * from there (#39).
 */
export function labelFloor(mode: LayoutMode): number {
  return mode === "phone" ? PHONE_FLOOR : 0;
}
