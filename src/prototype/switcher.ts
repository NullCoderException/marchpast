/**
 * PROTOTYPE (#39) — THROWAWAY. Never merge to main.
 *
 * The floating bar that switches placement algorithm, and the panel that
 * surfaces what the last frame actually did: every label's collapse step, its
 * leader, and both candidate short names with their collisions marked.
 *
 * Deliberately not in the plate's language: it is scaffolding, and must never
 * be mistaken for the design being judged.
 */
import { residualOverlap, shortByCommander, shortByRule, VARIANT_NAMES, VARIANTS, type Variant } from "../render/labels.ts";
import { furniture, lastFrame, onSettingsChanged, settings, update } from "./state.ts";

const STYLE = `
.pt-bar, .pt-panel {
  position: fixed; z-index: 9999; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
  background: #16181d; color: #f2f4f8; border: 1px solid #3a3f4a; border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.45);
}
.pt-bar { left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; padding: 7px 9px; }
.pt-bar button, .pt-panel button { font: inherit; color: inherit; background: #262a33; border: 1px solid #454b58; border-radius: 5px; padding: 3px 8px; cursor: pointer; }
.pt-bar button:hover, .pt-panel button:hover { background: #333944; }
.pt-bar .pt-current { padding: 0 8px; white-space: nowrap; }
.pt-bar .pt-key { color: #9aa4b6; }
.pt-panel { right: 12px; top: 12px; width: 340px; max-height: 78vh; overflow: auto; padding: 9px 11px; }
.pt-panel h4 { margin: 0 0 6px; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: #9aa4b6; }
.pt-panel table { border-collapse: collapse; width: 100%; }
.pt-panel td { padding: 1px 4px 1px 0; vertical-align: top; }
.pt-panel .pt-step-0 { color: #7fd08a; }
.pt-panel .pt-step-1, .pt-panel .pt-step-2 { color: #e2cd6b; }
.pt-panel .pt-step-3, .pt-panel .pt-step-4 { color: #e2a05a; }
.pt-panel .pt-step-5 { color: #e2685a; }
.pt-panel .pt-warn { color: #e2685a; }
.pt-panel .pt-dim { color: #9aa4b6; }
`;

export function mountSwitcher(): void {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.append(style);

  const bar = document.createElement("div");
  bar.className = "pt-bar";
  const previous = button("←", () => cycle(-1));
  const next = button("→", () => cycle(1));
  const current = document.createElement("span");
  current.className = "pt-current";
  const shortToggle = button("", () => update({ shortMode: settings.shortMode === "commander" ? "derived" : "commander" }));
  const boxesToggle = button("", () => update({ boxes: !settings.boxes }));
  const floorToggle = button("", () => update({ floor: (settings.floor + 1) % 6 }));
  const furnitureToggle = button("", () => update({ furniture: !settings.furniture }));
  const stressDown = button("−unit", () => reloadWithStress(-1));
  const stressUp = button("+unit", () => reloadWithStress(1));
  bar.append(previous, current, next, divider(), shortToggle, boxesToggle, floorToggle, furnitureToggle, divider(), stressDown, stressUp);

  const panel = document.createElement("div");
  panel.className = "pt-panel";

  document.body.append(bar, panel);
  // `?chrome=0` hides the scaffolding for a clean screenshot.
  if (new URLSearchParams(window.location.search).get("chrome") === "0") bar.hidden = true;

  const redraw = (): void => {
    // The player redraws on a resize, which is the cheapest way to mark it dirty.
    window.dispatchEvent(new Event("resize"));
  };

  const paint = (): void => {
    current.innerHTML = `<span class="pt-key">${settings.variant}</span> ${VARIANT_NAMES[settings.variant]}`;
    shortToggle.textContent = `short: ${settings.shortMode}`;
    boxesToggle.textContent = `boxes: ${settings.boxes ? "on" : "off"}`;
    floorToggle.textContent = `floor: ${settings.floor}`;
    furnitureToggle.textContent = `furniture: ${settings.furniture ? "on" : "off"}`;
    panel.hidden = !settings.panel;
  };

  onSettingsChanged(() => {
    paint();
    redraw();
  });
  paint();

  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
    if (event.key === "[") cycle(-1);
    else if (event.key === "]") cycle(1);
    else if (event.key === "b") update({ boxes: !settings.boxes });
    else if (event.key === "p") update({ panel: !settings.panel });
    else return;
    event.preventDefault();
  });

  // PROTOTYPE: keep redrawing even while paused, because the relaxed variant eases
  // toward its answer over frames and would otherwise be judged on its first guess.
  const tick = (): void => {
    if (settings.panel) panel.innerHTML = panelHtml();
    redraw();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function cycle(direction: number): void {
  const index = VARIANTS.indexOf(settings.variant);
  const next = VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length] as Variant;
  update({ variant: next });
}

