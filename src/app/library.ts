/**
 * The Library: the site's front door (ADR-0011). The bare URL lists every
 * battle oldest first — title, date and summary — each entry linking to
 * `?battle=<name>`, above the site's name and its one-line idea and beneath a
 * credit line naming the repository and the data licence.
 *
 * It is a DOM page, not a canvas: there is nothing here to animate. It wears
 * the plate's materials and type ramp all the same (`library.css`), so the
 * front door and the plate read as one thing. It offers no view and no level,
 * and remembers nothing: those are per-visit properties of a playback, and
 * this page is not one (#47, ADR-0014).
 */
import { compareBattles, type BattleIndex } from "../data/battleIndex.ts";
import { element } from "../player/dom.ts";
import { battleQuery, libraryHref } from "./battleName.ts";
import "./library.css";

/** The site's one-line idea, from `docs/CONCEPT.md`. */
const IDEA =
  "A web app that plays back famous battles as animated 2D “grand strategy” sequences, driven by a reusable JSON timeline format, with the timelines extracted from public-domain primary and secondary sources.";

/** Where the source lives, for the credit line. */
const REPOSITORY = "https://github.com/NullCoderException/sandtable";

/** What the page says about the data it plays. */
const DATA_LICENCE = "Battle files CC BY 4.0; each map file carries its own licence.";

/** One line of the Library's list: a battle as the page draws it. */
export interface LibraryRow {
  name: string;
  title: string;
  date: string;
  summary: string;
  /** Where the row leads: the same page with this battle named. */
  href: string;
}

/**
 * The list the Library draws, oldest first. The index is written in this order
 * already; sorting again costs nothing and means the page's own rule — oldest
 * first — does not depend on how the file it was handed was built.
 */
export function libraryRows(index: BattleIndex): LibraryRow[] {
  return [...index].sort(compareBattles).map((entry) => ({
    name: entry.name,
    title: entry.title,
    date: entry.date,
    summary: entry.summary,
    href: battleQuery(entry.name),
  }));
}

/** Builds the Library page for an index. The caller places it and owns the document. */
export function createLibrary(index: BattleIndex): HTMLElement {
  const root = element("main", "st-library");

  const head = element("header", "st-library-head");
  head.append(element("h1", "st-library-name", "Sandtable"), element("p", "st-library-idea", IDEA));
  root.append(head);

  const rows = libraryRows(index);
  if (rows.length === 0) {
    root.append(element("p", "st-library-empty", "No battles yet."));
  } else {
    const list = element("ol", "st-library-list");
    for (const row of rows) list.append(entryFor(row));
    root.append(list);
  }

  root.append(credit());
  return root;
}

/** The way back to the Library from a page that could not play a battle. */
export function createLibraryLink(): HTMLAnchorElement {
  const link = element("a", "st-library-back", "← All battles");
  link.href = libraryHref();
  return link;
}

/** One battle in the list: the whole entry is the link, so the summary is part of the target. */
function entryFor(row: LibraryRow): HTMLLIElement {
  const item = element("li", "st-library-entry");
  const link = element("a", "st-library-link");
  link.href = row.href;
  link.append(
    element("span", "st-library-title", row.title),
    element("span", "st-library-date", row.date),
    element("span", "st-library-summary", row.summary),
  );
  item.append(link);
  return item;
}

/** The credit line: where the source is, and what the data may be reused under. */
function credit(): HTMLElement {
  const footer = element("footer", "st-library-credit");
  const repository = element("a", undefined, "Sandtable on GitHub");
  repository.href = REPOSITORY;
  footer.append(repository, document.createTextNode(`. ${DATA_LICENCE}`));
  return footer;
}
