/**
 * What the map pass reports so the names can be placed (#107): every named
 * point measured in its own face, in the map file's own order.
 *
 * The ink is judged by eye (ADR-0009). What is worth testing is the promise
 * the placer makes and this pass draws: on every map this repository ships, in
 * every view, no name is written over another name, over another point's mark,
 * or over the furniture. That is the acceptance of #107, and it is checked
 * against the real files rather than a fixture because the case that forced
 * the ticket — Nelson's Island and its battery, four pixels apart at the
 * Nile's extent — lives in one of them.
 */
import { describe, expect, it } from "vitest";
import { furnitureBoxes } from "./drawFurniture.ts";
import { mapPoints } from "./drawMap.ts";
import { touches } from "./labels/geometry.ts";
import { type MapPoint, placeMapLabels } from "./labels/index.ts";
import type { Plate } from "./plate.ts";
import { fitProjection } from "./projection.ts";
import { contourLevels } from "./relief.ts";
import { PLATE_MARGIN, sideColours } from "./style.ts";
import { VIEWS } from "./views.ts";
import type { Battle, MapFile } from "../schema/types.ts";
import type { Picture } from "../timeline/picture.ts";

/**
 * A context that measures every glyph at half its point size and swallows
 * every drawing call. A stand-in for a real face, not a model of one — the
 * promise being tested holds for any measure, and these widths are the same
 * order as the plate's own.
 */
