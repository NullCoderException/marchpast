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
 *
 * The plate has words as well as pixels (#130). Two hidden nodes stand after
 * the canvas: the **muster**, the keyboard's route to the same unit cards the
 * pointer opens, and the **announcer**, the one sentence saying which phase of
 * how many is on the plate. Both are kept in step at the end of a rendered
 * frame and neither costs anything on a frame that changed nothing.
 */
import type { Battle, MapFile } from "../schema/types.ts";
import { createRenderer, type HitRegion, hoverAt, unitAt } from "../render/index.ts";
import { layoutMode } from "../render/layout.ts";
import { pictureAt } from "../timeline/pictureAt.ts";
import { ANNOUNCER_ID, createAnnouncer } from "./announcer.ts";
import { createControls, type PickerOptions } from "./controls.ts";
import { createDetailsPanel } from "./details.ts";
import { Listeners } from "./dom.ts";
import { createMuster } from "./muster.ts";
import "./player.css";
import {
  closeCard,
  focusUnit,
  hoverUnit,
  initialState,
  jumpNext,
  jumpPrevious,
  jumpToPhase,
  leaveMuster,
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
  const details = createDetailsPanel(battle, map);
  const announcer = createAnnouncer(battle);

  // The plate is a picture, named by the battle it draws and described by the
  // announcer, which says which phase of how many is on it (#130). Without
  // this the plate is an anonymous `<canvas>`: nothing to land on and nothing
  // said when you do.
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", battle.title);
  canvas.setAttribute("aria-describedby", ANNOUNCER_ID);

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

  // The keyboard's route to a unit card, immediately after the plate it stands
  // for, and the sentence that says where in the battle the plate is (#130).
  const muster = createMuster(battle, {
    focus: (id) => apply(focusUnit(state, id)),
    pin: (id) => apply(pinUnit(state, id)),
    close: () => apply(closeCard(state)),
    leave: () => apply(leaveMuster(state)),
  });
  canvas.after(muster.root, announcer.root);

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
  // rows as well. The keyboard reaches the same cards through the muster, and
  // ends in the same card drawn on the same canvas (#130).
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
    // The same rule the plate was just drawn to, off the same width: the
    // panel gains the legend's rows exactly when the plate loses them (#86).
    details.setPlate(state.view, layoutMode(canvas.clientWidth || canvas.width));
    controls.update(state, picture, details.isOpen());
    announcer.update(picture);
    // Last, because a rebuild moves focus and so opens a card: the state it
    // reads is the one this frame was drawn from, and the change it makes is
    // the next frame's.
    muster.update(state, picture);
  });

  return {
    destroy() {
      cancelAnimationFrame(frame);
      listeners.removeAll();
      controls.destroy();
      muster.destroy();
      announcer.root.remove();
      details.root.remove();
    },
  };
}

/**
 * Whether the focused element answers `key` itself: a text field takes every
 * key, a select takes the arrows and space, and any button takes space, which
 * is how it is pressed.
 *
 * A focused muster entry stands with the select rather than the button: the
 * arrows walk the units and space pins the card, so both belong to the widget
 * the viewer tabbed to (#130). It is the same stand-aside, not a new rule.
 */
function answersItself(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName)) return true;
  if (target.tagName === "SELECT" || target.getAttribute("role") === "option") return true;
  return key === " " && ["BUTTON", "A"].includes(target.tagName);
}

/** The keyboard shortcuts, each one the transition its button calls. */
const KEYS: Readonly<Record<string, (battle: Battle, state: PlayerState) => PlayerState>> = {
  " ": togglePlay,
  ArrowRight: jumpNext,
  ArrowLeft: jumpPrevious,
};
