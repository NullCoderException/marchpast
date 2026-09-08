/**
 * The staff map's typeface: Archivo (Omnibus-Type, SIL Open Font License 1.1,
 * see OFL-Archivo.txt beside the font), pinned at **wdth 75** and carrying the
 * **weight axis from 400 to 600** — one `.woff2` for the whole ramp, because
 * the view sets no italic at all and tells a name from a fact by weight, case
 * and tracking rather than by a second file (#139, #175).
 *
 * Pinning the width rather than varying it is what keeps that one file small:
 * a face that carried both axes would ship every width the view never sets.
 * The weight range has to be declared on the `FontFace` as well as lie in the
 * file — a `FontFace` with no `weight` descriptor is a 400 face, and a browser
 * asked for 600 would synthesise a bold off it rather than instance the axis
 * (`faces.ts`).
 *
 * **Tabular figures are frozen in.** The sheet sets its clock, its grid
 * numerals and its heights on one width, and a proportional `1` in a clock
 * redrawn every frame shifts the whole line under it. Canvas 2D can name a
 * family, a size and a weight and no font feature at all, so `tnum` cannot be
 * asked for at the draw site: the file is built with the tabular figures
 * already substituted into the character map, and every numeral this view sets
 * is one.
 */
export const STAFF_FONT_FAMILY = "Archivo SemiCondensed";

/** The face and what a browser falls back to, as a CSS `font-family` list: what the surface sets the strip in (ADR-0023). */
export const STAFF_FONT_STACK = `"${STAFF_FONT_FAMILY}", "Helvetica Neue", Arial, sans-serif`;

/** The weight range the one file carries, as a `FontFace` descriptor spells it. */
export const STAFF_FONT_WEIGHTS = "400 600";

/** A CSS font shorthand in the staff face at a weight, e.g. `staffFont(19, 600)`. */
export function staffFont(sizePx: number, weight: number): string {
  return `${weight} ${sizePx}px ${STAFF_FONT_STACK}`;
}
