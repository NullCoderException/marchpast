/**
 * The claim ADR-0015 makes of every view: a sign for every arm, keyed so the
 * compiler and not a reviewer notices the view that forgot one. That they
 * exist, that each arm draws something of its own, and that a mass asks the
 * label for room, is checked here.
 *
 * **What these tests cannot check**, and it is the interesting half: whether a
 * shape survives the pen at the size it is drawn. #140 found that a candidate
 * aircraft sign which is plainly an aeroplane at nine times magnification
 * closes up into the ship's chevron at the legend's own 34px length and 0.75
 * scale — a rasterising effect, the pen's width against the shape's features.
 * The trace below records path coordinates, so it separates two shapes that
 * differ at every scale and would separate them at any scale; it would pass on
 * a sign that inked identically to the chevron. ADR-0016 puts a sign's exact
 * pixels in the build's hands and says they are judged **by eye against the
 * design canvas**, which is what `docs/screenshots/aircraft-sign/` records.
 * These tests hold the seam, not the drawing.
 */
import { describe, expect, it } from "vitest";
import { ARMS } from "../../schema/arms.ts";
import type { Arm } from "../../schema/types.ts";
import { drawKeyRowSample, KEY_ROW_HEIGHT, KEY_SAMPLE_SCALE, KEY_SAMPLE_WIDTH } from "../key.ts";
import type { Glyph, Sign, SignBox, View } from "../view.ts";
import { VIEWS } from "../views.ts";
import { block } from "./block.ts";
import { ticks } from "./ticks.ts";

/** A sign that draws nothing, for the tables these tests build themselves. */
const nothing: Sign = () => undefined;

const GLYPHS: ReadonlyArray<[string, Glyph]> = [
  ["the plate's ticks", ticks],
  ["Atlas's blocks", block],
];

/* ------------------------------------------------------------ a traced context */

/** The calls that put something on paper, as against the state a view sets before it does. */
const INKING = ["fill", "stroke", "fillRect", "strokeRect"];
/** Where it is put: the plate's eight slots are eight `translate`s, and a legend row is drawn rotated. */
const PLACING = ["translate", "rotate", "scale"];
/** The rest of a path, and the clip rectangles `paintSign` lays before drawing a sign twice. */
const PATHING = ["beginPath", "closePath", "moveTo", "lineTo", "arc", "rect", "roundRect", "setLineDash"];

/**
 * A context that records what was drawn and where, in order, as text. The
 * state a view sets — inks, weights, dashes — is held rather than recorded, so
 * a sign may read its own pen back, and so two signs differ by their marks and
 * not by the colour those came out in.
 */
