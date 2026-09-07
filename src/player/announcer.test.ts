/**
 * What the announcer says. The phrase is the orientation a sighted viewer
 * reads off the scrubber's ticks — which phase of how many — and nothing else
 * on the page carries it (#130).
 */
import { describe, expect, it } from "vitest";
import { announcement, phaseCount } from "./announcer.ts";
import { pictureAt } from "../timeline/pictureAt.ts";
import { ABSENCE_BATTLE, TEST_BATTLE, clock } from "../timeline/testBattle.ts";

describe("phaseCount", () => {
  it("counts the phase the instant falls in, from one", () => {
    expect(phaseCount(pictureAt(TEST_BATTLE, clock("10:00")), TEST_BATTLE.phases.length)).toBe("Phase 1 of 3");
    expect(phaseCount(pictureAt(TEST_BATTLE, clock("10:15")), TEST_BATTLE.phases.length)).toBe("Phase 2 of 3");
  });

  it("counts a phase still running, not the instant it began on", () => {
    // 12:30 is half an hour into the fourth phase, which is still the fourth.
    expect(phaseCount(pictureAt(ABSENCE_BATTLE, clock("12:30")), ABSENCE_BATTLE.phases.length)).toBe("Phase 3 of 6");
  });
});

describe("announcement", () => {
  it("gives the count, the phase's own instant and its label", () => {
    expect(announcement(pictureAt(TEST_BATTLE, clock("10:20")), TEST_BATTLE.phases.length)).toBe("Phase 3 of 3, 10:20 — Phase three");
  });

  it("gives the phase's t rather than the clock, so it does not change while the phase plays", () => {
    const begun = announcement(pictureAt(TEST_BATTLE, clock("10:10")), TEST_BATTLE.phases.length);
    expect(announcement(pictureAt(TEST_BATTLE, clock("10:15")), TEST_BATTLE.phases.length)).toBe(begun);
    expect(begun).toBe("Phase 2 of 3, 10:10 — Phase two");
  });
});
