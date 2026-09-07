/**
 * Builds the design canvas for #151, the library's chronology rail. Run
 * `node build.mjs` from this directory; it writes the .dc.html artboards and
 * canvas.json beside itself, and the seed helper takes them from here.
 *
 * Every value the page already has is read out of src/app/library.css and the
 * brand prototype (#135) rather than chosen here; what this drawing decides is
 * the gutter, the rail, the node, the interval line, the still box and the
 * measure. The stills are real renders of the seven battles (stills.mjs), the
 * three unbuilt ones from throwaway sketch files (sketches.mjs).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entries = JSON.parse(readFileSync(join(here, "entries.json"), "utf8"));

/* ---------------------------------------------------- the engraved system */

const INK = "#2b2418";
const PARCHMENT = "#efe3c6";
const SUNK = "#e3d3ac";
const RULE = "rgba(43,36,24,0.55)";
const HAIR = "rgba(43,36,24,0.2)";
const RAIL = "rgba(43,36,24,0.3)";
const QUIET = "rgba(43,36,24,0.72)";
const SERIF = '"IM Fell English", Georgia, "Times New Roman", serif';
/** The plate's side inks in roster order (src/render/views.ts, CHART_PLATE). */
const SIDE_INKS = ["#8f2f24", "#24406b", "#3e5a2a", "#6b4a1e", "#5a3a6b", "#2f5f5a"];
/** A measuring annotation's ink: never a side ink, which belongs to the sides of a battle (#58). */
const MEASURE_INK = "#8f2f24";

/** The mark, A · The Review, at its 64-box geometry (prototypes/brand/marks.mjs). */
const MARK = `<svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="display: block;">
    <line x1="5" y1="50" x2="59" y2="50" stroke="${INK}" stroke-width="1.6"/>
    <line x1="11" y1="28" x2="11" y2="50" stroke="${INK}" stroke-width="3.6"/>
    <line x1="19.5" y1="28" x2="19.5" y2="50" stroke="${INK}" stroke-width="3.6"/>
    <line x1="28" y1="28" x2="28" y2="50" stroke="${INK}" stroke-width="3.6"/>
    <line x1="37.5" y1="5" x2="37.5" y2="58" stroke="${INK}" stroke-width="1.6"/>
    <line x1="42.5" y1="5" x2="42.5" y2="58" stroke="${INK}" stroke-width="1.6"/>
    <line x1="52" y1="28" x2="52" y2="50" stroke="${INK}" stroke-width="3.6"/></svg>`;

const IDEA = "Famous battles, played back on the map — phase by phase, from the sources up.";
const STORY = "How it is made, and where the battles come from →";
const CREDIT = "Marchpast on GitHub. Battle files CC BY 4.0; each map file carries its own licence.";

/* --------------------------------------------------------- the two widths */

/** The still box's height in CSS pixels, which ADR-0025 handed this ticket to set. See StillBox.dc.html. */
const STILL_BOX = 760;

/** Desktop: the measure widened from 46rem to 52rem to hold rail, still and text. */
const D = {
  measure: 832,
  padX: 24,
  gutter: 48,
  railX: 22,
  still: [288, Math.round((288 * STILL_BOX) / 1200)],
  gap: 24,
  cardPadY: 20,
  cardPadX: 12,
  node: [13, 3],
  title: 22,
  aside: 13,
  summary: 15,
  interval: 13,
  intervalGap: 18,
};
D.content = D.measure - D.padX * 2;
D.listContent = D.content - D.gutter;
D.text = D.listContent - D.still[0] - D.gap;

/** A phone at the Phone board's own width. The rail survives, narrower; the still goes above the text. */
const P = {
  measure: 390,
  padX: 16,
  gutter: 26,
  railX: 12,
  gap: 12,
  cardPadY: 16,
  cardPadX: 8,
  node: [9, 2.5],
  title: 20,
  aside: 12,
  summary: 14,
  interval: 12,
  intervalGap: 14,
};
P.content = P.measure - P.padX * 2;
P.listContent = P.content - P.gutter;
P.still = [P.listContent, Math.round((P.listContent * STILL_BOX) / 1200)];

/* ------------------------------------------------- the intervals, in words */

/** ADR-0022's own table. Whole elapsed years, floored, thousands separated, and the word *later*. */
const INTERVALS = {
  alesia: "164 years later",
  nile: "1,849 years later",
  copenhagen: "2 years later",
  trafalgar: "4 years later",
  "little-bighorn": "70 years later",
  midway: "65 years later",
};

/* ------------------------------------------------------------ the shell */

/** The .dc.html shell: the head line the editor replaces, the face, and the page's own ground. */
function page(body, { width, ground = PARCHMENT, pad = "0" } = {}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&amp;display=swap" rel="stylesheet">
  <style>
    body { margin: 0; font-family: ${SERIF}; color: ${INK}; background: ${ground}; }
    a { color: ${MEASURE_INK}; } a:hover { color: ${INK}; }
    svg text { font-family: ${SERIF}; }
    code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.88em; }
  </style>
