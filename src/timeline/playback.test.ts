import { describe, expect, it } from "vitest";
import { formatBattleTime } from "../schema/time.ts";
import { startClock } from "./intervals.ts";
import { advance, nextPhaseStart, previousPhaseStart } from "./playback.ts";
import { NIGHT_BATTLE, TEST_BATTLE, clock } from "./testBattle.ts";

describe("advance", () => {
  it("converts wall seconds through the current phase's playback rate", () => {
    expect(advance(TEST_BATTLE, clock("10:10"), 5, 1)).toEqual({ clockSeconds: clock("10:15"), finished: false });
  });

  it("changes rate at a phase boundary a single wall delta spans", () => {
    // One wall second finishes phase one (600 clock seconds at 600x); the
    // remaining half second buys 30 clock seconds at phase two's 60x.
    expect(advance(TEST_BATTLE, clock("10:00"), 1.5, 1)).toEqual({ clockSeconds: clock("10:10:30"), finished: false });
  });

  it("applies the speed multiplier on top of the rate", () => {
    expect(advance(TEST_BATTLE, clock("10:00"), 0.75, 2)).toEqual({ clockSeconds: clock("10:10:30"), finished: false });
    expect(advance(TEST_BATTLE, clock("10:10"), 5, 2)).toEqual({ clockSeconds: clock("10:20"), finished: false });
  });

  it("crosses two boundaries when the delta is long enough", () => {
    // 1s of phase one, 10s of phase two, then 2s of phase three at 120x.
    expect(advance(TEST_BATTLE, clock("10:00"), 13, 1)).toEqual({ clockSeconds: clock("10:24"), finished: false });
  });

  it("stops at end and reports finished", () => {
    expect(advance(TEST_BATTLE, clock("10:20"), 100, 1)).toEqual({ clockSeconds: clock("10:30"), finished: true });
    expect(advance(TEST_BATTLE, clock("10:00"), 16, 1)).toEqual({ clockSeconds: clock("10:30"), finished: true });
  });

  it("stays finished once at end: playing on is the player setting the clock back to the first phase", () => {
    expect(advance(TEST_BATTLE, clock("10:30"), 5, 1)).toEqual({ clockSeconds: clock("10:30"), finished: true });
    expect(startClock(TEST_BATTLE)).toBe(clock("10:00"));
    expect(advance(TEST_BATTLE, startClock(TEST_BATTLE), 0.5, 1)).toEqual({ clockSeconds: clock("10:05"), finished: false });
  });

  it("clamps an instant before the first phase up to it", () => {
    expect(advance(TEST_BATTLE, clock("09:00"), 0, 1)).toEqual({ clockSeconds: clock("10:00"), finished: false });
  });

  it("refuses a delta that runs backward or a multiplier that is not positive", () => {
    expect(() => advance(TEST_BATTLE, clock("10:00"), -1, 1)).toThrow(RangeError);
    expect(() => advance(TEST_BATTLE, clock("10:00"), 1, 0)).toThrow(RangeError);
  });
});

describe("nextPhaseStart", () => {
  it("lands on the following phase's t", () => {
    expect(nextPhaseStart(TEST_BATTLE, clock("10:00"))).toBe(clock("10:10"));
    expect(nextPhaseStart(TEST_BATTLE, clock("10:05"))).toBe(clock("10:10"));
    expect(nextPhaseStart(TEST_BATTLE, clock("10:19:59"))).toBe(clock("10:20"));
  });

  it("lands on end from the last phase, and stays there", () => {
    expect(nextPhaseStart(TEST_BATTLE, clock("10:20"))).toBe(clock("10:30"));
    expect(nextPhaseStart(TEST_BATTLE, clock("10:30"))).toBe(clock("10:30"));
  });
});

describe("previousPhaseStart", () => {
  it("goes back to the previous phase within a wall second of this phase's start", () => {
    expect(previousPhaseStart(TEST_BATTLE, clock("10:10:05"), 0.5)).toBe(clock("10:00"));
    expect(previousPhaseStart(TEST_BATTLE, clock("10:15"), 1)).toBe(clock("10:00"));
  });

  it("restarts this phase once more than a wall second has played", () => {
    expect(previousPhaseStart(TEST_BATTLE, clock("10:15"), 1.5)).toBe(clock("10:10"));
    expect(previousPhaseStart(TEST_BATTLE, clock("10:15"), 30)).toBe(clock("10:10"));
  });

  it("cannot go back past the first phase", () => {
    expect(previousPhaseStart(TEST_BATTLE, clock("10:05"), 0.5)).toBe(clock("10:00"));
    expect(previousPhaseStart(TEST_BATTLE, clock("10:05"), 1.5)).toBe(clock("10:00"));
  });

  it("counts end as being in the last phase", () => {
    // Only the played-through case: at end the last phase has held for its
    // whole interval, so under a wall second into it is not a state the
    // player can be in, and the issue decides nothing about it.
    expect(previousPhaseStart(TEST_BATTLE, clock("10:30"), 1.5)).toBe(clock("10:20"));
  });
});

describe("driving the clock across midnight", () => {
  it("carries the clock past midnight without resetting it", () => {
    // 20 wall seconds at 600x is 12,000 battle seconds from 23:00, which the
    // clock holds as 94,800 and never as 8,400. It reads 02:20 the next morning.
    expect(advance(NIGHT_BATTLE, clock("23:00"), 20, 1)).toEqual({ clockSeconds: 94_800, finished: false });
    expect(formatBattleTime(94_800 / 60)).toBe("02:20");
  });

  it("changes phase at daybreak, a boundary on the far side of midnight", () => {
    // 36.5 wall seconds finish the evening phase at 05:05; the remaining 3.5
    // buy 2,100 battle seconds of the daybreak phase, landing at 05:40.
    expect(advance(NIGHT_BATTLE, clock("23:00"), 40, 1)).toEqual({ clockSeconds: clock("05:40", 1), finished: false });
  });

  it("stops at end on the second day and reports finished", () => {
    expect(advance(NIGHT_BATTLE, clock("23:00"), 90, 1)).toEqual({ clockSeconds: clock("14:00", 1), finished: true });
    expect(advance(NIGHT_BATTLE, clock("23:00"), 1000, 1)).toEqual({ clockSeconds: clock("14:00", 1), finished: true });
  });

  it("jumps to a phase instant on the day it falls on", () => {
    expect(nextPhaseStart(NIGHT_BATTLE, clock("23:30"))).toBe(clock("05:05", 1));
    expect(nextPhaseStart(NIGHT_BATTLE, clock("11:30", 1))).toBe(clock("14:00", 1));
    expect(previousPhaseStart(NIGHT_BATTLE, clock("05:05", 1), 0)).toBe(clock("23:00"));
    expect(previousPhaseStart(NIGHT_BATTLE, clock("06:00", 1), 2)).toBe(clock("05:05", 1));
  });
});
