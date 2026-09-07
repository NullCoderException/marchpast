// The two faces, embedded rather than linked. A webfont fetched over the network
// is not there when the iframe first lays out, and a `<select>`'s intrinsic width
// is computed from its options in whatever face is available at that moment and
// not recomputed afterwards — which silently widened every chooser by about 5%
// and made the phone strip wrap to a fifth row it does not have in the app.
//
// IM Fell English is the app's own bundled file (src/fonts, SIL OFL 1.1), which
// is also what "match the real thing" means here. Archivo is fetched once from
// Google Fonts into ./archivo-75.woff2 and committed beside this file; run
// `node fonts.mjs --fetch` to refresh it.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FELL = join(REPO, "src", "fonts", "IMFellEnglish-Regular.woff2");
const ARCHIVO = join(HERE, "archivo-75.woff2");

if (process.argv.includes("--fetch")) {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75,400;75,500;75,600&display=swap",
    { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36" } },
  ).then((r) => r.text());
  // The last block css2 returns is `latin`; take its url and no other.
  const urls = [...css.matchAll(/src:\s*url\((https:[^)]+\.woff2)\)/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error("no woff2 in the Google Fonts css");
  const body = Buffer.from(await fetch(urls[urls.length - 1]).then((r) => r.arrayBuffer()));
  writeFileSync(ARCHIVO, body);
  console.log("archivo-75.woff2", body.length, "bytes from", urls[urls.length - 1]);
}

const dataUri = (file) => `data:font/woff2;base64,${readFileSync(file).toString("base64")}`;

/**
 * The `@font-face` block every artboard carries. Only the regular weight of IM
 * Fell English is bundled by the app, so an italic reference synthesises an
 * oblique exactly as the app's does.
 */
export function faceBlock() {
  const fell =
    `@font-face { font-family: "IM Fell English"; font-style: normal; font-weight: 400;` +
    ` font-display: block; src: url(${dataUri(FELL)}) format("woff2"); }`;
  if (!existsSync(ARCHIVO)) {
    console.warn("archivo-75.woff2 missing: run `node fonts.mjs --fetch`; the staff boards fall back");
    return fell;
  }
  return (
    fell +
    `@font-face { font-family: "Archivo"; font-style: normal; font-weight: 400 600;` +
    ` font-stretch: 62% 125%; font-display: block; src: url(${dataUri(ARCHIVO)}) format("woff2"); }`
  );
}
