import { describe, expect, it } from "vitest";
import { endClock, intervals, phaseIndexAt, scrubberSegments, startClock, wallDuration } from "./intervals.ts";
import { TEST_BATTLE, at, cloneTestBattle } from "./testBattle.ts";

describe("intervals", () => {
  it("runs each phase from its own t to the next phase's, and the last to the battle's end", () => {
    expect(intervals(TEST_BATTLE)).toEqual([
      { startMinutes: 600, endMinutes: 610, playbackRate: 600 },
      { startMinutes: 610, endMinutes: 620, playbackRate: 60 },
      { startMinutes: 620, endMinutes: 630, playbackRate: 120 },
    ]);
  });

  it("gives a one-phase battle the whole clock from its t to end", () => {
    const battle = cloneTestBattle();
    battle.phases = [battle.phases[0]!];
    expect(intervals(battle)).toEqual([{ startMinutes: 600, endMinutes: 630, playbackRate: 600 }]);
  });
});

describe("startClock and endClock", () => {
  it("are the first phase's t and the battle's end, in battle-clock seconds", () => {
    expect(startClock(TEST_BATTLE)).toBe(at("10:00"));
    expect(endClock(TEST_BATTLE)).toBe(at("10:30"));
  });
});

describe("wallDuration", () => {
  it("divides each interval by its playback rate", () => {
    expect(wallDuration(TEST_BATTLE)).toEqual({ total: 16, perPhase: [1, 10, 5] });
  });

  it("is halved throughout by a multiplier of 2", () => {
    expect(wallDuration(TEST_BATTLE, 2)).toEqual({ total: 8, perPhase: [0.5, 5, 2.5] });
  });

  it("refuses a multiplier that is not positive", () => {
    expect(() => wallDuration(TEST_BATTLE, 0)).toThrow(RangeError);
    expect(() => wallDuration(TEST_BATTLE, -1)).toThrow(RangeError);
  });
});

describe("scrubberSegments", () => {
  it("is each phase's share of the whole playback", () => {
    expect(scrubberSegments(TEST_BATTLE)).toEqual([1 / 16, 10 / 16, 5 / 16]);
  });

  it("is unchanged by the speed multiplier", () => {
    expect(scrubberSegments(TEST_BATTLE, 2)).toEqual(scrubberSegments(TEST_BATTLE, 1));
    expect(scrubberSegments(TEST_BATTLE, 0.25)).toEqual(scrubberSegments(TEST_BATTLE, 1));
  });

  it("sums to one", () => {
    const sum = scrubberSegments(TEST_BATTLE).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
  });
});

describe("phaseIndexAt", () => {
  it("holds a phase from its own t up to but not including the next", () => {
    expect(phaseIndexAt(TEST_BATTLE, 600)).toBe(0);
    expect(phaseIndexAt(TEST_BATTLE, 609.99)).toBe(0);
    expect(phaseIndexAt(TEST_BATTLE, 610)).toBe(1);
    expect(phaseIndexAt(TEST_BATTLE, 619.99)).toBe(1);
    expect(phaseIndexAt(TEST_BATTLE, 620)).toBe(2);
  });

  it("clamps before the first phase and at the end", () => {
    expect(phaseIndexAt(TEST_BATTLE, 0)).toBe(0);
    expect(phaseIndexAt(TEST_BATTLE, 599)).toBe(0);
    expect(phaseIndexAt(TEST_BATTLE, 630)).toBe(2);
    expect(phaseIndexAt(TEST_BATTLE, 1439)).toBe(2);
  });
});
