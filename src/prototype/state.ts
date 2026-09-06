/**
 * PROTOTYPE (#39) — THROWAWAY. Never merge to main.
 *
 * The knobs the prototype is driven by, read from the URL so a frame is
 * shareable, and the record of the last frame the renderer placed, so the
 * switcher's panel, the legend's numeral key and the sweep harness can all
 * read the same thing.
 */
import type { Placed, ShortMode, Variant } from "../render/labels.ts";
import type { Rect } from "../render/projection.ts";
import { VARIANTS } from "../render/labels.ts";

export interface Settings {
  /** Which placement algorithm is in force. */
  variant: Variant;
  /** Where a short name comes from at collapse step 4. */
  shortMode: ShortMode;
  /** Draws every label's collision box and its collapse step on the plate. */
  boxes: boolean;
  /** Shows the HTML panel listing each label's state. */
  panel: boolean;
  /** Roster size to inflate the battle to, splitting each unit into neighbours. `0` leaves it alone. */
  stress: number;
  /** Forces the collapse to start at this step, as the phone rule does. `0` is the normal start. */
  floor: number;
  /** Whether the furniture (rose, title, legend, scale bar, credit) is an obstacle labels must clear. */
  furniture: boolean;
}

function isVariant(value: string | null): value is Variant {
  return value !== null && (VARIANTS as readonly string[]).includes(value);
}

export function settingsFrom(search: string): Settings {
  const params = new URLSearchParams(search);
  const variant = params.get("labels")?.toUpperCase() ?? null;
  const short = params.get("short");
  return {
    variant: isVariant(variant) ? variant : "A",
    shortMode: short === "derived" ? "derived" : "commander",
    boxes: params.get("boxes") === "1",
    panel: params.get("panel") !== "0",
    stress: Math.max(0, Number(params.get("stress") ?? 0) || 0),
    floor: Math.min(5, Math.max(0, Number(params.get("floor") ?? 0) || 0)),
    furniture: params.get("furniture") !== "0",
  };
}

export const settings: Settings = settingsFrom(window.location.search);

/** Where the last frame's furniture sat, so labels can be kept out of it. One frame behind, which nothing can see. */
export const furniture: { boxes: Rect[] } = { boxes: [] };

export function recordFurniture(boxes: Rect[]): void {
  furniture.boxes = boxes;
}

/** What the last render placed, for the panel, the legend's key and the harness. */
export const lastFrame: { placed: Placed[]; clock: number } = { placed: [], clock: 0 };

/** Called by the units pass on every frame. */
export function recordFrame(placed: Placed[], clock: number): void {
  lastFrame.placed = placed;
  lastFrame.clock = clock;
}

/** Listeners the switcher registers so a knob turns without reloading the page. */
const listeners = new Set<() => void>();

export function onSettingsChanged(listener: () => void): void {
  listeners.add(listener);
}

/** Writes a knob to the settings and the URL, then redraws. */
export function update(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  const params = new URLSearchParams(window.location.search);
  params.set("labels", settings.variant);
  params.set("short", settings.shortMode);
  params.set("boxes", settings.boxes ? "1" : "0");
  params.set("panel", settings.panel ? "1" : "0");
  if (settings.stress > 0) params.set("stress", String(settings.stress));
  else params.delete("stress");
  if (settings.floor > 0) params.set("floor", String(settings.floor));
  else params.delete("floor");
  params.set("furniture", settings.furniture ? "1" : "0");
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  for (const listener of listeners) listener();
}
