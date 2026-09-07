/**
 * The placer: the priority order, the sticky search and what it remembers, the
 * collapse, the leader trigger and the legend's numeral key.
 */
import { describe, expect, it } from "vitest";
import type { CardContent } from "./card.ts";
import type { Measure } from "./content.ts";
import { glyphBox, type LabelUnit, LABEL_GAP, smokeBox } from "./geometry.ts";
import { CARD_STEP, needsLeader, NO_LABEL_MEMORY, numeralKey, placeLabels, type Placed, type Slot } from "./place.ts";
import { toRadians } from "../projection.ts";

/** A measurer with no canvas: every glyph a half of its point size wide. */
const measure: Measure = (text, size) => text.length * size * 0.5;

const PLATE = { x: 0, y: 0, width: 900, height: 600 };

function unit(over: Partial<LabelUnit> & Pick<LabelUnit, "id">): LabelUnit {
  return {
    rosterIndex: 0,
    name: "Van",
    state: "intact",
    strength: 1,
    colour: "#900",
    anchor: { x: 400, y: 300 },
    heading: 0,
    formation: "column",
    length: 72,
    halfWidth: 2.6,
    hasMove: false,
    ...over,
  };
}

/** Places one frame from nothing, the common case in these tests. */
function place(units: readonly LabelUnit[], over: { obstacles?: readonly { x: number; y: number; width: number; height: number }[]; plate?: typeof PLATE; memory?: ReadonlyMap<string, Slot>; card?: CardContent } = {}) {
  return placeLabels({
    units,
    plate: over.plate ?? PLATE,
    obstacles: over.obstacles ?? [],
    measure,
    memory: over.memory ?? NO_LABEL_MEMORY,
    card: over.card,
  });
}

const byId = (placed: readonly Placed[], id: string): Placed => {
  const found = placed.find((label) => label.unit.id === id);
  if (found === undefined) throw new Error(`no label for ${id}`);
  return found;
};

describe("placeLabels", () => {
  it("returns one label per unit, in roster order", () => {
    const { placed } = place([unit({ id: "b", rosterIndex: 1, anchor: { x: 200, y: 100 } }), unit({ id: "a", rosterIndex: 0 })]);
    expect(placed.map((label) => label.unit.id)).toEqual(["a", "b"]);
  });

  it("hangs the label on the flank, its near edge clear of the signs by the gap", () => {
    const only = unit({ id: "a" });
    const { placed } = place([only]);
    const label = byId(placed, "a");
    expect(label.step).toBe(0);
    // Heading north with no wind, the billow takes the port flank, so the label takes starboard.
    expect(label.box.x - (glyphBox(only).x + glyphBox(only).width)).toBeCloseTo(LABEL_GAP);
  });

  it("keeps the whole label inside the plate, off its edge by the inset", () => {
    const { placed } = place([unit({ id: "a", anchor: { x: 870, y: 300 } })]);
    const { box } = byId(placed, "a");
    expect(box.x).toBeGreaterThanOrEqual(PLATE.x + 6);
    expect(box.x + box.width).toBeLessThanOrEqual(PLATE.x + PLATE.width - 6);
  });

  it("treats the furniture as an obstacle and goes round it", () => {
    const only = unit({ id: "a" });
    const { placed: free } = place([only]);
    const onTheFlank = byId(free, "a").box;
    const { placed } = place([only], { obstacles: [onTheFlank] });
    const moved = byId(placed, "a");
    expect(overlapping(moved.box, onTheFlank)).toBe(false);
    expect(moved.box.x).not.toBeCloseTo(onTheFlank.x);
  });
});

