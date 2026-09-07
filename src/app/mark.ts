/**
 * The mark: A · The Review, chosen for #135 on 7 September 2026. A rank of
 * unit ticks on its baseline files past the plate's doubled rule, and one tick
 * has already gone by — the rule is the stand the column marches past and the
 * playhead the phases run under at once, which is the whole of the idea.
 *
 * Every stroke is the engraved system's (#58): the tick a unit is drawn with,
 * the rule the plate is bordered with, one ink and no second. The contrast is
 * load-bearing — the rule thin and tall against ticks thick and short — so the
 * seven verticals read as a rank and a stand rather than as a picket fence.
 * The mark is never set in a side ink, never in two inks, never boxed, rounded
 * or badged by us, and never stretched or re-proportioned.
 *
 * This is the full cut, for about 24 and up. Below that the doubled rule
 * cannot stay doubled — the gap falls under a pixel — so a small cut spends it
 * as one heavier bar and drops the rank from three ticks to two, keeping the
 * tick that has passed, which is the only stroke the idea cannot lose. That
 * drawing is `public/favicon.svg`; the icon files beside it were exported from
 * the same two cuts, whose source is `prototypes/brand/marks.mjs` on the
 * `prototype/brand` branch.
 */

/** The box every value below is measured in: 64 units, whatever the mark is set at. */
const BOX = 64;

/**
 * The four parts of the drawing, in the order they are laid down: the baseline
 * the rank marches on, the rank itself, the tick that has passed, and the
 * doubled rule it has passed. Drawn in `currentColor`, so the mark takes the
 * ink of whatever sets it and there is no second place to change it.
 */
const STROKES = [
  '<line x1="5" y1="50" x2="59" y2="50" stroke-width="1.6"/>',
  '<line x1="11" y1="28" x2="11" y2="50" stroke-width="3.6"/>',
  '<line x1="19.5" y1="28" x2="19.5" y2="50" stroke-width="3.6"/>',
  '<line x1="28" y1="28" x2="28" y2="50" stroke-width="3.6"/>',
  '<line x1="52" y1="28" x2="52" y2="50" stroke-width="3.6"/>',
  '<line x1="37.5" y1="5" x2="37.5" y2="58" stroke-width="1.6"/>',
  '<line x1="42.5" y1="5" x2="42.5" y2="58" stroke-width="1.6"/>',
].join("");

/**
 * The mark at `size`, as the SVG to set it with. It carries no title and no
 * role: wherever it is set the name is set beside it, so to a screen reader it
 * is decoration.
 */
export function markSvg(size: number): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 ${BOX} ${BOX}" xmlns="http://www.w3.org/2000/svg"` +
    ` fill="none" stroke="currentColor">${STROKES}</svg>`
  );
}
