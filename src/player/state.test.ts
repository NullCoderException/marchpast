import { describe, expect, it } from "vitest";
import {
  closeCard,
  hoverUnit,
  initialState,
  isFinished,
  jumpNext,
  jumpPrevious,
  jumpToPhase,
  levelOptions,
  pinUnit,
  scrubTo,
  setLevel,
  setMultiplier,
  setView,
  tick,
  togglePlay,
} from "./state.ts";
import { TEST_BATTLE, clock } from "../timeline/testBattle.ts";
import trafalgarRaw from "../../data/battles/trafalgar.json?raw";
import { MINIMAL_BATTLE } from "../schema/examples.ts";
import type { Battle } from "../schema/types.ts";

/** The shipped Trafalgar file, which `scripts/dataFiles.test.ts` has already proved valid. */
const trafalgar = JSON.parse(trafalgarRaw) as Battle;

/** The example battle with its `levels` replaced, so the rule is read off the field alone. */
function withLevels(levels: string[] | undefined): Battle {
  const battle = { ...MINIMAL_BATTLE };
  if (levels === undefined) delete battle.levels;
  else battle.levels = levels;
  return battle;
}

describe("initialState", () => {
  it("loads paused on the first phase at 1x, on the default view", () => {
    expect(initialState(TEST_BATTLE)).toEqual({ clock: clock("10:00"), playing: false, multiplier: 1, view: "plate" as const, level: 0 });
  });
});

describe("tick", () => {
  it("does not move the clock while paused", () => {
    const paused = initialState(TEST_BATTLE);
    expect(tick(TEST_BATTLE, paused, 5)).toEqual(paused);
  });

  it("advances through the phase's rate and the multiplier while playing", () => {
    const playing = { clock: clock("10:10"), playing: true, multiplier: 1, view: "plate" as const, level: 0 };
    expect(tick(TEST_BATTLE, playing, 5).clock).toBe(clock("10:15"));
    expect(tick(TEST_BATTLE, { ...playing, multiplier: 2 }, 5).clock).toBe(clock("10:20"));
  });

  it("pauses on the last picture at end", () => {
    const state = tick(TEST_BATTLE, { clock: clock("10:20"), playing: true, multiplier: 1, view: "plate" as const, level: 0 }, 100);
    expect(state).toEqual({ clock: clock("10:30"), playing: false, multiplier: 1, view: "plate" as const, level: 0 });
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
    const ended = { clock: clock("10:30"), playing: false, multiplier: 2, view: "plate" as const, level: 0 };
    expect(togglePlay(TEST_BATTLE, ended)).toEqual({ clock: clock("10:00"), playing: true, multiplier: 2, view: "plate" as const, level: 0 });
  });
});

describe("jumpNext", () => {
  it("lands on the following phase's t and keeps the play state", () => {
    expect(jumpNext(TEST_BATTLE, { clock: clock("10:05"), playing: true, multiplier: 1, view: "plate" as const, level: 0 })).toEqual({
      clock: clock("10:10"),
      playing: true,
      multiplier: 1,
      view: "plate",
      level: 0,
    });
    expect(jumpNext(TEST_BATTLE, { clock: clock("10:05"), playing: false, multiplier: 1, view: "plate" as const, level: 0 }).playing).toBe(false);
  });

  it("lands on end from the last phase, where the player pauses", () => {
    expect(jumpNext(TEST_BATTLE, { clock: clock("10:25"), playing: true, multiplier: 1, view: "plate" as const, level: 0 })).toEqual({
      clock: clock("10:30"),
      playing: false,
      multiplier: 1,
      view: "plate",
      level: 0,
    });
  });
});

