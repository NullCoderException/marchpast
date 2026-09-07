/**
 * The site reads no operating-system preference — not `prefers-reduced-motion`
 * and not `prefers-color-scheme` — and this is the test that keeps it true
 * (ADR-0029).
 *
 * Both are one line to add and neither is visible in a review of a diff, so
 * the rule is asserted over the source rather than trusted. It is a rule about
 * *user preferences* only: `@media (max-width: …)` is how the plate, the band
 * and the strip collapse for a phone, and nothing here touches it.
 *
 * The reasons are the ADR's, and they are not oversights. Every motion in
 * Marchpast is requested — there is no transition, animation or keyframe in
 * either stylesheet, `initialState` opens paused, and a phase jump cuts where
 * playback tweens — so a reduced-motion query would have nothing to suppress
 * but the product. And a view cannot be derived from two values: there are
 * three views and a fourth coming, and mapping a light/dark bit onto them
 * needs a table of which views are dark, which is the code counting aesthetics
 * that ADR-0021 forbids.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Every file the site's look can be written in: the sources, the stylesheets and the one page. */
function siteFiles(): string[] {
  const found: string[] = [path.join(ROOT, "index.html")];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
      } else if (/\.(ts|css|html)$/.test(entry.name)) {
        found.push(full);
      }
    }
  };
  walk(path.join(ROOT, "src"));
  return found;
}

/** Where a user-preference media query is written, as `path:line`. */
function preferenceQueries(): string[] {
  const hits: string[] = [];
  for (const file of siteFiles()) {
    // This file names the pattern it forbids, so it cannot be its own witness.
    if (file === import.meta.filename) continue;
    for (const [index, line] of fs.readFileSync(file, "utf-8").split("\n").entries()) {
      if (/@media[^;{]*\(\s*(prefers-|forced-colors)/.test(line)) hits.push(`${path.relative(ROOT, file)}:${index + 1}`);
    }
  }
  return hits;
}

describe("the operating-system preferences the site reads", () => {
  it("are none: no `@media (prefers-…)` anywhere in the sources, the stylesheets or index.html", () => {
    expect(preferenceQueries()).toEqual([]);
  });

  it("finds the files it is looking through, so an empty answer is a fact and not a bad path", () => {
    const files = siteFiles().map((file) => path.relative(ROOT, file).replaceAll("\\", "/"));
    expect(files).toContain("index.html");
    expect(files).toContain("src/player/player.css");
    expect(files).toContain("src/app/library.css");
  });
});

describe("the surface declines forced colours rather than querying them", () => {
  it("opts the strip and the details panel out, so the plate and the strip stay one object", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/player/player.css"), "utf-8");
    expect(css).toMatch(/\.st-controls,\s*\n\.st-details \{[^}]*forced-color-adjust: none;/);
  });
});
