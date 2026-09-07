/**
 * The four candidate marks for #135, each drawn once in a 64x64 box so the same
 * geometry can be set at 16, 32, 64 and 512 and judged at every one of them.
 *
 * Every value is the engraved system's (#58, src/render/views.ts): ink #2b2418
 * on parchment #efe3c6, the plate's doubled rule, the open head of the intent
 * pen, the ticks a unit is drawn with. Nothing here invents a colour.
 */

export const INK = "#2b2418";
export const PARCHMENT = "#efe3c6";
export const LAND = "#e3d3ac";
export const RULE = "rgba(43,36,24,0.55)";
export const HAIR = "rgba(43,36,24,0.2)";
export const RED = "#8f2f24";
export const BLUE = "#24406b";
export const SERIF = '"IM Fell English", Georgia, "Times New Roman", serif';

/**
 * A · The Review. The name's own reading, in the plate's own signs: a rank of
 * unit ticks on a baseline files past the doubled rule, one tick already over.
 */
function review(ink) {
  // The rule is thin and tall, the ticks thick and short: without that contrast
  // the seven verticals read as one picket fence rather than a rank and a stand.
  return `
    <line x1="5" y1="50" x2="59" y2="50" stroke="${ink}" stroke-width="1.6"/>
    <line x1="11" y1="28" x2="11" y2="50" stroke="${ink}" stroke-width="3.6"/>
    <line x1="19.5" y1="28" x2="19.5" y2="50" stroke="${ink}" stroke-width="3.6"/>
    <line x1="28" y1="28" x2="28" y2="50" stroke="${ink}" stroke-width="3.6"/>
    <line x1="37.5" y1="5" x2="37.5" y2="58" stroke="${ink}" stroke-width="1.6"/>
    <line x1="42.5" y1="5" x2="42.5" y2="58" stroke="${ink}" stroke-width="1.6"/>
    <line x1="52" y1="28" x2="52" y2="50" stroke="${ink}" stroke-width="3.6"/>`;
}

/** A at 16: two ticks, one tick over, and the rule as a single bar — a 5px double rule cannot survive here. */
function reviewSmall(ink) {
  return `
    <line x1="1.5" y1="12.6" x2="14.5" y2="12.6" stroke="${ink}" stroke-width="1"/>
    <line x1="3.2" y1="7.4" x2="3.2" y2="12.6" stroke="${ink}" stroke-width="1.4"/>
    <line x1="5.6" y1="7.4" x2="5.6" y2="12.6" stroke="${ink}" stroke-width="1.4"/>
    <line x1="9.4" y1="2.6" x2="9.4" y2="14.2" stroke="${ink}" stroke-width="1.8"/>
    <line x1="13.2" y1="7.4" x2="13.2" y2="12.6" stroke="${ink}" stroke-width="1.4"/>`;
}

/** B · The Cartouche. The plate's title panel, doubled rule and all, holding an M. */
function cartouche(ink) {
  return `
    <rect x="3.2" y="3.2" width="57.6" height="57.6" rx="9" fill="none" stroke="${ink}" stroke-width="2.4"/>
    <rect x="8.4" y="8.4" width="47.2" height="47.2" rx="5" fill="none" stroke="${ink}" stroke-width="1.1"/>
    <text x="32" y="45.5" text-anchor="middle" font-family='${SERIF}' font-size="37" fill="${ink}">M</text>`;
}

