/**
 * Exports the brand's static files from the mark's two cuts in `marks.mjs` —
 * the same geometry the canvas is drawn from, imported rather than copied, so
 * the shipped icons and the drawings cannot drift. This is what produced
 * `public/` on `main` for #169; re-run it when the mark changes.
 *
 *   node icons.mjs <out-dir>          # e.g. ../../public in a checkout of main
 *
 * Every file is a headless Chrome screenshot of a page sized to the exact
 * pixel box: the icons on parchment (or transparent, for the favicon), and the
 * library's social card, which is S2 from the canvas. `favicon.svg` is not
 * exported — it is the small cut written out as SVG, and lives in `public/`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INK, PARCHMENT, RULE, MARKS, markSvg } from "./marks.mjs";

/** Chrome, wherever this is run. Override with CHROME=... for a different install. */
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] ?? ".");
const PAGES = path.join(HERE, ".pages");

/** A · The Review, chosen for #135 on 7 September 2026. */
const MARK = MARKS[0];

/** The masthead line, and the domain the card prints. */
const IDEA = "Famous battles, played back on the map — phase by phase, from the sources up.";
const DOMAIN = "marchpast.com";

mkdirSync(OUT, { recursive: true });
mkdirSync(PAGES, { recursive: true });

/** Screenshots one page at an exact box. */
function shoot(name, html, width, height, { transparent = false } = {}) {
  const page = path.join(PAGES, `${name}.html`);
  writeFileSync(page, html);
  execFileSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${width},${height}`,
      `--default-background-color=${transparent ? "00000000" : "efe3c6ff"}`,
      "--virtual-time-budget=4000",
      `--screenshot=${path.join(OUT, `${name}.png`)}`,
      `file:///${page.replaceAll("\\", "/")}`,
    ],
    { stdio: "pipe" },
  );
  console.log(`${name}.png  ${width}x${height}`);
}

/** A page holding one thing, centred in the box. */
function tile(body, { width, height, ground }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; padding: 0; }
    body { width: ${width}px; height: ${height}px; overflow: hidden; ${ground === null ? "" : `background: ${ground};`}
           display: flex; align-items: center; justify-content: center; }
    svg { display: block; }
  </style></head><body>${body}</body></html>`;
}

// ------------------------------------------------------------------ The icons

/**
 * The mark's share of a tile, both ratios straight off the Icons sheet: a
 * plain tile gives the mark the brand's clear space on all four sides (the
 * tick height, 22 of 64), and the maskable tile gives it more, because that is
 * the one every platform crops to its own circle or squircle.
 */
const PLAIN = 68 / 118;
const MASKABLE = 50 / 118;

/** The favicon's PNG: the small cut, the same drawing as favicon.svg, on transparent. */
shoot("favicon-32", tile(markSvg(MARK, 32, { small: true }), { width: 32, height: 32, ground: null }), 32, 32, {
  transparent: true,
});

for (const size of [192, 512]) {
  shoot(
    `icon-${size}`,
    tile(markSvg(MARK, Math.round(size * PLAIN)), { width: size, height: size, ground: PARCHMENT }),
    size,
    size,
  );
}

shoot(
  "icon-512-maskable",
  tile(markSvg(MARK, Math.round(512 * MASKABLE)), { width: 512, height: 512, ground: PARCHMENT }),
  512,
  512,
);

/** iOS rounds the touch icon itself and composites a transparent one onto black, so it ships square and opaque. */
shoot(
  "apple-touch-icon",
  tile(markSvg(MARK, Math.round(180 * PLAIN)), { width: 180, height: 180, ground: PARCHMENT }),
  180,
  180,
);

// ------------------------------------------------------------- The social card

/**
 * S2: mark and wordmark over the doubled rule, the idea line, the domain at
 * the foot, on parchment. The lockup's drop is the rule the masthead uses —
 * the mark's baseline on the wordmark's — computed from the two sizes.
 */
const CARD_MARK = 128;
const CARD_TYPE = 104;
const drop = Math.round(0.219 * CARD_MARK - 0.205 * CARD_TYPE);

shoot(
  "social-card",
  `<!doctype html><html><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap" rel="stylesheet">
  <style>
    html, body { margin: 0; padding: 0; }
    body { width: 1200px; height: 630px; overflow: hidden; background: ${PARCHMENT}; color: ${INK};
           font-family: "IM Fell English", Georgia, "Times New Roman", serif; }
    .card { width: 1200px; height: 630px; box-sizing: border-box; padding: 64px; display: flex;
            flex-direction: column; justify-content: center; align-items: center; gap: 30px; }
    .lockup { display: flex; align-items: flex-end; gap: ${Math.round(CARD_MARK * 0.35)}px; }
    .mark { line-height: 0; margin-bottom: -${drop}px; }
    .name { font-size: ${CARD_TYPE}px; line-height: 1.15; letter-spacing: 0.02em; }
    .rule { width: 720px; border-top: 3px double ${RULE}; }
    .idea { font-size: 30px; font-style: italic; text-align: center; max-width: 900px; line-height: 1.4; }
    .domain { font-size: 20px; font-style: italic; }
    svg { display: block; }
  </style></head><body>
  <div class="card">
    <div class="lockup"><span class="mark">${markSvg(MARK, CARD_MARK)}</span><span class="name">Marchpast</span></div>
    <div class="rule"></div>
    <div class="idea">${IDEA}</div>
    <div class="domain">${DOMAIN}</div>
  </div>
</body></html>`,
  1200,
  630,
);
