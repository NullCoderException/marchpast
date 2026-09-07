/**
 * The ground buffer's promise, which #138 sized the whole ground build
 * against and #170 spends: **the ground is drawn once per view, battle, plate
 * rectangle and device pixel ratio, and blitted every frame after that.**
 *
 * It matters because the night plate's illuminated contours are one stroke per
 * segment — #138 costed the canvas's own relief at some 1 250 of them, and the
 * Cannae file as shipped runs to nearly 4 000 — where the chart plate strokes
 * one path per weight. Without the buffer that would run sixty times a second
 * for a picture that does not change between phases (ADR-0001).
 *
 * The buffer wants a second canvas, which no test environment here has, so the
 * one it asks `document` for is a fake that records what was drawn on it. That
 * is the whole of the stand-in: everything else is the real buffer.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Battle, MapFile } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";
import { sideColours, PLATE_MARGIN } from "./anatomy.ts";
import { createGroundBuffer } from "./groundBuffer.ts";
import type { Plate } from "./plate.ts";
import { fitProjection } from "./projection.ts";
import { contourLevels } from "./relief.ts";
import { VIEWS } from "./views.ts";

const DATA = import.meta.glob("../../data/{battles,maps}/*", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

const readJson = (dir: string, file: string): unknown => {
  const source = DATA[`../../data/${dir}/${file}`];
  if (source === undefined) throw new Error(`data/${dir}/${file} is not there`);
  return JSON.parse(source);
};

/** A context that swallows every call and counts the strokes, which is what one lit segment costs. */
function counter(): { ctx: CanvasRenderingContext2D; strokes: () => number } {
  let strokes = 0;
  const state: Record<string, unknown> = {};
  const own: Record<string, unknown> = { stroke: () => void strokes++, measureText: () => ({ width: 10 }) as TextMetrics };
  const ctx = new Proxy(own, {
    get: (target, key) => (key in target ? target[key as string] : (state[key as string] ?? ((): void => {}))),
    set: (_target, key, value) => {
      state[key as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, strokes: () => strokes };
}

/** The sheet the buffer asks `document` for: a canvas with one recording context on it. */
function fakeCanvas(): { canvas: HTMLCanvasElement; strokes: () => number } {
  const { ctx, strokes } = counter();
  const canvas = { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
  return { canvas, strokes };
}

/**
 * Cannae, read once: the buffer keys the ground it holds on the battle and the
 * map **by identity**, so a fixture that re-parsed the files would look like a
 * new battle every frame and hide the very thing being tested.
 */
const BATTLE = readJson("battles", "cannae.json") as Battle;
const MAP = readJson("maps", `${BATTLE.map}.geojson`) as MapFile;

/** Cannae's plate — the map with relief on it — in one view, at a size the player actually renders. */
function cannae(view: (typeof VIEWS)[number], width = 1280, height = 640): Plate {
  const battle = BATTLE;
  const map = MAP;
  const plateArea = { x: PLATE_MARGIN, y: PLATE_MARGIN, width: width - PLATE_MARGIN * 2, height: height - PLATE_MARGIN * 2 };
  const projection = fitProjection(battle.extent, plateArea);
  return {
    ctx: counter().ctx,
    view,
    mode: "desktop",
    battle,
    map,
    picture: { units: [] } as unknown as Picture,
    unitsDrawn: [],
    contourLevels: contourLevels(map),
    plateArea,
    projection,
    colours: sideColours(battle, view.palette),
    pixelsPerMetre: 1,
  };
}

const NIGHT = VIEWS.find(({ id }) => id === "night")!;
const PLATE = VIEWS.find(({ id }) => id === "plate")!;

afterEach(() => vi.unstubAllGlobals());

/** Stands a fake `document` up and hands back the sheets it was asked for, newest last. */
function withSheets(): () => { canvas: HTMLCanvasElement; strokes: () => number }[] {
  const sheets: { canvas: HTMLCanvasElement; strokes: () => number }[] = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const sheet = fakeCanvas();
      sheets.push(sheet);
      return sheet.canvas;
    },
  });
  return () => sheets;
}

describe("the ground buffer, on the heaviest ground there is", () => {
  /** What one `paint` cost the sheet, in strokes: nought where the frame blitted what was already there. */
  function painter(): (plate: Plate, width: number, dpr: number) => number {
    const sheets = withSheets();
    const buffer = createGroundBuffer();
    let seen = 0;
    return (plate, width, dpr) => {
      buffer.paint(plate, { width, plateHeight: 640 }, dpr);
      // One sheet for the life of the buffer: what a stale key redraws is the ground on it, never a new canvas.
      expect(sheets()).toHaveLength(1);
      const total = sheets()[0]?.strokes() ?? 0;
      const cost = total - seen;
      seen = total;
      return cost;
    };
  }

  it("draws the night plate's lit contours once across a run of frames, however many are played", () => {
    const paint = painter();
    const plate = cannae(NIGHT);

    // Cannae's relief is the case #138 costed: every lit segment is its own stroke.
    expect(paint(plate, 1280, 1)).toBeGreaterThan(1000);
    for (let frame = 0; frame < 60; frame++) expect(paint(plate, 1280, 1)).toBe(0);
  });

  it("costs the chart plate a small fraction of that, which is why the buffer was cut for the other two", () => {
    const paint = painter();
    // Every contour of one weight is one stroke on the plate, and one per segment on the night plate.
    expect(paint(cannae(PLATE), 1280, 1)).toBeLessThan(50);
  });

  it("draws it again when the view changes, because the ground is the view's", () => {
    const paint = painter();
    expect(paint(cannae(NIGHT), 1280, 1)).toBeGreaterThan(1000);
    expect(paint(cannae(PLATE), 1280, 1)).toBeGreaterThan(0);
    expect(paint(cannae(NIGHT), 1280, 1)).toBeGreaterThan(1000);
  });

  it("draws it again when the plate's rectangle or the device pixel ratio moves, and not otherwise", () => {
    const paint = painter();
    expect(paint(cannae(NIGHT, 1280), 1280, 1)).toBeGreaterThan(1000);
    expect(paint(cannae(NIGHT, 1280), 1280, 1)).toBe(0);
    expect(paint(cannae(NIGHT, 1100), 1100, 1)).toBeGreaterThan(1000);
    expect(paint(cannae(NIGHT, 1100), 1100, 2)).toBeGreaterThan(1000);
    expect(paint(cannae(NIGHT, 1100), 1100, 2)).toBe(0);
  });
});
