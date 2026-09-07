/**
 * The player: the animation loop that joins the timeline to the renderer, plus
 * the controls the viewer drives it with.
 *
 * Each frame turns the wall-clock delta into battle-clock time through
 * `tick`, asks the timeline for the picture at the new instant, and renders
 * it — keeping the hit regions that frame drew, which is how a pointer over
 * the canvas becomes a unit id and so a unit card (#60). Paused frames
 * render nothing unless something else changed — a scrub, a jump, a resize,
 * a card opening — which is what the `dirty` flag tracks. Every rule about
 * what a control does lives in `state.ts`; this file only wires gestures to
 * transitions and state to pixels.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import { createRenderer, type HitRegion, hoverAt, unitAt } from "../render/index.ts";
import { pictureAt } from "../timeline/pictureAt.ts";
import { createControls, type PickerOptions } from "./controls.ts";
import { createDetailsPanel } from "./details.ts";
import { Listeners } from "./dom.ts";
import "./player.css";
import {
  closeCard,
  hoverUnit,
  initialState,
  jumpNext,
  jumpPrevious,
  jumpToPhase,
  pinUnit,
  scrubTo,
  setLevel,
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
  /** What the Picker offers. Absent when the library could not be loaded: the battle still plays, without a Picker. */
  picker?: PickerOptions;
}

/** A running player. */
export interface Player {
  /** Stops the loop, unbinds every listener and removes the controls. */
  destroy(): void;
}

/** The longest wall delta one frame may be worth: a backgrounded tab must not skip a battle. */
const MAX_FRAME_SECONDS = 0.25;

/** Builds the player and starts its loop, paused on the first phase with its caption shown. */
export function createPlayer({ canvas, controlsRoot, battle, map, picker }: PlayerOptions): Player {
  const renderer = createRenderer(canvas);
  const listeners = new Listeners();
  const details = createDetailsPanel(battle);

  let state: PlayerState = initialState(battle);
  let dirty = true;
  /** Where everything the last frame drew landed, for the pointer to be resolved against. */
  let hits: readonly HitRegion[] = [];

  /**
   * Takes the state a transition returned, and marks the next frame for
   * redrawing. A transition that answered the state it was given changed
   * nothing, so nothing is redrawn: every pointer move over the plate is a
   * transition, and only the few that open or close a card cost a frame.
   */
  const apply = (next: PlayerState): void => {
    if (next === state) return;
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
    setView: (view) => apply(setView(state, view)),
    setLevel: (level) => apply(setLevel(battle, state, level)),
    toggleDetails: () => {
      details.setOpen(!details.isOpen());
      dirty = true;
    },
  }, picker);
  controlsRoot.append(details.root, controls.root);

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

  // The pointer on the plate: a resting pointer shows a card, a click pins it,
  // and a click on bare plate closes it. A tap is a click, so one pair of rules
  // serves both inputs (#60). The two gestures read different regions: hover
  // answers to a glyph and its label, a click to those and the legend's numeral
  // rows as well. Keyboard access to a card is out of scope for v0.2.
  const canvasPoint = (event: MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  listeners.on<PointerEvent>(canvas, "pointermove", (event) => apply(hoverUnit(state, hoverAt(hits, canvasPoint(event)))));
  listeners.on<PointerEvent>(canvas, "pointerleave", () => apply(hoverUnit(state, undefined)));
  listeners.on<MouseEvent>(canvas, "click", (event) => {
    const id = unitAt(hits, canvasPoint(event));
    apply(id === undefined ? closeCard(state) : pinUnit(state, id));
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
    hits = renderer.render(battle, map, picture, { view: state.view, level: state.level, card: state.card });
    details.update(picture);
    controls.update(state, picture, details.isOpen());
  });

  return {
    destroy() {
      cancelAnimationFrame(frame);
      listeners.removeAll();
      controls.destroy();
      details.root.remove();
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
