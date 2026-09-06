/**
 * The claim ADR-0015 makes of every view: a sign for every arm, keyed so the
 * compiler and not a reviewer notices the view that forgot one. What the signs
 * look like is checked by eye against the design canvas; that they exist, and
 * that a mass asks the label for room, is checked here.
 */
import { describe, expect, it } from "vitest";
import { ARMS } from "../../schema/arms.ts";
import type { Arm } from "../../schema/types.ts";
import type { Glyph, Sign } from "../view.ts";
import { block } from "./block.ts";
import { ticks } from "./ticks.ts";

/** A sign that draws nothing, for the tables these tests build themselves. */
const nothing: Sign = () => undefined;

const GLYPHS: ReadonlyArray<[string, Glyph]> = [
  ["the plate's ticks", ticks],
  ["Atlas's blocks", block],
];

describe.each(GLYPHS)("%s", (_name, glyph) => {
  it("draws every arm there is, with no fallback sign", () => {
    for (const arm of ARMS) expect(typeof glyph.signs[arm]).toBe("function");
    expect(Object.keys(glyph.signs).sort()).toEqual([...ARMS].sort());
  });

  it("asks the label for more room around a mass than around a line, so the rear rank is clear", () => {
    expect(glyph.halfWidth(1, "mass")).toBeGreaterThan(glyph.halfWidth(1, "line"));
    expect(glyph.halfWidth(1, "mass")).toBeGreaterThan(glyph.halfWidth(1, "column"));
  });

  it("scales its clearance with the sample, so the legend's rows are not spaced for the plate", () => {
    expect(glyph.halfWidth(0.5, "line")).toBeCloseTo(glyph.halfWidth(1, "line") / 2, 10);
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
