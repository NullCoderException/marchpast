/**
 * The placer: where every label of one frame goes (#39, algorithm **D**).
 *
 * Labels that stay with their units in a melee are mostly a question about
 * *frames*, not about one picture: a placement that is merely correct jitters,
 * because the answer changes every time two units drift past each other. So
 * the search is **sticky** — last frame's slot is tried first and kept while
 * it is still free, and a collapse step is given back only after the label has
 * been clear for thirty frames.
 *
 * Order per frame: engaged units first, then units with a move, then roster
 * order. Each label in turn takes the first free slot it finds, walking the
 * collapse order and exhausting the displacement ring at each step before
 * dropping a word — twice at each step, refusing to cross anyone's smoke and
 * then allowing it, which is the whole of what "soft" means here: smoke buys
 * a displacement and never a word.
 *
 * Pure: the memory goes in and a new memory comes out, so the renderer can run
 * the placer twice in one frame (the legend's numeral key changes the legend's
 * size, which changes the obstacles) without the frame counting twice.
 */
import type { Align, Measure } from "./content.ts";
import { contentAt, contentWidth, labelBox, LAST_STEP, nearEdgeSetback } from "./content.ts";
import {
  clearance,
  distanceToRect,
  glyphBox,
  insidePlate,
  LABEL_GAP,
  type LabelUnit,
  nearestPointOnRect,
  overlaps,
  preferredAngles,
  RING_RADII,
  ringAngles,
  smokeBox,
} from "./geometry.ts";
import type { Point } from "../primitives.ts";
import type { Rect } from "../projection.ts";

/** Frames a label must have held its slot before it may climb back up the collapse order. */
export const RECOVER_FRAMES = 30;

/**
 * The collapse order in runs of steps that say the same words: 0 and 1 are the
 * full label, in place and displaced. The search refuses another unit's smoke
 * over a whole run before it allows it, which is exactly what "smoke costs a
 * displacement but never a word" means (#39) — a label will ride the ring out
 * to 104px to stay clear of a billow, and cross it rather than lose its state
 * word.
 */
const WORD_RUNS: readonly (readonly number[])[] = [[0, 1], [2], [3], [LAST_STEP]];

/** The one piece of frame-to-frame state the renderer holds: where a label stood and for how long. */
export interface Slot {
  /** Radians clockwise from north. */
  angle: number;
  /** Displacement beyond the clearance, from the ring. */
  extra: number;
  /** Which step of the collapse order the label is on. */
  step: number;
  /** Consecutive frames the label has held exactly this slot. */
  clean: number;
}

/** Per-unit slots, keyed by roster id. Cleared when the battle changes. */
export type LabelMemory = ReadonlyMap<string, Slot>;

/** The memory a battle opens with. */
export const NO_LABEL_MEMORY: LabelMemory = new Map();

/** One label, placed. */
export interface Placed {
  unit: LabelUnit;
  /** 0 to `LAST_STEP` of the collapse order. */
  step: number;
  name: string;
  detail?: string;
  numeral?: number;
  /** The point the words hang from: the name's baseline sits above it, the state word below. */
  at: Point;
  align: Align;
  box: Rect;
  /** Where a leader leaves the label for its glyph's centre, when the label's own glyph is not the nearest one. */
  leader?: Point;
}

export interface PlaceOptions {
  /** The units this level draws, in roster order. */
  units: readonly LabelUnit[];
  /** The plate rectangle; no label may leave it. */
  plate: Rect;
  /** The furniture, and anything else hard that is not a glyph. */
  obstacles: readonly Rect[];
  measure: Measure;
  memory: LabelMemory;
}

export interface Placement {
  /** In roster order, whatever order they were placed in. */
  placed: Placed[];
  memory: LabelMemory;
}

/** One row of the legend's numeral key. */
export interface NumeralRow {
  numeral: number;
  /** The unit's full label, which is what the numeral stands in for. */
  label: string;
}

export function placeLabels({ units, plate, obstacles, measure, memory }: PlaceOptions): Placement {
  const boxes = new Map(units.map((unit) => [unit.id, glyphBox(unit)]));
  const smoke = new Map(units.map((unit) => [unit.id, smokeBox(unit)]));
  const taken: Rect[] = [];
  const placed: Placed[] = [];
  const next = new Map(memory);

  for (const unit of byPriority(units)) {
    const own = boxes.get(unit.id) ?? glyphBox(unit);
    const others = units.filter((other) => other.id !== unit.id);
    const hard = others.flatMap((other) => boxes.get(other.id) ?? []);
    const soft = others.flatMap((other) => smoke.get(other.id) ?? []);
    const previous = memory.get(unit.id);

    const free = (box: Rect, avoidSmoke: boolean): boolean => {
      if (!insidePlate(box, plate)) return false;
      if (overlaps(box, own)) return false;
      if (hard.some((other) => overlaps(box, other))) return false;
      if (taken.some((other) => overlaps(box, other))) return false;
      if (obstacles.some((other) => overlaps(box, other))) return false;
      return !(avoidSmoke && soft.some((other) => overlaps(box, other)));
    };

    const chosen = choose(unit, previous, measure, free);
    const label = build(unit, chosen, measure) ?? fallback(unit, measure);
    const clean = previous !== undefined && sameSlot(previous, chosen) ? previous.clean + 1 : 0;

    next.set(unit.id, { ...chosen, clean });
    taken.push(label.box);
    placed.push(label);
  }

  // The leader is ambiguity, not displacement: it is drawn when the label's
  // own glyph is not the nearest one, which is the reading the prototype's
  // 16-unit frame forced (#39).
  for (const label of placed) {
    const at = nearestPointOnRect(label.box, label.unit.anchor);
    if (needsLeader(at, label.unit, units)) label.leader = at;
  }

  placed.sort((a, b) => a.unit.rosterIndex - b.unit.rosterIndex);
  return { placed, memory: next };
}