</helmet>
<div style="width: ${width}px; padding: ${pad}; box-sizing: border-box; background: ${ground};">
${body}
</div>
</x-dc>
</body>
</html>
`;
}

/** A sheet's heading: the title and the one italic line that says what is being judged. */
function head(title, line) {
  return `  <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 26px;">
    <div style="font-size: 30px;">${title}</div>
    <div style="font-size: 15px; font-style: italic; line-height: 1.45; max-width: 60ch;">${line}</div>
  </div>`;
}

/** A section head, at the plate's 20px. */
const section = (title) => `<div style="font-size: 20px; margin: 30px 0 12px;">${title}</div>`;

/** A caption under a specimen: what it is, and what it costs. */
const caption = (text, { align = "left", width = null } = {}) =>
  `<div style="font-size: 11px; font-style: italic; color: ${QUIET}; line-height: 1.45; text-align: ${align};${width ? ` max-width: ${width}px;` : ""}">${text}</div>`;

/** A measuring mark: the one place a number is written on the drawing, in the measuring ink. */
const dim = (text) => `<span style="font-size: 10px; font-style: normal; color: ${MEASURE_INK}; letter-spacing: 0.04em;">${text}</span>`;

/* ------------------------------------------------------------- the library */

/** The masthead, at the brand's own values (#135): the mark, the name, the idea line, the story link. */
function masthead(w, { small = false } = {}) {
  const markSize = small ? 30 : 40;
  const mark = MARK.replace('width="40" height="40"', `width="${markSize}" height="${markSize}"`);
  return `<header style="padding-bottom: 16px; border-bottom: 3px double ${RULE};">
      <div style="display: flex; align-items: flex-end; gap: ${small ? 11 : 14}px;">
        <div style="margin-bottom: -3px; line-height: 0;">${mark}</div>
        <div style="font-size: ${small ? 24 : 30}px; line-height: 1.15; letter-spacing: 0.02em;">Marchpast</div>
      </div>
      <div style="margin: 10px 0 0; font-size: ${small ? 14 : 15}px; font-style: italic; line-height: 1.45;">${IDEA}</div>
      <div style="margin: 8px 0 0; font-size: 13px; font-style: italic;"><a href="#" style="color: ${INK};">${STORY}</a></div>
    </header>`;
}

/** The sides, in roster order and in the plate's side inks: the one fact that answers "who fought" without reading the summary. */
function sides(entry, size, { inked = true } = {}) {
  const parts = entry.sides.map(
    (side, i) => `<span style="color: ${inked ? SIDE_INKS[i] ?? INK : INK};">${side}</span>`,
  );
  return `<span style="display: block; margin-top: 3px; font-size: ${size}px;">${parts.join(`<span style="color: ${HAIR};"> · </span>`)}</span>`;
}

/**
 * One entry. The rail and its node hang off the link, so the run between two
 * cards is exactly where the interval line sits and the rail is broken by it
 * without any arithmetic.
 */
function entry(item, m, { first, last, phone = false, node = "tick", inked = true, stillSrc = null, still = true, stillRight = false } = {}) {
  const aLeft = m.gutter - m.cardPadX;
  const railLeft = m.railX - aLeft;
  const [nodeW, nodeH] = m.node;
  const nodeLeft = railLeft + 0.5 - nodeW / 2;
  const nodeTop = m.cardPadY - nodeH / 2;
  const railHeight = last ? `height: ${m.cardPadY}px;` : "bottom: 0;";

  const nodes = {
    tick: `<span style="position: absolute; left: ${nodeLeft}px; top: ${nodeTop}px; width: ${nodeW}px; height: ${nodeH}px; background: ${INK};"></span>`,
    ring: `<span style="position: absolute; left: ${railLeft - 3.5}px; top: ${m.cardPadY - 4}px; width: 8px; height: 8px; border: 1px solid ${INK}; border-radius: 50%; background: ${PARCHMENT}; box-sizing: border-box;"></span>`,
    lozenge: `<span style="position: absolute; left: ${railLeft - 3}px; top: ${m.cardPadY - 3.5}px; width: 7px; height: 7px; background: ${INK}; transform: rotate(45deg);"></span>`,
    none: "",
  };

  const image = still
    ? `<img src="${stillSrc ?? `${item.name}.jpg`}" alt="" style="display: block; width: ${m.still[0]}px; height: ${m.still[1]}px; object-fit: cover;">`
    : "";
  const text = `<div style="min-width: 0;">
          <span style="display: block; font-size: ${m.title}px; line-height: 1.2;">${item.title}</span>
          <span style="display: block; margin-top: 2px; font-size: ${m.aside}px; font-style: italic;">${item.date}</span>
          ${sides(item, m.aside, { inked })}
          <span style="display: block; margin-top: 8px; font-size: ${m.summary}px; line-height: 1.45;">${item.summary}</span>
        </div>`;

  const body = phone
    ? `<div style="display: flex; flex-direction: column; gap: ${m.gap}px;">${image}${text}</div>`
    : still
      ? `<div style="display: flex; gap: ${m.gap}px; align-items: flex-start;">${stillRight ? `${text}${image}` : `${image}${text}`}</div>`
      : text;

  const interval = first
    ? ""
    : `<div style="margin: ${m.intervalGap}px 0 ${m.intervalGap}px ${m.railX - m.gutter}px; font-size: ${m.interval}px; font-style: italic; color: ${QUIET}; line-height: 1.2;">${INTERVALS[item.name]}</div>`;

  return `<li style="padding-left: ${m.gutter}px;">
      ${interval}
      <div style="position: relative; padding: ${m.cardPadY}px ${m.cardPadX}px; margin: 0 -${m.cardPadX}px;">
        <span style="position: absolute; left: ${railLeft}px; top: 0; ${railHeight} width: 1px; background: ${RAIL};"></span>
        ${nodes[node]}
        ${body}
      </div>
    </li>`;
}

/** The whole list, seven entries oldest first. */
function list(m, options = {}) {
  const items = options.only ? entries.filter((e) => options.only.includes(e.name)) : entries;
  return `<ol style="margin: 0; padding: 0; list-style: none;">
    ${items
      .map((item, i) =>
        entry(item, m, {
          ...options,
          first: options.first ?? i === 0,
          last: options.last ?? i === items.length - 1,
        }),
      )
      .join("\n    ")}
  </ol>`;
}

/** The credit line, which the rail stops well above. */
const credit = () =>
  `<footer style="margin-top: 34px; padding-top: 20px; border-top: 1px solid ${RULE}; font-size: 11px; font-style: italic;"><a href="#" style="color: ${INK};">Marchpast on GitHub</a>. Battle files CC BY 4.0; each map file carries its own licence.</footer>`;

/** The library as a page, at one of the two widths. */
function library(m, options = {}) {
  return `<div style="width: ${m.measure}px; margin: 0 auto; padding: ${m.padX === 24 ? 56 : 32}px ${m.padX}px 40px; box-sizing: border-box;">
    ${masthead(m, { small: m.padX !== 24 })}
    ${list(m, options)}
    ${credit()}
  </div>`;
}

/* ============================================================== artboards */

const MAIN_W = 1024;
writeFileSync(
  join(here, "Main.dc.html"),
  page(library(D), { width: MAIN_W }),
);

writeFileSync(
  join(here, "Phone.dc.html"),
  page(library(P, { phone: true }), { width: P.measure }),
);

/* --------------------------------------------------------------- anatomy */

/**
 * The gutter at twice size, as one drawing. SVG rather than positioned divs so
 * every leader lands where it is aimed.
 */
function anatomy() {
  const label = (x, y, text, { anchor = "start", size = 12, italic = false } = {}) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${MEASURE_INK}"${italic ? ' font-style="italic"' : ""} letter-spacing="0.03">${text}</text>`;
  const leader = (x1, y, x2) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${MEASURE_INK}" stroke-width="0.6" stroke-dasharray="2 3"/>`;
  return `<svg width="820" height="398" viewBox="0 -14 820 398" xmlns="http://www.w3.org/2000/svg" style="display: block;">
    <rect x="0" y="20" width="96" height="300" fill="${SUNK}"/>
    <line x1="45" y1="20" x2="45" y2="98" stroke="${RAIL}" stroke-width="2"/>
    <text x="45" y="130" font-size="26" font-style="italic" fill="${QUIET}">1,849 years later</text>
    <line x1="45" y1="150" x2="45" y2="320" stroke="${RAIL}" stroke-width="2"/>
    <rect x="33" y="187" width="26" height="6" fill="${INK}"/>
    <line x1="96" y1="150" x2="96" y2="320" stroke="${HAIR}" stroke-width="1" stroke-dasharray="4 4"/>
    <rect x="110" y="190" width="120" height="80" fill="none" stroke="${HAIR}" stroke-width="1"/>
    <text x="170" y="234" text-anchor="middle" font-size="12" font-style="italic" fill="${QUIET}">the still</text>
    <text x="248" y="200" font-size="20" fill="${INK}">The Battle of the Nile</text>
    <text x="248" y="222" font-size="13" font-style="italic" fill="${INK}">1 August 1798</text>
    ${leader(49, 60, 500)}
    ${label(506, 64, "the rail · 1px · ink at 30% · hangs from the masthead's rule")}
    ${leader(268, 124, 500)}
    ${label(506, 128, "the interval · 13px italic · ink at 72% · starts on the rail,")}
    ${label(506, 144, "which breaks for it")}
    ${leader(63, 190, 500)}
    ${label(506, 194, "the node · 13 × 3 · full ink · level with the top edge")}
    ${label(506, 210, "of the still, which is where it is at both widths")}
    ${leader(100, 300, 500)}
    ${label(506, 304, "the card, bleeding 12px back into the gutter on hover")}
    <line x1="0" y1="340" x2="96" y2="340" stroke="${MEASURE_INK}" stroke-width="0.6"/>
    <line x1="0" y1="336" x2="0" y2="344" stroke="${MEASURE_INK}" stroke-width="0.6"/>
    <line x1="96" y1="336" x2="96" y2="344" stroke="${MEASURE_INK}" stroke-width="0.6"/>
    ${label(48, 358, "gutter 48", { anchor: "middle" })}
    <line x1="0" y1="10" x2="45" y2="10" stroke="${MEASURE_INK}" stroke-width="0.6"/>
    <line x1="45" y1="6" x2="45" y2="14" stroke="${MEASURE_INK}" stroke-width="0.6"/>
    ${label(22, 6, "22", { anchor: "middle" })}
    ${label(700, 366, "drawn at twice size", { anchor: "end", italic: true })}
  </svg>`;
}