function fakeContext(): CanvasRenderingContext2D {
  const state: Record<string, string> = { font: "15px serif", letterSpacing: "0px" };
  const noop = (): void => {};
  return new Proxy(
    {
      measureText: (text: string) => {
        const size = Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(state.font ?? "")?.[1] ?? "12");
        const tracking = Number.parseFloat(state.letterSpacing ?? "0");
        return { width: text.length * (size * 0.5 + tracking) } as TextMetrics;
      },
    } as Record<string, unknown>,
    {
      get: (target, key) => (key in target ? target[key as string] : (state[key as string] ?? noop)),
      set: (_target, key, value) => {
        state[key as string] = String(value);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

/**
 * The shipped files themselves, pulled in by the bundler rather than by
 * `node:fs`: `src/` is typechecked without node types, and this is a render
 * test, not a script.
 */
const DATA = import.meta.glob("../../data/{battles,maps}/*", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;

const readJson = (dir: string, file: string): unknown => {
  const source = DATA[`../../data/${dir}/${file}`];
  if (source === undefined) throw new Error(`data/${dir}/${file} is not there`);
  return JSON.parse(source);
};

/** The plate one shipped battle draws on, at a size in the range the player actually renders. */
function shippedPlate(battleFile: string, view: (typeof VIEWS)[number]): Plate {
  const battle = readJson("battles", battleFile) as Battle;
  const map = readJson("maps", `${battle.map}.geojson`) as MapFile;
  const plateArea = {
    x: PLATE_MARGIN,
    y: PLATE_MARGIN,
    width: 1280 - PLATE_MARGIN * 2,
    height: 640 - PLATE_MARGIN * 2,
  };
  const projection = fitProjection(battle.extent, plateArea);
  const picture = { units: [], wind: battle.phases[0]?.wind } as unknown as Picture;
  return {
    ctx: fakeContext(),
    view,
    mode: "desktop",
    battle,
    map,
    picture,
    unitsDrawn: [],
    contourLevels: contourLevels(map),
    plateArea,
    projection,
    colours: sideColours(battle, view.palette),
    pixelsPerMetre: 1 / projection.metresPerPixel((battle.extent.north + battle.extent.south) / 2),
  };
}

/** A fixture map, so the reporting itself is tested against something that cannot move under it. */
const FIXTURE: MapFile = {
  version: 2,
  name: "Two points",
  license: "public-domain",
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [30.1052, 31.3583] }, properties: { kind: "place", name: "Aboukir Island" } },
    { type: "Feature", geometry: { type: "LineString", coordinates: [[30.1, 31.3], [30.2, 31.4]] }, properties: { kind: "river" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [30.1072, 31.3587] }, properties: { kind: "work", name: "Island battery" } },
  ],
} as unknown as MapFile;

describe("mapPoints", () => {
  const plate = (): Plate => ({ ...shippedPlate("nile.json", VIEWS[0]!), map: FIXTURE });

  it("reports the named points in the map file's own order, across both kinds", () => {
    expect(mapPoints(plate()).map(({ kind, text }) => [kind, text])).toEqual([
      ["place", "Aboukir Island"],
      ["work", "ISLAND BATTERY"],
    ]);
  });

  it("gives each point the mark it is drawn with, centred on it, so no name is written over one", () => {
    const [island, battery] = mapPoints(plate());
    for (const point of [island, battery] as MapPoint[]) {
      expect(point.footprint.x + point.footprint.width / 2).toBeCloseTo(point.at.x);
      expect(point.footprint.y + point.footprint.height / 2).toBeCloseTo(point.at.y);
    }
    // A work's plan sign reaches a good deal further than a place's dot.
    expect(battery?.footprint.width).toBeGreaterThan(island?.footprint.width ?? 0);
  });

  it("measures each name in the face it is set in, so the work's tracking is in its width", () => {
    const [, battery] = mapPoints(plate());
    // 14 capitals at 11px, half a point size each, plus the face's tracking.
    expect(battery?.width).toBeCloseTo("ISLAND BATTERY".length * (11 * 0.5 + 0.5));
  });

  it("reports nothing at all for a battle with no map", () => {
    expect(mapPoints({ ...plate(), map: undefined })).toEqual([]);
  });
});

const SHIPPED = ["cannae.json", "copenhagen.json", "nile.json", "trafalgar.json"];
const CASES = SHIPPED.flatMap((battle) => VIEWS.map((view) => [`${battle} on ${view.id}`, battle, view] as const));

describe("every name on every shipped map", () => {
  it.each(CASES)("%s: stands clear of every other name, every mark and the furniture", (_name, battleFile, view) => {
    const plate = shippedPlate(battleFile, view);
    const points = mapPoints(plate);
    const frame = plate.projection.extentRect;
    const furniture = furnitureBoxes(plate, []);
    const names = placeMapLabels({ points, plate: frame, obstacles: furniture });

    // A name is dropped only where its own mark is buried with it: the legend
    // stands over Hannibal's camp on the Cannae plate, so the sign is out of
    // sight already and the word goes with it. Everywhere else on the maps as
    // they ship there is room, which is what makes the drop a last resort
    // rather than the ordinary case.
    const visible = points.filter(({ footprint }) => !furniture.some((box) => touches(footprint, box)));
    expect(names.map(({ point }) => point.text)).toEqual(visible.map(({ text }) => text));

    for (const [i, label] of names.entries()) {
      expect(touches(label.box, frame)).toBe(true);
      expect(label.box.x).toBeGreaterThanOrEqual(frame.x);
      expect(label.box.y).toBeGreaterThanOrEqual(frame.y);
      expect(label.box.x + label.box.width).toBeLessThanOrEqual(frame.x + frame.width);
      expect(label.box.y + label.box.height).toBeLessThanOrEqual(frame.y + frame.height);
      const name = label.point.text;
      for (const other of names.slice(i + 1)) expect([name, other.point.text, touches(label.box, other.box)]).toEqual([name, other.point.text, false]);
      for (const point of points) expect([name, point.text, touches(label.box, point.footprint)]).toEqual([name, point.text, false]);
      for (const box of furniture) expect([name, touches(label.box, box)]).toEqual([name, false]);
    }
  });

  /** The case #107 was raised for: two points 380 m apart, four pixels at this extent. */
  it("reads Nelson's Island and its battery, which is what #107 was raised for", () => {
    const plate = shippedPlate("nile.json", VIEWS[0]!);
    const points = mapPoints(plate);
    const names = placeMapLabels({ points, plate: plate.projection.extentRect, obstacles: furnitureBoxes(plate, []) });
    const island = names.find(({ point }) => point.text === "Aboukir Island");
    const battery = names.find(({ point }) => point.text === "ISLAND BATTERY");

    expect(island).toBeDefined();
    expect(battery).toBeDefined();
    // Four pixels apart on the ground, and the two names on opposite sides of it.
    expect(Math.abs((island?.point.at.x ?? 0) - (battery?.point.at.x ?? 0))).toBeLessThan(6);
    expect(touches(island?.box ?? plate.projection.extentRect, battery?.box ?? plate.projection.extentRect)).toBe(false);
  });
});
