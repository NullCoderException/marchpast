import { describe, expect, it } from "vitest";
import { drawCaption, layoutCaption } from "./caption.ts";
import type { Battle } from "../../../schema/types.ts";
import type { Picture } from "../../../timeline/picture.ts";
import { pictureAt } from "../../../timeline/pictureAt.ts";
import { NIGHT_BATTLE, clock } from "../../../timeline/testBattle.ts";
import { DEFAULT_VIEW } from "../../views.ts";

/** The default view's ramp, which is the engraved one these tests read. */
const TYPE = DEFAULT_VIEW.type;

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
  clock: 12 * 3600,
  caption: "At daylight, Cape Trafalgar bearing east by south about seven leagues.",
  label: "Dawn: the fleets sight each other",
  references: [{ source: "collingwood" }, { source: "southey" }, { source: "mahan" }, { source: "britannica" }],
} as unknown as Picture;

describe("the caption band's sources", () => {
  it("wraps the sources to the text column instead of running past it", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 390, "desktop", TYPE);
    const widest = Math.max(...layout.sourceLines.map((line) => line.length * 6));

    expect(layout.sourceLines.length).toBeGreaterThan(1);
    expect(widest).toBeLessThanOrEqual(390 - 24 * 2 - 150);
  });

  it("counts every source line in the band's height, so the plate above it shrinks to fit", () => {
    const narrow = layoutCaption(fakeContext(), battle, picture, 390, "desktop", TYPE);
    const wide = layoutCaption(fakeContext(), battle, picture, 1280, "desktop", TYPE);

    expect(narrow.sourceLines.length).toBeGreaterThan(wide.sourceLines.length);
    expect(narrow.height).toBeGreaterThan(wide.height);
  });

  it("keeps one line when the sources fit, and none when the phase cites nothing", () => {
    const wide = layoutCaption(fakeContext(), battle, picture, 1280, "desktop", TYPE);
    const unsourced = layoutCaption(fakeContext(), battle, { ...picture, references: [] } as unknown as Picture, 1280, "desktop", TYPE);

    expect(wide.sourceLines).toHaveLength(1);
    expect(wide.sourceLines[0]).toBe("— Collingwood's dispatch, Southey, Mahan, Britannica 1911 (Hannay)");
    expect(unsourced.sourceLines).toEqual([]);
  });
});

describe("the caption band's phase label", () => {
  it("wraps the label to the text column instead of running past it", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 390, "desktop", TYPE);
    const widest = Math.max(...layout.labelLines.map((line) => line.length * 6));

    expect(layout.labelLines.length).toBeGreaterThan(1);
    expect(widest).toBeLessThanOrEqual(390 - 24 * 2 - 150);
  });

  it("keeps a short label on one line, upper case", () => {
    const layout = layoutCaption(fakeContext(), battle, picture, 1280, "desktop", TYPE);

    expect(layout.labelLines).toEqual(["DAWN: THE FLEETS SIGHT EACH OTHER"]);
  });
});

describe("the caption band's date", () => {
  it("draws the date of the day the phase falls on, so a battle across midnight advances it", () => {
    const twoDays = { ...battle, dates: ["1 August 1798", "2 August 1798"] } as unknown as Battle;
    const daybreak = { ...picture, phase: { day: 1 }, clock: 0 } as unknown as Picture;

    const first = recordingContext();
    drawCaption(first.ctx, { ...picture, clock: 0 } as unknown as Picture, layoutCaption(fakeContext(), twoDays, picture, 1280, "desktop", TYPE), 0, 1280, DEFAULT_VIEW.palette, "desktop", TYPE);
    expect(first.texts).toContain("1 August 1798");

    const second = recordingContext();
    drawCaption(second.ctx, daybreak, layoutCaption(fakeContext(), twoDays, daybreak, 1280, "desktop", TYPE), 0, 1280, DEFAULT_VIEW.palette, "desktop", TYPE);
    expect(second.texts).toContain("2 August 1798");
  });

  it("draws the first day's date for a phase with no day, the single-day case", () => {
    const noDay = { ...picture, phase: {}, clock: 0 } as unknown as Picture;
    const { ctx, texts } = recordingContext();
    drawCaption(ctx, noDay, layoutCaption(fakeContext(), battle, noDay, 1280, "desktop", TYPE), 0, 1280, DEFAULT_VIEW.palette, "desktop", TYPE);
    expect(texts).toContain("21 October 1805");
  });
});

describe("the caption band on a battle that crosses midnight", () => {
  /** Draws the band for the real picture at `at`, and gives back every string it drew. */
  function draw(at: number): string[] {
    const picture = pictureAt(NIGHT_BATTLE, at);
    const layout = layoutCaption(fakeContext(), NIGHT_BATTLE, picture, 1280, "desktop", TYPE);
    const { ctx, texts } = recordingContext();
    drawCaption(ctx, picture, layout, 0, 1280, DEFAULT_VIEW.palette, "desktop", TYPE);
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

describe("the caption band on a phone", () => {
  /** The band as it is laid out and drawn at 390px, and every string it drew. */
  function phone(over: Partial<Battle> = {}): { texts: string[]; height: number } {
    const narrow = { ...battle, ...over } as unknown as Battle;
    const layout = layoutCaption(fakeContext(), narrow, picture, 390, "phone", TYPE);
    const { ctx, texts } = recordingContext();
    drawCaption(ctx, picture, layout, 0, 390, DEFAULT_VIEW.palette, "phone", TYPE);
    return { texts, height: layout.height };
  }

  it("takes the title off the plate and on to the date line", () => {
    expect(phone().texts).toContain("21 October 1805 · The Battle of Trafalgar");
  });

  it("leaves the date alone on a desktop, where the title is still on the plate", () => {
    const { ctx, texts } = recordingContext();
    const layout = layoutCaption(fakeContext(), battle, picture, 1280, "desktop", TYPE);
    drawCaption(ctx, picture, layout, 0, 1280, DEFAULT_VIEW.palette, "desktop", TYPE);
    expect(texts).toContain("21 October 1805");
    expect(texts).not.toContain("21 October 1805 · The Battle of Trafalgar");
  });

  it("still draws the clock, the label and the caption", () => {
    const { texts } = phone();
    expect(texts).toEqual(expect.arrayContaining(["12:00", "DAWN: THE FLEETS SIGHT EACH OTHER"]));
    expect(texts.join(" ")).toContain("Cape Trafalgar");
  });

  it("runs the caption the whole width instead of a column beside the clock", () => {
    // The desktop band keeps a 150px clock column; the phone band puts the
    // clock on its own line and gives the prose all of the width but the pads.
    const desktop = layoutCaption(fakeContext(), battle, picture, 390, "desktop", TYPE);
    const narrow = layoutCaption(fakeContext(), battle, picture, 390, "phone", TYPE);
    expect(narrow.lines.length).toBeLessThan(desktop.lines.length);
    const widest = Math.max(...narrow.lines.map((line) => line.length * 6));
    expect(widest).toBeLessThanOrEqual(390 - 14 * 2);
  });

  it("wraps a title too long for the date line rather than running it off the edge", () => {
    const long = phone({ title: "The Battle of Trafalgar and the Combined Fleet of France and Spain" });
    const widest = Math.max(...long.texts.map((line) => line.length * 6));
    expect(widest).toBeLessThanOrEqual(390 - 14 * 2);
    expect(long.height).toBeGreaterThan(phone().height);
  });
});
