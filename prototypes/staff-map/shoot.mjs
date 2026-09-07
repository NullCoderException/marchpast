// Throwaway: screenshot the standalone previews with headless Chrome over the DevTools protocol.
// Node 22 has a global WebSocket and fetch, so no packages are needed.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9331;
const PROFILE = join(tmpdir(), "staffmap-cdp");

const shots = JSON.parse(process.argv[2]); // [{file, out, w, h}]
mkdirSync(join(HERE, "stills"), { recursive: true });
try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(300);
  }
  throw new Error("no chrome target");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const waiting = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  const ready = new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    waiting.set(n, (m) => (m.error ? reject(new Error(method + ": " + m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  return { ready, send, close: () => ws.close() };
}

const url = await target();
const cdp = connect(url);
await cdp.ready;
await cdp.send("Page.enable");

for (const { file, out, w, h } of shots) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: "file:///" + join(HERE, file).replaceAll("\\", "/") });
  // Poll for the drawing rather than sleeping a fixed time; then let the webfont land.
  for (let i = 0; i < 80; i++) {
    const r = await cdp.send("Runtime.evaluate", { expression: "!!document.querySelector('svg,div')", returnByValue: true });
    if (r.result.value) break;
    await sleep(120);
  }
  await sleep(1200);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(HERE, "stills", out), Buffer.from(shot.data, "base64"));
  console.log(`stills/${out}  ${w}x${h}`);
}

cdp.close();
chrome.kill();
