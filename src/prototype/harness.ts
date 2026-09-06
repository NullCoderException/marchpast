/**
 * PROTOTYPE (#39) — THROWAWAY. Never merge to main.
 *
 * The measuring half of the prototype. The eye judges whether a frame reads;
 * only a sweep can say whether the labels sit still while it plays, so this
 * walks the whole battle at playback speed, places every frame under each
 * algorithm and counts what happened.
 *
 * In the console:  await __sweep()  ·  __sweep({ fps: 60, stress: 12 })
 */
import { labelUnits } from "../render/drawUnits.ts";
import { glyphBox, placeLabels, residualOverlap, resetLabelMemory, VARIANTS, type Placed, type ShortMode, type Variant } from "../render/labels.ts";
import { font } from "../render/style.ts";
import type { Battle, MapFile } from "../schema/types.ts";
import { parseBattleTime } from "../schema/time.ts";
import { pictureAt } from "../timeline/pictureAt.ts";
import { record } from "./plateRecord.ts";
import { furniture, settings } from "./state.ts";

export interface SweepOptions {
  /** Frames a second the playback is judged at. */
  fps?: number;
  variants?: readonly Variant[];
  shortMode?: ShortMode;
  floor?: number;
}

export interface VariantReport {
  variant: Variant;
  frames: number;
  units: number;
  /** How many label-frames landed on each collapse step, 0 to 5. */
  steps: number[];
  worstStep: number;
  /** Frames where two labels still overlapped after the whole collapse order. */
  framesWithOverlap: number;
  meanOverlapPx2: number;
  /** Mean pixels a label's offset from its glyph moves between frames: the jitter. */
  meanDriftPx: number;
  /** Label-frames that moved more than 6px in one frame: a visible jump. */
  jumpsPerSecond: number;
  /** Collapse-step changes a second: a label losing or regaining its state word while you watch. */
  stepChangesPerSecond: number;
  /** Flank changes a second: the label crossing to the unit's other side. */
  flankFlipsPerSecond: number;
  leaderShare: number;
  /** Label-frames whose nearest glyph is not their own unit and which carry no leader: the eye cannot tell whose they are. */
  strandedShare: number;
  msPerFrame: number;
  /** The instant with the worst residual overlap, as `HH:MM`, for a screenshot. */
  worstFrameClock: string;
}

function measurer(ctx: CanvasRenderingContext2D) {
  return (text: string, size: number, italic: boolean): number => {
    ctx.save();
    ctx.font = font(size, italic);
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
  };
}