describe("jumpPrevious", () => {
  it("goes to the previous phase within a second of playback into this one", () => {
    // Phase two plays at 60x, so half a wall second in is 10:10:30.
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:10:30"), playing: true, multiplier: 1, view: "plate" as const, level: 0 })).toEqual({
      clock: clock("10:00"),
      playing: true,
      multiplier: 1,
      view: "plate",
      level: 0,
    });
  });

  it("restarts the current phase past a second of playback into it", () => {
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:12"), playing: false, multiplier: 1, view: "plate" as const, level: 0 }).clock).toBe(clock("10:10"));
  });

  it("measures that second at the current speed multiplier", () => {
    // At 4x, 10:12 is two clock minutes but only half a wall second into phase two.
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:12"), playing: false, multiplier: 4, view: "plate" as const, level: 0 }).clock).toBe(clock("10:00"));
  });

  it("goes no further back than the first phase's t", () => {
    expect(jumpPrevious(TEST_BATTLE, { clock: clock("10:00"), playing: false, multiplier: 1, view: "plate" as const, level: 0 }).clock).toBe(clock("10:00"));
  });
});

describe("jumpToPhase", () => {
  it("lands on that phase's t, keeping the play state", () => {
    expect(jumpToPhase(TEST_BATTLE, { clock: clock("10:25"), playing: true, multiplier: 1, view: "plate" as const, level: 0 }, 0)).toEqual({
      clock: clock("10:00"),
      playing: true,
      multiplier: 1,
      view: "plate",
      level: 0,
    });
    expect(jumpToPhase(TEST_BATTLE, initialState(TEST_BATTLE), 2).clock).toBe(clock("10:20"));
  });

  it("refuses an index no phase has", () => {
    expect(() => jumpToPhase(TEST_BATTLE, initialState(TEST_BATTLE), 3)).toThrow(RangeError);
  });
});

describe("scrubTo", () => {
  it("sets the clock from a bar fraction and pauses", () => {
    const state = scrubTo(TEST_BATTLE, { clock: clock("10:00"), playing: true, multiplier: 1, view: "plate" as const, level: 0 }, 1 / 16);
    expect(state.clock).toBeCloseTo(clock("10:10"), 6);
    expect(state.playing).toBe(false);
  });
});

describe("setMultiplier", () => {
  it("changes the speed without moving the clock or stopping playback", () => {
    expect(setMultiplier({ clock: clock("10:15"), playing: true, multiplier: 1, view: "plate" as const, level: 0 }, 4)).toEqual({
      clock: clock("10:15"),
      playing: true,
      multiplier: 4,
      view: "plate",
      level: 0,
    });
  });

  it("refuses a speed a duration cannot be divided by", () => {
    expect(() => setMultiplier(initialState(TEST_BATTLE), 0)).toThrow(RangeError);
  });
});

describe("setView", () => {
  it("changes the view and nothing else", () => {
    const playing = { clock: clock("10:15"), playing: true, multiplier: 2, view: "plate" as const, level: 0 };

    expect(setView(playing, "night")).toEqual({ ...playing, view: "night" });
    expect(setView(playing, "atlas")).toEqual({ ...playing, view: "atlas" });
  });
});

describe("setLevel", () => {
  it("changes the level and nothing else, so a switch never interrupts", () => {
    const playing = { clock: clock("10:15"), playing: true, multiplier: 2, view: "night" as const, level: 0 };

    expect(setLevel(TEST_BATTLE, playing, 1)).toEqual({ ...playing, level: 1 });
    expect(setLevel(TEST_BATTLE, setLevel(TEST_BATTLE, playing, 1), 0)).toEqual(playing);
  });

  it("opens on the coarsest level and remembers nothing across a visit", () => {
    expect(initialState(TEST_BATTLE).level).toBe(0);
  });
});

describe("levelOptions", () => {
  it("offers the battle's levels, coarsest first, when there is a choice", () => {
    expect(levelOptions(MINIMAL_BATTLE)).toEqual(["Columns", "Squadrons"]);
    // The shipped Trafalgar carries the same two levels now that its squadrons are authored.
    expect(levelOptions(trafalgar)).toEqual(["Columns", "Squadrons"]);
  });

  it("offers nothing for a battle with no levels, so no chooser is built", () => {
    expect(levelOptions(withLevels(undefined))).toEqual([]);
  });

  it("offers nothing for a single level, which is not a choice either", () => {
    expect(levelOptions(withLevels(["Columns"]))).toEqual([]);
  });

  it("offers all three of a three-deep battle", () => {
    expect(levelOptions(withLevels(["Wings", "Divisions", "Brigades"]))).toEqual(["Wings", "Divisions", "Brigades"]);
  });
});

