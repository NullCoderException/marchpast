/**
 * PROTOTYPE ONLY — issue #40, branch `prototype/second-view`. Not for main.
 *
 * A floating bar that cycles the view, so the seam can be judged by flipping
 * between the three treatments over the real Trafalgar data at the same
 * instant. The real control is #47's decision; this stands in for it and
 * proves only that the view is player state the renderer reads per frame.
 *
 * Deliberately ugly and out of the plate's language, so nothing here is
 * mistaken for the design being evaluated. Hidden in production builds.
 */
import { VIEWS, type ViewId } from "../render/index.ts";

const PARAM = "view";

/** The view id on the URL, or `undefined` when it names none. */
export function viewFromSearch(search: string): ViewId | undefined {
  const value = new URLSearchParams(search).get(PARAM);
  return VIEWS.find((view) => view.id === value)?.id;
}

export interface ViewSwitcher {
  /** Redraws the label after the player's state moved. */
  update(current: ViewId): void;
  destroy(): void;
}

/** Mounts the bar and calls `onPick` whenever the viewer cycles. */
export function createViewSwitcher(current: ViewId, onPick: (view: ViewId) => void): ViewSwitcher {
  const root = document.createElement("div");
  root.setAttribute("data-prototype", "view-switcher");
  root.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:14px",
    "transform:translateX(-50%)",
    "z-index:9999",
    "display:flex",
    "align-items:center",
    "gap:2px",
    "padding:4px",
    "border-radius:999px",
    "background:#111",
    "color:#fff",
    "font:13px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace",
    "box-shadow:0 4px 18px rgba(0,0,0,0.35)",
  ].join(";");

  const button = (text: string, step: number): HTMLButtonElement => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = text;
    element.style.cssText =
      "all:unset;cursor:pointer;padding:4px 10px;border-radius:999px;color:#fff;font:inherit;line-height:1";
    element.addEventListener("click", () => cycle(step));
    return element;
  };

  const label = document.createElement("span");
  label.style.cssText = "padding:0 8px;min-width:150px;text-align:center;letter-spacing:0.02em";

  root.append(button("‹", -1), label, button("›", 1));
  document.body.append(root);

  let view = current;

  function cycle(step: number): void {
    const index = VIEWS.findIndex((candidate) => candidate.id === view);
    const next = VIEWS[(index + step + VIEWS.length) % VIEWS.length];
    if (next !== undefined) onPick(next.id);
  }

  // `v` cycles: the arrows already jump phases, and the plate's controls own space.
  const onKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key.toLowerCase() !== "v") return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName))) return;
    event.preventDefault();
    cycle(event.shiftKey ? -1 : 1);
  };
  window.addEventListener("keydown", onKey);

  const switcher: ViewSwitcher = {
    update(next) {
      view = next;
      const found = VIEWS.find((candidate) => candidate.id === next);
      label.textContent = `view: ${found?.name ?? next}`;
      // Shareable and reload-stable, without adding a history entry per flip.
      const url = new URL(window.location.href);
      url.searchParams.set(PARAM, next);
      window.history.replaceState(null, "", url);
    },
    destroy() {
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
  switcher.update(current);
  return switcher;
}