function reloadWithStress(direction: number): void {
  const current = settings.stress === 0 ? countUnits() : settings.stress;
  const wanted = Math.max(0, current + direction);
  const params = new URLSearchParams(window.location.search);
  if (wanted <= 0) params.delete("stress");
  else params.set("stress", String(wanted));
  window.location.search = params.toString();
}

function countUnits(): number {
  return lastFrame.placed.length;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.addEventListener("click", onClick);
  return element;
}

function divider(): HTMLSpanElement {
  const element = document.createElement("span");
  element.textContent = "·";
  element.className = "pt-key";
  return element;
}

const STEP_NAMES = ["full", "displaced", "no %", "no state", "short", "numeral"];

function panelHtml(): string {
  const placed = lastFrame.placed;
  if (placed.length === 0) return "<h4>labels</h4><div class='pt-dim'>no frame yet</div>";

  const steps = new Array<number>(6).fill(0);
  for (const label of placed) steps[label.step] = (steps[label.step] ?? 0) + 1;
  const residual = residualOverlap(placed, settings.furniture ? furniture.boxes : []);
  const leaders = placed.filter((label) => label.leader).length;

  const byCommander = placed.map((label) => shortByCommander(label.unit.name, label.unit.commander));
  const byRule = placed.map((label) => shortByRule(label.unit.name));
  const clash = (list: string[], index: number): boolean => list.filter((name) => name === list[index]).length > 1;

  const rows = placed
    .map((label, index) => {
      const commanderName = byCommander[index] ?? "";
      const ruleName = byRule[index] ?? "";
      const commanderClash = clash(byCommander, index) ? " pt-warn" : "";
      const ruleClash = clash(byRule, index) ? " pt-warn" : "";
      return `<tr>
        <td class="pt-step-${label.step}">${label.step}</td>
        <td>${escapeHtml(label.unit.name)}${label.leader ? ' <span class="pt-dim">↳leader</span>' : ""}</td>
        <td class="pt-dim">${Math.round(Math.hypot(label.offset.x, label.offset.y))}px</td>
        <td class="${commanderClash}">${escapeHtml(commanderName)}</td>
        <td class="${ruleClash}">${escapeHtml(ruleName)}</td>
      </tr>`;
    })
    .join("");

  const histogram = steps.map((count, step) => `${step}:${count}`).join("  ");
  return `<h4>labels · ${settings.variant} · ${placed.length} units</h4>
    <div class="pt-dim">steps ${histogram}</div>
    <div class="${residual > 0 ? "pt-warn" : "pt-dim"}">residual overlap ${Math.round(residual)}px²  ·  leaders ${leaders}</div>
    <div class="pt-dim">worst step: ${STEP_NAMES[Math.max(...placed.map((label) => label.step))] ?? "?"}</div>
    <table><tr class="pt-dim"><td>st</td><td>unit</td><td>off</td><td>commander</td><td>derived</td></tr>${rows}</table>
    <div class="pt-dim">[ ] variant · b boxes · p panel</div>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (character) => (character === "&" ? "&amp;" : character === "<" ? "&lt;" : "&gt;"));
}