describe("priority", () => {
  /**
   * Two columns close enough that only one of them can keep the windward
   * flank; the loser is pushed across to leeward. Both head north with no
   * wind, so windward is starboard, to the right of the anchor at x = 400.
   */
  const pair = (a: Partial<LabelUnit>, b: Partial<LabelUnit>): LabelUnit[] => [
    unit({ id: "a", rosterIndex: 0, anchor: { x: 400, y: 300 }, length: 20, ...a }),
    unit({ id: "b", rosterIndex: 1, anchor: { x: 400, y: 340 }, length: 20, ...b }),
  ];
  const windward = (placed: readonly Placed[], id: string): boolean => byId(placed, id).box.x > 400;

  it("settles a clash by roster order when nothing else separates the two", () => {
    const { placed } = place(pair({}, {}));
    expect(windward(placed, "a")).toBe(true);
    expect(windward(placed, "b")).toBe(false);
  });

  it("gives an engaged unit the flank over one that is not", () => {
    const { placed } = place(pair({}, { state: "engaged" }));
    expect(windward(placed, "b")).toBe(true);
    expect(windward(placed, "a")).toBe(false);
  });

  it("gives a unit with a move the flank over one without, engagement being equal", () => {
    const { placed } = place(pair({}, { hasMove: true }));
    expect(windward(placed, "b")).toBe(true);
    expect(windward(placed, "a")).toBe(false);
  });

  it("puts engagement above a move", () => {
    const { placed } = place(pair({ state: "engaged" }, { hasMove: true }));
    expect(windward(placed, "a")).toBe(true);
    expect(windward(placed, "b")).toBe(false);
  });
});

describe("the collapse order", () => {
  /** A plate too narrow for the unit's full name, so the collapse has to run. */
  const NARROW = { x: 0, y: 0, width: 220, height: 400 };
  const longName = "Spanish and Gallic cavalry x";

  it("falls to the roster's short_label when the words will not fit", () => {
    const { placed } = place([unit({ id: "a", name: longName, shortLabel: "Van", anchor: { x: 110, y: 200 } })], { plate: NARROW });
    const label = byId(placed, "a");
    expect(label.step).toBe(3);
    expect(label.name).toBe("Van");
  });

  it("skips that step for a unit the roster gave no short_label and goes straight to the numeral", () => {
    const { placed } = place([unit({ id: "a", name: longName, rosterIndex: 6, anchor: { x: 110, y: 200 } })], { plate: NARROW });
    const label = byId(placed, "a");
    expect(label.step).toBe(4);
    expect(label.numeral).toBe(7);
    expect(label.name).toBe("7");
  });
});

describe("the displacement ring", () => {
  /**
   * The unit's own flanks blocked at the clearance, but the plate wide open
   * beyond them: the label must ride out along the ring rather than give up a
   * word, since "displacement is exhausted before any word is dropped".
   */
  /** Boxes sitting on the two flanks at the clearance, where step 0 would put the label. */
  const starboardFlank = { x: 415, y: 275, width: 120, height: 50 };
  const portFlank = { x: 265, y: 275, width: 120, height: 50 };

  it("displaces rather than dropping a word", () => {
    const { placed } = place([unit({ id: "a", name: "Weather column", shortLabel: "Weather" })], { obstacles: [starboardFlank, portFlank] });
    const label = byId(placed, "a");
    expect(label.step).toBe(1);
    expect(label.name).toBe("Weather column");
    expect(label.detail).toBe("intact");
  });

  it("rides the ring out to stay clear of another unit's smoke, keeping every word", () => {
    // A burning neighbour whose billow lies over the windward flank, and a
    // hard obstacle over the lee one. Smoke is soft, so the label displaces
    // rather than crossing it — and keeps its name and its state word.
    const smoky = unit({ id: "b", rosterIndex: 1, name: "Lee", state: "engaged", formation: "line", anchor: { x: 480, y: 250 }, length: 40, windTo: Math.PI });
    const { placed } = place([unit({ id: "a", name: "Weather column" }), smoky], { obstacles: [portFlank] });
    const label = byId(placed, "a");
    expect(label.step).toBe(1);
    expect(label.detail).toBe("intact");
    expect(overlapping(label.box, smokeBox(smoky))).toBe(false);
  });
});

describe("numeralKey", () => {
  it("lists exactly the numerals shown this frame, in numeral order", () => {
    const placed: Placed[] = [
      { ...stub("a"), numeral: 3, unit: unit({ id: "a", rosterIndex: 2, name: "Van" }) },
      { ...stub("b"), unit: unit({ id: "b", rosterIndex: 1, name: "Centre" }) },
      { ...stub("c"), numeral: 1, unit: unit({ id: "c", rosterIndex: 0, name: "Rear" }) },
    ];
    expect(numeralKey(placed)).toEqual([
      { numeral: 1, label: "Rear", id: "c" },
      { numeral: 3, label: "Van", id: "a" },
    ]);
  });

  it("is empty when no label collapsed that far", () => {
    expect(numeralKey([stub("a")])).toEqual([]);
  });
});

