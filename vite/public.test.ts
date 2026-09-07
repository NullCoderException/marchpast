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
    const head = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
    expect(head).toContain('<meta property="og:image" content="https://marchpast.com/social-card.png" />');
  });
});
