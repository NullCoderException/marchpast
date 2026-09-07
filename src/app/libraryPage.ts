/**
 * The library page: the site's front door (ADR-0011). The bare URL lists every
 * battle oldest first — its still, title, date, sides and summary — each entry
 * linking to `?battle=<name>`, beneath the masthead and above a credit line
 * naming the repository and the data licence.
 *
 * It is a chronology rather than a grouping (ADR-0022): the entries hang off a
 * rail down a gutter to their left, a node marking each battle, and the run
 * between two of them carrying the elapsed interval in words. The rail is
 * **ordinal** — every run is the same length and the gap is written rather
 * than drawn, because 1,848 years and 2 years cannot share a scale. Its line
 * and its nodes are `aria-hidden`: they draw what the interval beside them
 * already says.
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
 * page is not one (#47, ADR-0014). The one thing it does borrow from a view is
 * the side inks, because a card's sides must be the inks its own still is
 * drawn in.
 */
import { compareBattles, type Library, type LibraryEntry } from "../data/library.ts";
import { stillUrl } from "../data/paths.ts";
import { element } from "../player/dom.ts";
import { DEFAULT_VIEW } from "../render/views.ts";
import type { SortDate } from "../schema/types.ts";
import { battleQuery } from "./battleName.ts";
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
 * page's own rule does not depend on how the file it was handed was built —
 * and the intervals are read off consecutive pairs of this order, so it has to
 * be the page's own.
 */
export function libraryOrder(library: Library): Library {
  return [...library].sort(compareBattles);
}

/**
 * The year on the astronomical line, where the year before AD 1 is 0. Battle
 * files write a year in ordinary historical numbering, BC negative with no
 * year zero (schema.md 2.1: Cannae is `-216`, not `-215`), which cannot be
 * subtracted from directly — 1 BC to AD 1 is one year, not two.
 */
function astronomicalYear(date: SortDate): number {
  return date.year < 0 ? date.year + 1 : date.year;
}

/** Whether `date` falls earlier in its year than `mark` does in its own: what floors a run to whole units. */
function earlierInYear(date: SortDate, mark: SortDate): boolean {
  return date.month < mark.month || (date.month === mark.month && date.day < mark.day);
}

/** Whole elapsed years from one battle's first day to another's, floored on the day. */
function elapsedYears(before: SortDate, after: SortDate): number {
  const years = astronomicalYear(after) - astronomicalYear(before);
  return earlierInYear(after, before) ? years - 1 : years;
}

/** Whole elapsed months, the unit a run of under a year falls back to. */
function elapsedMonths(before: SortDate, after: SortDate): number {
  const months = (astronomicalYear(after) - astronomicalYear(before)) * 12 + (after.month - before.month);
  return after.day < before.day ? months - 1 : months;
}

/** A count with its thousands separated, written here rather than left to a locale the page never sets. */
function grouped(count: number): string {
  return String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** `count` of `unit`, pluralised: *1 year*, *164 years*. */
function counted(count: number, unit: string): string {
  return `${grouped(count)} ${unit}${count === 1 ? "" : "s"}`;
}

/**
 * What the run between two consecutive battles says, as the rail writes it
 * (ADR-0022): whole elapsed years, floored, computed from the full `sort_date`
 * and separated at the thousands. The word *later* is what makes it a
 * chronology rather than a caption.
 *
 * The arithmetic is calendar-naive and knows only about the missing year zero:
 * Cannae's 216 BC is a proleptic Julian date and Midway's is Gregorian, and
 * the years between them are counted as though one calendar ran throughout.
 * A floor to whole years absorbs that. This is the one place `sort_date` is
 * counted from rather than compared — the distance between two battles is
 * about the library's shelf, not about either battle's clock, and no duration
 * *within* a battle may be had this way (ADR-0013, amended by ADR-0022).
 *
 * Under a year it falls back to whole months, and two battles inside one
 * calendar year read *later the same year*. Two battles either side of a new
 * year and under a month apart are none of those three, so they say what is
 * true and count nothing.
 */
export function intervalBetween(before: SortDate, after: SortDate): string {
  const years = elapsedYears(before, after);
  if (years >= 1) return `${counted(years, "year")} later`;
  if (before.year === after.year) return "later the same year";
  const months = elapsedMonths(before, after);
  if (months < 1) return "less than a month later";
  return `${counted(months, "month")} later`;
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
    for (const [index, battle] of battles.entries()) list.append(entryFor(battle, battles[index - 1]));
    root.append(list);
  }

  root.append(credit());
  return root;
}