describe("needsLeader", () => {
  const own = unit({ id: "a", anchor: { x: 400, y: 300 } });
  const far = unit({ id: "b", anchor: { x: 800, y: 300 } });
  const near = unit({ id: "b", anchor: { x: 448, y: 300 }, length: 20 });

  it("is false when the label's own glyph is the nearest one", () => {
    expect(needsLeader({ x: 433, y: 300 }, own, [own, far])).toBe(false);
  });

  it("is true when another unit's glyph is nearer than the label's own", () => {
    expect(needsLeader({ x: 440, y: 300 }, own, [own, near])).toBe(true);
  });

  it("is false for a lone unit however far its label has been displaced", () => {
    expect(needsLeader({ x: 560, y: 300 }, own, [own])).toBe(false);
  });
});

describe("the leader", () => {
  it("is not drawn for a displaced label in open water", () => {
    // Both flanks blocked at the clearance, so the label has to leave step 0
    // and displace — and, alone on the plate, still needs no leader.
    const bothFlanks = [
      { x: 415, y: 275, width: 120, height: 50 },
      { x: 265, y: 275, width: 120, height: 50 },
    ];
    const { placed } = place([unit({ id: "a" })], { obstacles: bothFlanks });
    const label = byId(placed, "a");
    expect(label.step).toBeGreaterThan(0);
    expect(label.leader).toBeUndefined();
  });
});

describe("the sticky search", () => {
  it("keeps last frame's slot while it is still free, though the unit has moved", () => {
    const first = place([unit({ id: "a", anchor: { x: 400, y: 300 } })]);
    const second = placeLabels({
      units: [unit({ id: "a", anchor: { x: 420, y: 260 } })],
      plate: PLATE,
      obstacles: [],
      measure,
      memory: first.memory,
    });
    const before = byId(first.placed, "a");
    const after = byId(second.placed, "a");
    expect(after.box.x - 420).toBeCloseTo(before.box.x - 400);
    expect(after.box.y - 260).toBeCloseTo(before.box.y - 300);
    expect(after.step).toBe(before.step);
  });

  it("counts the frames a label has held its slot, so the memory can give a step back", () => {
    const only = [unit({ id: "a" })];
    const first = place(only);
    expect(first.memory.get("a")?.clean).toBe(0);
    const second = placeLabels({ units: only, plate: PLATE, obstacles: [], measure, memory: first.memory });
    expect(second.memory.get("a")?.clean).toBe(1);
  });

  it("searches from the angle it had when its slot is taken, rather than restarting the ring", () => {
    const only = [unit({ id: "a" })];
    const held = new Map<string, Slot>([["a", { angle: toRadians(180), extra: 0, step: 1, clean: 0 }]]);
    const first = placeLabels({ units: only, plate: PLATE, obstacles: [], measure, memory: held });
    expect(first.memory.get("a")?.angle).toBeCloseTo(toRadians(180));

    const second = placeLabels({
      units: only,
      plate: PLATE,
      obstacles: [byId(first.placed, "a").box],
      measure,
      memory: held,
    });
    const now = second.memory.get("a")?.angle ?? 0;
    // One or two notches round the ring, not the far side of the unit.
    expect(Math.abs(shortest(now - toRadians(180)))).toBeLessThanOrEqual(toRadians(30));
  });

  it("gives a collapse step back after thirty clear frames and not after twenty-nine", () => {
    const only = [unit({ id: "a" })];
    const held: Slot = { angle: toRadians(90), extra: 0, step: 2, clean: 29 };

    const early = placeLabels({ units: only, plate: PLATE, obstacles: [], measure, memory: new Map([["a", held]]) });
    expect(byId(early.placed, "a").step).toBe(2);
    expect(early.memory.get("a")?.clean).toBe(30);

    const due = placeLabels({ units: only, plate: PLATE, obstacles: [], measure, memory: new Map([["a", { ...held, clean: 30 }]]) });
    expect(byId(due.placed, "a").step).toBe(1);
  });

  it("makes a recovered label earn the next step over again", () => {
    const only = [unit({ id: "a" })];
    const due = placeLabels({
      units: only,
      plate: PLATE,
      obstacles: [],
      measure,
      memory: new Map([["a", { angle: toRadians(90), extra: 0, step: 2, clean: 30 }]]),
    });
    expect(due.memory.get("a")?.clean).toBe(0);
  });

  it("keeps the slot of a unit this level does not draw, since only a new battle clears the memory", () => {
    // Switching level narrows what is drawn; a unit that comes back should
    // come back where it was, so its slot must survive the frames it was off.
    const both = place([unit({ id: "a" }), unit({ id: "b", rosterIndex: 1, anchor: { x: 600, y: 300 } })]);
    const narrowed = placeLabels({ units: [unit({ id: "a" })], plate: PLATE, obstacles: [], measure, memory: both.memory });
    expect([...narrowed.memory.keys()].sort()).toEqual(["a", "b"]);
    expect(narrowed.memory.get("b")).toEqual(both.memory.get("b"));
  });
});

