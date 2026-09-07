/**
 * Builds the brand canvas artboards for #135 from the mark geometry in
 * marks.mjs. Run `node build.mjs` from this directory; it writes the .dc.html
 * files and canvas.json beside itself, and the seed helper takes them from here.
 */
import { writeFileSync } from "node:fs";
import { HAIR, INK, LAND, MARKS, PARCHMENT, RED, RULE, SERIF, BLUE, markSvg } from "./marks.mjs";

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
    <div style="font-size: 15px; font-style: italic;">${line}</div>
  </div>`;
}

/** A caption under a specimen: what it is, and at what size. */
function caption(text) {
  return `<div style="font-size: 11px; font-style: italic; opacity: 0.8; text-align: center;">${text}</div>`;
}

/** One specimen in a bordered well, so a 16px mark is still findable on the sheet. */
function well(svg, label, { pad = 10, ground = PARCHMENT } = {}) {
  return `<div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="display: flex; align-items: center; justify-content: center; width: 118px; height: 118px; padding: ${pad}px; box-sizing: border-box; background: ${ground}; border: 1px solid ${HAIR};">${svg}</div>
        ${caption(label)}
      </div>`;
}

/** Mark plus wordmark, as the masthead and the social card set it. */
function lockup(mark, { size = 40, type = 30, ink = INK, ground = PARCHMENT } = {}) {
  return `<div style="display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: ${ground};">
        ${markSvg(mark, size, { ink })}
        <div style="font-size: ${type}px; letter-spacing: 0.02em; color: ${ink};">Marchpast</div>
      </div>`;
}

// ---------------------------------------------------------------- Main: the marks

const markBlocks = MARKS.map(
  (mark) => `  <div style="display: flex; gap: 28px; padding-top: 22px; border-top: 1px solid ${HAIR};">
    <div style="width: 330px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
      <div style="font-size: 22px;">${mark.key} · ${mark.name}</div>
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Axis: ${mark.axis}</div>
      <div style="font-size: 14px; line-height: 1.45;">${mark.concept}</div>
      <div style="font-size: 13px; line-height: 1.4;"><span style="font-style: italic; color: ${RED};">For.</span> ${mark.forIt}</div>
      <div style="font-size: 13px; line-height: 1.4;"><span style="font-style: italic; color: ${BLUE};">Against.</span> ${mark.against}</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; gap: 14px; align-items: flex-start;">
        ${well(markSvg(mark, 96), "96 · masthead and card")}
        ${well(markSvg(mark, 64), "64")}
        ${well(markSvg(mark, 32), "32 · tab, retina")}
        ${well(markSvg(mark, 16), "16 · scaled down")}
        ${well(markSvg(mark, 16, { small: true }), "16 · redrawn")}
        ${well(markSvg(mark, 72, { ink: PARCHMENT, ground: INK }), "reversed, on ink")}
      </div>
      ${lockup(mark)}
    </div>
  </div>`,
).join("\n");

const main = page(
  `${head(
    "Marchpast · the mark",
    "Four directions, one axis each. The name is arbitrary by design (ADR-0020), so nothing about it is a picture: the mark carries recognition and the masthead line carries the meaning. Every value here is the engraved system's (#58) — ink #2b2418 on parchment #efe3c6, the plate's doubled rule, the intent pen's open head, the tick a unit is drawn with. Monochrome first: each is one ink, and none needs a second.",
  )}
