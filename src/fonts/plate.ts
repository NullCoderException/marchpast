/**
 * The plate typeface: IM Fell English (Igino Marini, SIL Open Font License 1.1,
 * see OFL.txt beside the font). Bundled so the app works offline. Which faces
 * are fetched and when is `faces.ts`, which loads this one for every engraved
 * view (ADR-0021).
 */
export const PLATE_FONT_FAMILY = "IM Fell English";

/** The face and what a browser falls back to, as a CSS `font-family` list: what the surface sets the strip in (ADR-0023). */
export const PLATE_FONT_STACK = `"${PLATE_FONT_FAMILY}", Georgia, serif`;

/** A CSS font shorthand in the plate face, e.g. `plateFont(24)`. */
export function plateFont(sizePx: number): string {
  return `${sizePx}px ${PLATE_FONT_STACK}`;
}
