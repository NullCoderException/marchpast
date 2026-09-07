/**
 * The plate with no battle on it: what the page shows while a battle loads and
 * what it shows when the battle cannot be played.
 *
 * It is **DOM text, and it replaces the canvas** (#130, ADR-0023). A heading
 * drawn with `fillText` is silent to a screen reader, and a battle that fails
 * to load is the worst place on the page for that; the canvas has nothing to
 * draw before a battle loads, so there is nothing to sit over. It is one
 * surface and no duplicate text to drift.
 *
 * It reaches for no palette. The heading and the lines take the surface's own
 * tokens — the ink, the ground and the face `player.css` sets on the control
 * strip beside it — so the notice is themed by whatever view the surface is
 * in, and takes the opening view for free once the surface follows one.
 *
 * It is a `status`, so the error a viewer never asked for is spoken when it
 * arrives. There is no player on this path and so no announcer: the two live
 * regions never share a page.
 */
import { element } from "../player/dom.ts";
// The strip's own stylesheet carries the notice's rules, because the notice is
// the surface rather than the picture. The player imports it too; Vite loads
// it once.
import "../player/player.css";

/** What a notice says: a heading, then lines beneath it. An indented line keeps its indent. */
export interface Notice {
  heading: string;
  lines: readonly string[];
}

/** The notice as an element, for the caller to place. */
export function createNotice(notice: Notice): HTMLElement {
  const root = element("section", "st-notice");
  root.setAttribute("role", "status");
  root.append(element("h2", "st-notice-heading", notice.heading));
  for (const line of notice.lines) root.append(element("p", "st-notice-line", line));
  return root;
}

/**
 * Puts `notice` where the canvas is, taking the canvas out of sight and out of
 * the accessibility tree while it stands. Returns the function that takes it
 * down again and gives the plate back, before something else owns the canvas.
 */
export function showNotice(canvas: HTMLCanvasElement, notice: Notice): () => void {
  const root = createNotice(notice);
  canvas.hidden = true;
  canvas.after(root);
  return () => {
    root.remove();
    canvas.hidden = false;
  };
}
