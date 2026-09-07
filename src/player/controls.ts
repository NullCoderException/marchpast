/**
 * The controls beneath the plate: play/pause, the phase-segmented scrubber and
 * its battle-clock readout, the phase-jump buttons, the speed multiplier, the
 * View chooser, the Level chooser when the battle has more than one level, the
 * details-panel toggle and the Picker. Plain DOM, no framework.
 *
 * Nothing here decides anything: every gesture calls one of the transitions in
 * `state.ts` through the handlers it was given, and `update` is the only way
 * state reaches the DOM. That is the seam that keeps the rules testable
 * without a browser.
 *
 * The strip is **one tab stop per control and none per phase** (#130): the bar
 * is focusable and the ticks are not, so a battle of twenty-one phases costs
 * the tab order one stop rather than twenty-one.
 */
import type { LibraryEntry } from "../data/library.ts";
import { formatClock, VIEWS, viewById, type ViewId } from "../render/index.ts";
import type { Battle } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { phaseCount } from "./announcer.ts";
import { Listeners, element } from "./dom.ts";
import { barSegments, clockToFraction, type BarFraction } from "./scrub.ts";
import { levelOptions, MULTIPLIERS, type PlayerState } from "./state.ts";

/** What the viewer's gestures ask the player to do. */
export interface ControlHandlers {
  togglePlay(): void;
  next(): void;
  previous(): void;
  /** Dragging or clicking the bar, as a fraction of it from `0` to `1`. */
  scrub(fraction: BarFraction): void;
  /** Clicking a segment tick. */
  jumpToPhase(index: number): void;
  setMultiplier(multiplier: number): void;
  /** Picking a view, which takes effect on the next frame and interrupts nothing (#47). */
  setView(view: ViewId): void;
  /** Picking a level by its depth, which changes only which units are drawn (ADR-0017). */
  setLevel(level: number): void;
  toggleDetails(): void;
}

/**
 * What the Picker is built from: the library, which battle is playing, and
 * what choosing another one does. Absent when the library could not be loaded,
 * in which case the strip simply has no Picker.
 */
export interface PickerOptions {
  /** Every battle in the library, in its order. */
  battles: readonly LibraryEntry[];
  /** The name of the battle playing now: the one the Picker shows. */
  current: string;
  /** What choosing another battle does. Navigation, not a transition, which is why it is not one of the handlers. */
  choose(name: string): void;
}

/** The controls as the player holds them: one element to place, one call to keep in step. */
export interface Controls {
  /** The element holding every control, appended to the root the player was given. */
  readonly root: HTMLElement;
  /** Reflects the player's state and the current picture into the DOM. */
  update(state: PlayerState, picture: Picture, detailsOpen: boolean): void;
  /** Takes every listener back off. */
  destroy(): void;
}

