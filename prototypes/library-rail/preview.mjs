/** Turns a .dc.html artboard into a plain page so it can be looked at in a browser before the canvas is published. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, "preview"), { recursive: true });
for (const name of process.argv.slice(2)) {
  const src = readFileSync(join(here, `${name}.dc.html`), "utf8");
  const style = src.match(/<style>([\s\S]*?)<\/style>/)[1];
  const body = src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/)[1];
  writeFileSync(
    join(here, "preview", `${name}.html`),
    `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap" rel="stylesheet">
<style>${style}</style></head><body>${body}</body></html>`,
  );
  console.log(`preview/${name}.html`);
}