${markBlocks}
  <div style="padding-top: 20px; border-top: 1px solid ${RULE}; font-size: 13px; font-style: italic; line-height: 1.5;">
    The 16px column is the honest test. “Scaled down” is the 64px drawing shrunk, which is what a lazy favicon export gives; “redrawn” is the same idea cut for the pixel grid. A direction that needs a redraw is not disqualified — every mark worth having gets one — but it is a second drawing to keep in step forever, and B and D do not need it.
  </div>`,
  { width: 1240 },
);

// ---------------------------------------------------------------- Icons and manifest

const lead = MARKS[0];

const icons = page(
  `${head(
    "Icons and the manifest",
    "Drawn with A · The Review as the leading candidate; swapping the direction swaps every specimen on this sheet and nothing else. The set is what an installable web app asks for, and no more: no service worker, no offline (map #121).",
  )}
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 20px;">The favicon</div>
    <div style="display: flex; gap: 14px; align-items: flex-start;">
      ${well(markSvg(lead, 16, { small: true }), "16 · favicon.svg at 1×")}
      ${well(markSvg(lead, 32, { small: true }), "the same, at 2×")}
      ${well(markSvg(lead, 32), "32 · the 64 drawing")}
      ${well(`<div style="display: flex; align-items: center; gap: 7px; padding: 5px 9px; background: #d9d2c4; border-radius: 5px;">${markSvg(lead, 16, { small: true })}<span style="font-size: 11px;">Marchpast</span></div>`, "in a browser tab")}
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">One <code>favicon.svg</code> carrying the redrawn 16px geometry, plus a 32px PNG for the browsers that still want one. The SVG is ink on transparent, so a dark-themed tab strip gets the mark in ink on its own ground — if that reads badly, the SVG takes a <code>prefers-color-scheme</code> block and inverts, which is the one place the site is allowed to follow the viewer's theme.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 20px;">The app icon</div>
    <div style="display: flex; gap: 14px; align-items: flex-start;">
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="width: 118px; height: 118px; background: ${PARCHMENT}; border: 1px solid ${HAIR}; border-radius: 24px; display: flex; align-items: center; justify-content: center;">${markSvg(lead, 68)}</div>
        ${caption("192 and 512 · any")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="width: 118px; height: 118px; background: ${INK}; border: 1px solid ${HAIR}; border-radius: 24px; display: flex; align-items: center; justify-content: center;">${markSvg(lead, 68, { ink: PARCHMENT })}</div>
        ${caption("the reversed alternative")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="position: relative; width: 118px; height: 118px; background: ${PARCHMENT}; border: 1px solid ${HAIR}; display: flex; align-items: center; justify-content: center;">
          ${markSvg(lead, 50)}
          <div style="position: absolute; left: 11.8px; top: 11.8px; width: 94.4px; height: 94.4px; border: 1px dashed ${RED}; border-radius: 50%;"></div>
        </div>
        ${caption("512 · maskable, 80% safe zone")}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px; align-items: center;">
        <div style="width: 118px; height: 118px; background: ${PARCHMENT}; display: flex; align-items: center; justify-content: center;">${markSvg(lead, 68)}</div>
        ${caption("180 · apple-touch, square")}
      </div>
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The maskable icon is the mark at about 60% of the tile so every platform's crop — circle, squircle, rounded square — still clears it. The Apple touch icon ships square and opaque on parchment: iOS rounds it itself and composites a transparent one onto black. The tile is never ink-on-parchment <em>and</em> rounded by us; the platform owns the corner.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 20px;">The manifest</div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; font-size: 13px;">
      <div><span style="font-style: italic;">name</span> — Marchpast</div><div><span style="font-style: italic;">short_name</span> — Marchpast</div>
      <div><span style="font-style: italic;">theme_color</span> — #efe3c6, the parchment</div><div><span style="font-style: italic;">background_color</span> — #efe3c6, so the splash is the paper</div>
      <div><span style="font-style: italic;">display</span> — standalone</div><div><span style="font-style: italic;">start_url</span> — / , the library (ADR-0011)</div>
      <div><span style="font-style: italic;">scope</span> — /</div><div><span style="font-style: italic;">orientation</span> — unset; the plate letterboxes either way</div>
    </div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The name fits in one field, so <code>short_name</code> does not have to shorten anything. The theme colour is the parchment rather than the ink: an installed window frames the plate, and the plate's ground is the paper. There is nothing to decide about the description field — it is the meta description on the Words sheet.</div>
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
    <div style="position: absolute; left: 0; bottom: 0; width: 1200px; box-sizing: border-box; padding: 34px 56px 40px; background: rgba(239,227,198,0.94); border-top: 3px double ${RULE}; display: flex; align-items: center; gap: 26px;">
      ${markSvg(MARKS[0], 76)}
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 62px; line-height: 1; letter-spacing: 0.02em;">Marchpast</div>
        <div style="font-size: 24px; font-style: italic;">Famous battles, played back on the map, phase by phase.</div>
      </div>
      <div style="margin-left: auto; font-size: 20px; font-style: italic; align-self: flex-end;">marchpast.com</div>
    </div>
  </div>`;

const cardTwo = `<div style="width: 1200px; height: 630px; box-sizing: border-box; background: ${PARCHMENT}; border: 1px solid ${HAIR}; padding: 64px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px;">
    <div style="display: flex; align-items: center; gap: 28px;">
      ${markSvg(MARKS[0], 128)}
      <div style="font-size: 104px; line-height: 1; letter-spacing: 0.02em;">Marchpast</div>
    </div>
    <div style="width: 720px; border-top: 3px double ${RULE};"></div>
    <div style="font-size: 30px; font-style: italic; text-align: center; max-width: 860px; line-height: 1.4;">Famous battles, played back on the map, phase by phase, from the sources up.</div>
    <div style="font-size: 20px; font-style: italic;">marchpast.com</div>
  </div>`;

const social = page(
  `${head(
    "The social card · 1200 × 630",
    "What a link unfurls to on Slack, Discord, X, iMessage and every preview crawler. Two takes on the same question: whether a plate stands behind the name.",
  )}
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 20px;">S1 · The plate behind</div>
    ${cardOne}
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">The plate here is a hand-drawn stand-in, not the renderer's output: what would actually sit behind is a real still, and #126 proved the machinery — the same <code>@napi-rs/canvas</code> call the thumbnails use, at 1200 × 630, byte-identical run to run. <span style="color: ${RED};">For.</span> It shows the product in the preview rather than describing it, which is the whole job of an unfurl. <span style="color: ${BLUE};">Against.</span> It pins one battle to the whole site — every link to every page unfurls as Trafalgar — and the panel eats a third of the plate it is advertising.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 20px;">S2 · The plate alone</div>
    ${cardTwo}
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;"><span style="color: ${RED};">For.</span> Never misrepresents which battle a link points at, survives every crop a platform applies, and is one static file with nothing to regenerate. <span style="color: ${BLUE};">Against.</span> A preview that shows no product is a wasted preview, and this one is a title card for a site whose whole argument is the picture.</div>
  </div>
  <div style="padding-top: 20px; border-top: 1px solid ${RULE}; font-size: 13px; font-style: italic; line-height: 1.5;">
    A third way, if the thumbnail machinery lands anyway: S2 for the library's own card, and a per-battle card that is that battle's still with the S1 panel — <code>?battle=trafalgar</code> unfurls as Trafalgar because it is Trafalgar. That costs a per-battle <code>&lt;meta&gt;</code> the static host cannot vary, so it is only reachable if the build emits a page per battle, which ADR-0011 does not do today. Worth naming as the thing the thumbnails ticket (#134) could unlock, not as this ticket's answer.
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

const IDEA_LINE = "Famous battles, played back on the map: the units, their moves and a caption, phase by phase, from public-domain sources.";

const masthead = page(
  `<div style="width: 736px; margin: 0 auto; padding: 56px 24px 40px; box-sizing: border-box; display: flex; flex-direction: column;">
    <div style="padding-bottom: 16px; border-bottom: 3px double ${RULE};">
      <div style="display: flex; align-items: center; gap: 14px;">
        ${markSvg(MARKS[0], 40)}
        <div style="font-size: 30px; letter-spacing: 0.02em;">Marchpast</div>
      </div>
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
      <div style="display: flex; align-items: center; gap: 11px;">
        ${markSvg(MARKS[0], 32)}
        <div style="font-size: 30px; letter-spacing: 0.02em;">Marchpast</div>
      </div>
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
function option(key, text, note, { current = false } = {}) {
  return `<div style="display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border: 1px solid ${current ? RULE : HAIR}; background: ${current ? "rgba(43,36,24,0.04)" : "transparent"};">
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">${key}${current ? " · what ships today" : ""}</div>
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
    <div style="font-size: 20px;">The masthead line</div>
    ${option("L1", "A web app that plays back famous battles as animated 2D “grand strategy” sequences, driven by a reusable JSON timeline format, with the timelines extracted from public-domain primary and secondary sources.", "The concept document's one-liner, lifted whole (src/app/libraryPage.ts). It survived because the name used to carry some of the load. It names the implementation twice — “web app”, “JSON timeline format” — to a reader who came to watch a battle, and at 210 characters it wraps to three lines under the mark.", { current: true })}
    ${option("L2", "Famous battles, played back on the map: the units, their moves and a caption, phase by phase, from public-domain sources.", "What a visitor gets, in the order they will meet it, and it keeps the licence fact that makes the project what it is. Drops “JSON” and “web app”, which the README still carries for the people who want them. Drawn on the masthead artboards.")}
    ${option("L3", "A march-past of famous battles: each one played back on its own map, phase by phase, from the primary sources.", "Spends the name's one available reading — a column filing past while the reviewer stands still — so the word starts to mean something. Risk: a reader who does not know the term learns nothing and now has two unfamiliar things.")}
    ${option("L4", "Watch a battle unfold: units, arrows and a caption at every phase, drawn from public-domain sources.", "The shortest and the most direct, and the only one that opens with a verb aimed at the reader. Drops “famous”, which is doing real work — it is why anyone recognises a name in the list.")}
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 20px;">The title</div>
    ${option("T1", "<code>Marchpast</code> on the library; <code>The Battle of Trafalgar · Marchpast</code> on a battle.", "What ships today. A bare name is a bare name: in a search result, a bookmark bar or a shared tab, it says nothing, and now the name says nothing either.", { current: true })}
    ${option("T2", "<code>Marchpast — famous battles, played back on the map</code> on the library; the battle title unchanged.", "The library's title is the one that gets indexed and shared, so it carries the line; a battle page already has a self-explaining title and needs no tagline behind it.")}
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 20px;">The meta description</div>
    ${option("D1", "There is none.", "<code>index.html</code> has no description tag at all, so a search engine invents one from whatever text it finds first, and the social card has no text to fall back on.", { current: true })}
    ${option("D2", "“Famous battles played back on the map, phase by phase — units, moves and a caption, drawn from public-domain primary sources. Cannae, the Nile, Copenhagen, Trafalgar.”", "155 characters, which is the length a result snippet keeps. Naming the battles is what makes it findable: nobody searches for “battle playback”, they search for a battle.")}
  </div>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="font-size: 20px;">The README's first paragraph</div>
    <div style="font-size: 13px; font-style: italic; line-height: 1.5;">Already rewritten by the rename (#147) and already the long version: it names the format, the bar, and what the project is not, then points at <code>docs/CONCEPT.md</code>. Nothing here asks it to change — the README's reader is a contributor, not a visitor, and the split between L2 on the masthead and the full paragraph in the README is exactly the split ADR-0020 predicted. The one edit worth making is the sentence order: lead with what a reader sees, not with the phrase “driven by a reusable JSON timeline format”.</div>
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
};

for (const [name, source] of Object.entries(files)) {
  writeFileSync(new URL(name, import.meta.url), source);
}

const canvas = {
  artboards: [
    { file: "Main.dc.html", x: 0, y: 0, w: 1240, h: 1660, title: "The mark · four directions" },
    { file: "Icons.dc.html", x: 1360, y: 0, w: 940, h: 1000, title: "Icons and the manifest" },
    { file: "Words.dc.html", x: 2400, y: 0, w: 940, h: 1420, title: "The words · masthead line, title, description" },
    { file: "SocialCard.dc.html", x: 0, y: 1840, w: 1264, h: 1840, title: "The social card · 1200 × 630" },
    { file: "Masthead.dc.html", x: 1380, y: 1840, w: 1024, h: 1000, title: "The library masthead · desktop" },
    { file: "Phone.dc.html", x: 2520, y: 1840, w: 390, h: 1010, title: "The library masthead · phone, 390" },
  ],
  annotations: [
    {
      id: "brief",
      x: 0,
      y: -230,
      w: 1240,
      text: "BRAND · issue #135 on the v0.3 map (#121).\nThe name is settled (Marchpast, ADR-0020) and the domain is live (marchpast.com, #136), so everything here is drawable and the card can print the domain.\nThe engraved system of #58 governs: one face, IM Fell English; ink #2b2418 on parchment #efe3c6; the plate's doubled rule; no bold anywhere. The library keeps one look and does not follow the view (map #121), so none of this is themed.",
    },
    {
      id: "decide",
      x: 1360,
      y: 1080,
      w: 940,
      text: "TO DECIDE\n1. Which mark: A The Review, B The Cartouche, C The Arrow, D The Rose — or none, and the wordmark alone.\n2. Which masthead line, L1 to L4 (the Words sheet). This is the one that matters most: it is now the only thing on the page that explains the app.\n3. The social card: S1 the plate behind, or S2 the plate alone.\n4. Whether the head carries a third line linking to the story, as drawn, or whether that link stays in the credit footer where the GitHub link already is.\n5. The title and the meta description, T1/T2 and D1/D2.",
    },
    {
      id: "masthead-note",
      x: 1380,
      y: 1690,
      w: 1024,
      text: "The masthead is drawn at the real measure and the real ramp: 736px container, 56/24/40 padding, name 30, idea 15 italic, the 3px doubled rule under the head, entries at 20/12 with a 1px hairline between — every value read out of src/app/library.css rather than chosen here. The only new things are the mark, the third line, and L2 in place of L1. Four battles are what the library holds today; grouping at seven is #129, not this ticket.",
    },
  ],
  launch: { view: "canvas" },
};

writeFileSync(new URL("canvas.json", import.meta.url), `${JSON.stringify(canvas, null, 2)}\n`);
console.log(`wrote ${Object.keys(files).length} artboards and canvas.json`);