/** Builds the controls for a battle, wiring every gesture to one of `handlers`. */
export function createControls(battle: Battle, handlers: ControlHandlers, picker?: PickerOptions): Controls {
  const listeners = new Listeners();
  const root = element("div", "st-controls");

  const play = button("st-play", "Play", () => handlers.togglePlay());
  const previous = button("st-step", "⏮", () => handlers.previous(), "Previous phase");
  const next = button("st-step", "⏭", () => handlers.next(), "Next phase");

  const { bar, thumb } = scrubber(battle, listeners, handlers, button);
  const readout = element("output", "st-readout", "--:--");
  // An `<output>` is a live region of its own, and this one is rewritten every
  // time the shown second changes — which at 600x is several times a second.
  // There is **one** announcer on this page (#130), and it speaks once a phase;
  // the clock stays readable on demand and says nothing of its own accord.
  readout.setAttribute("aria-live", "off");
  const multiplier = multiplierChooser(listeners, handlers);
  const view = viewChooser(listeners, handlers);
  const level = levelChooser(battle, listeners, handlers);
  const details = button("st-details-toggle", "Details", () => handlers.toggleDetails());
  details.setAttribute("aria-expanded", "false");

  // The tail of the strip is the controls that change how the battle is
  // presented rather than where in it we are (#47, ADR-0017). The Picker comes
  // after even those: it leaves the battle altogether, so it sits apart from
  // the transport (ADR-0011).
  root.append(previous, play, next, bar, readout, multiplier, view, ...(level === undefined ? [] : [level]), details);
  if (picker !== undefined) root.append(battlePicker(listeners, picker));

  return {
    root,
    update(state, picture, detailsOpen) {
      const label = state.playing ? "Pause" : "Play";
      if (play.textContent !== label) play.textContent = label;
      play.setAttribute("aria-label", label);

      const time = formatClock(picture.clock);
      if (readout.textContent !== time) readout.textContent = time;

      const fraction = clockToFraction(battle, state.clock);
      thumb.style.left = `${fraction * 100}%`;
      bar.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
      // The same count the announcer reads, so the bar and the announcer never
      // state the position two different ways (#130).
      bar.setAttribute("aria-valuetext", `${phaseCount(picture, battle.phases.length)}, ${time}, ${picture.label}`);

      for (const option of multiplier.options) option.selected = Number(option.value) === state.multiplier;
      for (const option of view.options) option.selected = option.value === state.view;
      if (level !== undefined) for (const option of level.options) option.selected = Number(option.value) === state.level;
      details.setAttribute("aria-expanded", String(detailsOpen));
      details.classList.toggle("st-on", detailsOpen);
    },
    destroy() {
      listeners.removeAll();
      root.remove();
    },
  };

  function button(className: string, text: string, onClick: () => void, label = text): HTMLButtonElement {
    const node = element("button", className, text);
    node.type = "button";
    node.setAttribute("aria-label", label);
    listeners.on<MouseEvent>(node, "click", onClick);
    return node;
  }
}

/** How the scrubber makes its buttons: the same helper the rest of the controls use. */
type ButtonMaker = (className: string, text: string, onClick: () => void, label: string) => HTMLButtonElement;

/**
 * The bar: one segment per phase sized by its share of the playback, a tick at
 * every phase instant, and a thumb. Dragging anywhere on the bar scrubs; the
 * ticks jump to their phase instead, which is what makes them the phase-jump
 * targets.
 */
function scrubber(
  battle: Battle,
  listeners: Listeners,
  handlers: ControlHandlers,
  button: ButtonMaker,
): { bar: HTMLElement; thumb: HTMLElement } {
  const bar = element("div", "st-bar");
  bar.setAttribute("role", "slider");
  bar.setAttribute("aria-label", "Battle clock");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  // A slider nothing could focus was an ARIA lie, and `player.css` has styled
  // `.st-bar:focus-visible` all along for a focus it could never take (#130).
  bar.tabIndex = 0;

  // The bar's own two keys. The arrows need none: the player's own shortcut
  // jumps phases from anywhere, which is what an arrow on a battle-clock
  // slider should do. Home and End are the ends of the battle, which nothing
  // else reaches in one press now the ticks have left the tab order.
  listeners.on<KeyboardEvent>(bar, "keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    handlers.jumpToPhase(event.key === "Home" ? 0 : battle.phases.length - 1);
  });

  for (const segment of barSegments(battle)) {
    const phase = battle.phases[segment.index]!;
    const piece = element("div", "st-segment");
    piece.style.flexGrow = String(segment.end - segment.start);
    piece.title = `${phase.t} ${phase.label}`;
    bar.append(piece);

    const tick = button("st-tick", "", () => handlers.jumpToPhase(segment.index), `Jump to ${phase.label}, ${phase.t}`);
    // A pointer target and nothing else. Midway's twenty-one phases are
    // twenty-one tab stops between the plate and Details, and the arrows
    // already reach every phase while `aria-valuetext` says where you are, so
    // what is lost is direct jumping and what is bought back is the strip
    // (#130).
    tick.tabIndex = -1;
    tick.style.left = `${segment.start * 100}%`;
    tick.title = `${phase.t} ${phase.label}`;
    // The tick sits over the bar, so its own gestures must not also scrub.
    listeners.on<PointerEvent>(tick, "pointerdown", (event) => event.stopPropagation());
    listeners.on<MouseEvent>(tick, "click", (event) => event.stopPropagation());
    bar.append(tick);
  }

  const thumb = element("div", "st-thumb");
  bar.append(thumb);

  const fractionAt = (clientX: number): BarFraction => {
    const rect = bar.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  };

  let dragging = false;
  listeners.on<PointerEvent>(bar, "pointerdown", (event) => {
    dragging = true;
    bar.setPointerCapture(event.pointerId);
    handlers.scrub(fractionAt(event.clientX));
  });
  listeners.on<PointerEvent>(bar, "pointermove", (event) => {
    if (dragging) handlers.scrub(fractionAt(event.clientX));
  });
  const release = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);
  };
  listeners.on<PointerEvent>(bar, "pointerup", release);
  listeners.on<PointerEvent>(bar, "pointercancel", release);

  return { bar, thumb };
}