/**
 * Where a label stands this frame, in the three parts #39 decided, in order:
 * **recover** a step it has earned back, else **stay** where it was while that
 * is still free, else **search** from the step it was on.
 */
function choose(unit: LabelUnit, previous: Slot | undefined, measure: Measure, free: (box: Rect, avoidSmoke: boolean) => boolean): Omit<Slot, "clean"> {
  const flanks = preferredAngles(unit);
  const ring = ringAngles(unit, previous?.angle);

  /** The first free slot between two steps of the collapse order, or nothing. */
  const search = (from: number, to: number): Omit<Slot, "clean"> | undefined => {
    for (const run of WORD_RUNS) {
      const steps = run.filter((step) => step >= from && step <= to && contentAt(unit, step) !== undefined);
      if (steps.length === 0) continue;
      for (const avoidSmoke of [true, false]) {
        for (const step of steps) {
          // Step 0 *is* the flank, undisplaced; every step above it may take
          // the whole ring, exhausted before the run gives up a word.
          const angles = step === 0 ? flanks : ring;
          const radii = step === 0 ? [0] : RING_RADII;
          for (const extra of radii) {
            for (const angle of angles) {
              const candidate = build(unit, { angle, extra, step }, measure);
              if (candidate !== undefined && free(candidate.box, avoidSmoke)) return { angle, extra, step };
            }
          }
        }
      }
    }
    return undefined;
  };

  if (previous !== undefined) {
    // 1. Recover: a step is given back only after the label has held its slot
    //    for thirty frames, and one step at a time — the clean count resets
    //    with the slot, so the next costs another thirty.
    if (previous.clean >= RECOVER_FRAMES && previous.step > 0) {
      const better = search(previous.step - 1, previous.step - 1);
      if (better !== undefined) return better;
    }

    // 2. Stay. A label that need not move does not move, so nothing shifts
    //    under a viewer while the units around it drift.
    const held = build(unit, previous, measure);
    if (held !== undefined && free(held.box, true)) return { angle: previous.angle, extra: previous.extra, step: previous.step };
  }

  // 3. Search, from the step it was on.
  // Nothing free anywhere leaves the numeral on the flank, overlapping and all.
  return search(previous?.step ?? 0, LAST_STEP) ?? { angle: flanks[0] ?? 0, extra: 0, step: LAST_STEP };
}

/** The label a slot produces, or nothing when this unit skips that step of the collapse order. */
function build(unit: LabelUnit, slot: Omit<Slot, "clean">, measure: Measure): Placed | undefined {
  const content = contentAt(unit, slot.step);
  if (content === undefined) return undefined;
  const width = contentWidth(content, measure);
  const hasDetail = content.detail !== undefined;
  const align: Align = Math.sin(slot.angle) >= -1e-9 ? "left" : "right";
  const radius = clearance(unit, slot.angle) + LABEL_GAP + slot.extra + nearEdgeSetback(align, width, hasDetail, slot.angle);
  const at = { x: unit.anchor.x + Math.sin(slot.angle) * radius, y: unit.anchor.y - Math.cos(slot.angle) * radius };

  const label: Placed = { unit, step: slot.step, name: content.name, at, align, box: labelBox(at, align, width, hasDetail) };
  if (content.detail !== undefined) label.detail = content.detail;
  if (content.numeral !== undefined) label.numeral = content.numeral;
  return label;
}

/** The last step is never skipped, so this always answers; it exists only to keep the caller total. */
function fallback(unit: LabelUnit, measure: Measure): Placed {
  const angle = preferredAngles(unit)[0] ?? 0;
  const label = build(unit, { angle, extra: 0, step: LAST_STEP }, measure);
  if (label === undefined) throw new Error(`no label could be built for ${unit.id}`);
  return label;
}

function sameSlot(previous: Slot, slot: Omit<Slot, "clean">): boolean {
  return previous.angle === slot.angle && previous.extra === slot.extra && previous.step === slot.step;
}

/** Engaged units first, then units with a move, then roster order (#58). */
function byPriority(units: readonly LabelUnit[]): LabelUnit[] {
  return [...units].sort((a, b) => {
    const engaged = Number(b.state === "engaged") - Number(a.state === "engaged");
    if (engaged !== 0) return engaged;
    const move = Number(b.hasMove) - Number(a.hasMove);
    if (move !== 0) return move;
    return a.rosterIndex - b.rosterIndex;
  });
}

/** Whether a label hanging at `at` needs a leader: true when some other unit's glyph is nearer than its own. */
export function needsLeader(at: Point, unit: LabelUnit, units: readonly LabelUnit[]): boolean {
  const own = distanceToRect(at, glyphBox(unit));
  return units.some((other) => other.id !== unit.id && distanceToRect(at, glyphBox(other)) < own);
}

/** The legend's numeral key: a row per unit showing a numeral this frame, in numeral order. Empty when none is. */
export function numeralKey(placed: readonly Placed[]): NumeralRow[] {
  return placed
    .flatMap((label) => (label.numeral === undefined ? [] : [{ numeral: label.numeral, label: label.unit.name }]))
    .sort((a, b) => a.numeral - b.numeral);
}
