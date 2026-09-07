/**
 * The two passes that report what they will draw, so the label pass can clear
 * it (#39, ticket #81 items 2 and 3). `layoutUnits` says where every glyph
 * lands and how far it reaches; `layoutFurniture` says which boxes the rose, title,
 * legend, scale bar and credit will occupy, and grows the legend for the
 * numeral key.
 *
 * The drawing itself is checked by eye (ADR-0009); what is worth testing is
 * that the numbers handed on are the ones the placer needs — above all the
 * roster index, which the numeral is built from and which must be the whole
 * roster's, not the level's slice of it (schema.md 2.11).
 */
import { describe, expect, it } from "vitest";
import { layoutUnits } from "./drawUnits.ts";
import { furnitureBoxes } from "./drawFurniture.ts";
import { glyphBox, type LabelUnit } from "./labels/index.ts";
import { unitsDrawn } from "./level.ts";
import type { LayoutMode } from "./layout.ts";
import type { Plate } from "./plate.ts";
import { fitProjection, type Rect } from "./projection.ts";
import { GLYPH_PX, sideColours } from "./anatomy.ts";
import { ATLAS, DEFAULT_VIEW } from "./views.ts";
import type { Battle, MapFile, Unit } from "../schema/types.ts";
import type { Picture, UnitPicture } from "../timeline/picture.ts";