/** The fixed 0.5x / 1x / 2x / 4x choice, as a select so it stays one line wide. */
function multiplierChooser(listeners: Listeners, handlers: ControlHandlers): HTMLSelectElement {
  const select = element("select", "st-multiplier");
  select.setAttribute("aria-label", "Speed multiplier");
  for (const multiplier of MULTIPLIERS) {
    const option = element("option", undefined, `${multiplier}x`);
    option.value = String(multiplier);
    select.append(option);
  }
  listeners.on<Event>(select, "change", () => handlers.setMultiplier(Number(select.value)));
  return select;
}

/**
 * The Picker (ADR-0011): every battle in the library by title, the one playing
 * selected. Choosing another navigates to it as a fresh visit, so no player
 * state survives the change — which is what makes the view, the level and the
 * speed multiplier properties of a visit rather than of the site.
 */
function battlePicker(listeners: Listeners, picker: PickerOptions): HTMLSelectElement {
  const select = element("select", "st-picker");
  select.setAttribute("aria-label", "Battle");
  for (const battle of picker.battles) {
    const option = element("option", undefined, battle.title);
    option.value = battle.name;
    option.selected = battle.name === picker.current;
    select.append(option);
  }
  listeners.on<Event>(select, "change", () => picker.choose(select.value));
  return select;
}

/**
 * The View chooser (#47): the three views by their own names, as a select for
 * the same reason the multiplier is one — a short fixed list of viewer
 * preferences that has to show what is picked without being opened. No
 * keyboard shortcut: the player's keys are all transport.
 */
function viewChooser(listeners: Listeners, handlers: ControlHandlers): HTMLSelectElement {
  const select = element("select", "st-view");
  select.setAttribute("aria-label", "View");
  for (const view of VIEWS) {
    const option = element("option", undefined, view.name);
    option.value = view.id;
    select.append(option);
  }
  listeners.on<Event>(select, "change", () => handlers.setView(viewById(select.value).id));
  return select;
}

/**
 * The Level chooser (ADR-0017): the battle's own level names, coarsest first,
 * beside the View chooser and for the same reasons — a short fixed list of
 * viewer preferences that has to show what is picked without being opened.
 * `undefined`, and so no chooser at all, when the battle has one level.
 *
 * An option's value is its depth, which is the whole of what the renderer
 * needs. There is no `?level=` and no keyboard shortcut: the player's keys are
 * all transport, and the choice lasts the visit.
 */
function levelChooser(battle: Battle, listeners: Listeners, handlers: ControlHandlers): HTMLSelectElement | undefined {
  const levels = levelOptions(battle);
  if (levels.length === 0) return undefined;

  const select = element("select", "st-level");
  select.setAttribute("aria-label", "Level");
  for (const [depth, name] of levels.entries()) {
    const option = element("option", undefined, name);
    option.value = String(depth);
    select.append(option);
  }
  listeners.on<Event>(select, "change", () => handlers.setLevel(Number(select.value)));
  return select;
}