/** A placed label with nothing interesting in it, for the pure-function tests above. */
function stub(id: string): Placed {
  return {
    unit: unit({ id }),
    step: 0,
    name: "Van",
    at: { x: 0, y: 0 },
    align: "left",
    box: { x: 0, y: 0, width: 10, height: 10 },
  };
}

function overlapping(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function shortest(radians: number): number {
  let d = radians % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

describe("the unit card in the label pass", () => {
  /** One open card, as the renderer would have built it from the roster and the picture. */
  const CARD: CardContent = {
    id: "a",
    name: "Weather column",
    commander: "Nelson",
    facts: "ship · column · intact · 100%",
    tree: ["Van of the weather column · intact", "Rear of the weather column · engaged"],
  };

  it("gives the card's unit a box wider and taller than its label had", () => {
    const units = [unit({ id: "a" })];
    const plain = byId(place(units).placed, "a");
    const opened = byId(place(units, { card: CARD }).placed, "a");
    expect(opened.box.width).toBeGreaterThan(plain.box.width);
    expect(opened.box.height).toBeGreaterThan(plain.box.height);
    expect(opened.card?.content).toBe(CARD);
  });

  it("stands the card's near edge off the signs by the same clearance a label takes", () => {
    const only = unit({ id: "a" });
    const { placed } = place([only], { card: CARD });
    const glyph = glyphBox(only);
    expect(byId(placed, "a").box.x - (glyph.x + glyph.width)).toBeCloseTo(LABEL_GAP);
  });

  it("is placed first, so every other label of the frame goes round it", () => {
    const units = [
      unit({ id: "a" }),
      unit({ id: "b", rosterIndex: 1, anchor: { x: 470, y: 300 } }),
      unit({ id: "c", rosterIndex: 2, state: "engaged", anchor: { x: 430, y: 380 } }),
    ];
    const { placed } = place(units, { card: CARD });
    const card = byId(placed, "a");
    for (const label of placed) {
      if (label.unit.id === "a") continue;
      expect(overlapping(label.box, card.box)).toBe(false);
    }
  });

  it("never collapses, however crowded the plate is", () => {
    const units = Array.from({ length: 10 }, (_, index) =>
      unit({ id: index === 0 ? "a" : `u${index}`, rosterIndex: index, anchor: { x: 400 + index * 14, y: 300 + index * 9 } }),
    );
    const card = byId(place(units, { card: CARD }).placed, "a");
    expect(card.step).toBe(CARD_STEP);
    expect(card.card?.content.name).toBe("Weather column");
    expect(card.numeral).toBeUndefined();
  });

  it("keeps the slot it had while that is still free, so it does not jitter under a moving unit", () => {
    const units = [unit({ id: "a" })];
    const first = place(units, { card: CARD });
    const second = place(units, { card: CARD, memory: first.memory });
    expect(byId(second.placed, "a").box).toEqual(byId(first.placed, "a").box);
  });

  it("gives the unit its ordinary label back the moment the card closes", () => {
    const units = [unit({ id: "a" })];
    const opened = place(units, { card: CARD });
    const closed = place(units, { memory: opened.memory });
    const label = byId(closed.placed, "a");
    expect(label.card).toBeUndefined();
    expect(label.step).toBe(0);
    expect(label.name).toBe("Van");
  });

  it("draws over the least-bad slot rather than the first one when nothing is free", () => {
    // A plate barely bigger than the card leaves no slot inside it at all.
    const tight = { x: 0, y: 0, width: 260, height: 200 };
    const { placed } = place([unit({ id: "a", anchor: { x: 130, y: 100 } })], { card: CARD, plate: tight });
    const card = byId(placed, "a");
    expect(card.card).toBeDefined();
    // Least-bad is still on the plate as far as it can be: it never runs away from it.
    expect(card.box.x + card.box.width).toBeGreaterThan(tight.x);
    expect(card.box.x).toBeLessThan(tight.x + tight.width);
  });
});
