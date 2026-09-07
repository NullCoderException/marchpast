import { describe, expect, it } from "vitest";
import type { Battle } from "../schema/types.ts";
import { pictureAt, presentAt } from "./pictureAt.ts";
import { ABSENCE_BATTLE, NIGHT_BATTLE, TEST_BATTLE, clock, cloneTestBattle } from "./testBattle.ts";

/** The unit of that id in the picture; fails loudly rather than returning undefined. */
function unit(picture: ReturnType<typeof pictureAt>, id: string) {
  const found = picture.units.find((u) => u.id === id);
  if (found === undefined) throw new Error(`No unit ${id} in the picture`);
  return found;
}

describe("pictureAt: geometry tweens", () => {
  it("puts a unit at the arithmetic mean of the two positions at the midpoint of the interval", () => {
    const picture = pictureAt(TEST_BATTLE, clock("10:05"));
    expect(unit(picture, "alpha").position.lat).toBeCloseTo(15, 12);
    expect(unit(picture, "alpha").position.lon).toBeCloseTo(30, 12);
    expect(unit(picture, "beta").position.lat).toBeCloseTo(2, 12);
    expect(unit(picture, "beta").position.lon).toBeCloseTo(4, 12);
  });

  it("turns a heading the short way and resolves the 180 degree tie clockwise", () => {
    const picture = pictureAt(TEST_BATTLE, clock("10:05"));
    expect(unit(picture, "alpha").heading).toBeCloseTo(0, 12);
    expect(unit(picture, "beta").heading).toBeCloseTo(90, 12);
  });

  it("carries the interval's endpoints as the unit's track", () => {
    const picture = pictureAt(TEST_BATTLE, clock("10:05"));
    expect(unit(picture, "alpha").track).toEqual({ from: { lat: 10, lon: 20 }, to: { lat: 20, lon: 40 } });
    expect(unit(picture, "beta").track).toEqual({ from: { lat: 0, lon: 0 }, to: { lat: 4, lon: 8 } });
  });
});

describe("pictureAt: everything else steps", () => {
  it("does not tween strength", () => {
    const picture = pictureAt(TEST_BATTLE, clock("10:05"));
    expect(unit(picture, "alpha").strength).toBe(1);
    expect(pictureAt(TEST_BATTLE, clock("10:10")).units.find((u) => u.id === "alpha")?.strength).toBe(0.33);
  });

  it("defaults an unauthored strength to 1 and unauthored moves to none", () => {
    const picture = pictureAt(TEST_BATTLE, clock("10:05"));
    expect(unit(picture, "beta").strength).toBe(1);
    expect(unit(picture, "beta").moves).toEqual([]);
  });

  it("steps wind, caption, label, moves, formation and state at the phase's t", () => {
    const before = pictureAt(TEST_BATTLE, clock("10:09:59"));
    expect(before.phaseIndex).toBe(0);
    expect(before.wind).toEqual({ from: 270, force: "fresh" });
    expect(before.caption).toBe("Caption one.");
    expect(before.label).toBe("Phase one");
    expect(unit(before, "alpha").moves).toEqual([]);
    expect(unit(before, "alpha").formation).toBe("column");
    expect(unit(before, "alpha").state).toBe("intact");

    const on = pictureAt(TEST_BATTLE, clock("10:10"));
    expect(on.phaseIndex).toBe(1);
    expect(on.wind).toEqual({ from: 90, force: "light" });
    expect(on.caption).toBe("Caption two.");
    expect(on.label).toBe("Phase two");
    expect(unit(on, "alpha").moves).toEqual([{ kind: "intent", to: { lat: 25, lon: 45 } }]);
    expect(unit(on, "alpha").formation).toBe("line");
    expect(unit(on, "alpha").state).toBe("engaged");
  });

  it("carries the phase's references and its notes, which every phase has", () => {
    expect(pictureAt(TEST_BATTLE, clock("10:05")).references).toEqual([{ source: "invented", locator: "p. 1" }]);
    expect(pictureAt(TEST_BATTLE, clock("10:05")).notes).toBe(TEST_BATTLE.phases[0]!.notes);
    expect(pictureAt(TEST_BATTLE, clock("10:15")).notes).toBe(TEST_BATTLE.phases[1]!.notes);
  });

  it("has no wind at all when the battle does not track wind", () => {
    const battle: Battle = cloneTestBattle();
    for (const phase of battle.phases) delete phase.wind;
    expect(pictureAt(battle, clock("10:05")).wind).toBeUndefined();
  });
});

