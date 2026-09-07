// Throwaway: lift one <sc-if> branch out of a built artboard so it can be screenshotted on its own.
import { readFileSync, writeFileSync } from "node:fs";
const [file, key, out] = process.argv.slice(2);
const src = readFileSync(file, "utf8");
const open = `<sc-if value="{{ is_${key} }}"`;
const i = src.indexOf(open);
if (i < 0) throw new Error(`no branch ${key} in ${file}`);
const start = src.indexOf(">", i) + 1;
const end = src.indexOf("</sc-if>", start);
const head = `<meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IBM+Plex+Sans+Condensed:wght@400;600&display=swap" rel="stylesheet">`;
const face = file.includes("Staff") ? `"IBM Plex Sans Condensed","Arial Narrow",sans-serif` : `"IM Fell English",Georgia,serif`;
writeFileSync(out, `<html><head>${head}<style>body{margin:0}svg text{font-family:${face}}</style></head><body>${src.slice(start, end)}</body></html>`);
console.log(`${out}: ${((end - start) / 1024).toFixed(0)} KB`);
