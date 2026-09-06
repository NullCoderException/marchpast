/**
 * PROTOTYPE (#39) — THROWAWAY. Never merge to main.
 *
 * The label rule the design language decided (#58) placed by three different
 * algorithms, so the rule can be judged against real phase data rather than a
 * drawing. The rule itself is fixed: name 14px italic in the side ink over the
 * state word 12px upright in ink (with the percentage below full strength), on
 * the glyph's flank 30px clear of the ticks, never ahead of the unit, a 0.8px
 * leader to a dot at the glyph's centre when displaced, and the collapse order
 *   0 full · 1 displaced · 2 no percentage · 3 no state · 4 short name · 5 numeral.
 *
 * What the three variants disagree about is how a frame's labels are laid out
 * and, above all, what happens between one frame and the next:
 *
 *   A  Flank-first greedy — the rule read literally, no memory of the last frame.
 *   B  Scored slots with hysteresis — every label scores 50 candidate slots and
 *      pays to move or to collapse, so last frame's answer wins ties.
 *   C  Relaxed springs — labels are pushed apart continuously and slide, with
 *      the collapse step raised only when relaxation cannot clear the overlap.
 *   D  Sticky search — A's search with B's memory: last frame's slot is kept
 *      while it is still free, and a collapse step is only given back after the
 *      label has been clear for a while. Written after the first sweep showed
 *      that A never overlaps but jitters, and B holds still but tolerates
 *      overlap and drops words too readily.
 */
import type { Formation, UnitState } from "../schema/types.ts";
import type { Point } from "./primitives.ts";
import type { Rect } from "./projection.ts";
import { toRadians } from "./projection.ts";
import { TICK_HALF_WIDTH } from "./style.ts";

export const VARIANTS = ["A", "B", "C", "D"] as const;
export type Variant = (typeof VARIANTS)[number];

export const VARIANT_NAMES: Record<Variant, string> = {
  A: "Flank-first greedy (the rule, read literally)",
  B: "Scored slots with hysteresis",
  C: "Relaxed springs (continuous)",
  D: "Sticky search (A's search, B's memory)",
};

/** Clearance between the glyph's ticks and its label (#58). */
export const LABEL_GAP = 30;
const NAME_SIZE = 14;
const DETAIL_SIZE = 12;
const BOX_TOP = 19;
const BOX_BOTTOM_DETAIL = 17;
const BOX_BOTTOM_NAME_ONLY = 5;
/** Slack added around every box before two of them count as touching. */
const PAD = 3;
/** Half-angle of the forbidden sector ahead of the unit, where the track and the moves run. */
const FORWARD_SECTOR = toRadians(55);
/** Displacement rings tried beyond the base clearance. */
const RING_RADII = [0, 20, 44, 72, 104];
const RING_STEP = toRadians(15);

/** Which short-name rule is in force; the prototype switches it with `?short=`. */
export type ShortMode = "commander" | "derived";

/** One unit as the placer sees it: the glyph it must clear and the words it may show. */
export interface LabelUnit {
  id: string;
  /** The roster's `label`. */
  name: string;
  /** The roster's `commander`, when it has one. */
  commander?: string;
  state: UnitState;
  strength: number;
  colour: string;
  /** The glyph's centre in canvas pixels. */
  anchor: Point;
  heading: number;
  formation: Formation;
  /** The glyph's long axis in pixels. */
  length: number;
  hasMove: boolean;
  /** Degrees true the wind blows *toward*, so the smoke's side is known. Absent when the battle has no wind. */
  windTo?: number;
  rosterIndex: number;
}

/** Where one label landed, and how much of it survived. */
export interface Placed {
  id: string;
  unit: LabelUnit;
  /** 0 to 5 of the collapse order. */
  step: number;
  name: string;
  detail?: string;
  numeral?: number;
  x: number;
  y: number;
  align: "left" | "right";
  box: Rect;
  leader: boolean;
  /** The label's offset from its glyph: the number that must stay still between frames. */
  offset: Point;
}

export type Measure = (text: string, size: number, italic: boolean) => number;

