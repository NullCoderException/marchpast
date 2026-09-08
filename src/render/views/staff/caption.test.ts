/**
 * The staff band's own layout: what it wraps to its column, and the **case**
 * it sets each slot in — which is half of this view's device for telling a
 * name from a fact, and the half a screenshot is a poor witness to (#139).
 *
 * That the band runs the whole width below the plate with the clock at its
 * left is the anatomy's, and `anatomy.test.ts` holds it for every view.
 */
import { describe, expect, it } from "vitest";
import type { Battle } from "../../../schema/types.ts";
import type { Picture } from "../../../timeline/picture.ts";
import { STAFF_MAP } from "../../views.ts";
import { drawCaption, layoutCaption } from "./caption.ts";

const TYPE = STAFF_MAP.type;

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

/** The same, recording every string drawn. */
function recordingContext(): { ctx: CanvasRenderingContext2D; texts: string[] } {
  const texts: string[] = [];
  const ctx = {
    ...(fakeContext() as unknown as Record<string, unknown>),
    save() {},
    restore() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    measureText: (text: string) => ({ width: text.length * 6 }) as TextMetrics,
    fillText: (text: string) => texts.push(text),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, texts };
}

const battle = {
  title: "The Battle of Trafalgar",
  dates: ["21 October 1805"],
  sources: {
    collingwood: { label: "Collingwood's dispatch" },
    southey: { label: "Southey" },
    mahan: { label: "Mahan" },
    britannica: { label: "Britannica 1911 (Hannay)" },
  },
} as unknown as Battle;

const picture = {
  phase: { day: 0 },
  clock: 13 * 3600 + 30 * 60,
  caption: "The conflict is severe: the Redoutable strikes, and the Bucentaure surrenders.",
  label: "The melee; the line gives way",
  references: [{ source: "collingwood" }, { source: "southey" }, { source: "mahan" }, { source: "britannica" }],
} as unknown as Picture;

describe("the staff band", () => {
  it("sets the phase label, the date and the sources in capitals, and the caption as it is written", () => {
    const { ctx, texts } = recordingContext();
    const layout = layoutCaption(ctx, battle, picture, 1200, "desktop", TYPE);
    drawCaption(ctx, picture, layout, 0, 1200, STAFF_MAP.palette, "desktop", TYPE);

    expect(texts).toContain("13:30");
    expect(texts).toContain("21 OCTOBER 1805");
    expect(texts).toContain("THE MELEE; THE LINE GIVES WAY");
    // The prose is the one run the sheet leaves alone: a caption is a sentence.
    expect(texts).toContain(layout.lines[0]);
    expect(layout.lines[0]).toMatch(/[a-z]/);
    expect(layout.sourceLines.every((line) => line === line.toUpperCase())).toBe(true);
  });

  it("wraps the caption and the sources to the column beside the clock, never past it", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 500, "desktop", TYPE);
    const column = 500 - 176 - 24;
    for (const line of [...layout.lines, ...layout.sourceLines, ...layout.labelLines]) {
      expect(line.length * 6).toBeLessThanOrEqual(column);
    }
    expect(layout.sourceLines.length).toBeGreaterThan(1);
  });

  it("gives the phone's date line the battle's title, which has come off the plate", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 390, "phone", TYPE);
    expect(layout.dateLines.join(" ")).toContain("THE BATTLE OF TRAFALGAR");
    expect(layout.headerHeight).toBeGreaterThan(0);
    // A desktop keeps the title on the plate, so its date line says the date alone.
    expect(layoutCaption(fakeContext(), battle, picture, 1200, "desktop", TYPE).dateLines).toEqual(["21 OCTOBER 1805"]);
  });

  it("stands deep enough for everything it carries, and never shallower than its floor", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 1200, "desktop", TYPE);
    expect(layout.height).toBeGreaterThanOrEqual(90);
    const narrow = layoutCaption(fakeContext(), battle, picture, 520, "desktop", TYPE);
    expect(narrow.lines.length).toBeGreaterThan(layout.lines.length);
    expect(narrow.height).toBeGreaterThan(layout.height);
  });
});
