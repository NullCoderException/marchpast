/**
 * The details panel: the phase's reasoning and citations above the battle's
 * credit line and sources table (issue #13's resolution, point 6).
 *
 * It is a control, not furniture: hidden until the viewer asks for it, and
 * opening it never pauses playback. The battle half is built once; the phase
 * half is rebuilt only when the phase changes, so an open panel costs nothing
 * per frame.
 */
import type { Battle, Reference } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { element } from "./dom.ts";

/** The panel as the player holds it: one element to place, one call to keep the phase half in step. */
export interface DetailsPanel {
  /** The panel element, for the caller to place; hidden until `setOpen(true)`. */
  readonly root: HTMLElement;
  /** Shows or hides the panel. */
  setOpen(open: boolean): void;
  /** Whether the panel is showing. */
  isOpen(): boolean;
  /** Rewrites the phase half when the phase has changed. */
  update(picture: Picture): void;
}

/** Builds the panel for a battle, with the sources table already in it and the phase half empty until the first `update`. */
export function createDetailsPanel(battle: Battle): DetailsPanel {
  const root = element("section", "st-details");
  root.hidden = true;
  root.setAttribute("aria-label", "Phase notes and sources");

  const phaseSection = element("div", "st-details-phase");
  root.append(phaseSection, battleSection(battle));

  let shownPhase: number | undefined;
  return {
    root,
    setOpen(open) {
      root.hidden = !open;
    },
    isOpen: () => !root.hidden,
    update(picture) {
      if (picture.phaseIndex === shownPhase) return;
      shownPhase = picture.phaseIndex;
      phaseSection.replaceChildren(...phaseChildren(battle, picture));
    },
  };
}

/** The current phase: its label, its notes when it has them, and its references. */
function phaseChildren(battle: Battle, picture: Picture): Node[] {
  const children: Node[] = [element("h2", "st-details-heading", picture.label)];
  if (picture.notes !== undefined) children.push(element("p", "st-details-notes", picture.notes));

  const list = element("ul", "st-references");
  for (const reference of picture.references) list.append(referenceItem(battle, reference));
  children.push(element("h3", "st-details-subheading", "References"), list);
  return children;
}

/** One reference: the source's label, the locator, and the quote when there is one. */
function referenceItem(battle: Battle, reference: Reference): HTMLLIElement {
  const item = element("li", "st-reference");
  const source = battle.sources[reference.source];
  item.append(element("span", "st-reference-label", source?.label ?? reference.source));
  item.append(element("span", "st-reference-locator", reference.locator));
  if (reference.quote !== undefined) item.append(element("blockquote", "st-quote", reference.quote));
  if (reference.note !== undefined) item.append(element("p", "st-reference-note", reference.note));
  return item;
}

/** The battle: its credit line and the whole sources table, both fixed for the visit. */
function battleSection(battle: Battle): HTMLElement {
  const section = element("div", "st-details-battle");
  section.append(element("h3", "st-details-subheading", "Sources"));
  if (battle.attribution !== undefined) section.append(element("p", "st-attribution", battle.attribution));

  const table = element("table", "st-sources");
  const head = element("tr");
  for (const heading of ["Label", "Work", "Read it at", "Licence"]) head.append(element("th", undefined, heading));
  const thead = element("thead");
  thead.append(head);
  table.append(thead);

  const body = element("tbody");
  for (const [id, source] of Object.entries(battle.sources)) {
    const row = element("tr");
    row.append(element("td", "st-source-label", source.label), element("td", undefined, source.work));

    // The url as a link, when the source says where to read it.
    const url = element("td", "st-source-url");
    if (source.url !== undefined) {
      const link = element("a", undefined, source.url);
      link.href = source.url;
      link.rel = "noreferrer";
      link.target = "_blank";
      url.append(link);
    }
    row.append(url, element("td", "st-source-license", source.license));
    row.dataset["source"] = id;
    body.append(row);
  }
  table.append(body);
  section.append(table);
  return section;
}