export interface PlaceOptions {
  variant: Variant;
  units: LabelUnit[];
  /** The plate rectangle; no label may leave it. */
  plate: Rect;
  measure: Measure;
  shortMode: ShortMode;
  /** Collapse step every label starts at, as the phone rule starts at 4 (#58). Normally 0. */
  floor: number;
  /** Anything else on the plate a label must clear: the compass rose, the title, the legend, the scale bar, the credit. */
  obstacles: Rect[];
}

// ---------------------------------------------------------------- short names

/** The commander's last word: Nelson, Hasdrubal. Falls back to the derived rule when there is no commander. */
export function shortByCommander(name: string, commander: string | undefined): string {
  const surname = commander?.trim().split(/\s+/).at(-1);
  return surname === undefined || surname === "" ? shortByRule(name) : surname;
}

const STOP_WORDS = new Set(["and", "the", "of", "a"]);

/** First and last significant word of the label, parentheses dropped: "Roman and allied infantry" becomes "Roman infantry". */
export function shortByRule(name: string): string {
  const bare = name.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const words = bare.split(/\s+/).filter((word) => word !== "" && !STOP_WORDS.has(word.toLowerCase()));
  if (words.length <= 2) return words.join(" ");
  return `${words[0]} ${words.at(-1)}`;
}

export function shortNameOf(unit: LabelUnit, mode: ShortMode): string {
  return mode === "commander" ? shortByCommander(unit.name, unit.commander) : shortByRule(unit.name);
}

// ------------------------------------------------------------------ geometry

function glyphHalf(unit: LabelUnit): { x: number; y: number } {
  const along = unit.length / 2;
  const across = TICK_HALF_WIDTH + 2;
  return unit.formation === "column" ? { x: across, y: along } : { x: along, y: across };
}

/**
 * The glyph's axis-aligned box in canvas pixels. `includeSmoke` pads it by the
 * billow, which is right for someone else's glyph and wrong for the label's own:
 * its own smoke is already handled by `clearance`, which knows the lee side.
 */
export function glyphBox(unit: LabelUnit, includeSmoke = false): Rect {
  const half = glyphHalf(unit);
  const heading = toRadians(unit.heading);
  const cos = Math.abs(Math.cos(heading));
  const sin = Math.abs(Math.sin(heading));
  const halfWidth = half.x * cos + half.y * sin;
  const halfHeight = half.x * sin + half.y * cos;
  const smoke = !includeSmoke ? 0 : unit.state === "engaged" ? unit.length * 0.22 : unit.state === "broken" ? unit.length * 0.12 : 0;
  return {
    x: unit.anchor.x - halfWidth - smoke,
    y: unit.anchor.y - halfHeight - smoke,
    width: (halfWidth + smoke) * 2,
    height: (halfHeight + smoke) * 2,
  };
}

