/**
 * One ink helper: a colour at an alpha.
 *
 * Every treatment a view lays in at less than full strength is some colour at
 * some fraction — the engraved coastline's inward shading, the contour
 * weights, Atlas's tint bands, the shoal's stipple, the staff map's graticule
 * and its sienna contours — so this is arithmetic on a colour and not an
 * aesthetic's own hand.
 *
 * It was `views/engraved/ink.ts`, "the engraved aesthetic's one ink helper",
 * which was true while every view was engraved. The staff map is not, and it
 * lays ink at an alpha exactly as the other three do (#175), so the helper
 * comes up one level rather than being copied into a second folder.
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
