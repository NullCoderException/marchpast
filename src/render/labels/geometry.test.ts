/**
 * The field a label is placed on: the glyph's box, the clearance in a
 * direction, the collision test, and the ring of slots the search sweeps.
 */
import { describe, expect, it } from "vitest";
import {
  angleDelta,
  clearance,
  distanceToRect,
  glyphBox,
  insidePlate,
  isForward,
  type LabelUnit,
  overlaps,
  preferredAngles,
  RING_RADII,
  ringAngles,
  smokeBox,
} from "./geometry.ts";
import { toRadians } from "../projection.ts";
import { ticks } from "../glyphs/ticks.ts";

/** A unit with the fields this file's subject reads; everything else is filler. */
function unit(over: Partial<LabelUnit> = {}): LabelUnit {
  return {
    id: "a",
    rosterIndex: 0,
    name: "Weather column",
    state: "intact",
    strength: 1,
    colour: "#900",
    anchor: { x: 200, y: 200 },
    heading: 0,
    formation: "column",
    length: 72,
    halfWidth: 2.6,
    // The plate's own reach for the state asked for, so a fixture clears what
    // the plate's Billow clears (`glyphs/ticks.ts`).
    markReach: ticks.markReach(1, over.state ?? "intact"),
    hasMove: false,
    ...over,
  };
}

const degrees = (value: number): number => toRadians(value);

describe("glyphBox", () => {
  it("is long along the heading for a column and long across it for a line", () => {
    const column = glyphBox(unit({ formation: "column" }));
    expect(column.height).toBeCloseTo(72);
    expect(column.width).toBeCloseTo(5.2);

    const line = glyphBox(unit({ formation: "line" }));
    expect(line.width).toBeCloseTo(72);
    expect(line.height).toBeCloseTo(5.2);
  });

  it("turns with the heading, so a column heading east is long in x", () => {
    const box = glyphBox(unit({ formation: "column", heading: 90 }));
    expect(box.width).toBeCloseTo(72);
    expect(box.height).toBeCloseTo(5.2);
  });

  it("is centred on the anchor", () => {
    const box = glyphBox(unit({ anchor: { x: 50, y: 60 } }));
    expect(box.x + box.width / 2).toBeCloseTo(50);
    expect(box.y + box.height / 2).toBeCloseTo(60);
  });
});

describe("smokeBox", () => {
  it("is the glyph's own box for a unit that is not fighting", () => {
    const intact = unit({ state: "intact" });
    expect(smokeBox(intact)).toEqual(glyphBox(intact));
  });

  it("grows to leeward only, so the windward flank stays clear", () => {
    // No wind: a column's billow takes its port flank (negative local x), which
    // heading north puts to the left of the glyph.
    const box = smokeBox(unit({ state: "engaged", formation: "column", heading: 0 }));
    const bare = glyphBox(unit({ formation: "column", heading: 0 }));
    expect(box.x).toBeLessThan(bare.x);
    expect(box.x + box.width).toBeCloseTo(bare.x + bare.width);
  });

  it("reaches further when a unit is engaged than when it is broken", () => {
    const engaged = smokeBox(unit({ state: "engaged" }));
    const broken = smokeBox(unit({ state: "broken" }));
    expect(engaged.width).toBeGreaterThan(broken.width);
  });
});

describe("clearance", () => {
  it("is half the glyph across its flank and half its length ahead", () => {
    const column = unit({ formation: "column", heading: 0 });
    expect(clearance(column, degrees(90))).toBeCloseTo(2.6);
    expect(clearance(column, degrees(0))).toBeCloseTo(36);
  });

  it("turns with the heading", () => {
    const column = unit({ formation: "column", heading: 90 });
    expect(clearance(column, degrees(180))).toBeCloseTo(2.6);
    expect(clearance(column, degrees(90))).toBeCloseTo(36);
  });

  it("takes the view's halfWidth, so a wider glyph pushes its label further out", () => {
    const wide = unit({ formation: "column", halfWidth: 9 });
    expect(clearance(wide, degrees(90))).toBeCloseTo(9);
  });
});

