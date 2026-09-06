import { describe, expect, it } from "vitest";
import {
  initialState,
  isFinished,
  jumpNext,
  jumpPrevious,
  jumpToPhase,
  scrubTo,
  setMultiplier,
  tick,
  togglePlay,
} from "./state.ts";
import { TEST_BATTLE, clock } from "../timeline/testBattle.ts";

describe("initialState", () => {
  it("loads paused on the first phase at 1x", () => {
    expect(initialState(TEST_BATTLE)).toEqual({ clock: clock("10:00"), playing: false, multiplier: 1, view: "plate" as const });
  });
});

describe("tick", () => {
  it("does not move the clock while paused", () => {
    const paused = initialState(TEST_BATTLE);
    expect(tick(TEST_BATTLE, paused, 5)).toEqual(paused);
  });

  it("advances through the phase's rate and the multiplier while playing", () => {
    const playing = { clock: clock("10:10"), playing: true, multiplier: 1, view: "plate" as const };
    expect(tick(TEST_BATTLE, playing, 5).clock).toBe(clock("10:15"));
    expect(tick(TEST_BATTLE, { ...playing, multiplier: 2, view: "plate" as const }, 5).clock).toBe(clock("10:20"));
  });

  it("pauses on the last picture at end", () => {
    const state = tick(TEST_BATTLE, { clock: clock("10:20"), playing: true, multiplier: 1, view: "plate" as const }, 100);
    expect(state).toEqual({ clock: clock("10:30"), playing: false, multiplier: 1, view: "plate" as const });
    expect(isFinished(TEST_BATTLE, state)).toBe(true);
  });
});

describe("togglePlay", () => {
  it("plays and pauses in place", () => {
    const paused = initialState(TEST_BATTLE);
    expect(togglePlay(TEST_BATTLE, paused)).toEqual({ ...paused, playing: true });
    expect(togglePlay(TEST_BATTLE, { ...paused, playing: true })).toEqual(paused);
  });

  it("restarts from the first phase when the battle has ended", () => {
    const ended = { clock: clock("10:30"), playing: false, multiplier: 2, view: "plate" as const };
    expect(togglePlay(TEST_BATTLE, ended)).toEqual({ clock: clock("10:00"), playing: true, multiplier: 2, view: "plate" as const });
  });
});

describe("jumpNext", () => {
  it("lands on the following phase's t and keeps the play state", () => {
    expect(jumpNext(TEST_BATTLE, { clock: clock("10:05"), playing: true, multiplier: 1, view: "plate" as const })).toEqual({
      clock: clock("10:10"),
      playing: true,
      multiplier: 1,
      view: "plate",
    });
    expect(jumpNext(TEST_BATTLE, { clock: clock("10:05"), playing: false, multiplier: 1, view: "plate" as const }).playing).toBe(false);
  });

  it("lands on end from the last phase, where the player pauses", () => {
    expect(jumpNext(TEST_BATTLE, { clock: clock("10:25"), playing: true, multiplier: 1, view: "plate" as const })).toEqual({
      clock: clock("10:30"),
      playing: false,
      multiplier: 1,
      view: "plate",
    });
  });
});

describe("jumpPrevious", () => {
  it("goes to the previous phase within a second of playback into this one", () => {
    // Phase two plays at 60x, so half a wall second in is 10:10:30.
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:10:30"), playing: true, multiplier: 1, view: "plate" as const })).toEqual({
      clock: clock("10:00"),
      playing: true,
      multiplier: 1,
      view: "plate",
    });
  });

  it("restarts the current phase past a second of playback into it", () => {
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:12"), playing: false, multiplier: 1, view: "plate" as const }).clock).toBe(clock("10:10"));
  });

  it("measures that second at the current speed multiplier", () => {
    // At 4x, 10:12 is two clock minutes but only half a wall second into phase two.
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:12"), playing: false, multiplier: 4, view: "plate" as const }).clock).toBe(clock("10:00"));
  });

  it("goes no further back than the first phase's t", () => {
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:00"), playing: false, multiplier: 1, view: "plate" as const }).clock).toBe(clock("10:00"));
  });
});

describe("jumpToPhase", () => {
  it("lands on that phase's t, keeping the play state", () => {
    expect(jumpToPhase(TEST_BATTLE, { clock: clock("10:25"), playing: true, multiplier: 1, view: "plate" as const }, 0)).toEqual({
      clock: clock("10:00"),
      playing: true,
      multiplier: 1,
      view: "plate",
    });
    expect(jumpToPhase(TEST_BATTLE, initialState(TEST_BATTLE), 2).clock).toBe(clock("10:20"));
  });

  it("refuses an index no phase has", () => {
    expect(() => jumpToPhase(TEST_BATTLE, initialState(TEST_BATTLE), 3)).toThrow(RangeError);
  });
});

describe("scrubTo", () => {
  it("sets the clock from a bar fraction and pauses", () => {
    const state = scrubTo(TEST_BATTLE, { clock: clock("10:00"), playing: true, multiplier: 1, view: "plate" as const }, 1 / 16);
    expect(state.clock).toBeCloseTo(clock("10:10"), 6);
    expect(state.playing).toBe(false);
  });
});

describe("setMultiplier", () => {
  it("changes the speed without moving the clock or stopping playback", () => {
    expect(setMultiplier({ clock: clock("10:15"), playing: true, multiplier: 1, view: "plate" as const }, 4)).toEqual({
      clock: clock("10:15"),
      playing: true,
      multiplier: 4,
      view: "plate",
    });
  });

  it("refuses a speed a duration cannot be divided by", () => {
    expect(() => setMultiplier(initialState(TEST_BATTLE), 0)).toThrow(RangeError);
  });
});
