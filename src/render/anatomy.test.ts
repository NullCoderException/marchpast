/**
 * **The anatomy conformance test** (ADR-0021): what every view keeps, checked
 * over `VIEWS` so a view added to that table runs through all of it for free.
 *
 * It asserts **anchors, containment and order — never pixels**. A view that
 * moves its type moves every box measured from it, and that is the aesthetic
 * doing its job; what may not move is which corner a piece of furniture sits
 * in, that the caption band runs the whole width below the plate with the clock
 * at its left, that a label sits on its glyph's flank and never ahead of it,
 * that a glyph's long axis is `GLYPH_PX`, that the key samples its own view's
 * glyph and its own view's moves, and that the three motion styles are all
 * there and tellable apart.
 *
 * The precedent is `Glyph.signs: Record<Arm, Sign>`, which makes a new arm fail
 * to compile until every view has drawn it. Types alone cannot do this job,
 * because no type says the scale bar landed in the bottom left.
 *
 * The lee-flank geometry at the foot is the other half of the anatomy that is
 * checkable rather than drawn: which flank a mark drifts to, and therefore
 * which flank a label does not take.
 */
import { describe, expect, it } from "vitest";
import type { Battle, MapFile, Unit, UnitState } from "../schema/types.ts";
import type { Picture, UnitPicture } from "../timeline/picture.ts";
import { GLYPH_PX, leeDrift, MOVE_STYLES, sideColours, STATES, TYPE_ROLES } from "./anatomy.ts";
import { drawUnits, layoutUnits } from "./drawUnits.ts";
import { drawKeyRowSample } from "./key.ts";
import { glyphBox, isForward, overlaps } from "./labels/geometry.ts";
import { type LabelUnit, type Measure, NO_LABEL_MEMORY, placeLabels } from "./labels/index.ts";
import type { LayoutMode } from "./layout.ts";
import { unitsDrawn } from "./level.ts";
import type { Plate } from "./plate.ts";
import { fitProjection, type Rect } from "./projection.ts";
import type { FurniturePlace, LegendPlace, Pen, View } from "./view.ts";
import { VIEWS } from "./views.ts";

/* ------------------------------------------------------------ a fixture */