const anatomyBody = `${head("The rail, drawn out", "The gutter at twice size. Nothing here is new material: the rail is the mark's own rule stood upright, and the node is the mark's tick — thin and pale against thick and dark, which is the contrast #135 found the mark only reads at.")}
${anatomy()}
${section("What it is made of")}
<div style="display: flex; gap: 40px; flex-wrap: wrap; max-width: 900px;">
  <div style="max-width: 260px;">${caption("<b style=\"font-weight: normal; font-style: normal;\">The rail.</b> One line, 1px, ink at 30%. Single, never doubled: the page has one doubled rule and it is the masthead's horizon. The rail hangs from that horizon and stops dead at the last node — it does not run on past Midway, because the library is not claiming there is more below.")}</div>
  <div style="max-width: 260px;">${caption("<b style=\"font-weight: normal; font-style: normal;\">The node.</b> A bar 13 × 3 in full ink, crossing the rail: short and thick against thin and pale, the mark's own proportion. Not a dot — a dot on a line is a bullet, and this is a tick on a stand. It sits level with the top edge of the still, which is the one line that is in the same place on the desktop and on a phone.")}</div>
  <div style="max-width: 260px;">${caption("<b style=\"font-weight: normal; font-style: normal;\">The interval.</b> 13px italic at 72% ink, starting <i>on</i> the rail and reading right, in the run between two cards. The rail breaks for it. Same size as the date, one step quieter, because it is a fact about the shelf rather than about a battle.")}</div>
</div>
${section("The measure")}
<div style="max-width: 760px; font-size: 15px; line-height: 1.5;">
  The library's 46rem holds text alone. Rail, still and text want <b style="font-weight: normal;">52rem — 832px</b>: 24 padding, a 48 gutter, a 288 still, a 24 gap and 424 of text, which is 58 characters of the summary at 15px and inside the measure the old 46rem gave it (about 60). Widening past 56rem gives the summary a line too long to track back; narrowing to 48rem takes the still under 240 and the text under 55 characters at once.
</div>
<div style="margin-top: 18px; display: flex; align-items: stretch; height: 44px; width: ${D.content}px; font-size: 10px; color: ${MEASURE_INK}; letter-spacing: 0.04em;">
  <div style="width: ${D.gutter}px; border: 1px solid ${MEASURE_INK}; border-right: 0; display: flex; align-items: center; justify-content: center;">48</div>
  <div style="width: ${D.still[0]}px; border: 1px solid ${MEASURE_INK}; border-right: 0; display: flex; align-items: center; justify-content: center;">still 288 × 151</div>
  <div style="width: ${D.gap}px; border: 1px solid ${MEASURE_INK}; border-right: 0; display: flex; align-items: center; justify-content: center;">24</div>
  <div style="flex: 1; border: 1px solid ${MEASURE_INK}; display: flex; align-items: center; justify-content: center;">text ${D.text}</div>
</div>
${caption(`784px of content inside a 832px measure. Today's page is 736 inside 46rem, so the whole page grows by 96px and the masthead grows with it.`, { width: 600 })}
${section("What the rail replaces")}
<div style="max-width: 760px; font-size: 15px; line-height: 1.5;">
  The 1px hairline between entries goes. It ran the full measure, so it would cross the rail; and with an interval line and a still edge already separating two entries, a third separator is one too many. The hover ground (<code>--st-sunk</code>) still gives a card its extent, and it is what the reader is actually choosing.
