/**
 * The plate's **key**: what one row of it is, and a sample of the view's own
 * drawing laid across that row. Shared by the desktop legend, the phone's side
 * strip and the Details panel (#86), which is why it takes a place rather than
 * reading one off a plate — and why all three can never key the same thing
 * differently.
 *
 * A **shared half**: which rows there are is the anatomy's, and every mark in
 * them is the view's. The sample calls the view's own `glyph` and its own
 * `moves`, which is the whole reason Atlas's legend shows blocks and a staff
 * map's would show tapered arrows without this file knowing either exists
 * (ADR-0021, #139).
 */
import type { Arm, Unit, UnitState } from "../schema/types.ts";
import { MOVE_STYLES, STATES } from "./anatomy.ts";
import { legendArms } from "./glyphs/arms.ts";
import type { GlyphRequest, MoveStyle, View } from "./view.ts";

/**
 * One row of the key: a sample of the view's own drawing and the word it
 * teaches.
 */
export type KeyRow =
  | { kind: "side"; side: string; colour: string }
  | { kind: "state"; state: UnitState }
  | { kind: "arm"; arm: Arm }
  | { kind: "line"; line: MoveStyle };

/** A row per side, in roster order, in its own ink. */
export function sideRows(colours: ReadonlyMap<string, string>): KeyRow[] {
  return [...colours].map(([side, colour]) => ({ kind: "side", side, colour }));
}

/**
 * The rows that are not about a side: the four states, one per arm the roster
 * keys (ADR-0015), and the three line styles. These are exactly the rows a
 * phone moves off the plate and into the Details panel (#86).
 */
export function plateKeyRows(units: readonly Unit[]): KeyRow[] {
  return [
    ...STATES.map((state): KeyRow => ({ kind: "state", state })),
    ...legendArms(units).map((arm): KeyRow => ({ kind: "arm", arm })),
    ...MOVE_STYLES.map((line): KeyRow => ({ kind: "line", line })),
  ];
}

/** The word a row teaches. */
export function keyRowLabel(row: KeyRow): string {
  if (row.kind === "side") return row.side;
  if (row.kind === "state") return row.state;
  if (row.kind === "arm") return row.arm;
  return row.line;
}

/**
 * How a sample is sized: how wide it is drawn, how deep a row stands, and the
 * scale a glyph is given so it leaves off its finest detail. The **specimen's**
 * size rather than its drawing, which is why it is shared — the plate's legend,
 * the phone's strip and the Details panel all show the same specimen at the
 * same size, and only the hand that draws it changes. A view whose key wants a
 * different pitch cuts that then (ADR-0021); none does today.
 */
export const KEY_SAMPLE_WIDTH = 40;
/** How deep one row stands, sample and word together. */
export const KEY_ROW_HEIGHT = 18;
/** The scale a sample is drawn at, small enough that a glyph leaves off its finest detail. */
export const KEY_SAMPLE_SCALE = 0.75;

/** What a row's sample needs beyond the row itself: where it goes, and the two things a sample is not told by its kind. */
export interface KeySamplePlace {
  left: number;
  centreY: number;
  width: number;
  scale: number;
  /**
   * The arm the rows that are not about an arm are drawn in: the one most of
   * the battle is made of, so Cannae's states are not ship-ticks.
   */
  arm: Arm;
  /** The first side's ink, which the detachment line is drawn in. */
  firstSide: string;
}

/**
 * A sample of the view's own glyph or its own move, laid across a row. No wind
 * reaches a key, so nothing here drifts.
 */
export function drawKeyRowSample(ctx: CanvasRenderingContext2D, view: View, row: KeyRow, at: KeySamplePlace): void {
  const { palette, pens, glyph, moves } = view;
  if (row.kind === "line") {
    const colour = row.line === "detachment" ? at.firstSide : palette.ink;
    moves[row.line](ctx, { x: at.left, y: at.centreY }, { x: at.left + at.width, y: at.centreY }, { pen: pens[row.line], colour, palette });
    return;
  }

  const request: GlyphRequest = {
    length: at.width - 6,
    formation: "column",
    arm: row.kind === "arm" ? row.arm : at.arm,
    state: row.kind === "state" ? row.state : "intact",
    strength: row.kind === "state" && row.state === "broken" ? 0.4 : 1,
    colour: row.kind === "side" ? row.colour : palette.ink,
    seed: row.kind === "side" ? 1 : row.kind === "state" ? 3 : 5,
    scale: at.scale,
    windTo: undefined,
    palette,
  };
  ctx.save();
  ctx.translate(at.left + at.width / 2, at.centreY);
  ctx.rotate(Math.PI / 2);
  glyph.mark?.(ctx, request);
  glyph.body(ctx, request);
  ctx.restore();
}

/**
 * How many rows a full key stands: one per side, one per state, one per arm
 * the roster keys, and one per motion style, plus a row for every numeral a
 * label showed this frame (#39). Exported because the arm rows are the only
 * ones whose count is a decision (ADR-0015), and a decision is worth a test.
 */
export function keyRowCount(sides: number, arms: readonly Arm[], numerals = 0): number {
  return sides + STATES.length + arms.length + MOVE_STYLES.length + numerals;
}
