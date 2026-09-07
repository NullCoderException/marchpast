/**
 * What a visit remembers of the last one, and what it does when the browser
 * will not tell it. Storage throwing is not an edge case to be tidy about: it
 * is what some private modes do to every read and every write, and a themeless
 * player beats a crashed one (ADR-0023).
 */
import { afterEach, describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import { CHART_PLATE, DEFAULT_VIEW, NIGHT_PLATE, VIEWS } from "../render/views.ts";
import { GROUND_KEY, openingView, rememberView, VIEW_KEY } from "./rememberedView.ts";

/** A storage that holds what it is given, as a browser's does. */
function storageHolding(entries: Record<string, string> = {}): Storage {
  const held = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => void held.set(key, value),
    removeItem: (key: string) => void held.delete(key),
    clear: () => held.clear(),
    key: (index: number) => [...held.keys()][index] ?? null,
    get length() {
      return held.size;
    },
  };
}

/** A storage that refuses, which is what a private mode does. */
function storageRefusing(): Storage {
  const refuse = (): never => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  return { getItem: refuse, setItem: refuse, removeItem: refuse, clear: refuse, key: refuse, length: 0 };
}

/** Puts one in place for the length of a test. There is no `localStorage` in a test runner, so every case supplies its own. */
function usingStorage(storage: Storage): void {
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
});

describe("the view a visit opens in", () => {
  it("is the one the last visit left", () => {
    usingStorage(storageHolding({ "marchpast.view": NIGHT_PLATE.id }));
    expect(openingView()).toBe(NIGHT_PLATE);
  });

  it("is the default when nothing has been remembered yet", () => {
    usingStorage(storageHolding());
    expect(openingView()).toBe(CHART_PLATE);
  });

  it("is the default when the stored id is one no view carries", () => {
    usingStorage(storageHolding({ "marchpast.view": "daguerreotype" }));
    expect(openingView()).toBe(CHART_PLATE);
  });

  it("is the default when storage throws, rather than throwing itself", () => {
    usingStorage(storageRefusing());
    expect(() => openingView()).not.toThrow();
    expect(openingView()).toBe(CHART_PLATE);
  });

  it("is the default when there is no storage at all", () => {
    expect(openingView()).toBe(CHART_PLATE);
  });
});

describe("remembering a view", () => {
  it("writes the id, and the ground the next visit paints before its script runs", () => {
    const storage = storageHolding();
    usingStorage(storage);
    rememberView(NIGHT_PLATE.id);
    expect(storage.getItem("marchpast.view")).toBe(NIGHT_PLATE.id);
    expect(storage.getItem("marchpast.ground")).toBe(NIGHT_PLATE.palette.letterbox);
  });

  it("is read back by the next visit", () => {
    usingStorage(storageHolding());
    rememberView(NIGHT_PLATE.id);
    expect(openingView()).toBe(NIGHT_PLATE);
  });

  it("does not throw when storage refuses the write", () => {
    usingStorage(storageRefusing());
    expect(() => rememberView(NIGHT_PLATE.id)).not.toThrow();
  });
});

/**
 * The three lines in the head are the one place the memory is read by
 * something that cannot import it: a `<script>` in `index.html`, so that a
 * remembered ground is on the page before the deferred module runs. Nothing
 * but this holds the two spellings together, and a rename on either side would
 * leave every other test green (ADR-0023).
 */
describe("what `index.html` knows before a module has run", () => {
  it("reads the ground under the key this module writes it under", () => {
    expect(indexHtml).toContain(`localStorage.getItem("${GROUND_KEY}")`);
  });

  it("puts it on the one custom property the page's own ground is painted from", () => {
    expect(indexHtml).toContain('setProperty("--st-edge"');
    expect(indexHtml).toContain("background: var(--st-edge,");
  });

  it("falls back to the default view's letterbox, which is what a first visit has to paint", () => {
    expect(indexHtml).toContain(`var(--st-edge, ${DEFAULT_VIEW.palette.letterbox})`);
  });

  it("names no view id at all: the ground is resolved to a colour before it is stored", () => {
    for (const view of VIEWS) expect(indexHtml).not.toContain(`"${view.id}"`);
    // And it never reads the view key, which would be the id it must not know.
    expect(indexHtml).not.toContain(VIEW_KEY);
  });
});
