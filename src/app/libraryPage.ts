/**
 * The library page: the site's front door (ADR-0011). The bare URL lists every
 * battle oldest first — title, date and summary — each entry linking to
 * `/<name>/`, beneath the masthead and above a credit line naming the
 * repository and the data licence.
 *
 * The masthead is the mark beside the name, the one line that says what the
 * site is, and the way into the story (#135). The name is arbitrary by design
 * (ADR-0020), so the idea line is the only thing on the page that explains the
 * app to someone who has just arrived, and it is set before the list rather
 * than in the footer below it.
 *
 * It is a DOM page, not a canvas: there is nothing here to animate. It wears
 * the plate's materials and type ramp all the same (`library.css`), so the
 * front door and the plate read as one thing. It offers no view and no level,
 * and remembers nothing: those are properties of a visit to a battle, and this
 * page is not one (#47, ADR-0014).
 */
import { compareBattles, type Library } from "../data/library.ts";
import { element } from "../player/dom.ts";
import { battlePath } from "./battleName.ts";
import { markSvg } from "./mark.ts";
import "./library.css";

/** The site's name, set beside the mark. Never in another face, never bold, never all caps. */
const NAME = "Marchpast";

/** The site's one-line idea (#135): what a visitor is told before they are shown anything. */
export const IDEA = "Famous battles, played back on the map — phase by phase, from the sources up.";

/** Where the source lives, for the credit line. */
const REPOSITORY = "https://github.com/NullCoderException/marchpast";

/**
 * The head's third line: how the site is made, and where the battles come
 * from. It stays in the head rather than moving to the credit footer, which
 * sits below every card — a visitor who does not know what this is has decided
 * before they reach it. `detail` is the tail a phone drops (`library.css`).
 */
export const STORY = {
  text: "How it is made",
  detail: ", and where the battles come from",
  href: `${REPOSITORY}/blob/main/docs/CONCEPT.md`,
} as const;

/** The mark's size on the masthead; a phone drops it to 32, in `library.css`. */
const MARK_SIZE = 40;

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

/**
 * The masthead, as the HTML the head is set with: the mark, the name on the
 * mark's own baseline, the idea line, and the way into the story, in the order
 * they read. It is markup rather than elements because the mark is a drawing,
 * and every character of it is a constant of this module — nothing here comes
 * from a battle file, so there is nothing to escape.
 */
export function mastheadHtml(): string {
  return [
    '<div class="st-library-lockup">',
    `<span class="st-library-mark" aria-hidden="true">${markSvg(MARK_SIZE)}</span>`,
    `<h1 class="st-library-name">${NAME}</h1>`,
    "</div>",
    `<p class="st-library-idea">${IDEA}</p>`,
    `<p class="st-library-story"><a href="${STORY.href}">${STORY.text}`,
    `<span class="st-library-story-more">${STORY.detail}</span> →</a></p>`,
  ].join("");
}

/** Builds the page for a library. The caller places it and owns the document. */
export function createLibraryPage(library: Library): HTMLElement {
  const root = element("main", "st-library");

  const head = element("header", "st-library-head");
  head.innerHTML = mastheadHtml();
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

/** One battle in the list: the whole entry is the link, so the summary is part of the target. */
function entryFor(battle: Library[number]): HTMLLIElement {
  const item = element("li", "st-library-entry");
  const link = element("a", "st-library-link");
  link.href = battlePath(battle.name);
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
