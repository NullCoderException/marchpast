// Throwaway: turn a built artboard into a standalone page a browser can render, so the drawing can be
// checked before the canvas is published. Lifts the chosen <sc-if> branch, drops the <x-dc>/<helmet>
// wrappers the editor supplies at render time, and resolves the {{face}} hole to a literal stack.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FACES = {
  plex: `"IBM Plex Sans Condensed","Arial Narrow",sans-serif`,
  archivo: `"Archivo","Helvetica Neue",Arial,sans-serif`,
  barlow: `"Barlow Condensed","Arial Narrow",sans-serif`,
};

const [file, out, branch = "", faceKey = "plex"] = process.argv.slice(2);
const src = readFileSync(join(HERE, file), "utf8");
let body = src.slice(src.indexOf("<x-dc>") + 6, src.indexOf("</x-dc>"));
body = body.replace(/<helmet>[\s\S]*?<\/helmet>/, "");

// One branch, or the first if none is named.
const open = branch ? `<sc-if value="{{ ${branch} }}"` : `<sc-if `;
const i = body.indexOf(open);
if (i >= 0) {
  const start = body.indexOf(">", i) + 1;
  const end = body.indexOf("</sc-if>", start);
  const inner = body.slice(start, end);
  // Keep only the wrapper around the branches, never the branches before this one.
  body = body.slice(0, body.indexOf("<sc-if ")) + inner + body.slice(body.lastIndexOf("</sc-if>") + 8);
}
body = body.replaceAll("{{face}}", FACES[faceKey]);

const head = `<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;500;600&family=Archivo:wdth,wght@75,400;75,500;75,600&family=Barlow+Condensed:wght@400;500;600&display=swap" rel="stylesheet">
<style>body{margin:0;background:#c8c1ab;font-family:${FACES[faceKey]};color:#2f3134}svg text{font-family:inherit}</style>`;
writeFileSync(join(HERE, out), `<!doctype html><html><head>${head}</head><body>${body}</body></html>`);
console.log(`${out}: ${(body.length / 1024).toFixed(0)} KB`);
