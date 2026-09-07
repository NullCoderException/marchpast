/**
 * @vitest-environment jsdom
 *
 * The list the front door draws: what it holds, in what order, what the run
 * between two entries says, and the elements the rail and the still are made
 * of (ADR-0022, ADR-0025).
 *
 * The masthead is here too, as the HTML it is set in: the mark, the name, the
 * idea line and the way into the story, in the order they read (#135).
 *
 * The page builds elements, so this file needs a document. It is the one test
 * file in the app that does: everything else the page knows is arithmetic, and
 * `intervalBetween` is tested as arithmetic rather than through the DOM.
 */
import { describe, expect, it } from "vitest";
import type { Library } from "../data/library.ts";
import { stillUrl } from "../data/paths.ts";
import { DEFAULT_VIEW } from "../render/views.ts";
import type { SortDate } from "../schema/types.ts";
import { battleQuery } from "./battleName.ts";
import { createLibraryPage, IDEA, intervalBetween, libraryOrder, mastheadHtml, STORY } from "./libraryPage.ts";

/** A library entry with only the fields the page reads; `sides` is one side unless a test wants more. */
function entry(name: string, year: number, month = 1, day = 1, sides = ["British"]): Library[number] {
  return {
    name,
    title: `The Battle of ${name}`,
    date: `${day} of month ${month}, ${year}`,
    sort_date: { year, month, day },
    summary: `What happened at ${name}.`,
    sides,
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

/** A sort date, written the way the battle files write one: BC negative, no year zero. */
function on(year: number, month: number, day: number): SortDate {
  return { year, month, day };
}

/** The seven v0.3 battles' own first days, in library order (`data/battles/`, and #178 and #180 for the two unwritten). */
const V03 = {
  cannae: on(-216, 8, 2),
  alesia: on(-52, 9, 20),
  nile: on(1798, 8, 1),
  copenhagen: on(1801, 4, 2),
  trafalgar: on(1805, 10, 21),
  bighorn: on(1876, 6, 25),
  midway: on(1942, 6, 4),
};

describe("the interval between two battles", () => {
  it("counts the run from Cannae to Alesia in whole years", () => {
    expect(intervalBetween(V03.cannae, V03.alesia)).toBe("164 years later");
  });

  it("separates the thousands across the void from Alesia to the Nile", () => {
    // 1,849 years to 20 September 1798 — 51 from 52 BC to 1 BC, one across the
    // missing year zero, 1,797 to 1798 — and the Nile is six weeks short of
    // that anniversary, so the floor is 1,848. ADR-0022's table says 1,849
    // because it was written when Alesia was a bare "52 BC" with no day, which
    // is the year-only arithmetic that same ADR rejects by name. The three
    // numbers are forced: Cannae and the Nile straddle Alesia a day apart, so
    // 164 and this one must sum to Cannae → the Nile, which is 2,012. Raised
    // on #177.
    expect(intervalBetween(V03.alesia, V03.nile)).toBe("1,848 years later");
  });

  it("floors the run within a year, so twenty months from the Nile to Copenhagen is two years and not three", () => {
    expect(intervalBetween(V03.nile, V03.copenhagen)).toBe("2 years later");
  });

  it("counts a whole run from Copenhagen to Trafalgar", () => {
    expect(intervalBetween(V03.copenhagen, V03.trafalgar)).toBe("4 years later");
  });

  it("floors Trafalgar to the Little Bighorn to seventy and not seventy-one", () => {
    expect(intervalBetween(V03.trafalgar, V03.bighorn)).toBe("70 years later");
  });

  it("floors the Little Bighorn to Midway on the day, three weeks short of sixty-six", () => {
    expect(intervalBetween(V03.bighorn, V03.midway)).toBe("65 years later");
  });

  it("reads Nelson's three as a cluster, which is what the rail is for", () => {
    const cluster = [
      intervalBetween(V03.alesia, V03.nile),
      intervalBetween(V03.nile, V03.copenhagen),
      intervalBetween(V03.copenhagen, V03.trafalgar),
    ];
    expect(cluster).toEqual(["1,848 years later", "2 years later", "4 years later"]);
  });

  it("says later the same year rather than a number, for two battles inside one year", () => {
    expect(intervalBetween(on(1801, 4, 2), on(1801, 11, 30))).toBe("later the same year");
  });

  it("says later the same year even for two battles a day apart", () => {
    expect(intervalBetween(on(1798, 8, 1), on(1798, 8, 2))).toBe("later the same year");
  });

  it("falls back to whole months under a year, across the turn of a year", () => {
    expect(intervalBetween(on(1798, 8, 1), on(1799, 4, 1))).toBe("8 months later");
  });

  it("floors the months on the day, as it floors the years", () => {
    expect(intervalBetween(on(1798, 8, 20), on(1799, 4, 1))).toBe("7 months later");
  });

  it("skips the missing year zero, counting one year from 1 BC to AD 1", () => {
    expect(intervalBetween(on(-1, 3, 4), on(1, 3, 4))).toBe("1 year later");
  });

  it("skips the missing year zero in the months too", () => {
    expect(intervalBetween(on(-1, 12, 1), on(1, 1, 1))).toBe("1 month later");
  });

  it("counts BC to AD without inventing a year, so 1 BC to AD 1798 is 1,797", () => {
    expect(intervalBetween(on(-1, 1, 1), on(1798, 1, 1))).toBe("1,798 years later");
  });

  it("says less than a month for two battles either side of a new year", () => {
    expect(intervalBetween(on(1798, 12, 20), on(1799, 1, 5))).toBe("less than a month later");
  });

  it("writes the word later on every one of them, which is what makes it a chronology", () => {
    const runs = [
      intervalBetween(V03.cannae, V03.alesia),
      intervalBetween(on(1801, 4, 2), on(1801, 11, 30)),
      intervalBetween(on(1798, 8, 1), on(1799, 4, 1)),
      intervalBetween(on(1798, 12, 20), on(1799, 1, 5)),
    ];
    for (const run of runs) expect(run).toContain("later");
  });
});

/** The seven v0.3 battles as a library, in the order the file holds them. */
function v03Library(): Library {
  return [
    entry("cannae", -216, 8, 2, ["Roman", "Carthaginian"]),
    entry("alesia", -52, 9, 20, ["Gallic", "Roman"]),
    entry("nile", 1798, 8, 1, ["British", "French"]),
    entry("copenhagen", 1801, 4, 2, ["British", "Danish"]),
    entry("trafalgar", 1805, 10, 21, ["British", "Franco-Spanish"]),
    entry("little-bighorn", 1876, 6, 25, ["United States", "Lakota and Cheyenne"]),
    entry("midway", 1942, 6, 4, ["United States", "Japanese"]),
  ];
}

/** The nth of something drawn, failing loudly rather than typing around an absent one. */
function nth<T>(items: T[], index: number, what: string): T {
  const item = items[index];
  expect(item, `there is no ${what} ${index}`).toBeDefined();
  return item as T;
}

/** The page’s list, and its entries, for a library. */
function listOf(library: Library) {
  const page = createLibraryPage(library);
  const list = page.querySelector("ol.st-library-list");
  expect(list, "the page draws no list").not.toBeNull();
  return { page, list: list as HTMLOListElement, entries: [...(list as HTMLOListElement).children] as HTMLLIElement[] };
}

describe("the list the page draws", () => {
  it("keeps one <li> per battle inside one <ol>, so the count and the order are the list's own", () => {
    const { list, entries } = listOf(v03Library());
    expect(entries).toHaveLength(7);
    expect(entries.every((item) => item.tagName === "LI")).toBe(true);
    expect(list.children).toHaveLength(7);
  });

  it("gives every entry one link, to that battle", () => {
    const { entries } = listOf(v03Library());
    const links = entries.map((item) => item.querySelectorAll("a"));
    expect(links.every((found) => found.length === 1)).toBe(true);
    expect(entries.map((item) => item.querySelector("a")?.getAttribute("href"))).toEqual(
      ["cannae", "alesia", "nile", "copenhagen", "trafalgar", "little-bighorn", "midway"].map(battleQuery),
    );
  });
});

describe("the still on a card", () => {
  it("is an image of the battle's own still, lazy and unnamed", () => {
    const { entries } = listOf(v03Library());
    const stills = entries.map((item) => item.querySelector("img"));
    expect(stills.every((still) => still !== null)).toBe(true);
    for (const still of stills as HTMLImageElement[]) {
      expect(still.getAttribute("alt")).toBe("");
      expect(still.getAttribute("loading")).toBe("lazy");
    }
  });

  it("points at the still the build renders for that battle", () => {
    const { entries } = listOf(v03Library());
    expect(entries.map((item) => item.querySelector("img")?.getAttribute("src"))).toEqual(
      ["cannae", "alesia", "nile", "copenhagen", "trafalgar", "little-bighorn", "midway"].map(stillUrl),
    );
  });

  it("is read before the title, so the picture is the entry's face and not its footnote", () => {
    const first = nth(listOf(v03Library()).entries, 0, "entry");
    const link = first.querySelector("a") as HTMLAnchorElement;
    const drawn = [...link.querySelectorAll("img, .st-library-title")];
    expect(drawn.map((node) => node.tagName)).toEqual(["IMG", "SPAN"]);
  });
});

describe("the interval on a card", () => {
  it("is the first child of the following entry, outside its link", () => {
    const { entries } = listOf(v03Library());
    const first = nth(entries, 1, "entry").firstElementChild as HTMLElement;
    expect(first.className).toBe("st-library-interval");
    expect(first.textContent).toBe("164 years later");
    expect(first.closest("a")).toBeNull();
  });

  it("leaves the first entry without one: nothing came before Cannae", () => {
    const cannae = nth(listOf(v03Library()).entries, 0, "entry");
    expect(cannae.querySelector(".st-library-interval")).toBeNull();
    expect((cannae.firstElementChild as HTMLElement).tagName).toBe("A");
  });

  it("keeps the link's accessible name the battle, not the run before it", () => {
    const { entries } = listOf(v03Library());
    for (const item of entries) {
      const link = item.querySelector("a") as HTMLAnchorElement;
      expect(link.textContent).not.toContain("later");
    }
  });

  it("writes one run per gap: six for seven battles", () => {
    const { page } = listOf(v03Library());
    expect([...page.querySelectorAll(".st-library-interval")].map((node) => node.textContent)).toEqual([
      "164 years later",
      "1,848 years later",
      "2 years later",
      "4 years later",
      "70 years later",
      "65 years later",
    ]);
  });

  it("reads the run off the library's own order, not the order the file arrived in", () => {
    const shuffled = [...v03Library()].reverse();
    const { page } = listOf(shuffled);
    expect((page.querySelector(".st-library-interval") as HTMLElement).textContent).toBe("164 years later");
  });
});

describe("the sides on a card", () => {
  it("names them in roster order, beneath the date and above the summary", () => {
    const cannae = nth(listOf(v03Library()).entries, 0, "entry");
    const sides = cannae.querySelector(".st-library-sides") as HTMLElement;
    expect(sides.textContent).toBe("Roman · Carthaginian");
    const order = [...cannae.querySelectorAll(".st-library-date, .st-library-sides, .st-library-summary")];
    expect(order.map((node) => node.className)).toEqual(["st-library-date", "st-library-sides", "st-library-summary"]);
  });

  it("sets each one in the ink the still draws that side in", () => {
    const cannae = nth(listOf(v03Library()).entries, 0, "entry");
    const named = [...(cannae.querySelector(".st-library-sides") as HTMLElement).querySelectorAll(".st-library-side")];
    expect(named.map((node) => node.textContent)).toEqual(["Roman", "Carthaginian"]);
    expect(named.map((node) => (node as HTMLElement).style.color)).toEqual(
      DEFAULT_VIEW.palette.sides.slice(0, 2).map(hexToRgb),
    );
  });

  it("gives a side past the palette's end the page's ink rather than nothing", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g"];
    const only = nth(listOf([entry("many-sided", 1800, 1, 1, many)]).entries, 0, "entry");
    const named = [...only.querySelectorAll(".st-library-side")] as HTMLElement[];
    expect(named).toHaveLength(7);
    expect(nth(named, 6, "side").style.color).toBe(hexToRgb(nth([...DEFAULT_VIEW.palette.sides], 0, "ink")));
  });
});

/** jsdom answers `style.color` in `rgb()`, so the palette's hex is put in the same form to compare. */
function hexToRgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

describe("the rail", () => {
  it("hangs a line and a node off every entry's link, where the card is", () => {
    const { entries } = listOf(v03Library());
    for (const item of entries) {
      const link = item.querySelector("a") as HTMLAnchorElement;
      expect(link.querySelectorAll(".st-library-rail")).toHaveLength(1);
      expect(link.querySelectorAll(".st-library-node")).toHaveLength(1);
    }
  });

  it("hides both from a reader who is being read to: they draw what the words already say", () => {
    const { page } = listOf(v03Library());
    const drawn = [...page.querySelectorAll(".st-library-rail, .st-library-node")];
    expect(drawn).toHaveLength(14);
    for (const node of drawn) expect(node.getAttribute("aria-hidden")).toBe("true");
  });

  it("carries no words of its own", () => {
    const { page } = listOf(v03Library());
    for (const node of page.querySelectorAll(".st-library-rail, .st-library-node")) {
      expect(node.textContent).toBe("");
    }
  });
});

describe("a library with nothing in it", () => {
  it("says so, and draws no list and no rail", () => {
    const page = createLibraryPage([]);
    expect(page.querySelector("ol")).toBeNull();
    expect(page.querySelector(".st-library-rail")).toBeNull();
    expect(page.textContent).toContain("No battles yet.");
  });
});

describe("a library of one", () => {
  it("draws its card with no interval before it", () => {
    const { entries, page } = listOf([entry("trafalgar", 1805, 10, 21, ["British", "Franco-Spanish"])]);
    expect(entries).toHaveLength(1);
    expect(page.querySelector(".st-library-interval")).toBeNull();
  });
});