</div>`;

writeFileSync(join(here, "Anatomy.dc.html"), page(anatomyBody, { width: 1000, pad: "36px 40px" }));

/* ------------------------------------------------------------- intervals */

/** One interval specimen on a scrap of rail, so it is judged where it lives. */
function specimen(text, { size = D.interval } = {}) {
  return `<div style="position: relative; width: 300px; height: 96px;">
    <span style="position: absolute; left: 0; top: 0; width: 1px; height: 30px; background: ${RAIL};"></span>
    <span style="position: absolute; left: 0; top: 66px; width: 1px; height: 30px; background: ${RAIL};"></span>
    <div style="position: absolute; left: 0; top: 40px; font-size: ${size}px; font-style: italic; color: ${QUIET}; line-height: 1.2;">${text}</div>
  </div>`;
}

const intervalsBody = `${head("The interval line", "Six intervals and the two rules ADR-0022 wrote for cases the library does not hold yet. The question the ADR left is how <i>1,849 years later</i> and <i>2 years later</i> read as the same kind of thing when one is six times the width of the other.")}
${section("The answer is that neither is drawn to length")}
<div style="display: flex; flex-wrap: wrap; gap: 8px 40px;">
  ${["164 years later", "1,849 years later", "2 years later", "4 years later", "70 years later", "65 years later", "later the same year", "8 months later"].map((t) => specimen(t)).join("\n  ")}
