/**
 * The player: the animation loop that joins the timeline to the renderer, plus
 * the controls the viewer drives it with.
 *
 * Each frame turns the wall-clock delta into battle-clock time through
 * `tick`, asks the timeline for the picture at the new instant, and renders
 * it. Paused frames render nothing unless something else changed — a scrub, a
 * jump, a resize — which is what the `dirty` flag tracks. Every rule about
 * what a control does lives in `state.ts`; this file only wires gestures to
 * transitions and state to pixels.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import { createRenderer, viewById } from "../render/index.ts";
import { pictureAt } from "../timeline/pictureAt.ts";
import { createControls } from "./controls.ts";
import { createDetailsPanel } from "./details.ts";
import { Listeners } from "./dom.ts";
import "./player.css";
import { createViewSwitcher, viewFromSearch } from "./prototypeViewSwitcher.ts";
import {
  initialState,
  jumpNext,
  jumpPrevious,
  jumpToPhase,
  scrubTo,
  setMultiplier,
  setView,
  tick,
  togglePlay,
  type PlayerState,
} from "./state.ts";

/** What the player needs to draw and drive one battle. */
export interface PlayerOptions {
  /** The canvas the renderer draws the plate on. */
  canvas: HTMLCanvasElement;
  /** Where the controls and the details panel are appended. */
  controlsRoot: HTMLElement;
  /** A battle that has passed the validator. */
  battle: Battle;
  /** The battle's map, when it names one. */
  map?: MapFile;
}

/** A running player. */
export interface Player {
  /** Stops the loop, unbinds every listener and removes the controls. */
  destroy(): void;
}

/** The longest wall delta one frame may be worth: a backgrounded tab must not skip a battle. */
const MAX_FRAME_SECONDS = 0.25;

/** Builds the player and starts its loop, paused on the first phase with its caption shown. */
export function createPlayer({ canvas, controlsRoot, battle, map }: PlayerOptions): Player {
  const renderer = createRenderer(canvas);
  const listeners = new Listeners();
  const details = createDetailsPanel(battle);

  let state: PlayerState = initialState(battle, 1, viewFromSearch(window.location.search));
  let dirty = true;

  /** Takes the state a transition returned, and marks the next frame for redrawing. */
  const apply = (next: PlayerState): void => {
    state = next;
    dirty = true;
  };

  const controls = createControls(battle, {
    togglePlay: () => apply(togglePlay(battle, state)),
    next: () => apply(jumpNext(battle, state)),
    previous: () => apply(jumpPrevious(battle, state)),
    scrub: (fraction) => apply(scrubTo(battle, state, fraction)),
    jumpToPhase: (index) => apply(jumpToPhase(battle, state, index)),
    setMultiplier: (multiplier) => apply(setMultiplier(state, multiplier)),
    toggleDetails: () => {
      details.setOpen(!details.isOpen());
      dirty = true;
    },
  });
  controlsRoot.append(details.root, controls.root);

  // PROTOTYPE (#40): stands in for the view control #47 decides.
  const switcher = import.meta.env.DEV ? createViewSwitcher(state.view, (view) => apply(setView(state, view))) : undefined;

  // Space plays and pauses, the arrows jump phases. A focused control that
  // already answers the key keeps it: space is how a button is pressed, and a
  // select owns both arrows, so the shortcut stands aside rather than firing
  // twice or fighting the control the viewer tabbed to.
  listeners.on<KeyboardEvent>(window, "keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const transition = KEYS[event.key];
    if (transition === undefined || answersItself(event.target, event.key)) return;
    event.preventDefault();
    apply(transition(battle, state));
  });

  listeners.on<UIEvent>(window, "resize", () => {
    dirty = true;
  });

  let previousTimestamp: number | undefined;
  let frame = requestAnimationFrame(function step(timestamp: number): void {
    frame = requestAnimationFrame(step);
    const wallDelta = previousTimestamp === undefined ? 0 : Math.min((timestamp - previousTimestamp) / 1000, MAX_FRAME_SECONDS);
    previousTimestamp = timestamp;

    const advanced = tick(battle, state, wallDelta);
    const moved = advanced !== state;
    state = advanced;
    if (!moved && !dirty) return;
    dirty = false;

    const picture = pictureAt(battle, state.clock);
    renderer.render(battle, map, picture, viewById(state.view));
    details.update(picture);
    controls.update(state, picture, details.isOpen());
    switcher?.update(state.view);
  });

  return {
    destroy() {
      cancelAnimationFrame(frame);
      listeners.removeAll();
      controls.destroy();
      details.root.remove();
      switcher?.destroy();
    },
  };
}

/**
 * Whether the focused element answers `key` itself: a text field takes every
 * key, a select takes the arrows and space, and any button takes space, which
 * is how it is pressed.
 */
function answersItself(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName)) return true;
  if (target.tagName === "SELECT") return true;
  return key === " " && ["BUTTON", "A"].includes(target.tagName);
}

/** The keyboard shortcuts, each one the transition its button calls. */
const KEYS: Readonly<Record<string, (battle: Battle, state: PlayerState) => PlayerState>> = {
  " ": togglePlay,
  ArrowRight: jumpNext,
  ArrowLeft: jumpPrevious,
};