/** C · The Arrow. The intent pen of ADR-0009, dashed with an open head, sweeping past the rule. */
function arrow(ink, { dashed = true } = {}) {
  // The rule sits mid-span, where the curve actually crosses it: put it at the
  // left edge and the mark reads as a pennant on a pole, not a sweep past a mark.
  return `
    <line x1="30" y1="6" x2="30" y2="58" stroke="${ink}" stroke-width="2"/>
    <line x1="35.5" y1="6" x2="35.5" y2="58" stroke="${ink}" stroke-width="2"/>
    <path d="M6 52 C 22 50, 38 42, 54 18" fill="none" stroke="${ink}" stroke-width="3.2"
          stroke-linecap="round"${dashed ? ' stroke-dasharray="7 5"' : ""}/>
    <path d="M44.1 22.8 L54 18 L52.4 28.9" fill="none" stroke="${ink}" stroke-width="3.2"
          stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** C at 16: one rule, and the dash gone — below about 32 a [7,5] dash is a smudge. */
function arrowSmall(ink) {
  return `
    <line x1="7" y1="2" x2="7" y2="14" stroke="${ink}" stroke-width="1.8"/>
    <path d="M2 12.5 C 5.5 12, 9.5 10.5, 13.5 4.5" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M10.5 6 L13.5 4.5 L13.3 7.9" fill="none" stroke="${ink}" stroke-width="1.6"
          stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** D · The Rose. The chart's compass, the one piece of furniture north-up guarantees. */
function rose(ink) {
  const cardinal = `<path d="M32 2 L36.5 27.5 L62 32 L36.5 36.5 L32 62 L27.5 36.5 L2 32 L27.5 27.5 Z" fill="${ink}"/>`;
  return `
    <circle cx="32" cy="32" r="27" fill="none" stroke="${ink}" stroke-width="1.2"/>
    <path d="M45.2 18.8 L36.5 32 L45.2 45.2 L32 36.5 L18.8 45.2 L27.5 32 L18.8 18.8 L32 27.5 Z"
          fill="none" stroke="${ink}" stroke-width="1.1"/>
    ${cardinal}`;
}

/** D at 16: the cardinal star alone, and fattened — the 64px waist is a hairline down here. */
function roseSmall(ink) {
  return `<path d="M8 0.8 L9.7 6.3 L15.2 8 L9.7 9.7 L8 15.2 L6.3 9.7 L0.8 8 L6.3 6.3 Z" fill="${ink}"/>`;
}

/** The four directions, each with the axis it explores and the case for and against it. */
export const MARKS = [
  {
    key: "A",
    name: "The Review",
    axis: "The parade",
    concept:
      "A rank of unit ticks on its baseline files past the plate's doubled rule. The rule is the reviewing stand and the playhead at once; one tick has already gone by.",
    forIt:
      "Drawn from the app's own signs — the tick a unit is, the rule the plate is bordered with — so the mark and the plate are one hand. It is the only direction that draws what the word means, and what playback is.",
    against:
      "Abstract without the wordmark beside it: a stranger sees strokes, not a parade. Dies if scaled to 16 and has to be redrawn there (shown below).",
    draw: review,
    small: reviewSmall,
  },
  {
    key: "B",
    name: "The Cartouche",
    axis: "The document",
    concept:
      "The plate's own title panel — doubled rule, rounded corner — with an M set in IM Fell English, the one face the system allows.",
    forIt:
      "Legible at every size without a redraw, and unmistakably a printed document. Cheapest to make and to maintain; the face is already bundled.",
    against:
      "A letter in a box is the most generic form a mark takes, and it says nothing about battles, maps or playback. Leans the whole brand on the word, which ADR-0020 says teaches nobody anything.",
    draw: cartouche,
    small: cartouche,
  },
  {
    key: "C",
    name: "The Arrow",
    axis: "The battle map",
    concept:
      "The intent pen of ADR-0009 — dashed, open-headed — sweeping past a fixed doubled rule. The documentary arrow, which is the thing the product actually draws.",
    forIt:
      "Says 'map with arrows' in one glance, which is the concept's own bar, and still carries 'past'. The most legible of the four at a distance.",
    against:
      "An arrow is the category's most-used mark; it will sit beside a hundred others. The dash is lost below about 32, so the small sizes are a different drawing.",
    draw: arrow,
    small: arrowSmall,
  },
  {
    key: "D",
    name: "The Rose",
    axis: "The chart",
    concept:
      "The compass rose reduced to its two stars, cardinal filled and diagonal outlined, inside the plate's circle. North up is an invariant of every view.",
    forIt:
      "The most recognisable object on any chart, and it survives 16px on the filled star alone. Ready-made furniture: the plate already draws one, top-left.",
    against:
      "Least ownable of the four — every map product on earth has a compass — and it is the piece of the plate that says 'map' rather than 'battle' or 'playback'.",
    draw: rose,
    small: roseSmall,
  },
];

/** An SVG of one mark at a size, on whatever ground the caller wants. */
export function markSvg(mark, size, { ink = INK, small = false, ground = null } = {}) {
  const body = small ? mark.small(ink) : mark.draw(ink);
  const box = small && mark.key !== "B" ? "0 0 16 16" : "0 0 64 64";
  const bg = ground ? `<rect x="0" y="0" width="100%" height="100%" fill="${ground}"/>` : "";
  return `<svg width="${size}" height="${size}" viewBox="${box}" xmlns="http://www.w3.org/2000/svg" style="display: block;">${bg}${body}</svg>`;
}