describe("pictureAt: the last phase holds", () => {
  it("shows the last phase's own snapshot, untweened and trackless, right up to end", () => {
    const picture = pictureAt(TEST_BATTLE, clock("10:29:59"));
    const last = TEST_BATTLE.phases[2]!;
    expect(picture.phaseIndex).toBe(2);
    expect(picture.phase).toBe(last);
    expect(unit(picture, "alpha")).toEqual({
      id: "alpha",
      position: { lat: 22, lon: 44 },
      heading: 90,
      formation: "line",
      state: "broken",
      strength: 0.2,
      moves: [],
    });
    expect(unit(picture, "alpha").track).toBeUndefined();
    expect(unit(picture, "beta").position).toEqual({ lat: 6, lon: 12 });
    expect(unit(picture, "beta").track).toBeUndefined();
    expect(picture.caption).toBe(last.caption);
    expect(picture.label).toBe(last.label);
    expect(picture.references).toEqual(last.references);
    expect(picture.wind).toEqual(last.wind);
    expect(picture.notes).toBe(last.notes);
  });

  it("still shows it at end itself", () => {
    expect(pictureAt(TEST_BATTLE, clock("10:30")).phaseIndex).toBe(2);
    expect(pictureAt(TEST_BATTLE, clock("10:30")).clock).toBe(clock("10:30"));
  });

  it("hands out a fresh position rather than the phase's own object", () => {
    const picture = pictureAt(TEST_BATTLE, clock("10:29:59"));
    expect(unit(picture, "alpha").position).toEqual(TEST_BATTLE.phases[2]!.units[0]!.position);
    expect(unit(picture, "alpha").position).not.toBe(TEST_BATTLE.phases[2]!.units[0]!.position);
  });
});

describe("pictureAt: the clock", () => {
  it("clamps an instant before the first phase to the first phase's picture", () => {
    const picture = pictureAt(TEST_BATTLE, clock("09:00"));
    expect(picture.phaseIndex).toBe(0);
    expect(picture.clock).toBe(clock("10:00"));
    expect(unit(picture, "alpha").position).toEqual({ lat: 10, lon: 20 });
    expect(unit(picture, "alpha").heading).toBe(350);
  });

  it("clamps an instant past end to end", () => {
    expect(pictureAt(TEST_BATTLE, clock("23:00")).clock).toBe(clock("10:30"));
  });

  it("lists every roster unit in roster order", () => {
    expect(pictureAt(TEST_BATTLE, clock("10:05")).units.map((u) => u.id)).toEqual(["alpha", "beta"]);
  });
});

/** The ids in the picture at `time`, in the order the picture lists them. */
function drawn(time: string): string[] {
  return pictureAt(ABSENCE_BATTLE, clock(time)).units.map((u) => u.id);
}