</div>
${caption("Every one of them starts at the same x — on the rail — and sits in a break of the same height. The rail's run between two nodes is the same length whatever the number says, so the width of the words is just words. That is the whole of what makes the ordinal rail honest: it never pretends 1,849 is longer than 2, it says so.", { width: 760 })}
${section("Against the alternative, which is to draw the gap")}
<div style="display: flex; gap: 44px; align-items: flex-start; flex-wrap: wrap;">
  <div>
    <div style="position: relative; width: 300px; height: 210px;">
      <span style="position: absolute; left: 0; top: 0; width: 1px; height: 210px; background: ${RAIL};"></span>
      ${[0, 44, 92, 140, 188].map((y, i) => `<span style="position: absolute; left: -6px; top: ${y}px; width: 13px; height: 3px; background: ${INK};"></span><div style="position: absolute; left: 22px; top: ${y - 5}px; font-size: 13px;">${["Alesia", "the Nile", "Copenhagen", "Trafalgar", "the Little Bighorn"][i]}</div>`).join("")}
    </div>
    ${caption("Ordinal, as decided: equal runs, the gap written.", { width: 300 })}
  </div>
  <div>
    <div style="position: relative; width: 300px; height: 210px;">
      <span style="position: absolute; left: 0; top: 0; width: 1px; height: 210px; background: ${RAIL};"></span>
      <span style="position: absolute; left: -6px; top: 0; width: 13px; height: 3px; background: ${INK};"></span>
      <div style="position: absolute; left: 22px; top: -5px; font-size: 13px;">Alesia</div>
      ${[200, 200.2, 200.6, 208].map(() => "").join("")}
      <span style="position: absolute; left: -6px; top: 200px; width: 13px; height: 3px; background: ${INK};"></span>
      <div style="position: absolute; left: 22px; top: 195px; font-size: 13px;">the Nile · Copenhagen · Trafalgar</div>
      <div style="position: absolute; left: 22px; top: 90px; font-size: 11px; font-style: italic; color: ${MEASURE_INK};">7,400px of nothing, at 8px to the year</div>
    </div>
    ${caption("To scale, at the smallest spacing that separates the Nile from Copenhagen. Nelson's three still land inside one card's height and the void is twenty screens. ADR-0022 rejected it on these numbers; drawn, it is worse than the numbers sound.", { width: 300 })}
  </div>
</div>
${section("Two things the words must not become")}
<div style="display: flex; gap: 44px; flex-wrap: wrap;">
  <div style="max-width: 300px;">
    <div style="font-size: 13px; font-style: italic; color: ${QUIET};">1,849 <span style="font-style: normal;">YEARS LATER</span></div>
    ${caption("Not small capitals. The plate spends capitals on the phase label and on a work's name; a third use on the front door makes the interval an object rather than an aside.", { width: 300 })}
  </div>
  <div style="max-width: 300px;">
    <div style="font-size: 13px; font-style: italic; color: ${QUIET}; text-align: center; width: 300px;">1,849 years later</div>
    ${caption("Not centred in the measure. Centred, the words drift away from the rail and read as a heading over the entry below — which is the grouping ADR-0022 refused, reintroduced as typography.", { width: 300 })}
  </div>