/** A context that measures every glyph at half its point size and records what was drawn. */
function recorder(): { ctx: CanvasRenderingContext2D; fills: Rect[]; texts: { text: string; x: number; y: number }[] } {
  const fills: Rect[] = [];
  const texts: { text: string; x: number; y: number }[] = [];
  const state: Record<string, string> = { font: "12px serif", letterSpacing: "0px" };
  const noop = (): void => {};
  const own: Record<string, unknown> = {
    measureText: (text: string) => {
      const size = Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(state.font ?? "")?.[1] ?? "12");
      return { width: text.length * size * 0.5 } as TextMetrics;
    },
    fillRect: (x: number, y: number, width: number, height: number) => fills.push({ x, y, width, height }),
    fillText: (text: string, x: number, y: number) => texts.push({ text, x, y }),
  };
  const ctx = new Proxy(own, {
    get: (target, key) => (key in target ? target[key as string] : (state[key as string] ?? noop)),
    set: (_target, key, value) => {
      state[key as string] = String(value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, fills, texts };
}

const EXTENT = { north: 36.6, south: 36.0, east: -6.0, west: -6.8 };

const ROSTER: Unit[] = [
  { id: "weather", side: "British", label: "Weather column", short_label: "Weather", arm: "ship" },
  { id: "lee", side: "British", label: "Lee column", short_label: "Lee", arm: "ship" },
  { id: "combined", side: "Combined Fleet", label: "Combined Fleet", short_label: "Combined", arm: "ship" },
];

function snapshot(id: string, lat: number, lon: number, over: Partial<UnitPicture> = {}): UnitPicture {
  return { id, position: { lat, lon }, heading: 90, formation: "column", state: "intact", strength: 1, moves: [], ...over };
}

const PICTURE = {
  phase: { day: 0 },
  clock: 12 * 3600,
  label: "Dawn: the fleets sight each other",
  caption: "At daylight, Cape Trafalgar bearing east by south about seven leagues.",
  references: [],
  units: [
    snapshot("weather", 36.32, -6.5),
    snapshot("lee", 36.24, -6.44, { state: "engaged", strength: 0.7 }),
    snapshot("combined", 36.28, -6.24, { moves: [{ kind: "intent", to: { lat: 36.2, lon: -6.3 } }] }),
  ],
  wind: { from: 292.5, force: "light" },
} as unknown as Picture;

const BATTLE = {
  title: "The Battle of Trafalgar",
  dates: ["21 October 1805"],
  sources: {},
  extent: EXTENT,
  scale_unit: "nmi",
  units: ROSTER,
} as unknown as Battle;

const MAP = { attribution: "Natural Earth", features: [] } as unknown as MapFile;

const CANVAS = { width: 1120, height: 720 };

/** One plate, in one view, at one mode: the same fixture for every view, which is the point. */
function plateFor(view: View, mode: LayoutMode = "desktop", ctx = recorder().ctx): Plate {
  const width = mode === "phone" ? 390 : CANVAS.width;
  const plateArea = { x: 20, y: 20, width: width - 40, height: CANVAS.height - 140 };
  const projection = fitProjection(EXTENT, plateArea);
  return {
    ctx,
    view,
    mode,
    battle: BATTLE,
    map: MAP,
    picture: PICTURE,
    unitsDrawn: unitsDrawn(ROSTER, PICTURE.units, 0),
    contourLevels: [],
    plateArea,
    projection,
    colours: sideColours(BATTLE, view.palette),
    pixelsPerMetre: plateArea.width / 71000,
  };
}

function placeOf(plate: Plate): FurniturePlace {
  return { plate, frame: plate.mode === "phone" ? plate.plateArea : plate.projection.extentRect };
}

function legendOf(place: FurniturePlace): LegendPlace {
  return { key: [], bar: place.plate.view.furniture.scaleBar.layout(place), onPanel: false };
}

/** Which corner of `frame` a box's middle falls in. */
function corner(box: Rect, frame: Rect): { side: "left" | "right"; end: "top" | "bottom" } {
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  return {
    side: middle.x < frame.x + frame.width / 2 ? "left" : "right",
    end: middle.y < frame.y + frame.height / 2 ? "top" : "bottom",
  };
}

/** The angle from a unit's glyph to a point, in radians clockwise from north — the convention `geometry.ts` uses. */
function angleTo(unit: LabelUnit, point: { x: number; y: number }): number {
  return Math.atan2(point.x - unit.anchor.x, -(point.y - unit.anchor.y));
}

const named = VIEWS.map((view): [string, View] => [view.name, view]);

/* ------------------------------------------------------- the conformance */

describe.each(named)("%s keeps the anatomy", (_name, view) => {
  it("anchors the compass top left and the title top right", () => {
    const place = placeOf(plateFor(view));
    const compass = view.furniture.compass.panel(place);
    const title = view.furniture.title.panel(place);
    expect(compass).toBeDefined();
    expect(title).toBeDefined();
    expect(corner(compass as Rect, place.frame)).toEqual({ side: "left", end: "top" });
    expect(corner(title as Rect, place.frame)).toEqual({ side: "right", end: "top" });
  });

  it("anchors the scale bar bottom left and the credit bottom right", () => {
    const place = placeOf(plateFor(view));
    const bar = view.furniture.scaleBar.panel(place, legendOf(place));
    const credit = view.furniture.credit.panel(place);
    expect(credit).toBeDefined();
    expect(corner(bar, place.frame)).toEqual({ side: "left", end: "bottom" });
    expect(corner(credit as Rect, place.frame)).toEqual({ side: "right", end: "bottom" });
  });

  it("keeps the key in the bottom of the plate, whichever form the width leaves it", () => {
    // A desktop's legend stands on the scale bar's own corner panel and lays
    // none of its own, so what is checked there is the corner it draws in; a
    // phone's strip is a panel in its own right.
    const phone = placeOf(plateFor(view, "phone"));
    const strip = view.furniture.legend.panel(phone, legendOf(phone));
    expect(strip).toBeDefined();
    expect(corner(strip as Rect, phone.frame).end).toBe("bottom");

    const desktop = placeOf(plateFor(view));
    expect(view.furniture.legend.panel(desktop, legendOf(desktop))).toBeUndefined();
  });

  it("stands every piece of furniture inside the frame", () => {
    const place = placeOf(plateFor(view));
    const legend = legendOf(place);
    const boxes = [
      view.furniture.compass.panel(place),
      view.furniture.title.panel(place),
      view.furniture.scaleBar.panel(place, legend),
      view.furniture.credit.panel(place),
    ];
    for (const box of boxes) {
      if (box === undefined) continue;
      expect(box.x).toBeGreaterThanOrEqual(place.frame.x);
      expect(box.y).toBeGreaterThanOrEqual(place.frame.y);
      expect(box.x + box.width).toBeLessThanOrEqual(place.frame.x + place.frame.width);
      expect(box.y + box.height).toBeLessThanOrEqual(place.frame.y + place.frame.height);
    }
  });

  it("runs the caption band the whole width below the plate, with the clock at its left", () => {
    const { ctx, fills, texts } = recorder();
    const band = view.furniture.caption.measure({
      ctx,
      battle: BATTLE,
      picture: PICTURE,
      width: CANVAS.width,
      mode: "desktop",
      palette: view.palette,
      type: view.type,
    });
    const top = CANVAS.height - band.height;
    band.draw(top);

    expect(band.height).toBeGreaterThan(0);
    // Full width, below the plate: the band's own ground is the whole of it.
    const ground = fills.find((fill) => fill.width === CANVAS.width && fill.height === band.height);
    expect(ground).toEqual({ x: 0, y: top, width: CANVAS.width, height: band.height });

    const clock = texts.find((drawn) => drawn.text === "12:00");
    expect(clock).toBeDefined();
    expect(clock?.x).toBeLessThan(CANVAS.width / 2);
    // Everything else the band says is set to the right of the clock's column.
    const rest = texts.filter((drawn) => drawn.text !== "12:00");
    expect(rest.length).toBeGreaterThan(0);
    for (const drawn of rest) expect(drawn.y).toBeGreaterThanOrEqual(top);
  });

  it("draws every glyph at the anatomy's own long axis", () => {
    for (const { request, label } of layoutUnits(plateFor(view))) {
      expect(request.length).toBe(GLYPH_PX);
      expect(label.length).toBe(GLYPH_PX);
    }
  });

  it("puts every label on its glyph's flank and never ahead of it", () => {
    const plate = plateFor(view);
    const units = layoutUnits(plate).map(({ label }) => label);
    const measure: Measure = (text, size) => text.length * size * 0.5;
    const { placed } = placeLabels({
      units,
      plate: plate.projection.extentRect,
      obstacles: [],
      measure,
      memory: NO_LABEL_MEMORY,
      mode: "desktop",
    });
    expect(placed).toHaveLength(units.length);
    for (const label of placed) {
      // The bearing the words hang on is never in the sector ahead of the
      // unit, where its track and its moves run; and the words never lie over
      // the glyph itself.
      expect(isForward(label.unit, angleTo(label.unit, label.at))).toBe(false);
      expect(overlaps(label.box, glyphBox(label.unit))).toBe(false);
    }
  });

  it("keys its own glyph and its own moves, and never a shared drawing", () => {
    // The stand-ins record and draw nothing: what is being tested is that the
    // key reaches for *these* hands, not what they put on the paper.
    const drawn: string[] = [];
    const spied: View = {
      ...view,
      glyph: { ...view.glyph, mark: () => drawn.push("mark"), body: () => drawn.push("glyph") },
      moves: {
        track: () => drawn.push("track"),
        intent: () => drawn.push("intent"),
        detachment: () => drawn.push("detachment"),
      },
    };
    const { ctx } = recorder();
    const place = placeOf(plateFor(spied, "desktop", ctx));
    spied.furniture.legend.draw(place, legendOf(place));

    expect(drawn).toContain("glyph");
    for (const style of MOVE_STYLES) expect(drawn).toContain(style);
  });

  it("keys a sample of its own glyph for a side row and its own move for a line row", () => {
    const drawn: string[] = [];
    const spied: View = {
      ...view,
      glyph: { ...view.glyph, body: () => drawn.push("glyph") },
      moves: { ...view.moves, intent: () => drawn.push("intent") },
    };
    const { ctx } = recorder();
    const at = { left: 0, centreY: 9, width: 40, scale: 0.75, arm: "ship" as const, firstSide: "#900" };
    drawKeyRowSample(ctx, spied, { kind: "side", side: "British", colour: "#900" }, at);
    drawKeyRowSample(ctx, spied, { kind: "line", line: "intent" }, at);
    expect(drawn).toEqual(["glyph", "intent"]);
  });

  it("lays every engaged mark down before any body, or lays none and clears nothing", () => {
    // The units pass runs `mark` for every unit and then `body` for every unit,
    // because one unit's smoke must never cover the next unit's ships. A view
    // whose engaged mark is drawn inside the glyph's own footprint has no mark
    // half at all: its first loop runs empty, and it clears no ground for one
    // (ADR-0021, #139).
    const drawn: string[] = [];
    const spied: View = {
      ...view,
      glyph: {
        ...view.glyph,
        mark: view.glyph.mark === undefined ? undefined : () => drawn.push("mark"),
        body: () => drawn.push("body"),
      },
    };
    const plate = plateFor(spied);
    drawUnits(plate, layoutUnits(plate));
    expect(drawn.filter((half) => half === "body")).toHaveLength(plate.unitsDrawn.length);

    if (view.glyph.mark !== undefined) {
      expect(drawn.lastIndexOf("mark")).toBeLessThan(drawn.indexOf("body"));
      return;
    }
    expect(drawn).not.toContain("mark");
    for (const state of STATES) expect(view.glyph.markReach(1, state)).toBe(0);
  });

  it("carries all three motion styles, tellable apart by a pen or by a hand", () => {
    expect(MOVE_STYLES).toHaveLength(3);
    for (const style of MOVE_STYLES) {
      expect(typeof view.moves[style]).toBe("function");
      expect(view.pens[style].width).toBeGreaterThan(0);
    }
    for (const [a, b] of [
      ["track", "intent"],
      ["intent", "detachment"],
      ["track", "detachment"],
    ] as const) {
      const differentHand = view.moves[a] !== view.moves[b];
      expect(differentHand || !samePen(view.pens[a], view.pens[b])).toBe(true);
    }
  });

  it("ranks its eight type roles by size, coarsest first", () => {
    // The rank is the desktop's. A phone thins the band and the furniture
    // (`layout.ts`) and leaves the glyph and its label at plate constants
    // (ADR-0016), so its label outgrows its caption by design.
    const sizes = TYPE_ROLES.map((role) => view.type.role(role, "desktop").size);
    for (const size of sizes) expect(size).toBeGreaterThan(0);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
  });
});

/** Two pens that would draw the same line: a view whose three were all this would be one style, not three. */
function samePen(a: Pen, b: Pen): boolean {
  return a.width === b.width && a.head === b.head && a.headSize === b.headSize && a.dash.join() === b.dash.join();
}

/* -------------------------------------------------------- the lee flank */

/** Heading is up the negative y axis, so `-y` is ahead, `+y` astern, `+x` to starboard. */
const AHEAD = 0;
const STARBOARD = Math.PI / 2;
const ASTERN = Math.PI;
const PORT = (3 * Math.PI) / 2;

describe("leeDrift", () => {
  it("always answers a unit vector, so the mark's reach is the glyph's to set", () => {
    for (const windTo of [undefined, AHEAD, STARBOARD, ASTERN, PORT, 1, 2.5, 4]) {
      for (const formation of ["column", "line"] as const) {
        const drift = leeDrift(windTo, formation);
        expect(Math.hypot(drift.x, drift.y)).toBeCloseTo(1, 10);
      }
    }
  });

  it("takes a beam wind straight off the lee flank", () => {
    const starboard = leeDrift(STARBOARD, "column");
    expect(starboard.x).toBeCloseTo(1, 10);
    expect(starboard.y).toBeCloseTo(0, 10);
    expect(leeDrift(PORT, "column").x).toBeCloseTo(-1, 10);
  });

  it("keeps the mark off the hull when the wind is dead ahead or astern", () => {
    // A column running dead downwind would smoke over its own ticks: the
    // across-hull component is never below about a half, the along-hull damped.
    for (const windTo of [AHEAD, ASTERN]) {
      const drift = leeDrift(windTo, "column");
      expect(Math.abs(drift.x)).toBeGreaterThan(0.5);
      expect(Math.abs(drift.x)).toBeGreaterThan(Math.abs(drift.y));
    }
  });

  it("clears to the flank the wind is already leaning towards", () => {
    // A hair off dead ahead sends the mark to that side, never across the hull.
    expect(leeDrift(0.1, "column").x).toBeGreaterThan(0);
    expect(leeDrift(-0.1, "column").x).toBeLessThan(0);
  });

  it("measures a line's flanks fore and aft, since its long axis runs across the heading", () => {
    // A wind on the beam of a line-abreast unit blows along its length, which is
    // the case the clamp has to lift off the hull.
    const drift = leeDrift(STARBOARD, "line");
    expect(Math.abs(drift.y)).toBeGreaterThan(0.5);
    expect(Math.abs(drift.y)).toBeGreaterThan(Math.abs(drift.x));
  });

  it("puts a becalmed mark on the flank the label does not use", () => {
    // The label sits beside a column and astern of a line, so the mark takes
    // the other flank rather than sitting under the words.
    expect(leeDrift(undefined, "column")).toEqual({ x: -1, y: 0 });
    expect(leeDrift(undefined, "line")).toEqual({ x: 0, y: -1 });
  });
});

/** Kept honest: the states a glyph answers a reach for are the four the anatomy names. */
describe.each(named)("%s reports a mark reach for every state", (_name, view) => {
  it("answers a number for each, and none at all for a unit that is not fighting", () => {
    for (const state of ["intact", "engaged", "broken", "destroyed"] as UnitState[]) {
      expect(Number.isFinite(view.glyph.markReach(1, state))).toBe(true);
      expect(view.glyph.markReach(1, state)).toBeGreaterThanOrEqual(0);
    }
    expect(view.glyph.markReach(1, "intact")).toBe(0);
    expect(view.glyph.markReach(1, "destroyed")).toBe(0);
  });
});

