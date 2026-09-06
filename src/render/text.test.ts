import { describe, expect, it } from "vitest";
import { pictureAt } from "../timeline/pictureAt.ts";
import { NIGHT_BATTLE, clock } from "../timeline/testBattle.ts";
import { compassPoint, formatClock, wrapText } from "./text.ts";

/** A fake measurer: every character is 10 px wide. */
const tenPerChar = (text: string): number => text.length * 10;

describe("wrapText", () => {
  it("keeps a short text on one line", () => {
    expect(wrapText("the fleet", 200, tenPerChar)).toEqual(["the fleet"]);
  });

  it("breaks between words when the next word would overflow", () => {
    expect(wrapText("the enemy is discovered to the eastward", 120, tenPerChar)).toEqual([
      "the enemy is",
      "discovered",
      "to the",
      "eastward",
    ]);
  });

  it("puts a word longer than the width on its own line rather than dropping it", () => {
    expect(wrapText("a extraordinarily b", 50, tenPerChar)).toEqual(["a", "extraordinarily", "b"]);
  });

  it("collapses runs of whitespace and returns no lines for an empty text", () => {
    expect(wrapText("  spaced   out  ", 200, tenPerChar)).toEqual(["spaced out"]);
    expect(wrapText("", 200, tenPerChar)).toEqual([]);
    expect(wrapText("   ", 200, tenPerChar)).toEqual([]);
  });
});

describe("compassPoint", () => {
  it("names the sixteen points from degrees true", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(22.5)).toBe("NNE");
    expect(compassPoint(45)).toBe("NE");
    expect(compassPoint(90)).toBe("E");
    expect(compassPoint(180)).toBe("S");
    expect(compassPoint(270)).toBe("W");
    expect(compassPoint(292.5)).toBe("WNW");
    expect(compassPoint(337.5)).toBe("NNW");
  });

  it("rounds to the nearest point and wraps at north", () => {
    expect(compassPoint(285)).toBe("WNW");
    expect(compassPoint(10)).toBe("N");
    expect(compassPoint(12)).toBe("NNE");
    expect(compassPoint(350)).toBe("N");
    expect(compassPoint(359.9)).toBe("N");
  });
});

describe("formatClock", () => {
  it("writes battle-clock seconds as the HH:MM time of day, dropping seconds", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(12 * 3600 + 15 * 60)).toBe("12:15");
    expect(formatClock(16 * 3600 + 59)).toBe("16:00");
    expect(formatClock(23 * 3600 + 59 * 60 + 59)).toBe("23:59");
  });
});

describe("formatClock past the first midnight", () => {
  it("shows the time of day, so the readout never runs to 29:05 (ADR-0013)", () => {
    // The battle clock counts from midnight of the battle's first day, so
    // 05:05 on day 1 is 104,700 seconds; the readout takes the remainder.
    expect(formatClock(104_700)).toBe("05:05");
    expect(formatClock(94_800)).toBe("02:20");
    expect(formatClock(136_800)).toBe("14:00");
  });

  it("gives the daybreak phase the readout the scrubber shows, on a real picture", () => {
    // `formatClock(picture.clock)` is the scrubber readout verbatim
    // (`src/player/controls.ts`), which has no test of its own because the
    // controls need a DOM. Driving the same expression off the fixture's own
    // picture is as close as this suite gets to the readout itself.
    expect(formatClock(pictureAt(NIGHT_BATTLE, clock("05:05", 1)).clock)).toBe("05:05");
    expect(formatClock(pictureAt(NIGHT_BATTLE, clock("23:30")).clock)).toBe("23:30");
  });
});
