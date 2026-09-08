/**
 * The staff map's type: Archivo at wdth 75, the ramp #139 set against the
 * canvas, **no italic anywhere**, the elbow leader, and the chooser's caret —
 * a filed triangle where the engraved views cut a two-stroke chevron
 * (ADR-0021, ADR-0030, #139).
 *
 * The roles, their rank and the name/fact distinction are the anatomy's; the
 * face, the sizes and the **device** are the view's. The engraved plate tells a
 * name from a fact by slope, 14 px italic against 12 px upright. This view has
 * no italic at all: it tells them apart by **weight, case and tracking**, the
 * way a printed sheet sets a designation against a note, which is why it costs
 * one weight axis and not a second file (`fonts/staff.ts`).
 *
 * **Where each half of that device lands.** The eight roles carry it wherever
 * this view sets a run itself — the title, the legend, the scale, the credit —
 * and `naming` carries it to every named point on the ground. The unit label's
 * two lines are drawn by the shared label pass at the anatomy's own box
 * constants (`labels/content.ts`), and they carry it through `run`, which
 * answers a whole `Setting` rather than a face for exactly this reason: a name
 * reaches the plate at 600 in tracked capitals in the side ink, over a fact at
 * 400 as it is written. The ramp's own `unitName` and `stateWord` **sizes** are
 * the canvas's, and are what the conformance test ranks.
 */
import { staffFont } from "../../../fonts/staff.ts";
import type { LayoutMode } from "../../layout.ts";
import type { LeaderRequest, Setting, Type, TypeRole, Voice } from "../../view.ts";

/** The weight a name is set at, and the weight a fact is. */
const NAME_WEIGHT = 600;
const FACT_WEIGHT = 400;

/** How one role is set: the size in each mode, the weight, the tracking, and whether the words are capitalised. */
interface Row {
  desktop: number;
  phone: number;
  weight: number;
  tracking: number;
  caps: boolean;
}

/**
 * The staff ramp, all eight roles in the anatomy's rank of size (#139). The
 * phone sizes are this view's own collapse of it: the clock and the band come
 * down, the label's two lines stay at the plate constants they share with
 * every view (ADR-0016).
 */
const RAMP: Readonly<Record<TypeRole, Row>> = {
  clock: { desktop: 30, phone: 21, weight: 500, tracking: 0, caps: false },
  title: { desktop: 19, phone: 12, weight: 600, tracking: 1.5, caps: true },
  caption: { desktop: 15, phone: 13, weight: 400, tracking: 0, caps: false },
  unitName: { desktop: 12.5, phone: 12.5, weight: NAME_WEIGHT, tracking: 0.9, caps: true },
  stateWord: { desktop: 12, phone: 12, weight: FACT_WEIGHT, tracking: 0, caps: false },
  legendLine: { desktop: 11.5, phone: 10, weight: 400, tracking: 0.7, caps: true },
  scaleCaption: { desktop: 11, phone: 10, weight: 500, tracking: 0.8, caps: true },
  credit: { desktop: 10, phone: 10, weight: 400, tracking: 0.7, caps: true },
};

/** The elbow leader: how far it runs out of the text before it squares off, its weight, and the tick it ends on. */
const LEADER_WIDTH = 1;
const LEADER_ALPHA = 0.85;
const LEADER_TICK = 4.5;
const LEADER_TICK_WIDTH = 1.5;

/** The caret's box, which is the width `player.css` reserves beside a chooser's value (ADR-0030). */
const CARET = { width: 9, height: 6 } as const;

const asWritten = (words: string): string => words;
const asCaps = (words: string): string => words.toUpperCase();

/** The staff face at a size in one of the two weights. Exported: the ground and the furniture set runs this ramp does not name. */
export function font(sizePx: number, weight: number = FACT_WEIGHT): string {
  return staffFont(sizePx, weight);
}

export const staffType: Type = {
  face: "staff",

  role(role: TypeRole, mode: LayoutMode): Setting {
    const { desktop, phone, weight, tracking, caps } = RAMP[role];
    const size = mode === "phone" ? phone : desktop;
    return { font: font(size, weight), size, tracking: `${tracking}px`, spell: caps ? asCaps : asWritten };
  },

  /**
   * The label's two lines and the card's: the size the anatomy fixes, and this
   * view's whole device on top of it — the name at 600 in tracked capitals,
   * the fact at 400 as it is written.
   */
  run(sizePx: number, voice: Voice): Setting {
    const name = voice === "name";
    return {
      font: font(sizePx, name ? NAME_WEIGHT : FACT_WEIGHT),
      size: sizePx,
      tracking: name ? `${RAMP.unitName.tracking}px` : `${RAMP.stateWord.tracking}px`,
      spell: name ? asCaps : asWritten,
    };
  },

  /**
   * The operations-map annotation leader: a run out from the label's near edge,
   * square down to the unit, ending in a tick **across** it — never the plate's
   * hairline to a dot, which is an engraver's mark (#139).
   *
   * The elbow turns under the unit's own x, so the last leg drops on to the
   * glyph the way a sheet's annotation does; a label directly above or below
   * its unit draws the same path with a zero-length first leg, which is a
   * straight drop and still right.
   */
  leader(ctx: CanvasRenderingContext2D, { from, anchor, palette }: LeaderRequest): void {
    ctx.save();
    ctx.strokeStyle = palette.ink;
    ctx.globalAlpha = LEADER_ALPHA;
    ctx.lineWidth = LEADER_WIDTH;
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(anchor.x, from.y);
    ctx.lineTo(anchor.x, anchor.y);
    ctx.stroke();
    ctx.lineWidth = LEADER_TICK_WIDTH;
    ctx.beginPath();
    ctx.moveTo(anchor.x - LEADER_TICK, anchor.y);
    ctx.lineTo(anchor.x + LEADER_TICK, anchor.y);
    ctx.stroke();
    ctx.restore();
  },

  /** A filed triangle: the solid mark a printed sheet fills where the plate opens two strokes (ADR-0030). */
  caret(ink: string): string {
    const { width, height } = CARET;
    return dataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<path d="M0 0.6 L${width} 0.6 L${width / 2} ${height} Z" fill="${ink}"/>` +
        `</svg>`,
    );
  },
};

/** An SVG as a URI a stylesheet can name. Encoded whole: a palette's ink carries a `#`, which unescaped ends the URI at the fragment. */
function dataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
