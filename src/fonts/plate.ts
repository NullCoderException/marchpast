/**
 * The plate typeface: IM Fell English (Igino Marini, SIL Open Font License 1.1,
 * see OFL.txt beside the font). Bundled so the app works offline, and loaded
 * before the first frame because Canvas text falls back silently to whatever
 * font is available if the face is not ready yet (ADR-0009).
 */
import fontUrl from "./IMFellEnglish-Regular.woff2";

export const PLATE_FONT_FAMILY = "IM Fell English";

let loading: Promise<void> | undefined;

/** Loads the plate typeface and registers it with the document. Idempotent. */
export function loadPlateFont(): Promise<void> {
  loading ??= (async () => {
    const face = new FontFace(PLATE_FONT_FAMILY, `url(${fontUrl}) format("woff2")`);
    await face.load();
    document.fonts.add(face);
  })();
  return loading;
}

/** A CSS font shorthand in the plate face, e.g. `plateFont(24)` or `plateFont(15, "italic")`. */
export function plateFont(sizePx: number, style: "normal" | "italic" = "normal"): string {
  return `${style} ${sizePx}px "${PLATE_FONT_FAMILY}", Georgia, serif`;
}
