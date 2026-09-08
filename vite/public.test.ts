/**
 * What the site ships beside its code: the mark as an icon set, the manifest
 * that makes it installable, and the card a link unfurls to (#135). Vite
 * copies `public/` into the build output wholesale, and the manifest names
 * those files by URL, so the two facts worth holding are that the build really
 * carries every one of them and that the manifest points at nothing else.
 *
 * An icon whose file is a different size than the manifest claims is the
 * failure that does not show: the page looks right and the install prompt does
 * not come, so each PNG is measured rather than trusted.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build } from "vite";
import { afterAll, describe, expect, it } from "vitest";
import { markSvg } from "../src/app/mark.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

/** The manifest, read as the browser reads it: parsed, or the test fails here. */
interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}
interface Manifest {
  name: string;
  short_name: string;
  description: string;
  display: string;
  start_url: string;
  scope: string;
  theme_color: string;
  background_color: string;
  icons: Icon[];
}
const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, "site.webmanifest"), "utf-8")) as Manifest;

/** The head, as the crawlers read it. */
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");

/** What a static host answers with for a name the site does not hold (ADR-0028). */
const NOT_FOUND = fs.readFileSync(path.join(PUBLIC, "404.html"), "utf-8");

/**
 * The Library's stylesheet, which the 404 page copies its materials from. A
 * document with no bundle cannot import it, so the copy is held to this
 * original by reading the original rather than by repeating its values here.
 */
const LIBRARY_CSS = fs.readFileSync(path.join(ROOT, "src", "app", "library.css"), "utf-8");

/** The value `library.css` declares for one of its custom properties. */
function libraryToken(name: string): string {
  const declared = new RegExp(`--${name}:\\s*([^;]+);`).exec(LIBRARY_CSS)?.[1];
  if (declared === undefined) throw new Error(`library.css no longer declares --${name}`);
  return declared.trim();
}

/** A PNG's real pixel box, straight out of its header. */
function pngSize(file: string): string {
  const bytes = fs.readFileSync(file);
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

/** The file an icon's URL names, which is always at the root of the site. */
function iconFile(icon: Icon): string {
  return path.join(PUBLIC, icon.src.replace(/^\//, ""));
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "marchpast-public-"));
afterAll(() => fs.rmSync(outDir, { recursive: true, force: true }));

describe("the build's output", () => {
  it("carries every file in public/, byte for byte", async () => {
    await build({ root: ROOT, logLevel: "silent", build: { outDir, emptyOutDir: false } });
    const files = fs.readdirSync(PUBLIC);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(fs.existsSync(path.join(outDir, file)), `${file} is not in the build`).toBe(true);
      expect(fs.readFileSync(path.join(outDir, file))).toEqual(fs.readFileSync(path.join(PUBLIC, file)));
    }
  }, 60_000);
});

describe("the web app manifest", () => {
  it("names the app, opens at the library, and takes the plate's own ground", () => {
    expect(manifest.name).toBe("Marchpast");
    expect(manifest.short_name).toBe("Marchpast");
    expect(manifest.display).toBe("standalone");
    // The library is the front door and there is no default battle (ADR-0011).
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    // The parchment, not the ink: an installed window frames the plate.
    expect(manifest.theme_color).toBe("#efe3c6");
    expect(manifest.background_color).toBe("#efe3c6");
    expect(manifest.description).toMatch(/^Famous battles played back on the map/);
  });

  it("lists six icons: the two cuts of the mark, the two app sizes, the maskable tile and the touch icon", () => {
    expect(manifest.icons.map((icon) => `${icon.src} ${icon.sizes} ${icon.purpose}`)).toEqual([
      "/favicon.svg any any",
      "/favicon-32.png 32x32 any",
      "/icon-192.png 192x192 any",
      "/icon-512.png 512x512 any",
      "/icon-512-maskable.png 512x512 maskable",
      "/apple-touch-icon.png 180x180 any",
    ]);
  });

  it("names only files the site ships, each drawn at the size it claims", () => {
    for (const icon of manifest.icons) {
      expect(fs.existsSync(iconFile(icon)), `${icon.src} is not in public/`).toBe(true);
      if (icon.type === "image/png") expect(pngSize(iconFile(icon)), icon.src).toBe(icon.sizes);
    }
  });

  it("carries what an installable app is asked for: a 192, a 512 and a maskable tile", () => {
    const any = manifest.icons.filter((icon) => icon.purpose === "any").map((icon) => icon.sizes);
    expect(any).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});

describe("the social card", () => {
  it("is the 1200 by 630 every preview crawler asks for", () => {
    expect(pngSize(path.join(PUBLIC, "social-card.png"))).toBe("1200x630");
  });

  it("is the image index.html hands the crawlers, at an absolute URL", () => {
    // A crawler resolves og:image against nothing: a relative path unfurls as no image at all.
    expect(INDEX).toContain('<meta property="og:image" content="https://marchpast.com/social-card.png" />');
  });
});

describe("the 404 page", () => {
  it("says what happened and offers the one way on", () => {
    expect(NOT_FOUND).toContain('<h1 class="st-404-head">No such battle</h1>');
    expect(NOT_FOUND).toMatch(/<a[^>]*href="\/"/);
  });

  it("names itself on the middle dot a page's own title takes (#135)", () => {
    expect(NOT_FOUND).toContain("<title>No such battle · Marchpast</title>");
  });

  it("carries no bundle: it is a document, not the app", () => {
    expect(NOT_FOUND).not.toContain("<script");
  });

  it("draws the mark character for character, since a plain document cannot import it", () => {
    // `markSvg` is the drawing (src/app/mark.ts); this copy is the only one on
    // the site that no module can build, so it is held to the original here.
    expect(NOT_FOUND).toContain(markSvg(40));
  });

  it("is on the Library's own parchment, ink and type stack, and never a view's", () => {
    // Read out of library.css, so editing the Library's tones turns this red
    // rather than leaving the two pages quietly different (ADR-0029).
    expect(NOT_FOUND).toContain(libraryToken("st-parchment"));
    expect(NOT_FOUND).toContain(libraryToken("st-ink"));
    const stack = /font-family:\s*([^;]+);/.exec(LIBRARY_CSS)?.[1]?.trim() ?? "";
    expect(stack).not.toBe("");
    expect(NOT_FOUND).toContain(stack);
  });
});

describe("the description", () => {
  it("is one sentence, in the three places that cannot import it from each other", () => {
    // index.html's meta description and og:description; the manifest's own.
    const copies = [...INDEX.matchAll(/content="(Famous battles[^"]*)"/g)].map((match) => match[1] ?? "");
    expect(copies).toHaveLength(2);
    for (const copy of copies) expect(copy).toBe(manifest.description);
  });
});
