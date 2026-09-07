/**
 * The engraved views' type: IM Fell English, the ramp the three engraved views
 * share, the **slope** as the device that tells a name from a fact, the
 * label's leader — a hairline to a dot on the glyph's centre (#58) — and the
 * chooser's caret, a two-stroke chevron (ADR-0030).
 *
 * ADR-0021 fixes the eight roles and their rank and leaves the face, the sizes
 * and the device to the view; #139 widened the hand to the marks that set a
 * name against a thing, which is what the leader and the caret both are. The
 * rank holds on a desktop; a phone thins the band and the furniture
 * (`layout.ts`, #86) and leaves the glyph and its label at their plate
 * constants (ADR-0016), so the label's two lines end up larger than the
 * caption's — which is the collapse working, not the ramp breaking.
 *
 * "No bold" is a rule of *this* aesthetic and not an invariant (ADR-0021), and
 * it is why the ramp below moves in size and slope alone.
 */
import { plateFont } from "../../../fonts/plate.ts";
import { DETAIL_SIZE, NAME_SIZE } from "../../labels/content.ts";
import type { LayoutMode } from "../../layout.ts";
import type { LeaderRequest, Setting, Type, TypeRole, Voice } from "../../view.ts";

/** The plate face at a size, upright or italic. The bundled face is upright; the browser slants it. */
export function font(sizePx: number, italic = false): string {
  return italic ? `italic ${plateFont(sizePx)}` : plateFont(sizePx);
}

/**
 * The engraved ramp: the size each role is set at, and whether it is sloped.
 * The unit's two lines take the label's own box constants, because the box is
 * the anatomy's and this view sets its type to fill it (`labels/content.ts`).
 */
const RAMP: Readonly<Record<TypeRole, { desktop: number; phone: number; italic: boolean }>> = {
  clock: { desktop: 26, phone: 20, italic: false },
  // A phone gives the title to the band's date line, which is set at that size (#86).
  title: { desktop: 22, phone: 12, italic: false },
  caption: { desktop: 15, phone: 13, italic: false },
  unitName: { desktop: NAME_SIZE, phone: NAME_SIZE, italic: true },
  stateWord: { desktop: DETAIL_SIZE, phone: DETAIL_SIZE, italic: false },
  legendLine: { desktop: 12, phone: 10, italic: true },
  scaleCaption: { desktop: 12, phone: 10, italic: true },
  credit: { desktop: 11, phone: 11, italic: true },
};

/** The leader's weight, and the dot it ends on at the glyph's centre: 1.6px across, twice the line (#58). */
const LEADER_WIDTH = 0.8;
const LEADER_DOT = 0.8;

/**
 * The caret: two strokes meeting at a point, round-capped, in a box the width
 * `player.css` reserves beside a chooser's value. Drawn rather than typed, so
 * it is the plate's own chevron at every zoom and in every browser.
 */
const CARET = { width: 9, height: 6, weight: 1.1 } as const;

/** Nothing in the engraved system is tracked but a work's name, which its ground hand sets itself. */
const NO_TRACKING = "0px";

/** The words unchanged: this aesthetic carries the name/fact distinction in the slope, never in the case. */
const asWritten = (words: string): string => words;

export const engravedType: Type = {
  face: "plate",

  role(role: TypeRole, mode: LayoutMode): Setting {
    const { desktop, phone, italic } = RAMP[role];
    const size = mode === "phone" ? phone : desktop;
    return { font: font(size, italic), size, tracking: NO_TRACKING, spell: asWritten };
  },

  font(sizePx: number, voice: Voice): string {
    return font(sizePx, voice === "name");
  },

  /** A hairline from the label's near edge to the glyph's centre, ending on a dot there (#58). */
  leader(ctx: CanvasRenderingContext2D, { from, anchor, palette }: LeaderRequest): void {
    ctx.save();
    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = palette.ink;
    ctx.lineWidth = LEADER_WIDTH;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(anchor.x, anchor.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, LEADER_DOT, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /** A two-stroke chevron, the same open hand the plate's arrow heads are drawn with (ADR-0030). */
  caret(ink: string): string {
    const { width, height, weight } = CARET;
    return dataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<path d="M0.6 0.6 L4.5 5 L8.4 0.6" fill="none" stroke="${ink}" stroke-width="${weight}" stroke-linecap="round"/>` +
        `</svg>`,
    );
  },
};

/** An SVG as a URI a stylesheet can name. Encoded whole: a palette's ink carries a `#`, which unescaped ends the URI at the fragment. */
function dataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