</div>`;

writeFileSync(join(here, "Intervals.dc.html"), page(intervalsBody, { width: 1000, pad: "36px 40px" }));

/* ------------------------------------------------------ directions: nodes */

/**
 * One direction's gutter at real size, against three ghosted cards at the
 * rhythm the desktop page actually has: card 222 (a 182 still and 40 of
 * padding), interval run 52. Repeating the whole card four times buries the
 * one thing being compared.
 */
function nodeGutter(kind) {
  const cards = [0, 274, 548];
  const ghost = cards
    .map((y) => `<rect x="30" y="${y}" width="190" height="${y === 548 ? 92 : 222}" fill="${SUNK}"/>`)
    .join("");
  const last = kind === "none" ? 640 : 568;
  const rail = [
    [0, 234],
    [262, 508],
    [536, last],
  ]
    .map(([a, b]) => `<line x1="22.5" y1="${a}" x2="22.5" y2="${b}" stroke="${RAIL}" stroke-width="1"/>`)
    .join("");
  const nodes = {
    tick: cards.map((y) => `<rect x="16" y="${y + 18.5}" width="13" height="3" fill="${INK}"/>`).join(""),
    ring: cards.map((y) => `<circle cx="22.5" cy="${y + 20}" r="3.5" fill="${PARCHMENT}" stroke="${INK}" stroke-width="1"/>`).join(""),
    lozenge: cards.map((y) => `<rect x="19" y="${y + 16.5}" width="7" height="7" fill="${INK}" transform="rotate(45 22.5 ${y + 20})"/>`).join(""),
    none: "",
  };
  const words = ["164 years later", "1,849 years later"]
    .map((t, i) => `<text x="22" y="${[248, 522][i]}" font-size="13" font-style="italic" fill="${QUIET}">${t}</text>`)
    .join("");
  return `<svg width="220" height="640" viewBox="0 0 220 640" xmlns="http://www.w3.org/2000/svg" style="display: block;">
    ${ghost}${rail}${nodes[kind]}${words}
  </svg>`;
}

function nodeColumn(title, kind, note) {
  return `<div style="width: 220px;">
    <div style="font-size: 17px; margin-bottom: 12px; min-height: 46px;">${title}</div>
    ${nodeGutter(kind)}
    <div style="margin-top: 12px;">${caption(note)}</div>
  </div>`;
}

const nodesBody = `${head("Four nodes", "The gutter at real size against three ghosted cards at the page's own rhythm — card 222, interval run 52. Only what marks a battle on the line changes. The third card is the last in the library in all four, so the end of the rail is being judged too.")}
<div style="display: flex; gap: 24px; align-items: flex-start;">
  ${nodeColumn("A · The tick<br><span style=\"font-size: 13px; font-style: italic;\">the drawing's choice</span>", "tick", "The mark's own tick: thick and short across a rule that is thin and pale, which is the contrast #135 found the mark only reads at. It is the one node already in the brand, and it gives the rail an unambiguous end — the last tick. Against it: a short bar reads very slightly as a tick mark, and therefore as a checklist.")}
  ${nodeColumn("B · The ring", "ring", "A small open circle knocked out of the rail: the timeline convention, and the most obviously a node. Against it: it is the one shape here the engraved system does not already draw — every circle in the app is a compass rose or a glyph — and a ring on a line reads as a chart axis, which invites the scale the rail does not have.")}
  ${nodeColumn("C · The lozenge", "lozenge", "A filled diamond. Sharper than the ring and nearer the plate's hand. Against it: at 7px it is a smudge rather than a shape, and it is decorative in a way neither of the others is — nothing anywhere in the app is a diamond.")}
  ${nodeColumn("D · No node", "none", "The rail, broken only by the intervals. Quietest, and it makes the interval the only event on the line. Against it: the rail stops saying anything per battle — nothing marks where Trafalgar is — and with no last node there is nothing for the rail to stop at, so it has to run on past the last card and claim a library that keeps going.")}
</div>
${section("The one that is not a node question")}
<div style="max-width: 900px; font-size: 15px; line-height: 1.5;">
  All four keep the interval where it is: starting on the rail, in the run between two cards, with the rail broken for it. That placement is on <i>The interval line</i>; what is being chosen here is only the mark.
</div>`;

writeFileSync(join(here, "Nodes.dc.html"), page(nodesBody, { width: 1080, pad: "36px 40px" }));

/* -------------------------------------------------- directions: the still */

function stillRow(name, label, note) {
  const heights = [
    ["630", `${name}-630.jpg`, 151, "ADR-0025's starting number"],
    ["760", `${name}.jpg`, 182, "the drawing's choice"],
    ["900", `${name}-900.jpg`, 216, ""],
  ];
  return `<div style="margin-bottom: 34px;">
    <div style="font-size: 17px; margin-bottom: 10px;">${label}</div>
    <div style="display: flex; gap: 26px; align-items: flex-start;">
      ${heights
        .map(
          ([h, src, height, note]) => `<div style="width: ${D.still[0]}px;">
        <img src="${src}" alt="" style="display: block; width: ${D.still[0]}px; height: ${height}px;">
        <div style="margin-top: 6px;">${caption(`the box at ${h} · 288 × ${height}${note ? ` · ${note}` : ""}`, { align: "center" })}</div>
      </div>`,
        )
        .join("\n      ")}
    </div>
    <div style="margin-top: 10px;">${caption(note, { width: 940 })}</div>
  </div>`;
}

const stillBody = `${head("The still box", "ADR-0025 fixed everything about the still but its height, and handed that here: <i>“The plate box's height is #151's to set against its drawing, starting from 630.”</i> The width is 1200 CSS px at DPR 0.5 and is not in question. Three heights, three extents — a landscape one, a portrait one and one that is nearly all sea.")}
${stillRow("trafalgar", "Trafalgar · a landscape extent", "71.7 by 62.3 km, an aspect of 1.15 — squarer than the box at any of the three heights, so the plate is <i>height</i>-fitted and the letterbox falls on the flanks. Raising the box raises the map with it: at 900 the coast, the two columns and Cadiz are all half again the size they are at 630, in the same 288px of card width.")}
${stillRow("alesia", "Alesia · a portrait extent, 8.9 by 12.0 km", "The extreme case at 0.74 — taller than it is wide. At 630 the whole siege is a strip down the middle of the card with two thirds of the picture empty; at 900 the ground reaches the frame. The real Alesia file will have this shape, because 8.9 by 12.0 km is what the two lines enclose.")}
${stillRow("midway", "Midway · four hundred miles of open sea", "0.97, and a picture that is mostly empty ocean whatever the box does. Midway is the case that says the box height is not the only thing at stake: a still can be sparse and still be the right picture, and the card must read when the still gives it almost nothing.")}
${section("The seven extents, and why 630 is the wrong shape")}
<div style="max-width: 900px; font-size: 15px; line-height: 1.5; margin-bottom: 16px;">
  A 1200 &times; 630 box is <b style="font-weight: normal;">1.90 : 1</b>. Not one of the seven extents is that wide:
</div>
<table style="border-collapse: collapse; font-size: 14px; margin-bottom: 14px;">
  <tbody>
  ${[["Alesia", "8.9 × 12.0 km", "0.74"], ["the Little Bighorn", "10.5 × 13.4 km", "0.79"], ["Midway", "430 × 445 km", "0.97"], ["Trafalgar", "71.7 × 62.3 km", "1.15"], ["Copenhagen", "31.4 × 24.5 km", "1.28"], ["Cannae", "20.9 × 14.5 km", "1.44"], ["the Nile", "52.3 × 32.3 km", "1.62"]]
    .map(([n, size, a]) => `<tr><td style="padding: 3px 22px 3px 0;">${n}</td><td style="padding: 3px 22px 3px 0; font-style: italic;">${size}</td><td style="padding: 3px 0; text-align: right;">${a}</td></tr>`)
    .join("")}
  </tbody>
</table>
<div style="max-width: 900px; font-size: 15px; line-height: 1.5;">
  So every battle in the library is <b style="font-weight: normal;">height</b>-fitted in a 630 box, and the width the box does not use is letterbox on the flanks. Raising the box raises the drawn map one for one — the glyph stays the plate constant it is on every screen (ADR-0016), but the ground under it grows — right up to the point where the box gets wider than the extent, after which the extra height is genuinely wasted.
</div>
${section("What the drawing takes")}
<div style="max-width: 900px; font-size: 15px; line-height: 1.5;">
  <b style="font-weight: normal;">760, up from ADR-0025's 630.</b> Some flank letterbox is unavoidable — no box holds 0.74 and 1.62 at once — so the number to find is the one where every battle is still <i>gaining</i>. Take the plate rect inside the 20px margin: at 760 it is 1160 &times; 720, an aspect of <b style="font-weight: normal;">1.61</b>, and the widest extent the library holds is the Nile's 1.62. So 760 is the last height at which every one of the seven is height-fitted and every extra pixel of box goes straight into the drawn map, one for one. Below it, all seven are losing picture to nothing. Above it the Nile has reached its full width and starts paying letterbox at the top and foot instead, Cannae follows it at about 830, and by 900 the still (216px) plainly governs a card whose text is about 150.
  <br><br>
  It costs <b style="font-weight: normal;">31px per card</b> — 288 &times; 182 rather than 288 &times; 151 — which is 217px down a page of seven. The still is then a little taller than the text beside it rather than a little shorter, which is the one thing to look at on the desktop artboard before this is settled.
  <br><br>
  The number is <b style="font-weight: normal;">not</b> "the widest extent, forever": it is where the widest extent <i>we have</i> sits, and a future battle wider than 1.58 would be letterboxed on its flanks like any plate in the player. That is the ordinary condition of a fixed frame, not a reason to keep re-cutting the box.
</div>`;

writeFileSync(join(here, "StillBox.dc.html"), page(stillBody, { width: 1010, pad: "36px 40px" }));

/* ------------------------------------------------ directions: the layouts */

const layoutsBody = `${head("Three columns, and the two ways out of them", "ADR-0022 allowed the measure to widen and named the fallback: <i>“If three columns cannot be made to work at any sane measure, the still moves to the right of the text and the rail keeps the gutter.”</i> They can, at 52rem. Both alternatives are drawn against it.")}
${section("A · Rail, still, text at 52rem — the drawing's choice")}
<div style="width: ${D.content}px;">${list(D, { only: ["nile", "copenhagen"], first: false, last: false })}</div>
${caption("The title is the first thing on the line after the rail's node, and the picture is what the eye lands on. 424px of text is 58 characters, inside the measure the summary already had.", { width: 760 })}
${section("B · Rail, text, still — the fallback, at today's 46rem")}
<div style="width: 688px;">${list({ ...D, measure: 736, content: 688, listContent: 640, still: [240, Math.round((240 * STILL_BOX) / 1200)], text: 376 }, { only: ["nile", "copenhagen"], first: false, last: false, stillRight: true })}</div>
${caption("Keeps the page narrow. Against it: the reading order becomes title, date, sides, summary, <i>then</i> a picture, so the picture is a footnote to the entry rather than the entry's face; and the ragged right edge of seven summaries puts seven differently-placed stills down the right of the page, which the rail's regular left edge then has to fight. Only if three columns had failed.", { width: 760 })}
${section("C · Rail and text, no still — today's page with the rail alone")}
<div style="width: 688px;">${list({ ...D, measure: 736, content: 688, listContent: 640, text: 640 }, { only: ["nile", "copenhagen"], first: false, last: false, still: false })}</div>
${caption("Worth drawing because it is what ships if the still machinery slips: the rail is independent of ADR-0025 and costs nothing but the page's own arithmetic. It reads perfectly well. It is also the version that makes the front door a list of essays, which is the argument ADR-0025 already had.", { width: 760 })}
${section("The sides, inked or not")}
<div style="display: flex; gap: 40px; align-items: flex-start;">
  <div style="width: 320px;">
    <div style="font-size: 22px; line-height: 1.2;">The Battle of Trafalgar</div>
    <div style="margin-top: 2px; font-size: 13px; font-style: italic;">21 October 1805</div>
    ${sides(entries.find((e) => e.name === "trafalgar"), 13, { inked: true })}
    <div style="margin-top: 10px;">${caption("Inked, in roster order — the same two inks the still beside it is drawn in, so the card teaches the ink before the battle is opened. A side ink on the sides of a battle is exactly what #58 reserved it for.", { width: 320 })}</div>
  </div>
  <div style="width: 320px;">
    <div style="font-size: 22px; line-height: 1.2;">The Battle of Trafalgar</div>
    <div style="margin-top: 2px; font-size: 13px; font-style: italic;">21 October 1805</div>
    ${sides(entries.find((e) => e.name === "trafalgar"), 13, { inked: false })}
    <div style="margin-top: 10px;">${caption("In ink. Quieter, and it keeps colour on the front door to the stills alone. Against it: two side names in one ink read as a single phrase rather than as two sides, and the one fact the line exists to give is who fought whom.", { width: 320 })}</div>
  </div>