/** Signed shortest difference between two angles, in radians. */
function angleDelta(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** How much smoke lies in direction `angle`: the billow drifts to the lee flank under the wind (#58). */
function smokeReach(unit: LabelUnit, angle: number): number {
  if (unit.windTo === undefined) return 0;
  if (unit.state !== "engaged" && unit.state !== "broken") return 0;
  const off = Math.abs(angleDelta(angle, toRadians(unit.windTo)));
  if (off > toRadians(75)) return 0;
  const strength = unit.state === "engaged" ? 0.34 : 0.2;
  return unit.length * strength * (1 - off / toRadians(75));
}

/** Distance from the glyph's centre to the far side of its ticks (and smoke) in direction `angle`. */
export function clearance(unit: LabelUnit, angle: number): number {
  const local = angle - toRadians(unit.heading);
  const dx = Math.sin(local);
  const dy = -Math.cos(local);
  const half = glyphHalf(unit);
  const tx = Math.abs(dx) < 1e-6 ? Number.POSITIVE_INFINITY : half.x / Math.abs(dx);
  const ty = Math.abs(dy) < 1e-6 ? Number.POSITIVE_INFINITY : half.y / Math.abs(dy);
  return Math.min(tx, ty) + smokeReach(unit, angle);
}

/** The flanks the rule prefers: across the long axis, windward before leeward and then rightward. */
function preferredAngles(unit: LabelUnit): number[] {
  const heading = toRadians(unit.heading);
  const flanks =
    unit.formation === "column"
      ? [heading + Math.PI / 2, heading - Math.PI / 2]
      : [heading + Math.PI, heading + Math.PI / 2, heading - Math.PI / 2];
  return flanks.sort((a, b) => smokeReach(unit, a) - smokeReach(unit, b) || Math.sin(b) - Math.sin(a));
}

function isForward(unit: LabelUnit, angle: number): boolean {
  return Math.abs(angleDelta(angle, toRadians(unit.heading))) < FORWARD_SECTOR;
}

/** Every direction the ring offers, the preferred flanks first, the forbidden forward sector dropped. */
function ringAngles(unit: LabelUnit): number[] {
  const preferred = preferredAngles(unit);
  const rest: number[] = [];
  for (let i = 0; i < Math.PI * 2; i += RING_STEP) {
    if (isForward(unit, i)) continue;
    if (preferred.some((angle) => Math.abs(angleDelta(angle, i)) < RING_STEP / 2)) continue;
    rest.push(i);
  }
  // Nearest the preferred flank first, so a displaced label stays near where it belongs.
  const best = preferred[0] ?? 0;
  rest.sort((a, b) => Math.abs(angleDelta(a, best)) - Math.abs(angleDelta(b, best)));
  return [...preferred, ...rest];
}

// ------------------------------------------------------------------- content

interface Content {
  name: string;
  detail?: string;
  numeral?: number;
}

/** What survives at each step of the collapse order. */
export function contentAt(unit: LabelUnit, step: number, shortMode: ShortMode): Content {
  const percent = `${Math.round(unit.strength * 100)}%`;
  if (step <= 1) return { name: unit.name, detail: unit.strength < 1 ? `${unit.state} · ${percent}` : unit.state };
  if (step === 2) return { name: unit.name, detail: unit.state };
  if (step === 3) return { name: unit.name };
  if (step === 4) return { name: shortNameOf(unit, shortMode), detail: undefined };
  return { name: String(unit.rosterIndex + 1), numeral: unit.rosterIndex + 1 };
}

/** The clearance the step asks for: the numeral sits *beside* the glyph, not out on the flank. */
function gapFor(step: number): number {
  return step === 5 ? 12 : LABEL_GAP;
}

function boxOf(x: number, y: number, align: "left" | "right", width: number, hasDetail: boolean): Rect {
  const left = align === "left" ? x : x - width;
  const top = y - BOX_TOP;
  const height = BOX_TOP + (hasDetail ? BOX_BOTTOM_DETAIL : BOX_BOTTOM_NAME_ONLY);
  return { x: left, y: top, width, height };
}

interface Candidate {
  angle: number;
  /** Extra radius beyond the clearance and the gap. */
  extra: number;
}

/** Builds the placement a candidate produces, without judging it. */
function build(unit: LabelUnit, step: number, candidate: Candidate, measure: Measure, shortMode: ShortMode): Placed {
  const content = contentAt(unit, step, shortMode);
  const width = Math.max(
    measure(content.name, step === 5 ? NAME_SIZE : NAME_SIZE, true),
    content.detail === undefined ? 0 : measure(content.detail, DETAIL_SIZE, false),
  );
  const radius = clearance(unit, candidate.angle) + gapFor(step) + candidate.extra;
  const dx = Math.sin(candidate.angle) * radius;
  const dy = -Math.cos(candidate.angle) * radius;
  return placedFromOffset(unit, step, content, width, { x: dx, y: dy }, candidate.extra > 0);
}

function placedFromOffset(unit: LabelUnit, step: number, content: Content, width: number, offset: Point, displaced: boolean): Placed {
  const x = unit.anchor.x + offset.x;
  const y = unit.anchor.y + offset.y;
  const align: "left" | "right" = offset.x >= -0.5 ? "left" : "right";
  const placed: Placed = {
    id: unit.id,
    unit,
    step,
    name: content.name,
    x,
    y,
    align,
    box: boxOf(x, y, align, width, content.detail !== undefined),
    leader: displaced && step >= 1,
    offset,
  };
  if (content.detail !== undefined) placed.detail = content.detail;
  if (content.numeral !== undefined) placed.numeral = content.numeral;
  return placed;
}

// ------------------------------------------------------------------ overlaps

function overlapArea(a: Rect, b: Rect): number {
  const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) + PAD * 2;
  const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) + PAD * 2;
  return x <= 0 || y <= 0 ? 0 : x * y;
}

