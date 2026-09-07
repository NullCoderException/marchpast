/**
 * The engraved aesthetic's one ink helper: a colour at an alpha. Every
 * treatment the engraved views lay in — the coastline's inward shading, the
 * contour weights, Atlas's tint bands, the shoal's stipple — is the palette's
 * own ink or coast at some fraction, which is what keeps them one hand under
 * three palettes (#62).
 *
 * It came out of `anatomy.ts` with `font()` when that file stopped being the
 * engraved system (ADR-0021), and sits beside `type.ts` rather than inside it
 * because it is ink and not type.
 */

/** A hex colour at an alpha. */
export function atAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
