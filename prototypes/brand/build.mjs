/**
 * Builds the brand canvas artboards for #135 from the mark geometry in
 * marks.mjs. Run `node build.mjs` from this directory; it writes the .dc.html
 * files and canvas.json beside itself, and the seed helper takes them from here.
 *
 * Page 1 is the brand as chosen: A · The Review, drawn out, and everything cut
 * from it. Page 2 keeps the four directions the choice was made against, since
 * the ticket's resolution has to say what was rejected and why.
 */
import { writeFileSync } from "node:fs";
import { HAIR, INK, LAND, MARKS, PARCHMENT, RED, RULE, SERIF, BLUE, markSvg } from "./marks.mjs";

/** The chosen direction (#135, 7 September 2026). */
const MARK = MARKS[0];

/** The masthead line as it now stands on the drawings. */
const IDEA_LINE = "Famous battles, played back on the map — phase by phase, from the sources up.";

/** The .dc.html shell: the head line the editor replaces, the face, and the page's own ground. */
function page(body, { width, pad = "32px 36px" } = {}) {
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
    body { margin: 0; font-family: ${SERIF}; color: ${INK}; background: ${PARCHMENT}; }
    a { color: ${RED}; } a:hover { color: ${INK}; }
    svg text { font-family: ${SERIF}; }
    code { font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.9em; }
  </style>
</helmet>
<div style="width: ${width}px; padding: ${pad}; box-sizing: border-box; background: ${PARCHMENT}; display: flex; flex-direction: column; gap: 26px;">
${body}
</div>
</x-dc>
</body>
</html>
`;
}

/** A sheet's heading: the title and the one italic line that says what is being judged. */
function head(title, line) {
  return `  <div style="display: flex; flex-direction: column; gap: 6px;">
    <div style="font-size: 30px;">${title}</div>
    <div style="font-size: 15px; font-style: italic; line-height: 1.45;">${line}</div>
  </div>`;
}

/** A section head, at the plate's 20px. */
function section(title) {
  return `<div style="font-size: 20px;">${title}</div>`;
}

/** A caption under a specimen: what it is, and at what size. */
function caption(text) {
  return `<div style="font-size: 11px; font-style: italic; opacity: 0.8; text-align: center;">${text}</div>`;
}

/** One specimen in a bordered well, so a 16px mark is still findable on the sheet. */
function well(svg, label, { ground = PARCHMENT, size = 118 } = {}) {
  return `<div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; padding: 10px; box-sizing: border-box; background: ${ground}; border: 1px solid ${HAIR};">${svg}</div>
        ${caption(label)}
      </div>`;
}

/**
 * Mark plus wordmark. The rule is that the mark's baseline — the line its ticks
 * stand on, y=50 of 64 — sits on the wordmark's baseline, so the nudge is real
 * geometry and not an eyeballed offset.
 */
function lockup({ size = 40, type = 30, ink = INK } = {}) {
  // The mark's baseline sits 50/64 down its box; the face's sits about .205 of
  // its size above the line box's foot. Aligning the two feet leaves the mark
  // riding high by the difference, so drop it by exactly that, at every size.
  const drop = Math.round(0.219 * size - 0.205 * type);
  return `<div style="display: flex; align-items: flex-end; gap: ${Math.round(size * 0.35)}px;">
        <div style="margin-bottom: ${-drop}px; line-height: 0;">${markSvg(MARK, size, { ink })}</div>
        <div style="font-size: ${type}px; line-height: 1.15; letter-spacing: 0.02em; color: ${ink};">Marchpast</div>
      </div>`;
}

// ---------------------------------------------------------------- Main: the mark, chosen

/** The mark over its own grid, so the values below are checkable against the drawing. */
function construction(px) {
  const grid = [8, 16, 24, 32, 40, 48, 56]
    .map(
      (n) =>
        `<line x1="${n}" y1="0" x2="${n}" y2="64" stroke="${INK}" stroke-width="0.25" opacity="0.28"/><line x1="0" y1="${n}" x2="64" y2="${n}" stroke="${INK}" stroke-width="0.25" opacity="0.28"/>`,
    )
    .join("");
  return `<svg width="${px}" height="${px}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="display: block;">
      <rect width="64" height="64" fill="${PARCHMENT}"/>
      ${grid}
      <rect x="0.25" y="0.25" width="63.5" height="63.5" fill="none" stroke="${INK}" stroke-width="0.5" opacity="0.5"/>
      ${MARK.draw(INK)}
      <line x1="37.5" y1="61.5" x2="42.5" y2="61.5" stroke="${RED}" stroke-width="0.5"/>
      <line x1="8" y1="28" x2="55" y2="28" stroke="${RED}" stroke-width="0.4" stroke-dasharray="1 1"/>
      <line x1="8" y1="50" x2="55" y2="50" stroke="${RED}" stroke-width="0.4" stroke-dasharray="1 1"/>
    </svg>`;
}

const GEOMETRY = [
  ["The tick", "3.6 wide, from y 28 to the baseline at 50. Three of them at x 11, 19.5 and 28, spaced 8.5 — the rank."],
  ["The tick that has passed", "the same tick at x 52, alone on the far side. The asymmetry is the word."],
  ["The rule", "1.6 wide, doubled 5 apart at x 37.5 and 42.5, running the full height from y 5 to 58."],
  ["The baseline", "1.6 wide at y 50, from x 5 to 59: the ground the rank marches on, and it runs under the rule."],
];

const main = page(
  `${head(
    "Marchpast · the mark",
    "Direction A, <em>The Review</em>, chosen 7 September 2026. A rank of unit ticks on its baseline files past the plate's doubled rule. The rule is two things at once — the stand the column marches past, and the playhead the phases run under — and one tick has already gone by, which is the whole of the idea. Every stroke is the engraved system's (#58): the tick a unit is drawn with, the rule the plate is bordered with, one ink and no second.",
  )}
  <div style="display: flex; gap: 30px; align-items: flex-start; padding-top: 22px; border-top: 1px solid ${RULE};">
    <div style="display: flex; flex-direction: column; gap: 5px;">
      ${construction(320)}
      ${caption("the 64-unit box, ruled every 8")}
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px; flex: 1;">
      ${section("What it is made of")}
      <div style="display: flex; flex-direction: column; gap: 9px;">
        ${GEOMETRY.map(
          ([term, value]) =>
            `<div style="font-size: 14px; line-height: 1.45;"><span style="font-style: italic; color: ${RED};">${term}.</span> ${value}</div>`,
        ).join("\n        ")}
      </div>
      <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The contrast is load-bearing and was arrived at by drawing it wrong first: with the rule as thick as the ticks and no taller, the seven verticals read as one picket fence. The rule has to be <em>thin and tall</em> against ticks that are <em>thick and short</em>, or the mark says nothing. That is also why the doubled rule keeps its 5-unit gap rather than closing up — at the gap the ticks use, it becomes two more ticks.</div>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 14px; padding-top: 22px; border-top: 1px solid ${HAIR};">
    ${section("The ladder")}
    <div style="display: flex; gap: 14px; align-items: flex-start;">
      ${well(markSvg(MARK, 96), "96 · masthead, card")}
      ${well(markSvg(MARK, 64), "64 · the drawing")}
      ${well(markSvg(MARK, 48), "48")}
      ${well(markSvg(MARK, 32), "32 · tab at 2×")}
      ${well(markSvg(MARK, 16), "16 · scaled — dead")}
      ${well(markSvg(MARK, 16, { small: true }), "16 · redrawn")}
      ${well(markSvg(MARK, 72, { ink: PARCHMENT }), "reversed, on ink", { ground: INK })}
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The mark carries a second drawing at 16, and this is the price of choosing it. Below about 24 the doubled rule cannot stay doubled — the gap falls under a pixel — so the small cut spends it as one heavier bar, drops the rank from three ticks to two, and keeps the one tick that has passed, which is the only stroke the idea cannot lose. Two drawings, kept in step by hand, in <code>marks.mjs</code>.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 14px; padding-top: 22px; border-top: 1px solid ${HAIR};">
    ${section("The lockup")}
    <div style="display: flex; gap: 46px; align-items: flex-end; flex-wrap: wrap;">
      <div style="display: flex; flex-direction: column; gap: 5px;">
        ${lockup({ size: 40, type: 30 })}
        ${caption("masthead · mark 40, name 30")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px;">
        ${lockup({ size: 76, type: 58 })}
        ${caption("social card · mark 76, name 58")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; padding: 12px 16px; background: ${INK};">
        ${lockup({ size: 40, type: 30, ink: PARCHMENT })}
        <div style="font-size: 11px; font-style: italic; opacity: 0.8; text-align: center; color: ${PARCHMENT};">reversed</div>
      </div>
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The mark's baseline sits on the wordmark's baseline — the ticks and the letters stand on the same line, which is the one alignment the drawing already has. The name is set in IM Fell English at 0.02em, the ramp's 30px on the masthead, and the gap between mark and name is 35% of the mark's height at every size. Clear space on all four sides is the tick height, 22 of 64.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 14px; padding-top: 22px; border-top: 1px solid ${HAIR};">
    ${section("What it may not do")}
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 28px; font-size: 13px; line-height: 1.45;">
      <div>Never in a side ink. The six side colours belong to the sides of a battle and are never decorative (#58).</div>
      <div>Never in two inks. It is one stroke colour, on parchment or reversed on ink, and nothing else.</div>
      <div>Never rounded, boxed or badged by us. The app tile's corner belongs to the platform.</div>
      <div>Never stretched to fill a space, and never re-proportioned: the tick-to-rule contrast is the mark.</div>
      <div>The wordmark is never set in another face, never bold — the system has no bold — and never all-caps.</div>
      <div>The mark does not follow the view. The Night plate inverts the plate, not the brand (map #121).</div>
    </div>
  </div>`,
  { width: 1240 },
);

// ---------------------------------------------------------------- Directions: the record

const markBlocks = MARKS.map(
  (mark) => `  <div style="display: flex; gap: 28px; padding-top: 22px; border-top: 1px solid ${HAIR};">
    <div style="width: 330px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
      <div style="font-size: 22px;">${mark.key} · ${mark.name}${mark.key === "A" ? ` <span style="font-size: 13px; font-style: italic; color: ${RED};">chosen</span>` : ""}</div>
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Axis: ${mark.axis}</div>
      <div style="font-size: 14px; line-height: 1.45;">${mark.concept}</div>
      <div style="font-size: 13px; line-height: 1.4;"><span style="font-style: italic; color: ${RED};">For.</span> ${mark.forIt}</div>
      <div style="font-size: 13px; line-height: 1.4;"><span style="font-style: italic; color: ${BLUE};">Against.</span> ${mark.against}</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; gap: 14px; align-items: flex-start;">
        ${well(markSvg(mark, 96), "96")}
        ${well(markSvg(mark, 64), "64")}
        ${well(markSvg(mark, 32), "32")}
        ${well(markSvg(mark, 16), "16 · scaled")}
        ${well(markSvg(mark, 16, { small: true }), "16 · redrawn")}
        ${well(markSvg(mark, 72, { ink: PARCHMENT }), "reversed", { ground: INK })}
      </div>
      <div style="display: flex; align-items: flex-end; gap: 14px;">
        <div style="margin-bottom: -3px; line-height: 0;">${markSvg(mark, 40)}</div>
        <div style="font-size: 30px; line-height: 1.15; letter-spacing: 0.02em;">Marchpast</div>
      </div>
    </div>
  </div>`,
).join("\n");

const directions = page(
  `${head(
    "The four directions",
    "Kept as the record the choice was made against, not as live options. Each explores one axis; A was chosen on 7 September 2026 and is drawn out on the brand page. The name is arbitrary by design (ADR-0020), so nothing about it is a picture: the mark carries recognition and the masthead line carries the meaning.",
  )}
${markBlocks}
  <div style="padding-top: 20px; border-top: 1px solid ${RULE}; font-size: 13px; font-style: italic; line-height: 1.5;">
    The 16px column is the honest test. “Scaled” is the 64px drawing shrunk, which is what a lazy favicon export gives; “redrawn” is the same idea cut for the pixel grid. Needing a redraw did not disqualify anything — every mark worth having gets one — but it is a second drawing to keep in step forever, and B and D would not have needed one.
  </div>`,
  { width: 1240 },
);

// ---------------------------------------------------------------- Icons and manifest

const icons = page(
  `${head(
    "Icons and the manifest",
    "The chosen mark at the sizes an installable web app asks for, and no more: no service worker, no offline (map #121).",
  )}
  <div style="display: flex; flex-direction: column; gap: 12px;">
    ${section("The favicon")}
    <div style="display: flex; gap: 14px; align-items: flex-start;">
      ${well(markSvg(MARK, 16, { small: true }), "16 · favicon.svg at 1×")}
      ${well(markSvg(MARK, 32, { small: true }), "the same cut, at 2×")}
      ${well(markSvg(MARK, 32), "32 · the 64 drawing")}
      ${well(`<div style="display: flex; align-items: center; gap: 7px; padding: 5px 9px; background: #d9d2c4; border-radius: 5px;">${markSvg(MARK, 16, { small: true })}<span style="font-size: 11px;">Marchpast</span></div>`, "in a browser tab")}
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">One <code>favicon.svg</code> carrying the redrawn 16 geometry, plus a 32px PNG for the browsers that still want one. The SVG is ink on transparent, so a dark tab strip gets ink on its own ground — if that reads badly, the file takes a <code>prefers-color-scheme</code> block and inverts, which is the one place anything here follows the viewer's theme.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    ${section("The app icon")}
    <div style="display: flex; gap: 14px; align-items: flex-start;">
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="width: 118px; height: 118px; background: ${PARCHMENT}; border: 1px solid ${HAIR}; border-radius: 24px; display: flex; align-items: center; justify-content: center;">${markSvg(MARK, 68)}</div>
        ${caption("192 and 512 · any")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="width: 118px; height: 118px; background: ${INK}; border: 1px solid ${HAIR}; border-radius: 24px; display: flex; align-items: center; justify-content: center;">${markSvg(MARK, 68, { ink: PARCHMENT })}</div>
        ${caption("the reversed alternative")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="position: relative; width: 118px; height: 118px; background: ${PARCHMENT}; border: 1px solid ${HAIR}; display: flex; align-items: center; justify-content: center;">
          ${markSvg(MARK, 50)}
          <div style="position: absolute; left: 11.8px; top: 11.8px; width: 94.4px; height: 94.4px; border: 1px dashed ${RED}; border-radius: 50%; box-sizing: border-box;"></div>
        </div>
        ${caption("512 · maskable, 80% safe zone")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="width: 118px; height: 118px; background: ${PARCHMENT}; display: flex; align-items: center; justify-content: center;">${markSvg(MARK, 68)}</div>
        ${caption("180 · apple-touch, square")}
      </div>
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The maskable icon is the mark at about 60% of the tile so every platform's crop — circle, squircle, rounded square — clears it. The Apple touch icon ships square and opaque on parchment: iOS rounds it itself and composites a transparent one onto black. The tile is never rounded by us <em>and</em> handed to a platform that rounds it again.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    ${section("The manifest")}
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; font-size: 13px;">
      <div><span style="font-style: italic;">name</span> — Marchpast</div><div><span style="font-style: italic;">short_name</span> — Marchpast</div>
      <div><span style="font-style: italic;">theme_color</span> — #efe3c6, the parchment</div><div><span style="font-style: italic;">background_color</span> — #efe3c6, so the splash is the paper</div>
      <div><span style="font-style: italic;">display</span> — standalone</div><div><span style="font-style: italic;">start_url</span> — / , the library (ADR-0011)</div>
      <div><span style="font-style: italic;">scope</span> — /</div><div><span style="font-style: italic;">orientation</span> — unset; the plate letterboxes either way</div>
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The name fits in one field, so <code>short_name</code> shortens nothing. The theme colour is the parchment rather than the ink: an installed window frames the plate, and the plate's ground is the paper. The manifest's <code>description</code> is the meta description on the Words sheet, written once and used twice.</div>
  </div>`,
  { width: 940 },
);

// ---------------------------------------------------------------- Social card

/** A stand-in for a build-time still: not the renderer's output, just enough plate to judge the composition against. */
function plateStill(w, h) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" style="display: block;">
    <rect width="1200" height="630" fill="${PARCHMENT}"/>
    <path d="M0 470 C 160 440, 300 500, 470 486 C 640 472, 760 520, 900 500 C 1010 484, 1120 512, 1200 496 L1200 630 L0 630 Z" fill="${LAND}" stroke="${INK}" stroke-width="1.4"/>
    <g stroke="${RED}" stroke-width="1.4">
      <line x1="250" y1="180" x2="250" y2="212"/><line x1="272" y1="176" x2="272" y2="208"/><line x1="294" y1="172" x2="294" y2="204"/><line x1="316" y1="168" x2="316" y2="200"/>
    </g>
    <g stroke="${BLUE}" stroke-width="1.4">
      <line x1="700" y1="300" x2="700" y2="332"/><line x1="722" y1="304" x2="722" y2="336"/><line x1="744" y1="308" x2="744" y2="340"/><line x1="766" y1="312" x2="766" y2="344"/><line x1="788" y1="316" x2="788" y2="348"/>
    </g>
    <path d="M340 196 C 460 210, 560 260, 660 300" fill="none" stroke="${RED}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M660 300 L646 292 L650 300 L646 308 Z" fill="${RED}"/>
    <path d="M300 240 C 380 300, 470 330, 600 352" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="8 5"/>
    <path d="M591 344 L600 352 L591 360" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="none" stroke="${INK}" stroke-width="1" opacity="0.5">
      <circle cx="96" cy="96" r="30"/><path d="M96 62 L100 92 L130 96 L100 100 L96 130 L92 100 L62 96 L92 92 Z" fill="${INK}" stroke="none"/>
    </g>
    <text x="1104" y="102" text-anchor="end" font-size="22" fill="${INK}">The Battle of Trafalgar</text>
    <text x="1104" y="126" text-anchor="end" font-size="13" font-style="italic" fill="${INK}">21 October 1805 · 12:45</text>
  </svg>`;
}

const cardOne = `<div style="position: relative; width: 1200px; height: 630px; border: 1px solid ${HAIR};">
    ${plateStill(1200, 630)}
    <div style="position: absolute; left: 0; bottom: 0; width: 1200px; box-sizing: border-box; padding: 30px 56px 34px; background: rgba(239,227,198,0.94); border-top: 3px double ${RULE}; display: flex; align-items: flex-end; gap: 27px;">
      <div style="margin-bottom: -5px; line-height: 0;">${markSvg(MARK, 76)}</div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="font-size: 58px; line-height: 1.15; letter-spacing: 0.02em;">Marchpast</div>
        <div style="font-size: 24px; font-style: italic;">${IDEA_LINE}</div>
      </div>
      <div style="margin-left: auto; font-size: 20px; font-style: italic;">marchpast.com</div>
    </div>
  </div>`;

const cardTwo = `<div style="width: 1200px; height: 630px; box-sizing: border-box; background: ${PARCHMENT}; border: 1px solid ${HAIR}; padding: 64px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px;">
    <div style="display: flex; align-items: flex-end; gap: 45px;">
      <div style="margin-bottom: -7px; line-height: 0;">${markSvg(MARK, 128)}</div>
      <div style="font-size: 104px; line-height: 1.15; letter-spacing: 0.02em;">Marchpast</div>
    </div>
    <div style="width: 720px; border-top: 3px double ${RULE};"></div>
    <div style="font-size: 30px; font-style: italic; text-align: center; max-width: 900px; line-height: 1.4;">${IDEA_LINE}</div>
    <div style="font-size: 20px; font-style: italic;">marchpast.com</div>
  </div>`;

const social = page(
  `${head(
    "The social card · 1200 × 630",
    "What a link unfurls to on Slack, Discord, X, iMessage and every preview crawler. Two takes on the same question: whether a plate stands behind the name.",
  )}
  <div style="display: flex; flex-direction: column; gap: 10px;">
    ${section("S1 · The plate behind")}
    ${cardOne}
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The plate here is a hand-drawn stand-in, not the renderer's output: what would actually sit behind is a real still, and #126 proved the machinery — the same <code>@napi-rs/canvas</code> call the thumbnails use, at 1200 × 630, byte-identical run to run. <span style="color: ${RED};">For.</span> It shows the product in the preview rather than describing it, which is the whole job of an unfurl. <span style="color: ${BLUE};">Against.</span> It pins one battle to the whole site — every link to every page unfurls as Trafalgar — and the panel eats a third of the plate it is advertising.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 10px;">
    ${section("S2 · The plate alone")}
    ${cardTwo}
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;"><span style="color: ${RED};">For.</span> Never misrepresents which battle a link points at, survives every crop a platform applies, and is one static file with nothing to regenerate. <span style="color: ${BLUE};">Against.</span> A preview that shows no product is a wasted preview, and this one is a title card for a site whose whole argument is the picture.</div>
  </div>
  <div style="padding-top: 20px; border-top: 1px solid ${RULE}; font-size: 13px; font-style: italic; line-height: 1.5;">
    A third way, if the thumbnail machinery lands anyway: S2 for the library's own card, and a per-battle card that is that battle's still with the S1 panel — <code>?battle=trafalgar</code> unfurls as Trafalgar because it <em>is</em> Trafalgar. That costs a per-battle <code>&lt;meta&gt;</code> the static host cannot vary, so it is only reachable if the build emits a page per battle, which ADR-0011 does not do today. Worth naming as the thing the thumbnails ticket (#134) could unlock, not as this ticket's answer.
  </div>`,
  { width: 1264 },
);

// ---------------------------------------------------------------- Masthead

const BATTLES = [
  ["The Battle of Cannae", "2 August 216 BC", "Hannibal lets his centre give ground until the Roman army has walked into a bag, then closes his Libyans and his cavalry round it and annihilates the largest army Rome ever put in the field."],
  ["The Battle of the Nile", "1 August 1798", "Nelson finds the French fleet moored across Aboukir Bay, doubles its van at sunset and fights all night; by the second morning only two ships of the line are left to escape."],
  ["The Battle of Copenhagen", "2 April 1801", "Nelson takes twelve of the line up the King's Deep, destroys the Danish line of blockships at anchor, and ends the day under a flag of truce."],
  ["The Battle of Trafalgar", "21 October 1805", "Nelson's two columns cut Villeneuve's line off Cape Trafalgar and destroy the Combined Fleet in an afternoon."],
];

/** One library entry, at the real padding and the real ramp (src/app/library.css). */
function entry([title, date, summary], { compact = false } = {}) {
  const pad = compact ? "16px 8px" : "20px 12px";
  const margin = compact ? "0 -8px" : "0 -12px";
  return `<li style="border-top: 1px solid ${HAIR};">
        <div style="display: block; padding: ${pad}; margin: ${margin};">
          <span style="display: block; font-size: 22px;">${title}</span>
          <span style="display: block; margin-top: 2px; font-size: 13px; font-style: italic;">${date}</span>
          <span style="display: block; margin-top: 8px; font-size: 15px; line-height: 1.45;">${summary}</span>
        </div>
      </li>`;
}

const masthead = page(
  `<div style="width: 736px; margin: 0 auto; padding: 56px 24px 40px; box-sizing: border-box; display: flex; flex-direction: column;">
    <div style="padding-bottom: 16px; border-bottom: 3px double ${RULE};">
      ${lockup({ size: 40, type: 30 })}
      <div style="margin: 10px 0 0; font-size: 15px; font-style: italic; line-height: 1.45;">${IDEA_LINE}</div>
      <div style="margin: 8px 0 0; font-size: 13px; font-style: italic;"><a href="#" style="color: ${RED};">How it is made, and where the battles come from →</a></div>
    </div>
    <ol style="margin: 0; padding: 0; list-style: none;">
      ${BATTLES.map((b) => entry(b)).join("\n      ")}
    </ol>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid ${RULE}; font-size: 11px; font-style: italic;"><a href="#" style="color: ${INK};">Marchpast on GitHub</a>. Battle files CC BY 4.0; each map file carries its own licence.</div>
  </div>`,
  { width: 1024, pad: "0" },
);

const phone = page(
  `<div style="width: 390px; padding: 32px 16px 28px; box-sizing: border-box; display: flex; flex-direction: column;">
    <div style="padding-bottom: 16px; border-bottom: 3px double ${RULE};">
      ${lockup({ size: 32, type: 30 })}
      <div style="margin: 10px 0 0; font-size: 15px; font-style: italic; line-height: 1.45;">${IDEA_LINE}</div>
      <div style="margin: 8px 0 0; font-size: 13px; font-style: italic;"><a href="#" style="color: ${RED};">How it is made →</a></div>
    </div>
    <ol style="margin: 0; padding: 0; list-style: none;">
      ${BATTLES.slice(0, 3).map((b) => entry(b, { compact: true })).join("\n      ")}
    </ol>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${RULE}; font-size: 11px; font-style: italic;"><a href="#" style="color: ${INK};">Marchpast on GitHub</a>. Battle files CC BY 4.0; each map file carries its own licence.</div>
  </div>`,
  { width: 390, pad: "0" },
);

// ---------------------------------------------------------------- Words

/** One candidate line, with the case for it. */
function option(key, text, note, { tone = "plain" } = {}) {
  const border = tone === "plain" ? HAIR : RULE;
  const fill = tone === "plain" ? "transparent" : "rgba(43,36,24,0.04)";
  const tag = { ships: " · what ships today", drawn: " · drawn, and cut", lead: " · drawn on the masthead" }[tone] ?? "";
  return `<div style="display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border: 1px solid ${border}; background: ${fill};">
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">${key}${tag}</div>
      <div style="font-size: 15px; line-height: 1.45;">${text}</div>
      <div style="font-size: 13px; font-style: italic; line-height: 1.4;">${note}</div>
    </div>`;
}

const words = page(
  `${head(
    "The words",
    "ADR-0020 left the masthead line load-bearing: “Marchpast” gestures at nothing, so this line is now the only thing on the page that says what the site is. The rest follows from it — the title, the description and the README's opening are the same sentence at three lengths.",
  )}
  <div style="display: flex; flex-direction: column; gap: 12px;">
    ${section("The masthead line")}
    ${option("L1", "A web app that plays back famous battles as animated 2D “grand strategy” sequences, driven by a reusable JSON timeline format, with the timelines extracted from public-domain primary and secondary sources.", "The concept document's one-liner, lifted whole into <code>src/app/libraryPage.ts</code>. It survived because the name used to carry some of the load. It names the implementation twice — “web app”, “JSON timeline format” — to a reader who came to watch a battle, and at 210 characters it wraps to three lines under the mark.", { tone: "ships" })}
    ${option("L2", "Famous battles, played back on the map: the units, their moves and a caption, phase by phase, from public-domain sources.", "Cut. Three faults, all mechanical. Four clauses hang off the subject with nothing governing them, a colon and three commas doing the same job. “The units, their moves and a caption” is the renderer's parts list, and a caption is not a reason to visit. And it ends on a licence fact, which is the least interesting thing here to a visitor and the most interesting to a contributor.", { tone: "drawn" })}
    ${option("N1", "Famous battles, played back on the map — phase by phase, from the sources up.", "77 characters, one line under the mark at every width down to the phone. One clause, one em-dash, and the dash does the governing the colon failed at. “From the sources up” carries the provenance in four words without saying “public domain”, and it is a claim about how the thing is built rather than a licence note.", { tone: "lead" })}
    ${option("N2", "Famous battles, played back on the map phase by phase. Every position is drawn from a primary source.", "Two sentences, each doing one job: the what, then the claim. The safest of the four and the easiest to read aloud. Costs a second line under the mark, and “every position” is a promise the conjecture ticket (#133) may have to qualify.")}
    ${option("N3", "Watch a famous battle unfold on the map, phase by phase, drawn from the primary sources.", "The only one that opens with a verb aimed at the reader, which is what a front door usually wants. Against it: “watch” is what every video site says, and the plate's voice is a document's, not a broadcaster's.")}
    ${option("N4", "A march-past of famous battles: each one played back on its own map, phase by phase, from the primary sources.", "Spends the name's one available reading — a column filing past while the reviewer stands still — so the word starts to mean something, and the mark draws the same idea. Against it: a reader who does not know the term now has two unfamiliar things instead of one, and it is the longest of the four.")}
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    ${section("The title")}
    ${option("T1", "<code>Marchpast</code> on the library; <code>The Battle of Trafalgar · Marchpast</code> on a battle.", "What ships today. A bare name is a bare name: in a search result, a bookmark bar or a shared tab it says nothing, and now the name says nothing either.", { tone: "ships" })}
    ${option("T2", "<code>Marchpast — famous battles, played back on the map</code> on the library; the battle title unchanged.", "The library's title is the one that gets indexed and shared, so it carries the line; a battle page already has a self-explaining title and needs no tagline behind it.")}
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    ${section("The meta description")}
    ${option("D1", "There is none.", "<code>index.html</code> has no description tag at all, so a search engine invents one from whatever text it finds first, and a link with no card has no text to fall back on.", { tone: "ships" })}
    ${option("D2", "“Famous battles played back on the map, phase by phase — the positions, the moves and the clock, drawn from public-domain primary sources. Cannae, the Nile, Copenhagen, Trafalgar.”", "175 characters; a result snippet keeps about 155 and the rest still helps the match. Naming the battles is what makes it findable — nobody searches for “battle playback”, they search for a battle. Grows as battles land, which is a build-time job if the description is generated from the library.")}
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    ${section("The README's first paragraph")}
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">Already rewritten by the rename (#147) and already the long version: it names the format, the bar, and what the project is not, then points at <code>docs/CONCEPT.md</code>. Nothing here asks it to change — the README's reader is a contributor, not a visitor, and the split between a short masthead line and the full paragraph in the README is exactly the split ADR-0020 predicted. The one edit worth making is the sentence order: lead with what a reader sees, not with “driven by a reusable JSON timeline format”.</div>
  </div>`,
  { width: 940 },
);

// ---------------------------------------------------------------- Write

const files = {
  "Main.dc.html": main,
  "Icons.dc.html": icons,
  "SocialCard.dc.html": social,
  "Masthead.dc.html": masthead,
  "Phone.dc.html": phone,
  "Words.dc.html": words,
  "Directions.dc.html": directions,
};

for (const [name, source] of Object.entries(files)) {
  writeFileSync(new URL(name, import.meta.url), source);
}

const canvas = {
  pages: [
    { id: "page-1", name: "Brand" },
    { id: "page-2", name: "Directions" },
  ],
  artboards: [
    { file: "Main.dc.html", x: 0, y: 0, w: 1240, h: 1500, title: "The mark · A, The Review", page: "page-1" },
    { file: "Icons.dc.html", x: 1360, y: 0, w: 940, h: 1000, title: "Icons and the manifest", page: "page-1" },
    { file: "Words.dc.html", x: 2500, y: 0, w: 940, h: 2060, title: "The words · masthead line, title, description", page: "page-1" },
    { file: "SocialCard.dc.html", x: 0, y: 1680, w: 1264, h: 1840, title: "The social card · 1200 × 630", page: "page-1" },
    { file: "Masthead.dc.html", x: 1360, y: 1680, w: 1024, h: 1000, title: "The library masthead · desktop", page: "page-1" },
    { file: "Phone.dc.html", x: 3560, y: 0, w: 390, h: 1010, title: "The library masthead · phone, 390", page: "page-1" },
    { file: "Directions.dc.html", x: 0, y: 0, w: 1240, h: 1660, title: "The four directions · the record", page: "page-2" },
  ],
  annotations: [
    {
      id: "brief",
      x: 0,
      y: -250,
      w: 1240,
      page: "page-1",
      text: "BRAND · issue #135 on the v0.3 map (#121).\nThe mark is settled: A · The Review, chosen 7 September 2026. The four directions it was chosen against are on the Directions page.\nThe engraved system of #58 governs: one face, IM Fell English; ink #2b2418 on parchment #efe3c6; the plate's doubled rule; no bold anywhere. The library keeps one look and does not follow the view (map #121), so none of this is themed.",
    },
    {
      id: "decide",
      x: 1360,
      y: 1080,
      w: 940,
      page: "page-1",
      text: "STILL TO DECIDE\n1. The masthead line — N1 is drawn on the masthead, the card and the phone; N2, N3 and N4 are beside it on the Words sheet. This is the one that matters most: ADR-0020 left it as the only thing on the page that explains the app.\n2. The social card — S1, a real build-time still behind a parchment panel, or S2, the plate alone.\n3. Whether the head carries a third line linking to the story, as drawn, or whether that link stays in the credit footer beside the GitHub link.\n4. The title and the meta description, T1/T2 and D1/D2.",
    },
    {
      id: "masthead-note",
      x: 1360,
      y: 2720,
      w: 1024,
      page: "page-1",
      text: "The masthead is drawn at the real measure and the real ramp: 736px container, 56/24/40 padding, name 30, idea 15 italic, the 3px doubled rule under the head, entries at 20/12 with a 1px hairline between — every value read out of src/app/library.css rather than chosen here. The only new things are the mark, the third line, and the new idea line in place of the concept document's one-liner. Four battles are what the library holds today; grouping at seven is #129, not this ticket.",
    },
  ],
  launch: { view: "canvas", page: "page-1" },
};

writeFileSync(new URL("canvas.json", import.meta.url), `${JSON.stringify(canvas, null, 2)}\n`);
console.log(`wrote ${Object.keys(files).length} artboards and canvas.json`);
