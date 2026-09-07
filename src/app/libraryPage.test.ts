/**
 * The list the front door draws: what it holds and in what order. Drawing it
 * is a handful of elements over this (`libraryPage.ts`).
 *
 * The masthead is here too, as the HTML it is set in: the mark, the name, the
 * idea line and the way into the story, in the order they read (#135).
 */
import { describe, expect, it } from "vitest";
import type { Library } from "../data/library.ts";
import { IDEA, libraryOrder, mastheadHtml, STORY } from "./libraryPage.ts";

/** A library entry with only the fields the page reads; `sides` is carried for the file, not the page. */
function entry(name: string, year: number, month = 1, day = 1): Library[number] {
  return {
    name,
    title: `The Battle of ${name}`,
    date: `${day} of month ${month}, ${year}`,
    sort_date: { year, month, day },
    summary: `What happened at ${name}.`,
    sides: ["British"],
  };
}

describe("the order the front door lists battles in", () => {
  it("is oldest first, whatever order the file arrived in", () => {
    const library = [
      entry("trafalgar", 1805, 10, 21),
      entry("cannae", -216, 8, 2),
      entry("copenhagen", 1801, 4, 2),
      entry("nile", 1798, 8, 1),
    ];
    expect(libraryOrder(library).map((battle) => battle.name)).toEqual(["cannae", "nile", "copenhagen", "trafalgar"]);
  });

  it("keeps every battle, with what the entry says about it", () => {
    expect(libraryOrder([entry("trafalgar", 1805, 10, 21)])).toEqual([entry("trafalgar", 1805, 10, 21)]);
  });

  it("leaves the library it was handed alone", () => {
    const library = [entry("trafalgar", 1805), entry("cannae", -216)];
    libraryOrder(library);
    expect(library.map((battle) => battle.name)).toEqual(["trafalgar", "cannae"]);
  });

  it("is empty for an empty library", () => {
    expect(libraryOrder([])).toEqual([]);
  });
});

/** Where a part starts in the masthead, failing loudly when it is not there at all. */
function at(html: string, part: string): number {
  const index = html.indexOf(part);
  expect(index, `the masthead does not carry ${part}`).toBeGreaterThan(-1);
  return index;
}

describe("the masthead", () => {
  const html = mastheadHtml();

  it("draws the mark, and draws it as the mark and not as a picture file", () => {
    expect(html).toContain("<svg");
    // The rank, the tick that has passed and the doubled rule: the drawing itself.
    expect(html).toContain('viewBox="0 0 64 64"');
    expect(html).not.toContain("<img");
  });

  it("reads mark, name, idea, story, in that order", () => {
    const order = [at(html, "<svg"), at(html, ">Marchpast<"), at(html, IDEA), at(html, STORY.text)];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("says what the site is without the reader clicking anything", () => {
    expect(IDEA).toBe("Famous battles, played back on the map — phase by phase, from the sources up.");
  });

  it("links the story with a real href, not a placeholder", () => {
    expect(STORY.href).toMatch(/^https:\/\/\S+\/docs\/CONCEPT\.md$/);
    expect(html).toContain(`href="${STORY.href}"`);
  });

  it("keeps the tail of the story line separable, so a phone can drop it", () => {
    expect(html).toContain(STORY.detail);
    expect(at(html, STORY.detail)).toBeGreaterThan(at(html, STORY.text));
  });
});