describe("the unit card", () => {
  /** Level 0 draws the two columns and the Combined Fleet; level 1 draws the vans and the Combined Fleet, which was never split. */
  const battle = MINIMAL_BATTLE;
  const closed = { clock: clock("10:15"), playing: true, multiplier: 2, view: "plate" as const, level: 0 };

  describe("hoverUnit", () => {
    it("shows a card while the pointer is on a unit and hides it when it leaves", () => {
      const shown = hoverUnit(closed, "weather-column");
      expect(shown.card).toEqual({ id: "weather-column", pinned: false });
      expect(hoverUnit(shown, undefined)).toEqual(closed);
    });

    it("moves an unpinned card to whichever unit the pointer is on", () => {
      const shown = hoverUnit(hoverUnit(closed, "weather-column"), "lee-column");
      expect(shown.card).toEqual({ id: "lee-column", pinned: false });
    });

    it("keeps a pinned card while the pointer wanders elsewhere", () => {
      const pinned = pinUnit(closed, "weather-column");
      expect(hoverUnit(pinned, "lee-column")).toBe(pinned);
      expect(hoverUnit(pinned, undefined)).toBe(pinned);
    });

    it("changes nothing when the pointer is still on the unit the card is open on", () => {
      const shown = hoverUnit(closed, "weather-column");
      expect(hoverUnit(shown, "weather-column")).toBe(shown);
    });
  });

  describe("pinUnit", () => {
    it("pins the card to the unit clicked", () => {
      expect(pinUnit(closed, "weather-column").card).toEqual({ id: "weather-column", pinned: true });
    });

    it("swaps to another unit clicked, one card at a time", () => {
      const swapped = pinUnit(pinUnit(closed, "weather-column"), "lee-column");
      expect(swapped.card).toEqual({ id: "lee-column", pinned: true });
    });

    it("leaves the clock and the play state alone, so pinning never interrupts", () => {
      const pinned = pinUnit(closed, "weather-column");
      expect(pinned.clock).toBe(closed.clock);
      expect(pinned.playing).toBe(closed.playing);
    });
  });

  describe("closeCard", () => {
    it("closes a pinned card, which is what a click on bare plate does", () => {
      expect(closeCard(pinUnit(closed, "weather-column"))).toEqual(closed);
    });

    it("changes nothing when no card is open", () => {
      expect(closeCard(closed)).toBe(closed);
    });
  });

  describe("setLevel with a card open", () => {
    it("closes a card whose unit the new level stops drawing", () => {
      const pinned = pinUnit(closed, "weather-column");
      expect(setLevel(battle, pinned, 1).card).toBeUndefined();
    });

    it("keeps a card whose unit the new level still draws", () => {
      const pinned = pinUnit(closed, "combined-fleet");
      expect(setLevel(battle, pinned, 1).card).toEqual({ id: "combined-fleet", pinned: true });
    });

    it("closes a card on a unit that is absent at this instant, which has no glyph to hang on either", () => {
      // The Combined Fleet is not on the plate until the melee, so at 10:15
      // there is nothing for its card to be anchored at (ADR-0024).
      const absent = structuredClone(MINIMAL_BATTLE);
      absent.phases[0]!.units = absent.phases[0]!.units.filter((snapshot) => snapshot.id !== "combined-fleet");
      const pinned = pinUnit(closed, "combined-fleet");
      expect(setLevel(absent, pinned, 1).card).toBeUndefined();
    });
  });

  describe("setView with a card open", () => {
    it("keeps the card, redrawn in the new palette", () => {
      const pinned = pinUnit(closed, "weather-column");
      expect(setView(pinned, "night").card).toEqual({ id: "weather-column", pinned: true });
    });
  });
});
