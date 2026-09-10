/**
 * The details panel: the phase's reasoning and citations above the battle's
 * credit line and sources table (issue #13's resolution, point 6), and — on a
 * phone — the rows of the plate's key that no longer fit on the plate.
 *
 * It is a control, not furniture: hidden until the viewer asks for it, and
 * opening it never pauses playback. The battle half is built once; the phase
 * half is rebuilt only when the phase changes, and the key only when the view
 * does, so an open panel costs nothing per frame.
 *
 * The key is where a narrow plate's legend goes (#86): the four states, one
 * row per arm the roster keys, the three line styles, and the map's credit
 * line. It is drawn in the view's own glyph and pens, through the same
 * `drawKeyRowSample` the plate's legend uses, so a reader learns this view's
 * foot from this view's horse whichever of the two they are looking at.
 */
import {
  drawKeyRowSample,
  type KeyRow,
  KEY_ROW_HEIGHT,
  KEY_SAMPLE_SCALE,
  KEY_SAMPLE_WIDTH,
  keyRowLabel,
  plateKeyRows,
} from "../render/key.ts";
import { legendArm } from "../render/glyphs/arms.ts";
import { type View, type ViewId, viewById } from "../render/index.ts";
import type { LayoutMode } from "../render/layout.ts";
import { sideColours } from "../render/anatomy.ts";
import type { Battle, MapFile, Reference } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { element } from "./dom.ts";

/**
 * What the panel says about the plate itself, or nothing at all on a desktop,
 * where the legend still carries every row and the credit is still on the
 * plate. Pure, so what a phone's Details holds is a test and not a screenshot.
 */
export interface PlateKey {
  /** The rows the plate's legend can no longer show: the states, the arms, the line styles. */
  rows: KeyRow[];
  /** The map file's attribution, which a phone takes off the plate (ADR-0007). */
  credit?: string;
}

export function plateKey(battle: Battle, map: MapFile | undefined, mode: LayoutMode): PlateKey | undefined {
  if (mode !== "phone") return undefined;
  const key: PlateKey = { rows: plateKeyRows(battle.units) };
  const credit = map?.attribution;
  if (credit !== undefined && credit !== "") key.credit = credit;
  return key;
}

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
  /**
   * Keeps the plate's key in step with the plate: shown on a phone, in
   * whichever view the plate is being drawn in, and gone on a desktop where
   * the legend carries it.
   */
  setPlate(view: ViewId, mode: LayoutMode): void;
}

/** Builds the panel for a battle, with the sources table already in it and the phase half empty until the first `update`. */
export function createDetailsPanel(battle: Battle, map?: MapFile): DetailsPanel {
  const root = element("section", "st-details");
  root.hidden = true;
  root.setAttribute("aria-label", "Phase notes and sources");

  const phaseSection = element("div", "st-details-phase");
  const keySection = element("div", "st-details-key");
  keySection.hidden = true;
  root.append(phaseSection, keySection, battleSection(battle));

  let shownPhase: number | undefined;
  let shownView: ViewId | undefined;
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
    setPlate(view, mode) {
      keySection.hidden = mode !== "phone";
      // The rows say nothing the view does not, so they are built when the
      // view changes and on no other frame — this runs once per rendered
      // frame, and an open panel is meant to cost nothing.
      if (keySection.hidden || view === shownView) return;
      const key = plateKey(battle, map, mode);
      if (key === undefined) return;
      shownView = view;
      keySection.replaceChildren(...keyChildren(battle, key, viewById(view)));
    },
  };
}

/** The plate's key: a row per thing the legend keys, then the map's credit when it has one. */
function keyChildren(battle: Battle, key: PlateKey, view: View): Node[] {
  const colours = sideColours(battle, view.palette);
  const place = {
    left: 0,
    centreY: KEY_ROW_HEIGHT / 2,
    width: KEY_SAMPLE_WIDTH,
    scale: KEY_SAMPLE_SCALE,
    arm: legendArm(battle.units),
    firstSide: colours.values().next().value ?? view.palette.ink,
  };

  const list = element("ul", "st-key");
  for (const row of key.rows) {
    const item = element("li", "st-key-row");
    item.append(sampleCanvas(view, row, place), element("span", "st-key-word", keyRowLabel(row)));
    list.append(item);
  }

  const children: Node[] = [element("h3", "st-details-subheading", "The plate"), list];
  if (key.credit !== undefined) children.push(element("p", "st-key-credit", key.credit));
  return children;
}

/** One row's sample, drawn on its own canvas at the device's own pixels so it is as crisp as the plate. */
function sampleCanvas(view: View, row: KeyRow, place: Parameters<typeof drawKeyRowSample>[3]): HTMLCanvasElement {
  const canvas = element("canvas", "st-key-sample");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(KEY_SAMPLE_WIDTH * dpr);
  canvas.height = Math.round(KEY_ROW_HEIGHT * dpr);
  canvas.style.width = `${KEY_SAMPLE_WIDTH}px`;
  canvas.style.height = `${KEY_ROW_HEIGHT}px`;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawKeyRowSample(ctx, view, row, place);
  return canvas;
}

/**
 * The notes as the paragraphs they were written in. The longer ones run to
 * several, separated by a blank line, and one text node would run them
 * together into a wall the reader has to pick apart.
 */
export function notesParagraphs(notes: string): string[] {
  return notes
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
}

/** The current phase: its label, its notes, and its references. */
function phaseChildren(battle: Battle, picture: Picture): Node[] {
  const children: Node[] = [element("h2", "st-details-heading", picture.label)];
  for (const paragraph of notesParagraphs(picture.notes)) {
    children.push(element("p", "st-details-notes", paragraph));
  }

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
