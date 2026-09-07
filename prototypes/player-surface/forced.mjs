// ADR-0029 hands #137 the one line of code it costs — `forced-color-adjust: none`
// on the surface — and says nobody has yet viewed this page in Windows High
// Contrast. This looks: the strip under forced colours as it stands, and with
// the opt-out on. `node forced.mjs`.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CDP = 9337;
const PROFILE = join(HERE, ".chrome-forced");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [`--remote-debugging-port=${CDP}`, `--user-data-dir=${PROFILE}`, "--headless=new", "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"],
  { stdio: "ignore" },
);
let target;
for (let i = 0; i < 40; i++) {
  try {
    const list = await fetch(`http://127.0.0.1:${CDP}/json/list`).then((r) => r.json());
    target = list.find((t) => t.type === "page");
    if (target) break;
  } catch {
    /* not up */
  }
  await sleep(300);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pend = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  const p = pend.get(m.id);
  if (p) {
    pend.delete(m.id);
    p(m.result);
  }
});
const send = (method, params = {}) => {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise((r) => pend.set(i, r));
};
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");
mkdirSync(join(HERE, "stills"), { recursive: true });

// The strip and the panel; the picture is a PNG and forced colours leave images alone.
const OPT_OUT = `(function(){
  var strips = [].slice.call(document.querySelectorAll("div")).filter(function(d){return d.style.flexWrap === "wrap"});
  var n = 0;
  strips.forEach(function(s){
    var all = [s].concat([].slice.call(s.querySelectorAll("*")));
    all.forEach(function(e){ e.style.setProperty("forced-color-adjust", "none"); n++; });
  });
  return n;
})()`;

for (const board of ["Main", "Staff"]) {
  for (const scheme of ["light", "dark"]) {
    await send("Emulation.setEmulatedMedia", {
      features: [
        { name: "forced-colors", value: "active" },
        { name: "prefers-color-scheme", value: scheme },
      ],
    });
    await send("Emulation.setDeviceMetricsOverride", { width: 1120, height: 300, deviceScaleFactor: 1, mobile: false });
    const url = "file:///" + join(HERE, "preview", `${board}.html`).replaceAll("\\", "/");
    await send("Page.navigate", { url });
    await sleep(1400);
    // Scroll to the strip so a 300-tall shot is the surface and not the picture.
    await ev(`window.scrollTo(0, document.documentElement.scrollHeight); true`);
    await sleep(300);
    let { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(HERE, "stills", `forced-${board}-${scheme}.png`), Buffer.from(data, "base64"));
    console.log(board, scheme, "as it stands: styled elements", await ev(OPT_OUT));
    await sleep(300);
    ({ data } = await send("Page.captureScreenshot", { format: "png" }));
    writeFileSync(join(HERE, "stills", `forced-${board}-${scheme}-optout.png`), Buffer.from(data, "base64"));
  }
}
await send("Browser.close");
ws.close();
chrome.kill();
console.log("forced-colour stills written");
