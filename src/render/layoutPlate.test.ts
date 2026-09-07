/**
 * The frame's layout: the one ordering #107 decided, which is that the map's
 * names go down before the units' labels and are obstacles to them.
 *
 * "The map labels are drawn before the units, so the unit pass should be able
 * to treat the placed map labels as obstacles too, which it currently cannot"
 * (#107). That is a promise about two passes, so neither pass's own tests can
 * hold it; this is the seam that can.
 */
import { describe, expect, it } from "vitest";
import { furnitureBoxes } from "./drawFurniture.ts";
import { layoutUnits } from "./drawUnits.ts";
import { touches } from "./labels/geometry.ts";
import { NO_LABEL_MEMORY } from "./labels/index.ts";
import { unitsDrawn } from "./level.ts";
import type { Plate } from "./plate.ts";
import { fitProjection, type Rect } from "./projection.ts";
import { layoutPlate } from "./renderer.ts";
import { sideColours } from "./style.ts";
import { DEFAULT_VIEW } from "./views.ts";
import type { Battle, MapFile, Unit } from "../schema/types.ts";
import type { Picture, UnitPicture } from "../timeline/picture.ts";

/** A context that measures every glyph at half its point size and swallows every drawing call. */
function fakeContext(): CanvasRenderingContext2D {
  const state: Record<string, string> = { font: "15px serif", letterSpacing: "0px" };
  const noop = (): void => {};
  return new Proxy(
    {
      measureText: (text: string) => {
        const size = Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(state.font ?? "")?.[1] ?? "12");
        return { width: text.length * (size * 0.5 + Number.parseFloat(state.letterSpacing ?? "0")) } as TextMetrics;
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

const EXTENT = { north: 36.6, south: 36.0, east: -6.0, west: -6.8 };
const ROSTER: Unit[] = [{ id: "weather", side: "British", label: "Weather column", arm: "ship" }];
const SNAPSHOT: UnitPicture = {
  id: "weather",
  position: { lat: 36.3, lon: -6.4 },
  heading: 0,
  formation: "column",
  state: "intact",
  strength: 1,
  moves: [],
};
const PICTURE = { units: [SNAPSHOT] } as unknown as Picture;
const BATTLE = { title: "The Battle of Trafalgar", extent: EXTENT, scale_unit: "nmi", units: ROSTER, levels: ["Columns"] } as unknown as Battle;

function plate(map?: MapFile): Plate {
  const projection = fitProjection(EXTENT, { x: 20, y: 20, width: 900, height: 560 });
  return {
    ctx: fakeContext(),
    view: DEFAULT_VIEW,
    battle: BATTLE,
    map,
    picture: PICTURE,
    unitsDrawn: unitsDrawn(ROSTER, PICTURE.units, 0),
    contourLevels: [],
    projection,
    colours: sideColours(BATTLE, DEFAULT_VIEW.palette),
    pixelsPerMetre: 900 / 71000,
  };
}

const layout = (map?: MapFile) =>
  layoutPlate({ plate: plate(map), units: layoutUnits(plate(map)).map(({ label }) => label), memory: NO_LABEL_MEMORY, measure: (text, size) => text.length * size * 0.5 });

/** A map carrying one place, whose name will hang east of the pixel given. */
function mapWithPlaceAt(box: Rect): MapFile {
  // The name runs east of its dot, so the dot goes a little west of the box it
  // is meant to sit across, on the box's own middle.
  const { lat, lon } = plate().projection.unproject(box.x - 8, box.y + box.height / 2);
  return {
    version: 2,
    name: "One place",
    license: "public-domain",
    features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { kind: "place", name: "Cape Trafalgar" } }],
  } as unknown as MapFile;
}

describe("layoutPlate", () => {
  it("places no names at all for a battle with no map, and the unit label is on its flank", () => {
    const { names, placed } = layout();
    expect(names).toEqual([]);
    expect(placed).toHaveLength(1);
    expect(placed[0]?.step).toBe(0);
  });

  it("makes the map's names obstacles to the unit labels, so a label moves off a name rather than over it", () => {
    const bare = layout().placed[0];
    if (bare === undefined) throw new Error("nothing was placed");

    const { names, placed } = layout(mapWithPlaceAt(bare.box));
    const name = names[0];
    const moved = placed[0];
    if (name === undefined || moved === undefined) throw new Error("the name or the label went missing");

    // The name really does lie across the slot the label had to itself.
    expect(touches(name.box, bare.box)).toBe(true);
    // So the label is somewhere else, and clear of it.
    expect(moved.box).not.toEqual(bare.box);
    expect(touches(moved.box, name.box)).toBe(false);
  });

  it("gives the name the slot and makes the unit label yield, never the other way about", () => {
    const bare = layout().placed[0];
    if (bare === undefined) throw new Error("nothing was placed");

    const withMap = layout(mapWithPlaceAt(bare.box));
    const name = withMap.names[0];
    if (name === undefined) throw new Error("the name went missing");
    // Abeam right is the map label's first slot and it keeps it: the place is
    // where it is, and it is the unit label that has somewhere else to go.
    expect(name.slot).toBe("E");
  });

  it("keeps every name clear of the furniture it was placed against", () => {
    const only = plate();
    const { names } = layout(mapWithPlaceAt(layout().placed[0]?.box ?? only.projection.extentRect));
    for (const name of names) {
      for (const box of furnitureBoxes(only, [])) expect(touches(name.box, box)).toBe(false);
    }
  });
});