function inside(box: Rect, plate: Rect): boolean {
  return box.x >= plate.x + 6 && box.y >= plate.y + 6 && box.x + box.width <= plate.x + plate.width - 6 && box.y + box.height <= plate.y + plate.height - 6;
}

/** Priority when two labels fight: engaged units, then units with a move, then roster order (#58). */
function priorityOrder(units: LabelUnit[]): LabelUnit[] {
  return [...units].sort((a, b) => {
    const engaged = Number(b.state === "engaged") - Number(a.state === "engaged");
    if (engaged !== 0) return engaged;
    const move = Number(b.hasMove) - Number(a.hasMove);
    if (move !== 0) return move;
    return a.rosterIndex - b.rosterIndex;
  });
}

// -------------------------------------------------------------- the variants

/** A: the rule read literally. Each label takes the first free slot in the collapse order; nothing remembers the last frame. */
function placeGreedy({ units, plate, measure, shortMode, floor, obstacles }: PlaceOptions): Placed[] {
  const glyphs = units.map((unit) => ({ id: unit.id, box: glyphBox(unit) }));
  const taken: Rect[] = [];
  const out: Placed[] = [];

  for (const unit of priorityOrder(units)) {
    const others = glyphs.filter((glyph) => glyph.id !== unit.id).map((glyph) => glyph.box);
    // Its own ticks count too: "30px clear of the ticks" is measured from the label's
    // near edge, and a wide label anchored on the flank can still lie across them.
    const own = glyphBox(unit);
    const smoky = units.filter((other) => other.id !== unit.id).map((other) => glyphBox(other, true));
    const ring = ringAngles(unit);
    let chosen: Placed | undefined;

    for (const avoidSmoke of [true, false]) {
      for (let step = floor; step <= 5 && chosen === undefined; step++) {
        const angles = step === floor ? preferredAngles(unit) : ring;
        const radii = step === floor ? [0] : RING_RADII;
        for (const extra of radii) {
          for (const angle of angles) {
            const candidate = build(unit, step, { angle, extra }, measure, shortMode);
            if (!inside(candidate.box, plate)) continue;
            if (taken.some((box) => overlapArea(candidate.box, box) > 0)) continue;
            if (others.some((box) => overlapArea(candidate.box, box) > 0)) continue;
            if (obstacles.some((box) => overlapArea(candidate.box, box) > 0)) continue;
            if (overlapArea(candidate.box, own) > 0) continue;
            if (avoidSmoke && smoky.some((box) => overlapArea(candidate.box, box) > 0)) continue;
            chosen = candidate;
            break;
          }
          if (chosen !== undefined) break;
        }
      }
      if (chosen !== undefined) break;
    }

    chosen ??= build(unit, 5, { angle: preferredAngles(unit)[0] ?? 0, extra: 0 }, measure, shortMode);
    taken.push(chosen.box);
    out.push(chosen);
  }
  return out;
}

/** What B remembers about a label between frames. */
interface SlotMemory {
  angle: number;
  extra: number;
  step: number;
  /** Frames in a row the label has been clear at this step, which is what lets it climb back up the order. */
  clean: number;
}

const slotMemory = new Map<string, SlotMemory>();

/** Cost of moving a label a pixel from where it was last frame: what stops the jitter. */
const STICKINESS = 0.55;
/** Frames a label must stay clear before it is allowed to un-collapse one step. */
const RECOVER_FRAMES = 20;