/** A context that measures and swallows every drawing call; the ink is judged by eye. */
function fakeContext(): CanvasRenderingContext2D {
  const noop = (): void => {};
  return new Proxy(
    {
      measureText: (text: string) => ({ width: text.length * 6 }) as TextMetrics,
    } as Record<string, unknown>,
    {
      get(target, key) {
        if (key in target) return target[key as string];
        if (key === "font" || key === "fillStyle" || key === "strokeStyle" || key === "textAlign" || key === "textBaseline") return "";
        return noop;
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
}

const EXTENT = { north: 36.6, south: 36.0, east: -6.0, west: -6.8 };

/** Two columns and a squadron under the first, so the roster is deeper than one level. */
const ROSTER: Unit[] = [
  { id: "weather", side: "British", label: "Weather column", short_label: "Weather", arm: "ship" },
  { id: "weather-van", side: "British", label: "Weather column, van", parent: "weather", arm: "ship" },
  { id: "lee", side: "British", label: "Lee column", arm: "ship" },
  { id: "combined", side: "Combined Fleet", label: "Combined Fleet", arm: "ship" },
];

function snapshot(id: string, lat: number, lon: number, over: Partial<UnitPicture> = {}): UnitPicture {
  return { id, position: { lat, lon }, heading: 90, formation: "column", state: "intact", strength: 1, moves: [], ...over };
}

const PICTURE = {
  units: [
    snapshot("weather", 36.3, -6.4),
    snapshot("weather-van", 36.35, -6.35),
    snapshot("lee", 36.25, -6.4, { moves: [{ kind: "intent", to: { lat: 36.2, lon: -6.3 } }] }),
    snapshot("combined", 36.28, -6.3, { strength: 0.6 }),
  ],
  wind: { from: 292.5, force: "light" },
} as unknown as Picture;

const BATTLE = {
  title: "The Battle of Trafalgar",
  extent: EXTENT,
  scale_unit: "nmi",
  units: ROSTER,
  levels: ["Columns", "Squadrons"],
} as unknown as Battle;

function plate(over: { level?: number; map?: MapFile; view?: typeof DEFAULT_VIEW; mode?: LayoutMode } = {}): Plate {
  const view = over.view ?? DEFAULT_VIEW;
  const plateArea = { x: 20, y: 20, width: 900, height: 560 };
  const projection = fitProjection(EXTENT, plateArea);
  return {
    ctx: fakeContext(),
    view,
    mode: over.mode ?? "desktop",
    battle: BATTLE,
    map: over.map,
    picture: PICTURE,
    unitsDrawn: unitsDrawn(ROSTER, PICTURE.units, over.level ?? 0),
    plateArea,
    projection,
    colours: sideColours(BATTLE, view.palette),
    contourLevels: [],
    pixelsPerMetre: 900 / 71000,
  };
}

/** What the pass reports to the placer, which is all these tests are about. */
const reported = (of: Plate): LabelUnit[] => layoutUnits(of).map(({ label }) => label);

describe("layoutUnits", () => {
  it("reports one label unit per drawn glyph, in the order it drew them", () => {
    const units = reported(plate());
    expect(units.map((unit) => unit.id)).toEqual(["weather", "lee", "combined"]);
  });

  it("puts each glyph where the projection put it, and the box round it", () => {
    const weather = reported(plate())[0];
    if (weather === undefined) throw new Error("nothing was drawn");
    expect(weather.anchor).toEqual(plate().projection.project(36.3, -6.4));
    // The box the label must clear: heading east, the glyph's length runs in x
    // and the view's own halfWidth across it.
    const box = glyphBox(weather);
    expect(box.width).toBeCloseTo(GLYPH_PX);
    expect(box.height).toBeCloseTo(DEFAULT_VIEW.glyph.halfWidth(1, "column") * 2);
  });

  it("takes the reach across the axis from the view, so Atlas's blocks clear more than the plate's ticks", () => {
    const [onThePlate] = reported(plate());
    const [onAtlas] = reported(plate({ view: ATLAS }));
    expect(onAtlas?.halfWidth).toBeGreaterThan(onThePlate?.halfWidth ?? 0);
    expect(onAtlas?.halfWidth).toBe(ATLAS.glyph.halfWidth(1, "column"));
  });

  it("carries the roster's words: the label, the short_label where there is one, and nothing where there is not", () => {
    const units = reported(plate());
    expect(units[0]?.name).toBe("Weather column");
    expect(units[0]?.shortLabel).toBe("Weather");
    expect(units[1]?.shortLabel).toBeUndefined();
  });

  it("numbers a unit by the whole roster, so a numeral means the same at every level", () => {
    // At level 1 the weather column is drawn as its van, the third roster
    // entry drawn but the *second* roster entry: the numeral follows the
    // roster, never the slice (schema.md 2.11).
    const coarse = reported(plate({ level: 0 }));
    const fine = reported(plate({ level: 1 }));
    expect(coarse.map((unit) => unit.rosterIndex)).toEqual([0, 2, 3]);
    expect(fine.map((unit) => unit.id)).toEqual(["weather-van", "lee", "combined"]);
    expect(fine.map((unit) => unit.rosterIndex)).toEqual([1, 2, 3]);
  });

  it("says which units have a move, since they take the flank before the rest", () => {
    const units = reported(plate());
    expect(units.map((unit) => unit.hasMove)).toEqual([false, true, false]);
  });

  it("hands on the wind the glyph was given, so the label and the billow agree which flank is the lee one", () => {
    const [weather] = reported(plate());
    // A WNW wind on a unit heading east: the same one turn the glyph is handed.
    expect(weather?.windTo).toBeCloseTo((((292.5 + 180 - 90) % 360) * Math.PI) / 180);
  });
});

describe("furnitureBoxes", () => {
  const frame = () => plate().projection.extentRect;

  /** The box whose centre lies nearest a corner of the extent: which piece of furniture stands there. */
  const inCorner = (boxes: readonly Rect[], corner: { x: number; y: number }): Rect => {
    const nearest = [...boxes].sort(
      (a, b) => Math.hypot(a.x + a.width / 2 - corner.x, a.y + a.height / 2 - corner.y) - Math.hypot(b.x + b.width / 2 - corner.x, b.y + b.height / 2 - corner.y),
    )[0];
    if (nearest === undefined) throw new Error("no furniture box at all");
    return nearest;
  };

  it("reports a box in every corner the furniture takes", () => {
    const { x, y, width, height } = frame();
    const boxes = furnitureBoxes(plate({ map: { attribution: "Coastline: Natural Earth" } as unknown as MapFile }), []);
    expect(boxes).toHaveLength(4);
    // The rose top left, the title top right, the scale bar and legend bottom
    // left, the credit bottom right — and each inside the plate it stands on.
    const corners = [
      { x, y },
      { x: x + width, y },
      { x, y: y + height },
      { x: x + width, y: y + height },
    ];
    const found = corners.map((corner) => inCorner(boxes, corner));
    expect(new Set(found).size).toBe(4);
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(x);
      expect(box.y).toBeGreaterThanOrEqual(y);
      expect(box.x + box.width).toBeLessThanOrEqual(x + width);
      expect(box.y + box.height).toBeLessThanOrEqual(y + height);
    }
  });

  it("reports no credit box when the battle has no map to credit", () => {
    expect(furnitureBoxes(plate(), [])).toHaveLength(3);
  });

  it("grows the legend's box for the numeral key, so a label cannot land on a row it made", () => {
    const { x, y, height } = frame();
    const bottomLeft = { x, y: y + height };
    const bare = inCorner(furnitureBoxes(plate(), []), bottomLeft);
    const keyed = inCorner(
      furnitureBoxes(plate(), [
        { numeral: 2, label: "Weather column, van of the weather division", id: "weather-van" },
        { numeral: 4, label: "Combined Fleet", id: "combined" },
      ]),
      bottomLeft,
    );
    // It grows upward and outward: the scale bar is pinned to the corner.
    expect(keyed.y).toBeLessThan(bare.y);
    expect(keyed.width).toBeGreaterThan(bare.width);
    expect(keyed.y + keyed.height).toBeCloseTo(bare.y + bare.height);
  });
});
