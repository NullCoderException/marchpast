// Renders every artboard the way the canvas will, and screenshots it: the holes
// resolved for one chip setting, the <sc-if> branches cut to the live one, the
// helmet lifted into <head>. `node check.mjs [derivation] [chooser]`.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VIEWS, surface } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODE = process.argv[2] ?? "decided";
const CHOOSER = process.argv[3] ?? "native";
const CDP = 9334;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = join(HERE, ".chrome-check");

const BOARDS = [
  { file: "Main", view: "plate", w: 1120, h: 810 },
  { file: "Night", view: "night", w: 1120, h: 810 },
  { file: "Atlas", view: "atlas", w: 1120, h: 850 },
  { file: "Staff", view: "staff", w: 1120, h: 780 },
  { file: "PhonePlate", view: "plate", w: 390, h: 844 },
  { file: "PhoneStaff", view: "staff", w: 390, h: 844 },
  { file: "Tokens", view: "plate", w: 1180, h: 1010 },
  { file: "Choosers", view: "plate", w: 1440, h: 1180 },
  { file: "Details", view: "plate", w: 1120, h: 1180 },
  { file: "Boundary", view: "plate", w: 1180, h: 1200 },
];

/** The runtime, in the small part this prototype uses: holes and one level of <sc-if>. */
function resolve(source, view) {
  const s = surface(view, MODE);
  const vals = {
    ...s,
    face: view.face,
    stretch: view.stretch,
    isNative: CHOOSER === "native",
    isCaret: CHOOSER === "caret",
    isDrawn: CHOOSER === "drawn",
  };
  let body = source.slice(source.indexOf("<x-dc>") + 6, source.indexOf("</x-dc>"));
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(body);
  const headExtra = helmet === null ? "" : helmet[1];
  body = body.replace(/<helmet>[\s\S]*?<\/helmet>/, "");
  body = body.replace(/<sc-if value="\{\{(\w+)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/g, (_, key, inner) =>
    vals[key] ? inner : "",
  );
  body = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in vals ? String(vals[key]) : m));
  // The canvas resolves a bare filename against its own files; a preview on disk sits one level down.
  body = body.replaceAll('src="', 'src="../');
  return `<!doctype html><html><head><meta charset="utf-8">${headExtra}</head><body>${body}</body></html>`;
}

mkdirSync(join(HERE, "preview"), { recursive: true });
mkdirSync(join(HERE, "stills"), { recursive: true });
for (const b of BOARDS) {
  const src = readFileSync(join(HERE, `${b.file}.dc.html`), "utf8");
  writeFileSync(join(HERE, "preview", `${b.file}.html`), resolve(src, VIEWS[b.view]));
}

// --- shoot ----------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Client {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      const p = this.pending.get(m.id);
      if (p === undefined) return;
      this.pending.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  }
}
async function until(fn, what, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      if (await fn()) return;
    } catch {
      /* not ready */
    }
    await sleep(300);
  }
  throw new Error(`timed out waiting for ${what}`);
}

const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${CDP}`,
    `--user-data-dir=${PROFILE}`,
    "--headless=new",
    "--no-first-run",
    "--disable-gpu",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let target;
await until(async () => {
  const list = await fetch(`http://127.0.0.1:${CDP}/json/list`).then((r) => r.json());
  target = list.find((t) => t.type === "page");
  return target !== undefined;
}, "the debugging endpoint");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
const c = new Client(ws);
await c.send("Page.enable");
await c.send("Runtime.enable");

for (const b of BOARDS) {
  await c.send("Emulation.setDeviceMetricsOverride", {
    width: b.w,
    height: b.h,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const url = "file:///" + join(HERE, "preview", `${b.file}.html`).replaceAll("\\", "/");
  await c.send("Page.navigate", { url });
  await until(() => c.evaluate(`document.readyState === "complete"`), `${b.file}: load`);
  // A webfont is fetched only when something is laid out in it, and `fonts.status`
  // reads "loaded" before anything has been asked for — so ask, then wait.
  await c.evaluate(
    `Promise.allSettled([document.fonts.load('16px "IM Fell English"'), document.fonts.load('italic 16px "IM Fell English"'),` +
      ` document.fonts.load('16px Archivo'), document.fonts.load('600 16px Archivo')])` +
      `.then(() => document.fonts.ready).then(() => true)`,
  );
  await sleep(600);
  const { data } = await c.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(join(HERE, "stills", `${b.file}.png`), Buffer.from(data, "base64"));
  const size = await c.evaluate(
    `JSON.stringify({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })`,
  );
  const stripH = await c.evaluate(
    `(() => { const s = [...document.querySelectorAll("div")].find((d) => d.style.borderTop && d.style.flexWrap === "wrap");` +
      ` return s ? Math.round(s.getBoundingClientRect().height) : 0; })()`,
  );
  console.log(b.file.padEnd(12), "content", size, "frame", `${b.w}x${b.h}`, stripH ? `strip ${stripH}` : "");
}

await c.send("Browser.close").catch(() => {});
ws.close();
chrome.kill();
console.log("stills written");
