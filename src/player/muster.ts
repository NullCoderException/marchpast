/**
 * The muster: the units the plate is drawing, as a list a keyboard or a screen
 * reader can walk (#130).
 *
 * A card is anchored at a glyph, so the pointer had the only route to one
 * until now. The muster is the other route to the same drawn thing: a visually
 * hidden `listbox` immediately after the canvas, one `option` per unit the
 * plate is drawing **at the current level and in the current phase**, in
 * roster order. Never the whole roster — a muster of undrawn units would offer
 * what the plate cannot show.
 *
 * **One tab stop, not sixteen.** A roving `tabindex` puts a single option in
 * the tab order: Tab enters, the arrows walk, Home and End hit the ends, Tab
 * leaves. Both pairs of arrows walk it, and `answersItself` in `player.ts`
 * stands aside for a focused option exactly as it does for a `<select>`, which
 * owns both arrows today.
 *
 * **Focus opens the card; Enter or Space pins it.** That is a deliberate
 * divergence from the pointer, where a pinned card ignores hover entirely:
 * that rule exists to stop a unit sliding out from under a still pointer, a
 * problem focus does not have, and if focus obeyed it, pinning would strike
 * the rest of the muster silent. Pinning is what keeps a card alive when focus
 * leaves for the scrubber or the Level chooser.
 *
 * **A phase change relabels where it can and rebuilds where it must.** Nothing
 * below a phase change alters a word — state and strength step at the phase
 * instant — so this runs on a level or phase change and on no other frame.
 * When the drawn set is the same units in the same order, only the words
 * change and no element is replaced, so focus is never disturbed and a reader
 * is not made to hear the unit again every phase (#130). When absence or a
 * level has changed the set itself, the list is built afresh and focus is put
 * back as near as it can go (ADR-0024).
 */
import { unitsDrawn } from "../render/level.ts";
import { cardContent, type CardContent } from "../render/labels/index.ts";
import type { Battle, Unit } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { Listeners, element, plainKey } from "./dom.ts";
import type { PlayerState } from "./state.ts";

/** One unit in the muster, and the two strings it is announced by. */
export interface MusterOption {
  /** The roster `units[].id`, which is what a transition takes. */
  id: string;
  /** The accessible name: short, because walking sixteen units must be quick. */
  name: string;
  /** The accessible description: the rest of the card, announced after a pause. */
  description: string;
}

/**
 * The muster's options for one instant at one level: the plate's own drawn
 * set, through `unitsDrawn` so that the list and the picture cannot disagree.
 * Pure, so what a reader hears is a test rather than a screen reader session.
 */
export function musterOptions(battle: Battle, picture: Picture, level: number): MusterOption[] {
  const roster = new Map(battle.units.map((unit) => [unit.id, unit]));
  const options: MusterOption[] = [];
  for (const drawn of unitsDrawn(battle.units, picture.units, level)) {
    // Both are there by construction — `unitsDrawn` returns picture units the
    // roster holds at this level, which is exactly what `cardContent` wants —
    // but neither lookup says so in its type.
    const unit = roster.get(drawn.id);
    const content = cardContent(battle.units, picture.units, drawn.id);
    if (unit === undefined || content === undefined) continue;
    options.push({ id: unit.id, name: optionName(unit), description: optionDescription(content) });
  }
  return options;
}

/**
 * The unit and its side — `Redoutable, French`. The side is the one thing the
 * card does not say in words: it is carried by the label's ink, and ink does
 * not survive speech.
 */
function optionName(unit: Unit): string {
  return `${unit.label}, ${unit.side}`;
}

/**
 * The card's own words, in the card's own order, less the name the option
 * already carries: the commander, the facts line, then the parent or the
 * children. One wording feeds the plate and the speech, so the two cannot
 * drift.
 */
function optionDescription(content: CardContent): string {
  const lines = [...(content.commander === undefined ? [] : [content.commander]), content.facts, ...content.tree];
  return lines.map(spoken).join(". ");
}

/**
 * The card sets its parts off with a typographic middle dot, which is a mark
 * for the eye. A comma is the same pause for the ear; the words are untouched.
 */
function spoken(line: string): string {
  return line.replaceAll(" · ", ", ");
}

/** What a gesture in the muster asks the player to do. Each one is a transition in `state.ts`. */
export interface MusterHandlers {
  /** Focus has reached a unit: its card opens, unpinned. */
  focus(id: string): void;
  /** Enter or Space on a unit: its card is pinned. */
  pin(id: string): void;
  /** Escape: the card is unpinned and closed, focus staying where it is. */
  close(): void;
  /** Focus has left the muster: an unpinned card closes, a pinned one stays. */
  leave(): void;
}

/** The muster as the player holds it: one element to place, one call to keep in step. */
export interface Muster {
  /** The listbox, placed immediately after the canvas. */
  readonly root: HTMLElement;
  /** Relabels or rebuilds the list when the level or the phase has changed, and marks the pinned unit. */
  update(state: PlayerState, picture: Picture): void;
  /** Takes every listener back off and removes the listbox. */
  destroy(): void;
}