function tracer(): { ctx: CanvasRenderingContext2D; marks: string[] } {
  const marks: string[] = [];
  const shown = (value: unknown): string => (typeof value === "number" ? value.toFixed(3) : String(value));
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      marks.push(`${name}(${args.map(shown).join(" ")})`);
    };
  // A pen wide enough to be scaled by a sign that draws one of its strokes
  // finer than the rest; every view sets its own before a sign is reached.
  const state: Record<string, unknown> = { lineWidth: 1, globalAlpha: 1 };
  const own: Record<string, unknown> = {};
  for (const name of [...INKING, ...PLACING, ...PATHING]) own[name] = record(name);
  const noop = (): void => {};
  const ctx = new Proxy(own, {
    get: (target, key) => (key in target ? target[key as string] : (state[key as string] ?? noop)),
    set: (_target, key, value) => {
      state[key as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, marks };
}

/** The marks one sign makes on its own, in a footprint big enough for any view's field. */
function signMarks(sign: Sign, half: SignBox = { x: 5, y: 7 }): string[] {
  const { ctx, marks } = tracer();
  sign(ctx, half, 1);
  return marks;
}

/** The marks a view's own hand makes drawing one arm's legend row, at the legend's own length and scale. */
function rowMarks(view: View, arm: Arm): string[] {
  const { ctx, marks } = tracer();
  drawKeyRowSample(
    ctx,
    view,
    { kind: "arm", arm },
    {
      left: 0,
      centreY: KEY_ROW_HEIGHT / 2,
      width: KEY_SAMPLE_WIDTH,
      scale: KEY_SAMPLE_SCALE,
      arm,
      firstSide: view.palette.ink,
    },
  );
  return marks;
}

/* ------------------------------------------------------------ the tables */

describe.each(GLYPHS)("%s", (_name, glyph) => {
  it("draws every arm there is, with no fallback sign", () => {
    for (const arm of ARMS) expect(typeof glyph.signs[arm]).toBe("function");
    expect(Object.keys(glyph.signs).sort()).toEqual([...ARMS].sort());
  });

  it("draws an aircraft with a sign of its own, and not the ship's", () => {
    // Both halves are needed: the stopgap this replaced was a distinct function
    // that delegated to the ship's, so identity alone never caught it.
    expect(glyph.signs.aircraft).not.toBe(glyph.signs.ship);
    expect(signMarks(glyph.signs.aircraft)).not.toEqual(signMarks(glyph.signs.ship));
  });

  it("asks the label for more room around a mass than around a line, so the rear rank is clear", () => {
    expect(glyph.halfWidth(1, "mass")).toBeGreaterThan(glyph.halfWidth(1, "line"));
    expect(glyph.halfWidth(1, "mass")).toBeGreaterThan(glyph.halfWidth(1, "column"));
  });

  it("scales its clearance with the sample, so the legend's rows are not spaced for the plate", () => {
    expect(glyph.halfWidth(0.5, "line")).toBeCloseTo(glyph.halfWidth(1, "line") / 2, 10);
  });
});

describe("Atlas's aircraft", () => {
  it("is stroked and never filled, because `paintSign` sets only `strokeStyle`", () => {
    // A filled Atlas sign would come out in whatever the last fill colour
    // happened to be, the two clipped passes setting no `fillStyle` of their
    // own (#140). That is a property of the shared pass, so the sign obeys it.
    expect(signMarks(block.signs.aircraft).filter((mark) => mark.startsWith("fill"))).toEqual([]);
  });

  it("lays its fuselage up the heading, whichever way the block runs", () => {
    // The field follows the block's long axis, so the aeroplane is broader in a
    // line than in a column; what may not move is which way it points.
    for (const half of [{ x: 36, y: 5 }, { x: 5, y: 36 }, { x: 18, y: 10 }]) {
      const fuselage = signMarks(block.signs.aircraft, half).slice(1, 3);
      expect(fuselage[0]).toMatch(/^moveTo\(0\.000 -/);
      expect(fuselage[1]).toMatch(/^lineTo\(0\.000 /);
    }
  });
});

describe.each(VIEWS.map((view): [string, View] => [view.id, view]))("%s's legend", (_id, view) => {
  it("draws an aircraft row with different geometry from a ship row", () => {
    expect(rowMarks(view, "aircraft")).not.toEqual(rowMarks(view, "ship"));
  });

  it("inks something for every arm it keys, so no row comes out blank", () => {
    // A clip rectangle is a `rect` and not a mark, so this counts only the
    // calls that put ink down.
    for (const arm of ARMS) {
      const inked = rowMarks(view, arm).filter((mark) => INKING.some((call) => mark.startsWith(`${call}(`)));
      expect(inked.length, `${view.id} keys ${arm} with nothing`).toBeGreaterThan(0);
    }
  });
});

describe("a sign table", () => {
  it("does not compile when an arm is missing", () => {
    // `cavalry` is not drawn, so this is not a sign table: adding an arm to
    // `arms.ts` breaks every view until each has drawn it. The compile error
    // the next line raises is the whole assertion (ADR-0015).
    // @ts-expect-error
    const incomplete: Record<Arm, Sign> = { infantry: nothing, ship: nothing };
    expect(Object.keys(incomplete)).toHaveLength(2);
  });
});