describe("overlaps", () => {
  const box = { x: 0, y: 0, width: 10, height: 10 };

  it("is true for boxes that cross", () => {
    expect(overlaps(box, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
  });

  it("is false for boxes well apart", () => {
    expect(overlaps(box, { x: 40, y: 0, width: 10, height: 10 })).toBe(false);
  });

  it("counts boxes that merely touch as overlapping, so labels keep a little air", () => {
    expect(overlaps(box, { x: 10, y: 0, width: 10, height: 10 })).toBe(true);
  });
});

describe("insidePlate", () => {
  const plate = { x: 0, y: 0, width: 100, height: 100 };

  it("keeps a box off the plate's edge by the inset", () => {
    expect(insidePlate({ x: 6, y: 6, width: 88, height: 88 }, plate)).toBe(true);
    expect(insidePlate({ x: 5, y: 6, width: 88, height: 88 }, plate)).toBe(false);
    expect(insidePlate({ x: 6, y: 6, width: 89, height: 88 }, plate)).toBe(false);
  });
});

describe("isForward", () => {
  it("forbids the sector the track and the moves run in, and nothing wider", () => {
    const north = unit({ heading: 0 });
    expect(isForward(north, degrees(0))).toBe(true);
    expect(isForward(north, degrees(54))).toBe(true);
    expect(isForward(north, degrees(56))).toBe(false);
    expect(isForward(north, degrees(-56))).toBe(false);
    expect(isForward(north, degrees(180))).toBe(false);
  });

  it("turns with the heading", () => {
    const east = unit({ heading: 90 });
    expect(isForward(east, degrees(90))).toBe(true);
    expect(isForward(east, degrees(0))).toBe(false);
  });
});

describe("preferredAngles", () => {
  it("puts a column's label on its flank, windward first", () => {
    // With no wind the billow takes a column's port flank, so the label takes starboard.
    const angles = preferredAngles(unit({ formation: "column", heading: 0 }));
    expect(angles.map((angle) => Math.round((angle * 180) / Math.PI))).toEqual([90, 270]);
  });

  it("puts a line's label astern of it", () => {
    const angles = preferredAngles(unit({ formation: "line", heading: 0 }));
    expect(Math.round((angles[0] ?? 0) * (180 / Math.PI))).toBe(180);
  });

  it("prefers the windward flank, so the label does not sit in its own smoke", () => {
    // Wind blowing to starboard (90 degrees off the heading) drives the billow
    // that way, so the label takes the port flank instead.
    const angles = preferredAngles(unit({ formation: "column", heading: 0, windTo: degrees(90) }));
    expect(Math.round((angles[0] ?? 0) * (180 / Math.PI))).toBe(270);
  });

  it("never offers an angle in the forward sector", () => {
    const angles = preferredAngles(unit({ formation: "line", heading: 0, windTo: degrees(180) }));
    for (const angle of angles) expect(isForward(unit({ formation: "line", heading: 0 }), angle)).toBe(false);
  });
});

describe("ringAngles", () => {
  const north = unit({ heading: 0, formation: "column" });

  it("offers the twenty-four directions of the ring less the forward sector", () => {
    const angles = ringAngles(north);
    expect(angles).toHaveLength(24 - 7);
    for (const angle of angles) expect(isForward(north, angle)).toBe(false);
  });

  it("sweeps outward from the angle the label already had", () => {
    const angles = ringAngles(north, degrees(90));
    const offsets = angles.map((angle) => Math.abs(angleDelta(angle, degrees(90))));
    expect(offsets[0]).toBeCloseTo(0);
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeGreaterThanOrEqual(offsets[i - 1] ?? 0);
  });

  it("leads with the preferred flanks when the label has no angle yet", () => {
    expect(ringAngles(north).slice(0, 2)).toEqual(preferredAngles(north));
  });
});

describe("RING_RADII", () => {
  it("is the decided ring: the clearance, then four displacements", () => {
    expect([...RING_RADII]).toEqual([0, 20, 44, 72, 104]);
  });
});

describe("angleDelta", () => {
  it("is the shortest way round", () => {
    expect(angleDelta(degrees(350), degrees(10))).toBeCloseTo(degrees(-20));
    expect(angleDelta(degrees(10), degrees(350))).toBeCloseTo(degrees(20));
  });
});

describe("distanceToRect", () => {
  const box = { x: 0, y: 0, width: 10, height: 10 };

  it("is zero inside", () => {
    expect(distanceToRect({ x: 5, y: 5 }, box)).toBe(0);
  });

  it("is the gap outside", () => {
    expect(distanceToRect({ x: 14, y: 5 }, box)).toBeCloseTo(4);
    expect(distanceToRect({ x: 13, y: 14 }, box)).toBeCloseTo(5);
  });
});