</div>`;

writeFileSync(join(here, "Layouts.dc.html"), page(layoutsBody, { width: 900, pad: "36px 40px" }));

/* ------------------------------------------------------------ canvas.json */

const canvas = {
  pages: [
    { id: "page-1", name: "The library" },
    { id: "page-2", name: "Directions" },
  ],
  artboards: [
    { file: "Main.dc.html", x: 0, y: 0, w: MAIN_W, h: 2140, title: "The library · desktop, 52rem", page: "page-1" },
    { file: "Phone.dc.html", x: 1140, y: 0, w: P.measure, h: 4260, title: "The library · phone, 390", page: "page-1" },
    { file: "Anatomy.dc.html", x: 1650, y: 0, w: 1000, h: 1180, title: "The rail, drawn out", page: "page-1" },
    { file: "Intervals.dc.html", x: 1650, y: 1320, w: 1000, h: 1240, title: "The interval line", page: "page-1" },
    { file: "Nodes.dc.html", x: 0, y: 0, w: 1080, h: 1200, title: "Four nodes", page: "page-2" },
    { file: "StillBox.dc.html", x: 1200, y: 0, w: 1010, h: 1980, title: "The still box · 630, 760, 900", page: "page-2" },
    { file: "Layouts.dc.html", x: 2330, y: 0, w: 900, h: 2100, title: "Three columns, and the ways out", page: "page-2" },
  ],
  annotations: [
    {
      id: "brief",
      x: 0,
      y: -330,
      w: 1024,
      page: "page-1",
      text: "THE LIBRARY'S CHRONOLOGY RAIL · issue #151 on the v0.3 map (#121).\nADR-0022 settled what the rail is and what it says: flat list, oldest first, no grouping; a line in a gutter left of the cards, a bare node per battle, and the elapsed interval written in the run between two of them, ordinal and never to scale. This canvas is the drawing it deferred — gutter, weight, node, the interval line's setting, the measure, and the card beside it.\nEvery still is a real render of the marked phase through the app's own renderer (ADR-0025, the recipe #126 measured). The four battles the library holds are their real files; Alesia, the Little Bighorn and Midway are throwaway sketch files written for this drawing, so their positions are eyeballed, not authored.",
    },
    {
      id: "decisions",
      x: 1650,
      y: 2700,
      w: 1000,
      page: "page-1",
      text: "WHAT THE DRAWING PROPOSES\nMeasure 52rem (832px), up from 46rem: 48 gutter, 288 still, 24 gap, 424 text.\nRail: one 1px line at x 22, ink at 30%, hanging from the masthead's doubled rule and stopping dead at the last node.\nNode: a 13 × 3 bar in full ink, level with the top edge of the still — the mark's own tick against the mark's own rule.\nInterval: 13px italic at 72% ink, starting on the rail, the rail broken for it.\nThe 1px hairline between entries goes; the hover ground stays.\nThe still box stays at ADR-0025's 630.\nThe sides are set in their own inks, in roster order.",
    },
    {
      id: "phone-note",
      x: 1140,
      y: 4330,
      w: 390,
      page: "page-1",
      text: "The phone at 390. Gutter 26, rail at 12, node 9 × 2.5, interval at 12px. The still goes above the text, so the title stays the first thing read after it — and the node is level with the still's top edge at both widths, which is why that is where it sits rather than beside the title.",
    },
  ],
  launch: { view: "canvas", page: "page-1" },
};

writeFileSync(join(here, "canvas.json"), `${JSON.stringify(canvas, null, 2)}\n`);
console.log("wrote 7 artboards and canvas.json");