/** Builds the muster for a battle, empty until the first `update`. */
export function createMuster(battle: Battle, handlers: MusterHandlers): Muster {
  const listeners = new Listeners();
  const root = element("ul", "st-muster st-hidden");
  root.setAttribute("role", "listbox");
  root.setAttribute("aria-label", "Units on the plate");

  /** The options as they were last built, and the elements standing for them, index for index. */
  let options: MusterOption[] = [];
  let items: Item[] = [];
  /** Which option holds the tab stop. Only ever a real index once the list is built. */
  let active = 0;
  /** What the list was last taken for: it is looked at again when either changes, and on no other frame. */
  let shown: { level: number; phaseIndex: number } | undefined;
  /** The unit `aria-selected` is on, so the attribute is only written when the pin moves. */
  let selected: string | undefined;
  /** Set while the elements are being swapped, so the focus a rebuild moves is not read as the viewer leaving. */
  let rebuilding = false;

  listeners.on<KeyboardEvent>(root, "keydown", (event) => {
    if (!plainKey(event) || options.length === 0) return;
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        return move(event, Math.min(active + 1, last));
      case "ArrowUp":
      case "ArrowLeft":
        return move(event, Math.max(active - 1, 0));
      case "Home":
        return move(event, 0);
      case "End":
        return move(event, last);
      case "Enter":
      case " ":
        event.preventDefault();
        return handlers.pin(options[active]!.id);
      case "Escape":
        event.preventDefault();
        return handlers.close();
      default:
        return;
    }
  });

  // Focus is what opens a card, however it arrived: the arrows above, Tab from
  // the page, or a rebuild putting it back on the nearest surviving unit.
  listeners.on<FocusEvent>(root, "focusin", (event) => {
    const index = items.findIndex((item) => item.root === event.target);
    if (index < 0) return;
    setActive(index);
    handlers.focus(options[index]!.id);
  });

  // Leaving for anywhere outside the listbox closes an unpinned card, which is
  // the pointer's `pointerleave` in the keyboard's terms. A rebuild takes the
  // focused element off the page, and that is not the viewer leaving.
  listeners.on<FocusEvent>(root, "focusout", (event) => {
    if (rebuilding) return;
    const to = event.relatedTarget;
    if (to instanceof Node && root.contains(to)) return;
    handlers.leave();
  });

  return {
    root,
    update(state, picture) {
      if (shown === undefined || shown.level !== state.level || shown.phaseIndex !== picture.phaseIndex) {
        shown = { level: state.level, phaseIndex: picture.phaseIndex };
        take(musterOptions(battle, picture, state.level));
      }
      // Pinning *is* selection, so the pinned state is announced for free.
      const pinned = state.card?.pinned === true ? state.card.id : undefined;
      if (pinned === selected) return;
      selected = pinned;
      for (const [index, item] of items.entries()) item.root.setAttribute("aria-selected", String(options[index]!.id === pinned));
    },
    destroy() {
      listeners.removeAll();
      root.remove();
    },
  };

  /** Walks to another option: the key is ours, so the page's own shortcut must not also fire. */
  function move(event: KeyboardEvent, index: number): void {
    event.preventDefault();
    items[index]?.root.focus();
  }

  /** Moves the tab stop, so Tab returns to the unit the viewer left off on rather than to the top. */
  function setActive(index: number): void {
    active = index;
    for (const [at, item] of items.entries()) item.root.tabIndex = at === index ? 0 : -1;
  }

  /**
   * Takes the options this phase and level draw. The same units in the same
   * order are **relabelled**: only the words are written, so the element the
   * viewer is on is the element it stays on. A set that has changed is
   * **rebuilt**, which is the only case that can move focus.
   */
  function take(next: MusterOption[]): void {
    const sameUnits = next.length === options.length && next.every((option, index) => option.id === options[index]!.id);
    options = next;
    if (sameUnits) {
      for (const [index, item] of items.entries()) item.say(next[index]!);
      return;
    }
    rebuild();
  }

  /**
   * Builds the list afresh. Focus is kept on the same unit when the new list
   * still holds it; when it does not — the unit has gone absent, or the level
   * has stopped drawing it — it goes to whatever is now at that place in the
   * list, because focus must land somewhere inside the widget the viewer is
   * in. The card follows it, unpinned, which is the muster's own rule: a card
   * on a unit that is no longer on the plate has already been closed by
   * `closeAbsentCard`, so nothing is silently carried over.
   */
  function rebuild(): void {
    const was = items[active]?.id;
    const hadFocus = root.contains(document.activeElement);

    rebuilding = true;
    items = options.map((option, index) => itemFor(option, index));
    root.replaceChildren(...items.map((item) => item.root));
    selected = undefined;

    const kept = options.findIndex((option) => option.id === was);
    setActive(kept < 0 ? Math.min(active, Math.max(options.length - 1, 0)) : kept);
    if (hadFocus) items[active]?.root.focus();
    rebuilding = false;
  }
}

/** One option's element and the two nodes its name and its description are read from. */
interface Item {
  readonly id: string;
  readonly root: HTMLLIElement;
  /** Writes the words, for a phase that changed them without changing the units. */
  say(option: MusterOption): void;
}

/**
 * One option. Its name and its description are separate elements referred to
 * by id rather than one run of text, so that walking the muster reads the unit
 * and its side at once and the rest of the card after a pause.
 */
function itemFor(option: MusterOption, index: number): Item {
  const root = element("li", "st-muster-unit");
  root.id = `st-muster-${index}`;
  root.setAttribute("role", "option");
  root.setAttribute("aria-selected", "false");
  root.setAttribute("aria-labelledby", `${root.id}-name`);
  root.setAttribute("aria-describedby", `${root.id}-said`);
  root.tabIndex = -1;

  const name = element("span", undefined, option.name);
  name.id = `${root.id}-name`;
  const said = element("span", undefined, option.description);
  said.id = `${root.id}-said`;
  root.append(name, said);

  return {
    id: option.id,
    root,
    say(next) {
      if (name.textContent !== next.name) name.textContent = next.name;
      if (said.textContent !== next.description) said.textContent = next.description;
    },
  };
}
