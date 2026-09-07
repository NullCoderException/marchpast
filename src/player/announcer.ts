/**
 * The announcer: the one node that says where in the battle the plate is
 * (#130).
 *
 * It is two things at once and deliberately not two nodes. It is the canvas's
 * `aria-describedby` target, so a reader who lands on the plate is told what
 * instant it is showing; and it is an `aria-live="polite"` region, so the same
 * sentence is spoken again when the battle steps to the next phase. A second
 * node would be the same words twice, free to drift.
 *
 * It fires **on a phase change only** — never on the clock ticking, which
 * would talk over everything else on the page sixty times a second. Which
 * phase of how many is the orientation a sighted viewer reads off the
 * scrubber's ticks and nothing else carries, which is why the bar's
 * `aria-valuetext` takes the same `phasePosition` rather than a wording of its
 * own. The clock readout is silenced for the same reason: an `<output>` is a
 * live region, and one page has one announcer.
 *
 * The details panel is not a live region: it rebuilds every phase, and
 * re-announcing that subtree would be unusable. The announcer carries the
 * headline; Details holds the article.
 */
import type { Battle } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { element } from "./dom.ts";

/** The id the canvas's `aria-describedby` points at. One player to a page, so one is enough. */
export const ANNOUNCER_ID = "st-announcer";

/** Where in the run of phases the plate is, counted from one and in words: `Phase 4 of 12`. */
export function phasePosition(picture: Picture, phases: number): string {
  return `Phase ${picture.phaseIndex + 1} of ${phases}`;
}

/**
 * What the announcer says: the count, the phase's own instant and its label —
 * `Phase 4 of 12, 13:20 — The relief army arrives`. The phase's `t` rather
 * than the clock, because the sentence is spoken once per phase and a time
 * that had moved on by the time it was read would be a lie.
 */
export function announcement(picture: Picture, phases: number): string {
  return `${phasePosition(picture, phases)}, ${picture.phase.t} — ${picture.label}`;
}

/** The announcer as the player holds it: one element to place, one call to keep in step. */
export interface Announcer {
  /** The element, placed after the canvas and hidden from sight. */
  readonly root: HTMLElement;
  /** Rewrites the sentence when the phase has changed, and on no other frame. */
  update(picture: Picture): void;
  /** Removes the node, when the player is taken down. */
  destroy(): void;
}

/** Builds the announcer for a battle, empty until the first `update`. */
export function createAnnouncer(battle: Battle): Announcer {
  const root = element("p", "st-announcer st-hidden");
  root.id = ANNOUNCER_ID;
  root.setAttribute("aria-live", "polite");

  let shown: number | undefined;
  return {
    root,
    update(picture) {
      if (picture.phaseIndex === shown) return;
      shown = picture.phaseIndex;
      root.textContent = announcement(picture, battle.phases.length);
    },
    destroy() {
      root.remove();
    },
  };
}
