import { describe, expect, it } from "vitest";
import { barSegments, clockToFraction, fractionToClock } from "./scrub.ts";
import { TEST_BATTLE, clock } from "../timeline/testBattle.ts";

// The fixture plays in 1 + 10 + 5 = 16 wall seconds, so the three segments are
// 1/16, 10/16 and 5/16 of the bar.
describe("barSegments", () => {
  it("sizes one segment per phase by its wall playback duration", () => {
    expect(barSegments(TEST_BATTLE)).toEqual([
      { index: 0, start: 0, end: 1 / 16 },
      { index: 1, start: 1 / 16, end: 11 / 16 },
      { index: 2, start: 11 / 16, end: 1 },
    ]);
  });

  it("runs the segments end to end from zero to one", () => {
    const segments = barSegments(TEST_BATTLE);
    expect(segments[0]!.start).toBe(0);
    expect(segments.at(-1)!.end).toBe(1);
    for (const [index, segment] of segments.entries()) {
      if (index > 0) expect(segment.start).toBe(segments[index - 1]!.end);
    }
  });
});

describe("clockToFraction", () => {
  it("puts the first phase's t at the far left and end at the far right", () => {
    expect(clockToFraction(TEST_BATTLE, clock("10:00"))).toBe(0);
    expect(clockToFraction(TEST_BATTLE, clock("10:30"))).toBe(1);
  });

  it("puts a phase instant on its segment boundary", () => {
    expect(clockToFraction(TEST_BATTLE, clock("10:10"))).toBeCloseTo(1 / 16, 12);
    expect(clockToFraction(TEST_BATTLE, clock("10:20"))).toBeCloseTo(11 / 16, 12);
  });

  it("moves linearly in battle clock inside a segment, not across the whole bar", () => {
    // Half of phase two's interval is half of its 10/16 segment, not half the bar.
    expect(clockToFraction(TEST_BATTLE, clock("10:15"))).toBeCloseTo(6 / 16, 12);
    expect(clockToFraction(TEST_BATTLE, clock("10:05"))).toBeCloseTo(0.5 / 16, 12);
  });

  it("clamps an instant outside the battle", () => {
    expect(clockToFraction(TEST_BATTLE, clock("09:00"))).toBe(0);
    expect(clockToFraction(TEST_BATTLE, clock("23:00"))).toBe(1);
  });
});

describe("fractionToClock", () => {
  it("inverts clockToFraction", () => {
    for (const time of ["10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30"]) {
      const seconds = clock(time);
      expect(fractionToClock(TEST_BATTLE, clockToFraction(TEST_BATTLE, seconds))).toBeCloseTo(seconds, 6);
    }
  });

  it("reads a segment boundary as that phase's t", () => {
    expect(fractionToClock(TEST_BATTLE, 1 / 16)).toBeCloseTo(clock("10:10"), 6);
    expect(fractionToClock(TEST_BATTLE, 11 / 16)).toBeCloseTo(clock("10:20"), 6);
  });

  it("clamps a fraction outside the bar", () => {
    expect(fractionToClock(TEST_BATTLE, -0.5)).toBe(clock("10:00"));
    expect(fractionToClock(TEST_BATTLE, 1.5)).toBe(clock("10:30"));
  });
});
