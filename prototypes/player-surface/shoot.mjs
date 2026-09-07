// Captures the plate at the width the artboards are laid out at, so the picture
// and the strip drawn beneath it are at one scale. Drives Chrome over the
// DevTools protocol; no packages. `node shoot.mjs <vite-port>`.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] ?? 5199);
const CDP = 9333;
const WIDTH = 1120;
const HEIGHT = 780;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = join(HERE, ".chrome-player-surface");

const SHOTS = [
  { name: "plate", battle: "trafalgar", view: "Chart plate", phase: 5 },
  { name: "night", battle: "trafalgar", view: "Night plate", phase: 5 },
  { name: "atlas", battle: "cannae", view: "Atlas", phase: 6 },
];

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
      if (m.error) p.reject(new Error(JSON.stringify(m.error)));
      else p.resolve(m.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.result));
    return r.result.value;
  }
}

/** Polls rather than sleeping: a cold Vite server takes seconds over its first module graph. */
async function until(fn, what, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      if (await fn()) return;
    } catch {
      /* the page may not have a document yet */
    }
    await sleep(400);
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
    `--window-size=${WIDTH},${HEIGHT}`,
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
await c.send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 1,
  mobile: false,
});

mkdirSync(join(HERE, "shots"), { recursive: true });

for (const shot of SHOTS) {
  await c.send("Page.navigate", { url: `http://localhost:${PORT}/?battle=${shot.battle}` });
  await until(() => c.evaluate(`!!document.querySelector(".st-controls")`), `${shot.name}: the strip`);
  await until(() => c.evaluate(`document.querySelectorAll(".st-tick").length > 0`), `${shot.name}: the ticks`);
  // The fonts block the first frame, so give the plate a moment after the strip lands.
  await sleep(1200);

  // Pause first: a playing clock moves the picture between the click and the shot.
  await c.evaluate(`(() => {
    const play = document.querySelector(".st-play");
    if (play && play.textContent === "Pause") play.click();
    return true;
  })()`);

  await c.evaluate(`(() => {
    const sel = [...document.querySelectorAll(".st-controls select")]
      .find((s) => [...s.options].some((o) => o.textContent === ${JSON.stringify(shot.view)}));
    if (!sel) throw new Error("no view chooser");
    sel.value = [...sel.options].find((o) => o.textContent === ${JSON.stringify(shot.view)}).value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelectorAll(".st-tick")[${shot.phase}].click();
    return true;
  })()`);
  await sleep(1400);

  const { data } = await c.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(join(HERE, "shots", `${shot.name}.png`), Buffer.from(data, "base64"));

  const strip = await c.evaluate(
    `Math.round(document.querySelector(".st-controls").getBoundingClientRect().top)`,
  );
  const wrapped = await c.evaluate(
    `Math.round(document.querySelector(".st-controls").getBoundingClientRect().height)`,
  );
  console.log(shot.name, "canvas height", strip, "strip height", wrapped);
}

await c.send("Browser.close").catch(() => {});
ws.close();
chrome.kill();
console.log("done");