/** B: every candidate slot is scored — overlap, how far from the flank, how far it moved since last frame — and the cheapest wins. */
function placeScored({ units, plate, measure, shortMode, floor, obstacles }: PlaceOptions): Placed[] {
  const glyphs = units.map((unit) => ({ id: unit.id, box: glyphBox(unit) }));
  const taken: Rect[] = [];
  const out: Placed[] = [];

  for (const unit of priorityOrder(units)) {
    const others = glyphs.filter((glyph) => glyph.id !== unit.id).map((glyph) => glyph.box);
    const own = glyphBox(unit);
    const smoky = units.filter((other) => other.id !== unit.id).map((other) => glyphBox(other, true));
    const ring = ringAngles(unit);
    const preferred = preferredAngles(unit)[0] ?? 0;
    const previous = slotMemory.get(unit.id);
    const startStep = Math.max(floor, previous === undefined ? 0 : previous.clean >= RECOVER_FRAMES ? previous.step - 1 : previous.step);

    let best: { placed: Placed; overlap: number; score: number } | undefined;

    for (let step = startStep; step <= 5; step++) {
      let bestAtStep: { placed: Placed; overlap: number; score: number } | undefined;
      for (const extra of RING_RADII) {
        for (const angle of ring) {
          const placed = build(unit, step, { angle, extra }, measure, shortMode);
          if (!inside(placed.box, plate)) continue;
          let overlap = 0;
          for (const box of taken) overlap += overlapArea(placed.box, box);
          for (const box of others) overlap += overlapArea(placed.box, box);
          for (const box of obstacles) overlap += overlapArea(placed.box, box);
          overlap += overlapArea(placed.box, own);

          let smoke = 0;
          for (const box of smoky) smoke += overlapArea(placed.box, box);
          let score = overlap / 30 + smoke / 120;
          score += Math.abs(angleDelta(angle, preferred)) * 6;
          score += extra * 0.25;
          score += step * 14;
          if (previous !== undefined) {
            const previousAngleDistance = Math.abs(angleDelta(angle, previous.angle));
            score += previousAngleDistance * 8 * STICKINESS + Math.abs(extra - previous.extra) * 0.4 * STICKINESS;
          }
          if (bestAtStep === undefined || score < bestAtStep.score) bestAtStep = { placed, overlap, score };
        }
      }
      if (bestAtStep === undefined) continue;
      if (best === undefined || bestAtStep.score < best.score) best = bestAtStep;
      if (bestAtStep.overlap === 0) {
        best = bestAtStep;
        break;
      }
    }

    const chosen = best?.placed ?? build(unit, 5, { angle: preferred, extra: 0 }, measure, shortMode);
    const overlap = best?.overlap ?? 0;
    const angle = Math.atan2(chosen.offset.x, -chosen.offset.y);
    const extra = Math.hypot(chosen.offset.x, chosen.offset.y) - clearance(unit, angle) - gapFor(chosen.step);
    slotMemory.set(unit.id, {
      angle,
      extra: Math.max(0, extra),
      step: chosen.step,
      clean: overlap === 0 ? (previous?.clean ?? 0) + 1 : 0,
    });
    taken.push(chosen.box);
    out.push(chosen);
  }
  return out;
}

/** What C remembers: where the label actually is, so it can be eased rather than jumped. */
interface SpringMemory {
  offset: Point;
  step: number;
  /** Frames in a row with an overlap it could not relax away. */
  dirty: number;
  clean: number;
}

const springMemory = new Map<string, SpringMemory>();

const RELAX_ITERATIONS = 50;
/** How far the label moves toward the relaxed answer each frame: the whole reason C slides instead of jumping. */
const EASING = 0.25;
const SPRING = 0.05;
const DIRTY_FRAMES = 8;
const CLEAN_FRAMES = 24;

