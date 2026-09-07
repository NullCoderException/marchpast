/**
 * The player's surface: the control strip, the details panel and the page
 * ground, in the tones of whichever view the picture is drawn in (ADR-0023,
 * ADR-0030).
 *
 * A view supplies nothing new for this. Every token below is **derived** from
 * the palette and the type a view already has, which is what stops the same
 * four colours being hand-copied into `player.css`, `library.css` and
 * `index.html` as they were until now. Two of them are derived rather than
 * taken whole:
 *
 *   - `--st-sunk`, the hover fill, the scrubber's trough and the Details
 *     toggle's on state, is the ink at 8% over the ground. It used to be
 *     `palette.land`, which is a *picture* value — what ground is coloured on
 *     a map — and a printed operations sheet that colours its sea and its land
 *     one tone apart on purpose left the trough invisible (ADR-0030);
 *   - `--st-rule` is the ink at the least alpha from 0.55 up that clears 3:1
 *     against the ground: 0.55 for the three engraved views, 0.57 for the
 *     staff map, which a flat 0.55 missed by two hundredths.
 *
 * `palette.land` reaches the surface nowhere. `color-scheme` is derived from
 * the paper's luminance and **set**, never read: the site reads no
 * operating-system preference at all (ADR-0029), and setting it is what keeps
 * a native `<select>`'s popup dark under a dark view.
 *
 * The properties are written on `document.documentElement`, once per switch
 * and never per frame — they change when the viewer picks a different view and
 * at no other time — and on the root rather than on a player element because
 * `index.html`'s page ground wants `--st-edge` too.
 */
import { fontStack } from "../fonts/faces.ts";
import type { View } from "../render/index.ts";

/** The fill's wash: a hint under a pointer, not a panel (ADR-0030). */
const FILL_ALPHA = 0.08;

/** The rule's floor, and the contrast it has to clear against the ground. */
const RULE_FLOOR = 0.55;
const RULE_TARGET = 3;

/**
 * Above this luminance the paper is a light ground. The threshold only has to
 * separate parchment from indigo, which it does by a wide margin either way.
 */
const LIGHT_PAPER = 0.18;

/** What the surface is written as: one custom property each, plus the `color-scheme` that is a property of its own. */
export interface Surface {
  /** `--st-ink`: the palette's ink, whole. */
  ink: string;
  /** `--st-ground`: the palette's paper, whole. Named for what it is rather than for parchment, which lies under an indigo view. */
  ground: string;
  /** `--st-sunk`: the ink at 8% over the ground. */
  sunk: string;
  /** `--st-rule`: the ink at the least alpha that clears 3:1 over the ground. */
  rule: string;
  /** `--st-edge`: the palette's letterbox, which is the page's own ground behind the plate. */
  edge: string;
  /** `--st-face`: the CSS font-family list the view's face is set in. */
  face: string;
  /** `--st-caret`: the chooser's caret, as a `url()` the view's own type hand drew. */
  caret: string;
  /** `color-scheme`, so the operating system draws a `<select>`'s popup and a scrollbar to match the paper. */
  scheme: "light" | "dark";
}

/** The surface a view derives. Pure: the same view answers the same tokens, on a server or in a test. */
export function surfaceOf(view: View): Surface {
  const { ink, paper, letterbox } = view.palette;
  return {
    ink,
    ground: paper,
    sunk: over(ink, paper, FILL_ALPHA),
    rule: over(ink, paper, ruleAlpha(ink, paper)),
    edge: letterbox,
    face: fontStack(view.type.face),
    caret: `url("${view.type.caret(ink)}")`,
    scheme: luminance(paper) > LIGHT_PAPER ? "light" : "dark",
  };
}

/**
 * Writes the surface on the document, which is every place a token is read:
 * the strip, the details panel and the page ground. Called once when the
 * player opens and once per view switch.
 */
export function applySurface(view: View, root: HTMLElement = document.documentElement): void {
  const surface = surfaceOf(view);
  root.style.setProperty("--st-ink", surface.ink);
  root.style.setProperty("--st-ground", surface.ground);
  root.style.setProperty("--st-sunk", surface.sunk);
  root.style.setProperty("--st-rule", surface.rule);
  root.style.setProperty("--st-edge", surface.edge);
  root.style.setProperty("--st-face", surface.face);
  root.style.setProperty("--st-caret", surface.caret);
  root.style.colorScheme = surface.scheme;
}

/**
 * The least alpha from the floor up at which the ink over the ground clears
 * the rule's target. It steps in hundredths because that is the resolution the
 * decision was taken at — 0.57 rather than 0.5665 — and answers 1 if a paper
 * and an ink ever fail at every alpha, which no palette that passes the
 * conformance test can. The count is kept in whole hundredths because adding
 * a hundredth to a float drifts: 0.57 has to be 0.57 and not 0.5700000000001.
 */
export function ruleAlpha(ink: string, ground: string): number {
  for (let hundredths = Math.round(RULE_FLOOR * 100); hundredths <= 100; hundredths += 1) {
    const alpha = hundredths / 100;
    if (contrastRatio(over(ink, ground, alpha), ground) >= RULE_TARGET) return alpha;
  }
  return 1;
}

/** `ink` laid over `ground` at `alpha`, as the opaque colour the two make. */
export function over(ink: string, ground: string, alpha: number): string {
  const [fr, fg, fb] = channels(ink);
  const [br, bg, bb] = channels(ground);
  const mix = (front: number, back: number): string =>
    Math.round(front * alpha + back * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(fr, br)}${mix(fg, bg)}${mix(fb, bb)}`;
}

/** WCAG's contrast ratio between two opaque colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** WCAG's relative luminance, 0 for black and 1 for white. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** One channel of a colour, gamma removed. */
function linear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** The three channels of a `#rgb` or `#rrggbb` colour. Every palette value the surface reads is one of those. */
function channels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((digit) => digit + digit).join("") : value;
  const at = (index: number): number => Number.parseInt(full.slice(index, index + 2), 16);
  return [at(0), at(2), at(4)];
}
