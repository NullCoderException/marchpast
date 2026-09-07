/**
 * Where a glyph's signs go: the arithmetic every view's body pass shares
 * (ADR-0016). Eight sign slots laid out by the formation word, thinned by
 * strength, knocked out of rank when the unit is broken.
 *
 * A **sign** is the repeated shape a view draws one arm in; how many there are
 * and where they sit is the same for every arm and every view, so it lives
 * here rather than in `ticks.ts`. Pure: no context, no colour, no scale — the
 * caller has already rotated the plate so the unit heads up the negative y
 * axis, and hands in the glyph's length in pixels.
 */
import type { Formation, UnitState } from "../../schema/types.ts";
/**
 * Signs a unit glyph shows at full strength, whatever its arm. A constant of
 * the **engraved** glyphs rather than of the anatomy: it says how a tick glyph
 * fills its 72 pixels, and means nothing to a view that draws a unit as one
 * symbol rectangle (ADR-0016, ADR-0021). No data field carries a ship count.
 */
export const SIGNS_PER_GLYPH = 8;

/** One sign's place in the glyph, in pixels from its centre, heading up. */
export interface Slot {
  x: number;
  y: number;
}

/** A mass is four across and two deep (ADR-0016): half a line's frontage, twice its depth. */
export const MASS_FRONTAGE = 4;
export const MASS_RANKS = 2;

/**
 * How wide a glyph stands across its own front: the whole length for a column
 * or a line, half of it for a mass, which spends the other half on its second
 * rank. Both views measure a mass by this, so both agree on what one is.
 */
export function frontage(formation: Formation, length: number): number {
  return formation === "mass" ? (length * MASS_FRONTAGE) / SIGNS_PER_GLYPH : length;
}

/**
 * Every slot a formation offers, in the order strength fills them: for a mass,
 * the whole front rank before any of the rear, so what is left at half
 * strength is a rank of four and still a body.
 *
 * The pitch is the glyph's length shared among its eight signs, so a mass's
 * ranks stand the same distance apart as a line's signs do.
 */
export function signSlots(formation: Formation, length: number): Slot[] {
  const pitch = length / SIGNS_PER_GLYPH;
  if (formation === "mass") {
    return Array.from({ length: SIGNS_PER_GLYPH }, (_, index) => ({
      x: ((index % MASS_FRONTAGE) - (MASS_FRONTAGE - 1) / 2) * pitch,
      y: (Math.floor(index / MASS_FRONTAGE) - (MASS_RANKS - 1) / 2) * pitch,
    }));
  }
  // A column runs in file along the heading, a line abreast across it.
  const along = (index: number): number => (index - (SIGNS_PER_GLYPH - 1) / 2) * pitch;
  return Array.from({ length: SIGNS_PER_GLYPH }, (_, index) =>
    formation === "column" ? { x: 0, y: along(index) } : { x: along(index), y: 0 },
  );
}

/** Signs a glyph shows: `round(8 * strength)`, at least one unless the unit is destroyed. */
export function shownSigns(state: UnitState, strength: number): number {
  if (state === "destroyed") return 0;
  return Math.max(1, Math.round(SIGNS_PER_GLYPH * strength));
}

/**
 * Which slots carry a sign: a centred contiguous run when the unit holds
 * together, the front rank first for a mass, scattered with gaps when broken.
 */
export function occupiedSlots(formation: Formation, state: UnitState, shown: number, random: () => number): number[] {
  if (shown <= 0) return [];
  if (state === "broken") return scattered(shown, random);
  if (formation === "mass") return byRank(shown);
  const start = Math.floor((SIGNS_PER_GLYPH - shown) / 2);
  return Array.from({ length: shown }, (_, i) => start + i);
}

/** Where a glyph's signs actually go: the occupied slots' places, in slot order. */
export function signPositions(
  formation: Formation,
  state: UnitState,
  strength: number,
  length: number,
  random: () => number,
): Slot[] {
  const slots = signSlots(formation, length);
  return occupiedSlots(formation, state, shownSigns(state, strength), random).flatMap((index) => {
    const slot = slots[index];
    return slot === undefined ? [] : [slot];
  });
}

/** A mass empties from the rear: the front rank fills before any of the rear, each rank centred on the frontage. */
function byRank(shown: number): number[] {
  const front = Math.min(shown, MASS_FRONTAGE);
  return [...centredRank(front, 0), ...centredRank(shown - front, MASS_FRONTAGE)];
}

/** `count` signs centred in the rank beginning at slot `base`. */
function centredRank(count: number, base: number): number[] {
  const start = base + Math.floor((MASS_FRONTAGE - count) / 2);
  return Array.from({ length: count }, (_, i) => start + i);
}

/** Spread the survivors over the whole glyph, each nudged into a neighbouring slot, so the gaps read as gaps. */
function scattered(shown: number, random: () => number): number[] {
  const indices = new Set<number>();
  for (let i = 0; i < shown; i++) {
    const ideal = ((i + 0.5) * SIGNS_PER_GLYPH) / shown;
    const nudge = Math.floor(random() * 2) - 1;
    let index = Math.min(SIGNS_PER_GLYPH - 1, Math.max(0, Math.floor(ideal) + nudge));
    while (indices.has(index) && index < SIGNS_PER_GLYPH - 1) index++;
    indices.add(index);
  }
  return [...indices];
}
