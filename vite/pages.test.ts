/**
 * The page per battle: what its head says, that the rest of the document is
 * copied through untouched, and that the build writes one file per battle the
 * library lists (ADR-0028).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { battleSegment } from "../src/data/library.ts";
import { MINIMAL_BATTLE } from "../src/schema/examples.ts";
import type { Battle, SortDate } from "../src/schema/types.ts";
import {
  battleHead,
  battlePageFile,
  battlePages,
  battleUrl,
  CANONICAL_ORIGIN,
  cardUrl,
  escapeHtml,
  HEAD_BEGIN,
  HEAD_END,
  pageHtml,
} from "./pages.ts";
import { CARD, cardAlt } from "./stills.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

/** The site's own document, which the build's pages are copies of. */
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");

/** A data directory, thrown away after each test. */
let dataDir: string;

beforeEach(() => {
  dataDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "marchpast-pages-")), "data");
});

afterEach(() => {
  fs.rmSync(path.dirname(dataDir), { recursive: true, force: true });
});

/** Writes `battles/<name>.json`: the minimal example, titled and dated, and naming no map, so nothing else has to be on the disk. */
function writeBattle(name: string, sort_date: SortDate, fields: Partial<Battle> = {}): Battle {
  const battle: Battle = { ...structuredClone(MINIMAL_BATTLE), title: `The Battle of ${name}`, sort_date, ...fields };
  delete battle.map;
  const file = path.join(dataDir, "battles", `${name}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(battle, null, 2));
  return battle;
}

/** A document of the same shape as the site's, without the weight of it. */
function fakeIndex(head: string): string {
  return `<!doctype html>\n<html>\n  <head>\n    ${HEAD_BEGIN}\n    ${head}\n    ${HEAD_END}\n    <link rel="icon" href="/favicon.svg" />\n  </head>\n  <body><script src="/assets/index-abc123.js"></script></body>\n</html>\n`;
}

describe("a battle's head", () => {
  it("says what the page is, whose it is, and what it unfurls as", () => {
    const battle = writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    const entry = { name: "trafalgar", title: battle.title, date: "21 October 1805", sort_date: battle.sort_date, summary: battle.summary, sides: [] };
    const head = battleHead(entry, "a picture of it");

    expect(head).toContain("<title>The Battle of trafalgar — Marchpast</title>");
    expect(head).toContain(`<meta name="description" content="${battle.summary}" />`);
    expect(head).toContain('<meta property="og:type" content="website" />');
    expect(head).toContain('<meta property="og:site_name" content="Marchpast" />');
    // Bare: every client prints the site name on its own line already (ADR-0028).
    expect(head).toContain('<meta property="og:title" content="The Battle of trafalgar" />');
    expect(head).toContain(`<meta property="og:description" content="${battle.summary}" />`);
    expect(head).toContain('<meta property="og:url" content="https://marchpast.com/trafalgar/" />');
    expect(head).toContain('<meta property="og:image" content="https://marchpast.com/data/cards/trafalgar.png" />');
    expect(head).toContain(`<meta property="og:image:width" content="${CARD.width}" />`);
    expect(head).toContain(`<meta property="og:image:height" content="${CARD.height}" />`);
    expect(head).toContain('<meta property="og:image:alt" content="a picture of it" />');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(head).toContain('<link rel="canonical" href="https://marchpast.com/trafalgar/" />');
  });

  it("escapes a battle's own words rather than trusting them", () => {
    expect(escapeHtml('Villeneuve & "the line" <br>')).toBe("Villeneuve &amp; &quot;the line&quot; &lt;br&gt;");
    const entry = { name: "x", title: 'A "battle"', date: "", sort_date: { year: 1, month: 1, day: 1 }, summary: "Ships & men", sides: [] };
    const head = battleHead(entry, "");
    expect(head).toContain("<title>A &quot;battle&quot; — Marchpast</title>");
    expect(head).toContain('<meta property="og:description" content="Ships &amp; men" />');
  });

  it("carries the card's own alt, which the still renderer writes", () => {
    const battle = writeBattle("cannae", { year: -216, month: 8, day: 2 });
    const entry = { name: "cannae", title: battle.title, date: "", sort_date: battle.sort_date, summary: battle.summary, sides: [] };
    expect(battleHead(entry, cardAlt(battle))).toContain(`content="${escapeHtml(cardAlt(battle))}" />`);
  });
});

describe("a battle's page", () => {
  it("is the library's document with nothing but the marked block changed", () => {
    const html = pageHtml(fakeIndex("<title>Marchpast</title>"), "<title>Cannae</title>");
    expect(html).toContain("<title>Cannae</title>");
    expect(html).not.toContain("<title>Marchpast</title>");
    // The bundle, the icons and the body are the library's, copied through.
    expect(html).toContain('<script src="/assets/index-abc123.js"></script>');
    expect(html).toContain('<link rel="icon" href="/favicon.svg" />');
    // The markers survive, so a page is itself a document the swap could be run on again.
    expect(html).toContain(HEAD_BEGIN);
    expect(html).toContain(HEAD_END);
  });

  it("refuses a document that does not mark its head, rather than shipping the library's", () => {
    expect(() => pageHtml("<html><head><title>Marchpast</title></head></html>", "<title>Cannae</title>")).toThrow(/must mark its own head/);
    expect(() => pageHtml(`<html>${HEAD_BEGIN}</html>`, "")).toThrow(/must mark its own head/);
  });
});

describe("the pages the build writes", () => {
  it("is one per battle the library lists, at the battle's own path", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    writeBattle("cannae", { year: -216, month: 8, day: 2 });
    const built = battlePages(dataDir, fakeIndex("<title>Marchpast</title>"));

    expect(built.map((page) => page.file)).toEqual(["cannae/index.html", "trafalgar/index.html"]);
    expect(built[1]?.html).toContain("<title>The Battle of trafalgar — Marchpast</title>");
    expect(built[0]?.html).toContain('<link rel="canonical" href="https://marchpast.com/cannae/" />');
  });

  it("is nothing at all when there are no battle files", () => {
    expect(battlePages(dataDir, fakeIndex(""))).toEqual([]);
  });

  it("fails rather than emitting a page for a battle whose file will not validate", () => {
    writeBattle("broken", { year: 1798, month: 8, day: 1 }, { summary: 7 as unknown as string });
    expect(() => battlePages(dataDir, fakeIndex(""))).toThrow(/broken\.json[\s\S]*\/summary/);
  });
});

describe("the URL shape", () => {
  it("is the app's, so a link the library draws and the page the build writes are the same URL", () => {
    // `battleSegment` is what `src/app/battleName.ts` hangs `battlePath` off.
    expect(battleUrl("trafalgar")).toBe(`${CANONICAL_ORIGIN}/${battleSegment("trafalgar")}`);
    expect(battleUrl("the nile")).toBe("https://marchpast.com/the%20nile/");
  });

  it("puts the escaping on the URL and never on the disk, so the file the host serves is the one written", () => {
    expect(battlePageFile("trafalgar")).toBe("trafalgar/index.html");
    expect(battlePageFile("the nile")).toBe("the nile/index.html");
  });

  it("hangs the card off the same origin, where vite/stills.ts writes it", () => {
    expect(cardUrl("little-bighorn")).toBe("https://marchpast.com/data/cards/little-bighorn.png");
  });
});

describe("the library's own head", () => {
  it("marks itself, so the build has a block to swap", () => {
    expect(INDEX.indexOf(HEAD_BEGIN)).toBeGreaterThan(-1);
    expect(INDEX.indexOf(HEAD_END)).toBeGreaterThan(INDEX.indexOf(HEAD_BEGIN));
  });

  it("keeps the title, the description, the card and the canonical inside the markers, and the icons out", () => {
    const marked = INDEX.slice(INDEX.indexOf(HEAD_BEGIN), INDEX.indexOf(HEAD_END));
    expect(marked).toContain("<title>Marchpast — famous battles, played back on the map</title>");
    expect(marked).toContain('name="description"');
    expect(marked).toContain('<meta property="og:image" content="https://marchpast.com/social-card.png" />');
    expect(marked).toContain('<link rel="canonical" href="https://marchpast.com/" />');
    expect(marked).not.toContain('rel="icon"');
    expect(marked).not.toContain('name="theme-color"');
  });

  it("unfurls as the site and never as a battle: its card is the brand's own", () => {
    expect(INDEX).not.toContain("/data/cards/");
  });
});
