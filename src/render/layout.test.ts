/**
 * The one global rule about width (#86): which mode a plate width is in, what
 * furniture that mode draws, and which step of the collapse order its labels
 * start at. Everything narrow-screen in the app reads these three answers, so
 * there is nothing per view to keep in step.
 */
import { describe, expect, it } from "vitest";
import { LAST_STEP, labelLadder } from "./labels/content.ts";
import { furnitureFor, labelFloor, layoutMode, PHONE_MAX_WIDTH } from "./layout.ts";

describe("layoutMode", () => {
  it("collapses a phone in portrait", () => {
    // The widths the Phone board and the handsets it stands for are drawn at.
    for (const width of [320, 360, 390, 393, 414, 430]) expect(layoutMode(width)).toBe("phone");
  });

  it("leaves a tablet in portrait alone", () => {
    // The narrowest tablet portrait is 600; an iPad mini is 744, an iPad 768.
    for (const width of [600, 744, 768, 834]) expect(layoutMode(width)).toBe("desktop");
  });

  it("leaves a desktop alone, the width the acceptance is read at", () => {
    expect(layoutMode(1120)).toBe("desktop");
  });

  it("puts the threshold itself in the narrow mode, and the pixel above it out", () => {
    expect(layoutMode(PHONE_MAX_WIDTH)).toBe("phone");
    expect(layoutMode(PHONE_MAX_WIDTH + 1)).toBe("desktop");
  });

  it("sits the threshold above every phone and below every tablet", () => {
    expect(PHONE_MAX_WIDTH).toBeGreaterThan(430);
    expect(PHONE_MAX_WIDTH).toBeLessThan(600);
  });
});

describe("furnitureFor", () => {
  it("draws the whole set on a desktop", () => {
    expect(furnitureFor("desktop")).toEqual({ compass: "rose", title: true, legend: "full", credit: true, scaleBar: true });
  });

  it("drops the title and the credit off a phone, and thins the compass and the legend", () => {
    expect(furnitureFor("phone")).toEqual({ compass: "arrow", title: false, legend: "sides", credit: false, scaleBar: true });
  });

  it("keeps the scale bar in both modes, the one piece that never goes", () => {
    expect(furnitureFor("desktop").scaleBar).toBe(true);
    expect(furnitureFor("phone").scaleBar).toBe(true);
  });
});

describe("labelFloor", () => {
  it("starts a desktop label at the top of the collapse order", () => {
    expect(labelFloor("desktop")).toBe(0);
  });

  it("starts a phone label at the short name with its state word", () => {
    expect(labelFloor("phone")).toBe(3);
  });
});

describe("labelFloor and the ladder", () => {
  it("names the first rung of the mode's own ladder, so the two cannot drift apart", () => {
    for (const mode of ["desktop", "phone"] as const) expect(labelLadder(mode)[0]).toBe(labelFloor(mode));
  });

  it("gives a desktop the order #39 decided, unchanged by the phone's", () => {
    expect(labelLadder("desktop")).toEqual([0, 1, 2, 5, LAST_STEP]);
  });

  it("gives a phone the floor, its displacement, the bare short name and the numeral", () => {
    expect(labelLadder("phone")).toEqual([3, 4, 5, LAST_STEP]);
  });
});