/**
 * One battle in the list: the run since `previous` and then the card, which is
 * the whole link so the summary is part of the target.
 *
 * The interval is the first child of the `<li>` and sits **outside** the
 * `<a>`, which is what keeps the `<ol>` valid and counting while leaving the
 * link's accessible name the battle: inside it, every link would announce as
 * "1,848 years later, The Battle of the Nile, …" and the run would become part
 * of the name of the thing being chosen (ADR-0022).
 */
function entryFor(battle: LibraryEntry, previous: LibraryEntry | undefined): HTMLLIElement {
  const item = element("li", "st-library-entry");
  if (previous !== undefined) {
    item.append(element("p", "st-library-interval", intervalBetween(previous.sort_date, battle.sort_date)));
  }
  item.append(linkFor(battle));
  return item;
}

/** The card: the rail's line and node, the still, and the words. */
function linkFor(battle: LibraryEntry): HTMLAnchorElement {
  const link = element("a", "st-library-link");
  link.href = battleQuery(battle.name);
  link.append(railPart("st-library-rail"), railPart("st-library-node"), cardFor(battle));
  return link;
}

/** A part of the rail: a drawing of what the words beside it already say, so nothing is read out for it. */
function railPart(className: string): HTMLSpanElement {
  const part = element("span", className);
  part.setAttribute("aria-hidden", "true");
  return part;
}

/** The still to the left of the words on a desktop, above them on a phone, so the title stays the first thing read. */
function cardFor(battle: LibraryEntry): HTMLSpanElement {
  const card = element("span", "st-library-card");

  // Unnamed and lazy (ADR-0025): the entry is already one link named by title,
  // date, sides and summary, and a picture of ground the summary describes in
  // words adds noise to that name rather than meaning.
  const still = element("img", "st-library-still");
  still.src = stillUrl(battle.name);
  still.alt = "";
  // Set as an attribute rather than through `loading`, which not every DOM reflects.
  still.setAttribute("loading", "lazy");

  const text = element("span", "st-library-text");
  text.append(
    element("span", "st-library-title", battle.title),
    element("span", "st-library-date", battle.date),
    sidesOf(battle),
    element("span", "st-library-summary", battle.summary),
  );

  card.append(still, text);
  return card;
}

/**
 * The sides in roster order, each in the ink its own still is drawn in: the
 * one fact that answers "who fought" without reading the summary (ADR-0022).
 *
 * The inks are the default view's rather than the library's own, because the
 * still beside them is drawn in the view the battle opens in, which is that
 * view for every battle (ADR-0025). Roster order is the palette's order, wrapping
 * as `sideColours` wraps, so the card and the plate agree side for side.
 */
function sidesOf(battle: LibraryEntry): HTMLSpanElement {
  const { sides: inks, ink } = DEFAULT_VIEW.palette;
  const sides = element("span", "st-library-sides");
  for (const [index, side] of battle.sides.entries()) {
    if (index > 0) sides.append(element("span", "st-library-sides-rule", " · "));
    const named = element("span", "st-library-side", side);
    named.style.color = inks[index % inks.length] ?? ink;
    sides.append(named);
  }
  return sides;
}

/** The credit line: where the source is, and what the data may be reused under. */
function credit(): HTMLElement {
  const footer = element("footer", "st-library-credit");
  const repository = element("a", undefined, "Marchpast on GitHub");
  repository.href = REPOSITORY;
  footer.append(repository, document.createTextNode(`. ${DATA_LICENCE}`));
  return footer;
}
