import { describe, expect, it } from "vitest";
import { endClock, intervalAt, intervals, phaseIndexAt, scrubberSegments, startClock, wallDuration } from "./intervals.ts";
import { NIGHT_BATTLE, TEST_BATTLE, clock, cloneTestBattle } from "./testBattle.ts";

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
    expect(startClock(TEST_BATTLE)).toBe(clock("10:00"));
    expect(endClock(TEST_BATTLE)).toBe(clock("10:30"));
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

/**
 * The two-day fixture (ADR-0013). Every instant below is counted from midnight
 * of day 0 and so runs past a day's worth of seconds without ever resetting:
 * `23:00` is 82,800, `05:05` on day 1 is 104,700, `14:00` on day 1 is 136,800.
 */
describe("a battle that crosses midnight", () => {
  it("runs each interval from its own (day, t) to the next, so the first is six hours and five minutes", () => {
    const first = intervals(NIGHT_BATTLE)[0]!;

    expect(intervals(NIGHT_BATTLE)).toEqual([
      { startMinutes: 1380, endMinutes: 1745, playbackRate: 600 },
      { startMinutes: 1745, endMinutes: 2100, playbackRate: 600 },
      { startMinutes: 2100, endMinutes: 2280, playbackRate: 600 },
    ]);
    expect(first.endMinutes - first.startMinutes).toBe(6 * 60 + 5);
  });

  it("counts startClock and endClock from midnight of the first day", () => {
    expect(startClock(NIGHT_BATTLE)).toBe(82_800);
    expect(endClock(NIGHT_BATTLE)).toBe(136_800);
    expect(startClock(NIGHT_BATTLE)).toBe(clock("23:00"));
    expect(endClock(NIGHT_BATTLE)).toBe(clock("14:00", 1));
  });

  it("puts end on the last phase's day when end_day is absent", () => {
    const battle = structuredClone(NIGHT_BATTLE);
    delete battle.end_day;
    expect(endClock(battle)).toBe(clock("14:00", 1));
  });

  it("holds the evening phase across midnight until daybreak", () => {
    expect(phaseIndexAt(NIGHT_BATTLE, clock("23:30") / 60)).toBe(0);
    expect(phaseIndexAt(NIGHT_BATTLE, 100_000 / 60)).toBe(0);
    expect(phaseIndexAt(NIGHT_BATTLE, clock("05:05", 1) / 60)).toBe(1);
    expect(phaseIndexAt(NIGHT_BATTLE, clock("11:00", 1) / 60)).toBe(2);
  });

  it("finds the interval an instant past midnight belongs to", () => {
    expect(intervalAt(NIGHT_BATTLE, 100_000).index).toBe(0);
    expect(intervalAt(NIGHT_BATTLE, clock("05:05", 1)).index).toBe(1);
  });

  it("sizes the scrubber's segments by the intervals the days give them", () => {
    const shares = [21_900 / 54_000, 21_300 / 54_000, 10_800 / 54_000];

    expect(wallDuration(NIGHT_BATTLE)).toEqual({ total: 90, perPhase: [36.5, 35.5, 18] });
    expect(scrubberSegments(NIGHT_BATTLE)).toEqual([36.5 / 90, 35.5 / 90, 18 / 90]);
    // Every phase plays at one rate here, so a segment is its interval's share.
    for (const [index, fraction] of scrubberSegments(NIGHT_BATTLE).entries()) {
      expect(fraction).toBeCloseTo(shares[index]!, 12);
    }
  });
});