/** C: labels repel each other and the glyphs, spring back toward their flank, and slide toward the answer over several frames. */
function placeRelaxed({ units, plate, measure, shortMode, floor, obstacles }: PlaceOptions): Placed[] {
  const ordered = priorityOrder(units);
  const glyphs = new Map(units.map((unit) => [unit.id, glyphBox(unit)]));

  interface Working {
    unit: LabelUnit;
    memory: SpringMemory;
    base: Point;
    content: Content;
    width: number;
    offset: Point;
    box: Rect;
  }

  const working: Working[] = ordered.map((unit) => {
    const angle = preferredAngles(unit)[0] ?? 0;
    const step = Math.max(floor, springMemory.get(unit.id)?.step ?? floor);
    const radius = clearance(unit, angle) + gapFor(step);
    const base: Point = { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius };
    const memory = springMemory.get(unit.id) ?? { offset: { ...base }, step: floor, dirty: 0, clean: 0 };
    const content = contentAt(unit, memory.step, shortMode);
    const width = Math.max(
      measure(content.name, NAME_SIZE, true),
      content.detail === undefined ? 0 : measure(content.detail, DETAIL_SIZE, false),
    );
    const offset = { ...memory.offset };
    const align: "left" | "right" = offset.x >= -0.5 ? "left" : "right";
    return {
      unit,
      memory,
      base,
      content,
      width,
      offset,
      box: boxOf(unit.anchor.x + offset.x, unit.anchor.y + offset.y, align, width, content.detail !== undefined),
    };
  });

  const refresh = (item: Working): void => {
    const align: "left" | "right" = item.offset.x >= -0.5 ? "left" : "right";
    item.box = boxOf(
      item.unit.anchor.x + item.offset.x,
      item.unit.anchor.y + item.offset.y,
      align,
      item.width,
      item.content.detail !== undefined,
    );
  };

  for (let iteration = 0; iteration < RELAX_ITERATIONS; iteration++) {
    for (const item of working) {
      let pushX = 0;
      let pushY = 0;

      // Push out of the other labels, cheapest way out first.
      for (const other of working) {
        if (other.unit.id === item.unit.id) continue;
        const push = separation(item.box, other.box);
        pushX += push.x * 0.5;
        pushY += push.y * 0.5;
      }
      // Push out of every glyph, and more gently out of the smoke around it.
      for (const [id, box] of glyphs) {
        if (id === item.unit.id) continue;
        const push = separation(item.box, box);
        pushX += push.x;
        pushY += push.y;
      }
      for (const other of working) {
        if (other.unit.id === item.unit.id) continue;
        const push = separation(item.box, glyphBox(other.unit, true));
        pushX += push.x * 0.35;
        pushY += push.y * 0.35;
      }
      // Off its own ticks.
      const ownPush = separation(item.box, glyphBox(item.unit));
      pushX += ownPush.x;
      pushY += ownPush.y;
      // And out of the furniture.
      for (const box of obstacles) {
        const push = separation(item.box, box);
        pushX += push.x;
        pushY += push.y;
      }

      // Spring back toward the flank the rule wants.
      pushX += (item.base.x - item.offset.x) * SPRING;
      pushY += (item.base.y - item.offset.y) * SPRING;

      item.offset = { x: item.offset.x + pushX * 0.35, y: item.offset.y + pushY * 0.35 };
      constrain(item.unit, item.offset, item.memory.step);
      refresh(item);
    }
  }

  const out: Placed[] = [];
  for (const item of working) {
    // Ease from where the label was to where relaxation put it, so it slides.
    const eased: Point = {
      x: item.memory.offset.x + (item.offset.x - item.memory.offset.x) * EASING,
      y: item.memory.offset.y + (item.offset.y - item.memory.offset.y) * EASING,
    };
    constrain(item.unit, eased, item.memory.step);
    item.offset = eased;
    refresh(item);

    // Keep it on the plate.
    const nudge = intoPlate(item.box, plate);
    if (nudge.x !== 0 || nudge.y !== 0) {
      item.offset = { x: item.offset.x + nudge.x, y: item.offset.y + nudge.y };
      refresh(item);
    }

    let residual = 0;
    for (const other of working) if (other.unit.id !== item.unit.id) residual += overlapArea(item.box, other.box);
    for (const [id, box] of glyphs) if (id !== item.unit.id) residual += overlapArea(item.box, box);
    for (const box of obstacles) residual += overlapArea(item.box, box);
    residual += overlapArea(item.box, glyphBox(item.unit));

    const memory: SpringMemory = {
      offset: { ...item.offset },
      step: item.memory.step,
      dirty: residual > 0 ? item.memory.dirty + 1 : 0,
      clean: residual > 0 ? 0 : item.memory.clean + 1,
    };
    if (memory.dirty > DIRTY_FRAMES && memory.step < 5) {
      memory.step += 1;
      memory.dirty = 0;
    } else if (memory.clean > CLEAN_FRAMES && memory.step > floor) {
      memory.step -= 1;
      memory.clean = 0;
    }
    springMemory.set(item.unit.id, memory);

    const displaced = Math.hypot(item.offset.x - item.base.x, item.offset.y - item.base.y) > 10;
    out.push(placedFromOffset(item.unit, item.memory.step, item.content, item.width, item.offset, displaced));
  }
  return out;
}

