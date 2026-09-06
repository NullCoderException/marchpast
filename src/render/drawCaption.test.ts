import { describe, expect, it } from "vitest";
import { drawCaption, layoutCaption } from "./drawCaption.ts";
import type { Battle } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { pictureAt } from "../timeline/pictureAt.ts";
import { NIGHT_BATTLE, clock } from "../timeline/testBattle.ts";
import { DEFAULT_VIEW } from "./views.ts";

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
  dates: ["21 October 1805"],
  sources: {
    collingwood: { label: "Collingwood's dispatch" },
    southey: { label: "Southey" },
    mahan: { label: "Mahan" },
    britannica: { label: "Britannica 1911 (Hannay)" },
  },
} as unknown as Battle;

/** A drawing context that measures like `fakeContext` and records every string drawn. */
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

const picture = {
  phase: { day: 0 },
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

describe("the caption band's date", () => {
  it("draws the date of the day the phase falls on, so a battle across midnight advances it", () => {
    const twoDays = { ...battle, dates: ["1 August 1798", "2 August 1798"] } as unknown as Battle;
    const daybreak = { ...picture, phase: { day: 1 }, clock: 0 } as unknown as Picture;

    const first = recordingContext();
    drawCaption(first.ctx, twoDays, { ...picture, clock: 0 } as unknown as Picture, layoutCaption(fakeContext(), twoDays, picture, 1280), 0, 1280, DEFAULT_VIEW.palette);
    expect(first.texts).toContain("1 August 1798");

    const second = recordingContext();
    drawCaption(second.ctx, twoDays, daybreak, layoutCaption(fakeContext(), twoDays, daybreak, 1280), 0, 1280, DEFAULT_VIEW.palette);
    expect(second.texts).toContain("2 August 1798");
  });

  it("draws the first day's date for a phase with no day, the single-day case", () => {
    const noDay = { ...picture, phase: {}, clock: 0 } as unknown as Picture;
    const { ctx, texts } = recordingContext();
    drawCaption(ctx, battle, noDay, layoutCaption(fakeContext(), battle, noDay, 1280), 0, 1280, DEFAULT_VIEW.palette);
    expect(texts).toContain("21 October 1805");
  });
});

describe("the caption band on a battle that crosses midnight", () => {
  /** Draws the band for the real picture at `at`, and gives back every string it drew. */
  function draw(at: number): string[] {
    const picture = pictureAt(NIGHT_BATTLE, at);
    const layout = layoutCaption(fakeContext(), NIGHT_BATTLE, picture, 1280);
    const { ctx, texts } = recordingContext();
    drawCaption(ctx, NIGHT_BATTLE, picture, layout, 0, 1280, DEFAULT_VIEW.palette);
    return texts;
  }

  it("shows the first day's date before midnight and the second after, with the time of day beside it", () => {
    expect(draw(clock("23:30"))).toEqual(expect.arrayContaining(["23:30", "1 January 1800"]));
    expect(draw(clock("11:30", 1))).toEqual(expect.arrayContaining(["11:30", "2 January 1800"]));
  });

  it("reads the small hours as a time of day, under the date of the phase that is still running", () => {
    // 02:20 is past midnight but still inside the evening phase, so the clock
    // takes the remainder while the date stays the one that phase falls on:
    // the band follows the phase's day, not the clock's calendar day.
    expect(draw(clock("02:20", 1))).toEqual(expect.arrayContaining(["02:20", "1 January 1800"]));
  });
});
