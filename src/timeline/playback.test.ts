import { describe, expect, it } from "vitest";
import { advance, nextPhaseStart, previousPhaseStart } from "./playback.ts";
import { TEST_BATTLE, at } from "./testBattle.ts";

describe("advance", () => {
  it("converts wall seconds through the current phase's playback rate", () => {
    expect(advance(TEST_BATTLE, at("10:10"), 5, 1)).toEqual({ clockSeconds: at("10:15"), finished: false });
  });

  it("changes rate at a phase boundary a single wall delta spans", () => {
    // One wall second finishes phase one (600 clock seconds at 600x); the
    // remaining half second buys 30 clock seconds at phase two's 60x.
    expect(advance(TEST_BATTLE, at("10:00"), 1.5, 1)).toEqual({ clockSeconds: at("10:10:30"), finished: false });
  });

  it("applies the speed multiplier on top of the rate", () => {
    expect(advance(TEST_BATTLE, at("10:00"), 0.75, 2)).toEqual({ clockSeconds: at("10:10:30"), finished: false });
    expect(advance(TEST_BATTLE, at("10:10"), 5, 2)).toEqual({ clockSeconds: at("10:20"), finished: false });
  });

  it("crosses two boundaries when the delta is long enough", () => {
    // 1s of phase one, 10s of phase two, then 2s of phase three at 120x.
    expect(advance(TEST_BATTLE, at("10:00"), 13, 1)).toEqual({ clockSeconds: at("10:24"), finished: false });
  });

  it("stops at end and reports finished", () => {
    expect(advance(TEST_BATTLE, at("10:20"), 100, 1)).toEqual({ clockSeconds: at("10:30"), finished: true });
    expect(advance(TEST_BATTLE, at("10:00"), 16, 1)).toEqual({ clockSeconds: at("10:30"), finished: true });
  });

  it("stays finished once at end", () => {
    expect(advance(TEST_BATTLE, at("10:30"), 5, 1)).toEqual({ clockSeconds: at("10:30"), finished: true });
  });

  it("clamps an instant before the first phase up to it", () => {
    expect(advance(TEST_BATTLE, at("09:00"), 0, 1)).toEqual({ clockSeconds: at("10:00"), finished: false });
  });

  it("refuses a delta that runs backward or a multiplier that is not positive", () => {
    expect(() => advance(TEST_BATTLE, at("10:00"), -1, 1)).toThrow(RangeError);
    expect(() => advance(TEST_BATTLE, at("10:00"), 1, 0)).toThrow(RangeError);
  });
});

describe("nextPhaseStart", () => {
  it("lands on the following phase's t", () => {
    expect(nextPhaseStart(TEST_BATTLE, at("10:00"))).toBe(at("10:10"));
    expect(nextPhaseStart(TEST_BATTLE, at("10:05"))).toBe(at("10:10"));
    expect(nextPhaseStart(TEST_BATTLE, at("10:19:59"))).toBe(at("10:20"));
  });

  it("lands on end from the last phase, and stays there", () => {
    expect(nextPhaseStart(TEST_BATTLE, at("10:20"))).toBe(at("10:30"));
    expect(nextPhaseStart(TEST_BATTLE, at("10:30"))).toBe(at("10:30"));
  });
});

describe("previousPhaseStart", () => {
  it("goes back to the previous phase within a wall second of this phase's start", () => {
    expect(previousPhaseStart(TEST_BATTLE, at("10:10:05"), 0.5)).toBe(at("10:00"));
    expect(previousPhaseStart(TEST_BATTLE, at("10:15"), 1)).toBe(at("10:00"));
  });

  it("restarts this phase once more than a wall second has played", () => {
    expect(previousPhaseStart(TEST_BATTLE, at("10:15"), 1.5)).toBe(at("10:10"));
    expect(previousPhaseStart(TEST_BATTLE, at("10:15"), 30)).toBe(at("10:10"));
  });

  it("cannot go back past the first phase", () => {
    expect(previousPhaseStart(TEST_BATTLE, at("10:05"), 0.5)).toBe(at("10:00"));
    expect(previousPhaseStart(TEST_BATTLE, at("10:05"), 1.5)).toBe(at("10:00"));
  });

  it("counts end as being in the last phase", () => {
    expect(previousPhaseStart(TEST_BATTLE, at("10:30"), 1.5)).toBe(at("10:20"));
    expect(previousPhaseStart(TEST_BATTLE, at("10:30"), 0.5)).toBe(at("10:10"));
  });
});