/** The shortest push that separates `box` from `other`, or zero when they are already clear. */
function separation(box: Rect, other: Rect): Point {
  const area = overlapArea(box, other);
  if (area <= 0) return { x: 0, y: 0 };
  const dx = box.x + box.width / 2 - (other.x + other.width / 2);
  const dy = box.y + box.height / 2 - (other.y + other.height / 2);
  const overlapX = box.width / 2 + other.width / 2 + PAD * 2 - Math.abs(dx);
  const overlapY = box.height / 2 + other.height / 2 + PAD * 2 - Math.abs(dy);
  if (overlapX < overlapY) return { x: Math.sign(dx || 1) * overlapX, y: 0 };
  return { x: 0, y: Math.sign(dy || 1) * overlapY };
}

/** Keeps an offset off the ticks, out of the forward sector, and within reach. */
function constrain(unit: LabelUnit, offset: Point, step: number): void {
  let angle = Math.atan2(offset.x, -offset.y);
  if (isForward(unit, angle)) {
    const heading = toRadians(unit.heading);
    const side = angleDelta(angle, heading) >= 0 ? 1 : -1;
    angle = heading + side * FORWARD_SECTOR;
  }
  const minimum = clearance(unit, angle) + gapFor(step) * 0.8;
  const maximum = clearance(unit, angle) + gapFor(step) + 110;
  const radius = Math.min(maximum, Math.max(minimum, Math.hypot(offset.x, offset.y)));
  offset.x = Math.sin(angle) * radius;
  offset.y = -Math.cos(angle) * radius;
}

function intoPlate(box: Rect, plate: Rect): Point {
  const nudge = { x: 0, y: 0 };
  if (box.x < plate.x + 6) nudge.x = plate.x + 6 - box.x;
  if (box.x + box.width > plate.x + plate.width - 6) nudge.x = plate.x + plate.width - 6 - (box.x + box.width);
  if (box.y < plate.y + 6) nudge.y = plate.y + 6 - box.y;
  if (box.y + box.height > plate.y + plate.height - 6) nudge.y = plate.y + plate.height - 6 - (box.y + box.height);
  return nudge;
}

// --------------------------------------------------------------- the entry point

/** What D remembers: the exact slot, so a frame that is still legal changes nothing at all. */
interface StickyMemory {
  angle: number;
  extra: number;
  step: number;
  /** Frames in a row the label has been clear where it stands. */
  clean: number;
}

const stickyMemory = new Map<string, StickyMemory>();

/** Frames a label must have been clear before it may climb back up the collapse order. */
const STICKY_RECOVER = 30;

/**
 * D: last frame's answer is tried first and kept whenever it is still free, so a
 * label that need not move does not move; only when its slot has actually been
 * taken does it search, and then from the nearest angle outward.
 */
