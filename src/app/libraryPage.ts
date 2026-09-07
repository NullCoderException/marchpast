/**
 * The library page: the site's front door (ADR-0011). The bare URL lists every
 * battle oldest first — title, date and summary — each entry linking to
 * `?battle=<name>`, beneath the site's name and its one-line idea and above a
 * credit line naming the repository and the data licence.
 *
 * It is a DOM page, not a canvas: there is nothing here to animate. It wears
 * the plate's materials and type ramp all the same (`library.css`), so the
 * front door and the plate read as one thing. It offers no view and no level,
 * and remembers nothing: those are properties of a visit to a battle, and this
 * page is not one (#47, ADR-0014).
 */
import { compareBattles, type Library } from "../data/library.ts";
import { element } from "../player/dom.ts";
import { battleQuery, libraryHref } from "./battleName.ts";
import "./library.css";

/** The site's one-line idea, from `docs/CONCEPT.md`. */
const IDEA =
  "A web app that plays back famous battles as animated 2D “grand strategy” sequences, driven by a reusable JSON timeline format, with the timelines extracted from public-domain primary and secondary sources.";

/** Where the source lives, for the credit line. */
const REPOSITORY = "https://github.com/NullCoderException/marchpast";

/** What the page says about the data it plays. */
const DATA_LICENCE = "Battle files CC BY 4.0; each map file carries its own licence.";

/**
 * The library in the order the page lists it, oldest first. The file is
 * written in this order already; ordering it again costs nothing and means the
 * page's own rule does not depend on how the file it was handed was built.
 */
export function libraryOrder(library: Library): Library {
  return [...library].sort(compareBattles);
}

/** Builds the page for a library. The caller places it and owns the document. */
export function createLibraryPage(library: Library): HTMLElement {
  const root = element("main", "st-library");

  const head = element("header", "st-library-head");
  head.append(element("h1", "st-library-name", "Marchpast"), element("p", "st-library-idea", IDEA));
  root.append(head);

  const battles = libraryOrder(library);
  if (battles.length === 0) {
    root.append(element("p", "st-library-empty", "No battles yet."));
  } else {
    const list = element("ol", "st-library-list");
    for (const battle of battles) list.append(entryFor(battle));
    root.append(list);
  }

  root.append(credit());
  return root;
}

/** The way back to the library from a page that could not play a battle. */
export function createLibraryLink(): HTMLAnchorElement {
  const link = element("a", "st-library-back", "← All battles");
  link.href = libraryHref();
  return link;
}

/** One battle in the list: the whole entry is the link, so the summary is part of the target. */
function entryFor(battle: Library[number]): HTMLLIElement {
  const item = element("li", "st-library-entry");
  const link = element("a", "st-library-link");
  link.href = battleQuery(battle.name);
  link.append(
    element("span", "st-library-title", battle.title),
    element("span", "st-library-date", battle.date),
    element("span", "st-library-summary", battle.summary),
  );
  item.append(link);
  return item;
}

/** The credit line: where the source is, and what the data may be reused under. */
function credit(): HTMLElement {
  const footer = element("footer", "st-library-credit");
  const repository = element("a", undefined, "Marchpast on GitHub");
  repository.href = REPOSITORY;
  footer.append(repository, document.createTextNode(`. ${DATA_LICENCE}`));
  return footer;
}