describe("pictureAt: a unit absent from a phase", () => {
  it("leaves the strike out of the interval before its run, where only the far end holds it", () => {
    expect(drawn("10:00")).toEqual(["force", "fleet"]);
    expect(drawn("10:30")).toEqual(["force", "fleet"]);
    expect(drawn("10:59:59")).toEqual(["force", "fleet"]);
  });

  it("puts the strike on the plate at the instant of its first phase, and tweens it through its run", () => {
    expect(drawn("11:00")).toEqual(["force", "fleet", "strike"]);
    expect(drawn("12:00")).toEqual(["force", "fleet", "strike"]);
    // Ten degrees an hour: halfway from 11:00 to 12:00 is longitude 15.
    const half = pictureAt(ABSENCE_BATTLE, clock("11:30"));
    expect(unit(half, "strike").position.lon).toBeCloseTo(15, 12);
    expect(unit(half, "strike").track).toEqual({ from: { lat: 10, lon: 10 }, to: { lat: 10, lon: 20 } });
  });

  it("draws the strike arriving at its last snapshot, right up to the instant it is struck below", () => {
    // The last snapshot is the tween's destination, which is how a recovery
    // phase "brings it home" (ADR-0024): the strike is on the plate, at its
    // authored position, until the instant of the phase that holds it.
    const arriving = pictureAt(ABSENCE_BATTLE, clock("12:59:59"));
    expect(arriving.units.map((u) => u.id)).toEqual(["force", "fleet", "strike"]);
    // A second short of the hour is a second short of the destination, which
    // is the whole of what "brings it home" means.
    expect(unit(arriving, "strike").position.lon).toBeCloseTo(30, 2);
  });

  it("takes the strike off the plate at the instant its run ends, with no fade", () => {
    expect(drawn("13:00")).toEqual(["force", "fleet"]);
    expect(drawn("14:00")).toEqual(["force", "fleet"]);
    expect(drawn("15:30")).toEqual(["force", "fleet"]);
    expect(drawn("16:00")).toEqual(["force", "fleet"]);
  });

  it("keeps the units it does draw in roster order", () => {
    expect(drawn("11:30")).toEqual(["force", "fleet", "strike"]);
  });

  it("holds a unit whose run reaches the last phase, which has no far end to check", () => {
    const battle: Battle = structuredClone(ABSENCE_BATTLE);
    // The strike flies from phase 4 to the end of the battle instead.
    for (const [index, phase] of battle.phases.entries()) {
      phase.units = phase.units.filter((snapshot) => snapshot.id !== "strike");
      if (index >= 3) phase.units.push({ id: "strike", position: { lat: 10, lon: index }, heading: 90, formation: "line", state: "engaged" });
    }
    expect(pictureAt(battle, clock("12:59:59")).units.map((u) => u.id)).toEqual(["force", "fleet"]);
    expect(pictureAt(battle, clock("13:00")).units.map((u) => u.id)).toEqual(["force", "fleet", "strike"]);
    expect(pictureAt(battle, clock("15:30")).units.map((u) => u.id)).toEqual(["force", "fleet", "strike"]);
    expect(pictureAt(battle, clock("16:00")).units.map((u) => u.id)).toEqual(["force", "fleet", "strike"]);
  });
});

describe("presentAt", () => {
  it("answers with the ids the interval holding the clock draws", () => {
    expect([...presentAt(ABSENCE_BATTLE, clock("10:30"))]).toEqual(["force", "fleet"]);
    expect([...presentAt(ABSENCE_BATTLE, clock("11:30"))]).toEqual(["force", "fleet", "strike"]);
    expect([...presentAt(ABSENCE_BATTLE, clock("13:30"))]).toEqual(["force", "fleet"]);
  });

  it("clamps like the picture does, so an instant outside the battle answers for its nearest end", () => {
    expect([...presentAt(ABSENCE_BATTLE, clock("03:00"))]).toEqual(["force", "fleet"]);
    expect([...presentAt(ABSENCE_BATTLE, clock("23:00"))]).toEqual(["force", "fleet"]);
  });
});

describe("pictureAt across midnight", () => {
  it("tweens through midnight as one interval, because the clock never resets", () => {
    // Halfway from 23:00 to 05:05 is 02:02:30 on day 1. Nothing about the day
    // break interrupts the tween or restarts the fraction.
    const picture = pictureAt(NIGHT_BATTLE, clock("02:02:30", 1));

    expect(picture.phaseIndex).toBe(0);
    expect(unit(picture, "alpha").position.lat).toBeCloseTo(15, 12);
    expect(unit(picture, "alpha").position.lon).toBeCloseTo(30, 12);
  });

  it("carries the phase's own day, which is what the caption band's date reads", () => {
    expect(pictureAt(NIGHT_BATTLE, clock("23:30")).phase.day).toBeUndefined();
    expect(pictureAt(NIGHT_BATTLE, clock("05:05", 1)).phase.day).toBe(1);
    expect(pictureAt(NIGHT_BATTLE, clock("11:30", 1)).phase.day).toBe(1);
  });

  it("clamps to the battle's own ends, which lie on different days", () => {
    expect(pictureAt(NIGHT_BATTLE, clock("06:00")).clock).toBe(clock("23:00"));
    expect(pictureAt(NIGHT_BATTLE, clock("23:00", 1)).clock).toBe(clock("14:00", 1));
  });
});
