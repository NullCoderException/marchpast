import { describe, expect, it } from "vitest";
import { layoutCaption } from "./drawCaption.ts";
import type { Battle } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";

/** A measuring context: every glyph six pixels wide, which is all the layout needs. */
function fakeContext(): CanvasRenderingContext2D {
  return {
    save() {},
    restore() {},
    measureText: (text: string) => ({ width: text.length * 6 }) as TextMetrics,
    set font(_value: string) {},
    get font() {
      return "";
    },
  } as unknown as CanvasRenderingContext2D;
}

const battle = {
  title: "The Battle of Trafalgar",
  date: "21 October 1805",
  sources: {
    collingwood: { label: "Collingwood's dispatch" },
    southey: { label: "Southey" },
    mahan: { label: "Mahan" },
    britannica: { label: "Britannica 1911 (Hannay)" },
  },
} as unknown as Battle;

const picture = {
  caption: "At daylight, Cape Trafalgar bearing east by south about seven leagues.",
  label: "Dawn: the fleets sight each other",
  references: [{ source: "collingwood" }, { source: "southey" }, { source: "mahan" }, { source: "britannica" }],
} as unknown as Picture;

describe("the caption band's sources", () => {
  it("wraps the sources to the text column instead of running past it", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 390);
    const widest = Math.max(...layout.sourceLines.map((line) => line.length * 6));

    expect(layout.sourceLines.length).toBeGreaterThan(1);
    expect(widest).toBeLessThanOrEqual(390 - 24 * 2 - 150);
  });

  it("counts every source line in the band's height, so the plate above it shrinks to fit", () => {
    const narrow = layoutCaption(fakeContext(), battle, picture, 390);
    const wide = layoutCaption(fakeContext(), battle, picture, 1280);

    expect(narrow.sourceLines.length).toBeGreaterThan(wide.sourceLines.length);
    expect(narrow.height).toBeGreaterThan(wide.height);
  });

  it("keeps one line when the sources fit, and none when the phase cites nothing", () => {
    const wide = layoutCaption(fakeContext(), battle, picture, 1280);
    const unsourced = layoutCaption(fakeContext(), battle, { ...picture, references: [] } as unknown as Picture, 1280);

    expect(wide.sourceLines).toHaveLength(1);
    expect(wide.sourceLines[0]).toBe("— Collingwood's dispatch, Southey, Mahan, Britannica 1911 (Hannay)");
    expect(unsourced.sourceLines).toEqual([]);
  });
});

describe("the caption band's phase label", () => {
  it("wraps the label to the text column instead of running past it", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 390);
    const widest = Math.max(...layout.labelLines.map((line) => line.length * 6));

    expect(layout.labelLines.length).toBeGreaterThan(1);
    expect(widest).toBeLessThanOrEqual(390 - 24 * 2 - 150);
  });

  it("keeps a short label on one line, upper case", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 1280);

    expect(layout.labelLines).toEqual(["DAWN: THE FLEETS SIGHT EACH OTHER"]);
  });
});
