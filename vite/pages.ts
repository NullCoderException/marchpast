/**
 * A page per battle: `dist/<name>/index.html`, the same document over the same
 * bundle with its own head (ADR-0028). `marchpast.com/trafalgar/` is a real
 * URL with Trafalgar's title, its own description and its own card, which is
 * the only way a static host can let a battle's link unfurl as that battle —
 * a crawler never runs the app, and a `<meta>` cannot vary with a query
 * string.
 *
 * **What varies is one block.** `index.html` marks it between
 * `head:page:begin` and `head:page:end`; everything else — the icons, the
 * theme colour, the ground script, the styles, the body and the bundle Vite
 * injected — is copied through untouched. The document is taken *after* the
 * build has injected its asset tags (`transformIndexHtml`, `order: "post"`),
 * so the battle pages carry the same hashed script and stylesheet as the
 * library's; and since #136 deleted the base path, the absolute `/assets/…`
 * and `/data/…` URLs in it work at any depth, which is what makes the copy
 * legitimate.
 *
 * **The origin is a constant.** `og:image` and `og:url` must be absolute, and
 * #136 established `marchpast.com` as the one canonical origin with `.app` and
 * `.org` 301ing to it, so there is nothing to vary and nothing to configure.
 *
 * The dev server emits none of this: Vite's SPA fallback serves the
 * untransformed `index.html` for `/trafalgar/` and the app reads the path, so
 * dev and the build agree about the route while differing about the head —
 * which is the half of the document only a crawler reads.
 */
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { battleSegment, type LibraryEntry } from "../src/data/library.ts";
import { readLibrary } from "./library.ts";
import { CARD, cardAlt, readBattle } from "./stills.ts";

/**
 * The site's one canonical origin, hardcoded (ADR-0028). A local build emits
 * absolute URLs at the live site, which is correct for the only consumer there
 * is: a crawler resolves `og:image` against nothing.
 */
export const CANONICAL_ORIGIN = "https://marchpast.com";

/** What every page calls the site, on `og:site_name`. */
const SITE_NAME = "Marchpast";

/** The markers in `index.html` between which a page's own head sits. */
export const HEAD_BEGIN = "<!-- head:page:begin -->";
export const HEAD_END = "<!-- head:page:end -->";

/**
 * Where a battle's page is written, relative to the build's output directory,
 * always with forward slashes.
 *
 * The **raw** name, not `battleSegment`'s: a host serves the file `the nile/`
 * at the URL `/the%20nile/`, so escaping it here would put the escape on the
 * disk and the URL would have to be escaped twice to reach it. The escaping
 * belongs to the URL, which is where `battleSegment` is used.
 */
export function battlePageFile(name: string): string {
  return `${name}/index.html`;
}

/** The absolute URL a battle's page is served at: what `og:url` and the canonical carry. */
export function battleUrl(name: string): string {
  return `${CANONICAL_ORIGIN}/${battleSegment(name)}`;
}

/** The absolute URL of a battle's social card, which `vite/stills.ts` writes beside the thumbnails. */
export function cardUrl(name: string): string {
  return `${CANONICAL_ORIGIN}/data/cards/${encodeURIComponent(name)}.png`;
}

/** Text as an attribute value: a battle's own words reach the head verbatim, so they are escaped rather than trusted. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * One battle's head, as the lines that replace the marked block.
 *
 * The `<title>` carries the site's name after the battle's, matching what
 * `main.ts` sets at runtime, so the tab does not change its mind when the
 * bundle arrives. `og:title` carries the battle's name **bare**: every preview
 * client prints `og:site_name` or the domain on its own line, and the suffix
 * would set the name twice inside a box three lines tall (ADR-0028).
 */
export function battleHead(entry: LibraryEntry, alt: string): string {
  const title = escapeHtml(entry.title);
  const summary = escapeHtml(entry.summary);
  const url = battleUrl(entry.name);
  return [
    `<title>${title} — ${SITE_NAME}</title>`,
    `<meta name="description" content="${summary}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${summary}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${cardUrl(entry.name)}" />`,
    `<meta property="og:image:width" content="${CARD.width}" />`,
    `<meta property="og:image:height" content="${CARD.height}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<link rel="canonical" href="${url}" />`,
  ].join("\n    ");
}

/**
 * The library's document with the marked block swapped for `head`. Throws when
 * the markers are not there or are the wrong way round: a page emitted with
 * the library's head would unfurl every battle as the site, which is the exact
 * failure ADR-0028 exists to end, and it would look like a working build.
 */
export function pageHtml(indexHtml: string, head: string): string {
  const begin = indexHtml.indexOf(HEAD_BEGIN);
  const end = indexHtml.indexOf(HEAD_END, begin + HEAD_BEGIN.length);
  if (begin === -1 || end === -1) {
    throw new Error(`Marchpast: index.html must mark its own head between ${HEAD_BEGIN} and ${HEAD_END}.`);
  }
  return indexHtml.slice(0, begin + HEAD_BEGIN.length) + `\n    ${head}\n    ` + indexHtml.slice(end);
}

/** One emitted page: where it goes under the output directory, and what is in it. */
export interface BattlePage {
  /** Relative to the build's output directory, always with forward slashes. */
  file: string;
  html: string;
}

/**
 * A page for every battle in the library, built over the transformed
 * `index.html`.
 *
 * The library is the list, exactly as it is for the stills, so the pages the
 * build writes are exactly the battles the front door links to. The battle
 * file is read again here for the card's alt, which is written from the whole
 * battle rather than from its library entry; a battle the library lists and
 * the disk does not hold **fails the build**, as it does in `stills.ts`.
 */
export function battlePages(dataDir: string, indexHtml: string): BattlePage[] {
  return readLibrary(dataDir).map((entry) => {
    const source = readBattle(dataDir, entry.name);
    if (source === undefined) throw new Error(`Marchpast: the library lists ${entry.name}, which has no battle file.`);
    return { file: battlePageFile(entry.name), html: pageHtml(indexHtml, battleHead(entry, cardAlt(source.battle))) };
  });
}

/**
 * The plugin. A build-time thing only: in dev the fallback serves the library's
 * own document for every path, which is what makes `/trafalgar/` work there
 * without any of this.
 */
export function pages(): Plugin {
  let dataDir = "";
  let outDir = "";
  let indexHtml: string | undefined;

  return {
    name: "marchpast:pages",
    apply: "build",

    configResolved(config) {
      dataDir = path.resolve(config.root, "data");
      outDir = path.resolve(config.root, config.build.outDir);
    },

    // `post`, so what is copied is the document Vite finished with: the bundle's
    // own `<script>` and `<link>` are already in it.
    transformIndexHtml: {
      order: "post",
      handler(html) {
        indexHtml = html;
      },
    },

    // `closeBundle` rather than `writeBundle`, for the reason `stills.ts` gives:
    // the pages land after everything else has written whatever it writes.
    closeBundle() {
      if (indexHtml === undefined || !fs.existsSync(dataDir)) return;
      for (const page of battlePages(dataDir, indexHtml)) {
        const file = path.join(outDir, page.file);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, page.html);
      }
    },
  };
}