function clockText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function sweep(battle: Battle, options: SweepOptions = {}): VariantReport[] {
  const plate = record.plate;
  if (plate === undefined) throw new Error("Nothing has been rendered yet, so there is no projection to sweep with");

  const fps = options.fps ?? 60;
  const shortMode = options.shortMode ?? settings.shortMode;
  const floor = options.floor ?? settings.floor;
  const measure = measurer(plate.ctx);
  const first = battle.phases[0];
  if (first === undefined) throw new Error("The battle has no phases");
  const start = parseBattleTime(first.t) * 60;
  const finish = parseBattleTime(battle.end) * 60;

  return (options.variants ?? VARIANTS).map((variant) => {
    resetLabelMemory();
    const steps = new Array<number>(6).fill(0);
    let frames = 0;
    let labelFrames = 0;
    let framesWithOverlap = 0;
    let overlapTotal = 0;
    let driftTotal = 0;
    let driftSamples = 0;
    let jumps = 0;
    let stepChanges = 0;
    let flankFlips = 0;
    let leaders = 0;
    let stranded = 0;
    let worstOverlap = -1;
    let worstClock = start;
    const previous = new Map<string, Placed>();
    const began = performance.now();

    let clock = start;
    while (clock <= finish) {
      const picture = pictureAt(battle, clock);
      const placed = placeLabels({
        variant,
        units: labelUnits({ ...plate, picture }),
        plate: plate.projection.extentRect,
        measure,
        shortMode,
        floor,
        obstacles: settings.furniture ? furniture.boxes : [],
      });

      frames += 1;
      labelFrames += placed.length;
      const overlap = residualOverlap(placed, settings.furniture ? furniture.boxes : []);
      overlapTotal += overlap;
      if (overlap > 0) framesWithOverlap += 1;
      if (overlap > worstOverlap) {
        worstOverlap = overlap;
        worstClock = clock;
      }

      for (const label of placed) {
        steps[label.step] = (steps[label.step] ?? 0) + 1;
        if (label.leader) leaders += 1;
        else {
          // Whose label is it? If another unit's glyph is nearer than its own, only a leader can say.
          // From the point the label attaches at (its near edge), not its box centre:
          // a wide label's centre is far from its own unit however well it is placed.
          const centre = { x: label.x, y: label.y };
          const distance = (unit: { anchor: { x: number; y: number } }): number => Math.hypot(unit.anchor.x - centre.x, unit.anchor.y - centre.y);
          const mine = distance(label.unit);
          if (placed.some((other) => other.id !== label.id && distance(other.unit) < mine)) stranded += 1;
        }
        const before = previous.get(label.id);
        if (before !== undefined) {
          const drift = Math.hypot(label.offset.x - before.offset.x, label.offset.y - before.offset.y);
          driftTotal += drift;
          driftSamples += 1;
          if (drift > 6) jumps += 1;
          if (before.step !== label.step) stepChanges += 1;
          const angleBefore = Math.atan2(before.offset.x, -before.offset.y);
          const angleNow = Math.atan2(label.offset.x, -label.offset.y);
          let delta = Math.abs(angleNow - angleBefore) % (Math.PI * 2);
          if (delta > Math.PI) delta = Math.PI * 2 - delta;
          if (delta > Math.PI / 4) flankFlips += 1;
        }
        previous.set(label.id, label);
      }

      clock += picture.phase.playback_rate / fps;
    }

    const seconds = frames / fps;
    return {
      variant,
      frames,
      units: frames === 0 ? 0 : Math.round(labelFrames / frames),
      steps,
      worstStep: steps.reduce((worst, count, step) => (count > 0 ? step : worst), 0),
      framesWithOverlap,
      meanOverlapPx2: round(overlapTotal / Math.max(1, frames)),
      meanDriftPx: round(driftTotal / Math.max(1, driftSamples), 3),
      jumpsPerSecond: round(jumps / Math.max(1, seconds), 2),
      stepChangesPerSecond: round(stepChanges / Math.max(1, seconds), 2),
      flankFlipsPerSecond: round(flankFlips / Math.max(1, seconds), 2),
      leaderShare: round(leaders / Math.max(1, labelFrames), 3),
      strandedShare: round(stranded / Math.max(1, labelFrames), 3),
      msPerFrame: round((performance.now() - began) / Math.max(1, frames), 3),
      worstFrameClock: clockText(worstClock),
    };
  });
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** One frame, under one variant, told in full: where each label went and what it is still touching. */
export function probe(variant: Variant): unknown {
  const plate = record.plate;
  if (plate === undefined) throw new Error("nothing rendered yet");
  const obstacles = settings.furniture ? furniture.boxes : [];
  const units = labelUnits(plate);
  resetLabelMemory();
  let placed = placeLabels({ variant, units, plate: plate.projection.extentRect, measure: measurer(plate.ctx), shortMode: settings.shortMode, floor: settings.floor, obstacles });
  // The relaxed variant eases, so let it settle the way the loop would.
  for (let i = 0; i < 60; i++) {
    placed = placeLabels({ variant, units, plate: plate.projection.extentRect, measure: measurer(plate.ctx), shortMode: settings.shortMode, floor: settings.floor, obstacles });
  }
  const hit = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): number => {
    const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return x <= 0 || y <= 0 ? 0 : Math.round(x * y);
  };
  return placed.map((label) => ({
    id: label.id,
    step: label.step,
    leader: label.leader,
    offset: [Math.round(label.offset.x), Math.round(label.offset.y)],
    box: [Math.round(label.box.x), Math.round(label.box.y), Math.round(label.box.width), Math.round(label.box.height)],
    hitsLabels: placed.filter((other) => other.id !== label.id && hit(label.box, other.box) > 0).map((other) => `${other.id}:${hit(label.box, other.box)}`),
    hitsTicks: units.filter((unit) => unit.id !== label.id && hit(label.box, glyphBox(unit)) > 0).map((unit) => `${unit.id}:${hit(label.box, glyphBox(unit))}`),
    hitsSmoke: units.filter((unit) => unit.id !== label.id && hit(label.box, glyphBox(unit, true)) > 0).map((unit) => unit.id),
    hitsOwnTicks: hit(label.box, glyphBox(label.unit)),
    hitsFurniture: obstacles.map((box, index) => (hit(label.box, box) > 0 ? `${index}:${hit(label.box, box)}` : "")).filter(Boolean),
  }));
}

/** Hangs the sweep off `window` so it can be run from the console or over the DevTools protocol. */
export function installHarness(battle: Battle, _map: MapFile | undefined): void {
  const target = window as unknown as Record<string, unknown>;
  target.__battle = battle;
  target.__probe = (variant: Variant = settings.variant) => probe(variant);
  target.__sweep = (options: SweepOptions = {}) => {
    const reports = sweep(battle, options);
    resetLabelMemory();
    window.dispatchEvent(new Event("resize"));
    return reports;
  };
}