function placeSticky({ units, plate, measure, shortMode, floor, obstacles }: PlaceOptions): Placed[] {
  const taken: Rect[] = [];
  const out: Placed[] = [];

  for (const unit of priorityOrder(units)) {
    const others = units.filter((other) => other.id !== unit.id).map((other) => glyphBox(other));
    const smoky = units.filter((other) => other.id !== unit.id).map((other) => glyphBox(other, true));
    const own = glyphBox(unit);
    const previous = stickyMemory.get(unit.id);

    const free = (candidate: Placed, avoidSmoke: boolean): boolean => {
      if (!inside(candidate.box, plate)) return false;
      if (taken.some((box) => overlapArea(candidate.box, box) > 0)) return false;
      if (others.some((box) => overlapArea(candidate.box, box) > 0)) return false;
      if (obstacles.some((box) => overlapArea(candidate.box, box) > 0)) return false;
      if (overlapArea(candidate.box, own) > 0) return false;
      if (avoidSmoke && smoky.some((box) => overlapArea(candidate.box, box) > 0)) return false;
      return true;
    };

    let chosen: Placed | undefined;
    let stayed = false;

    // 1. Stay exactly where it was, if that is still legal.
    if (previous !== undefined) {
      const step = previous.clean >= STICKY_RECOVER ? Math.max(floor, previous.step - 1) : previous.step;
      for (const candidateStep of step === previous.step ? [previous.step] : [step, previous.step]) {
        const candidate = build(unit, candidateStep, { angle: previous.angle, extra: previous.extra }, measure, shortMode);
        if (free(candidate, true)) {
          chosen = candidate;
          stayed = true;
          break;
        }
      }
    }

    // 2. Otherwise search as A does, but from the angle it already had.
    if (chosen === undefined) {
      const ring = ringAngles(unit);
      if (previous !== undefined) {
        ring.sort((a, b) => Math.abs(angleDelta(a, previous.angle)) - Math.abs(angleDelta(b, previous.angle)));
      }
      const start = Math.max(floor, previous?.step ?? floor);
      for (const avoidSmoke of [true, false]) {
        for (let step = start; step <= 5 && chosen === undefined; step++) {
          const angles = step === start && previous === undefined ? preferredAngles(unit) : ring;
          for (const extra of RING_RADII) {
            for (const angle of angles) {
              const candidate = build(unit, step, { angle, extra }, measure, shortMode);
              if (!free(candidate, avoidSmoke)) continue;
              chosen = candidate;
              break;
            }
            if (chosen !== undefined) break;
          }
        }
        if (chosen !== undefined) break;
      }
    }

    chosen ??= build(unit, 5, { angle: preferredAngles(unit)[0] ?? 0, extra: 0 }, measure, shortMode);
    const angle = Math.atan2(chosen.offset.x, -chosen.offset.y);
    stickyMemory.set(unit.id, {
      angle,
      extra: Math.max(0, Math.hypot(chosen.offset.x, chosen.offset.y) - clearance(unit, angle) - gapFor(chosen.step)),
      step: chosen.step,
      clean: stayed ? (previous?.clean ?? 0) + 1 : 0,
    });
    taken.push(chosen.box);
    out.push(chosen);
  }
  return out;
}

/** Places every label for one frame under the chosen algorithm. Returns them in roster order. */
export function placeLabels(options: PlaceOptions): Placed[] {
  const placed =
    options.variant === "A"
      ? placeGreedy(options)
      : options.variant === "B"
        ? placeScored(options)
        : options.variant === "C"
          ? placeRelaxed(options)
          : placeSticky(options);
  return placed.sort((a, b) => a.unit.rosterIndex - b.unit.rosterIndex);
}

/** Forgets what the stateful variants remember: called when the variant, the battle or the roster changes. */
export function resetLabelMemory(): void {
  slotMemory.clear();
  springMemory.clear();
  stickyMemory.clear();
}

/** Residual overlap between the labels of one frame, in square pixels: what none of the collapse steps could clear. */
export function residualOverlap(placed: Placed[], obstacles: Rect[] = []): number {
  let total = 0;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a === undefined || b === undefined) continue;
      total += overlapArea(a.box, b.box);
    }
  }
  for (const label of placed) for (const box of obstacles) total += overlapArea(label.box, box);
  return total;
}
