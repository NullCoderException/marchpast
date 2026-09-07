/**
 * The map label placer: the slot order, the footprints it never covers, the
 * plate and the furniture it stays clear of, and the drop that is its last
 * word (#107).
 */
import { describe, expect, it } from "vitest";
import { touches } from "./geometry.ts";
import { MAP_LABEL_SLOTS, type MapLabel, type MapPoint, placeMapLabels } from "./map.ts";
import type { Rect } from "../projection.ts";

const PLATE: Rect = { x: 0, y: 0, width: 900, height: 600 };

function point(over: Partial<MapPoint> & Pick<MapPoint, "text">): MapPoint {
  const at = over.at ?? { x: 400, y: 300 };
  return {
    kind: "place",
    at,
    footprint: over.footprint ?? { x: at.x - 2, y: at.y - 2, width: 4, height: 4 },
    width: over.text.length * 6,
    height: 15,
    gap: 7,
    ...over,
  };
}

function place(points: readonly MapPoint[], obstacles: readonly Rect[] = []): MapLabel[] {
  return placeMapLabels({ points, plate: PLATE, obstacles });
}

const named = (labels: readonly MapLabel[], text: string): MapLabel => {
  const found = labels.find((label) => label.point.text === text);
  if (found === undefined) throw new Error(`no label for ${text}`);
  return found;
};

describe("placeMapLabels", () => {
  it("hangs a lone name abeam to the right, its near edge the gap off the point", () => {
    const only = point({ text: "Cadiz" });
    const [label] = place([only]);
    expect(label?.slot).toBe("E");
    expect(label?.align).toBe("left");
    expect(label?.at).toEqual({ x: only.at.x + only.gap, y: only.at.y });
    expect(label?.box.x).toBe(only.at.x + only.gap);
  });

  it("tries the six slots in one order: abeam right, abeam left, then the four quadrants", () => {
    expect([...MAP_LABEL_SLOTS]).toEqual(["E", "W", "NE", "NW", "SE", "SW"]);
  });

  it("sends the second name to the other side when the first has taken the right", () => {
    const labels = place([point({ text: "Cadiz" }), point({ text: "Cadiz Bay", at: { x: 400, y: 306 } })]);
    expect(labels).toHaveLength(2);
    expect(named(labels, "Cadiz").slot).toBe("E");
    expect(named(labels, "Cadiz Bay").slot).toBe("W");
    expect(touches(named(labels, "Cadiz").box, named(labels, "Cadiz Bay").box)).toBe(false);
  });

  /**
   * The Nile's own case: Nelson's Island is a `place` and its battery a `work`
   * four pixels away (schema.md 3.5), and before #107 the two names were drawn
   * one on top of the other.
   */
  it("reads two named points a pixel apart, neither name over the other and neither over a footprint", () => {
    const island = point({ text: "Aboukir Island" });
    const battery = point({
      kind: "work",
      text: "ISLAND BATTERY",
      at: { x: 401, y: 300 },
      footprint: { x: 401 - 6.5, y: 300 - 6.5, width: 13, height: 13 },
      gap: 11,
    });
    const labels = place([island, battery]);

    expect(labels).toHaveLength(2);
    expect(touches(named(labels, "Aboukir Island").box, named(labels, "ISLAND BATTERY").box)).toBe(false);
    for (const label of labels) {
      for (const footprint of [island.footprint, battery.footprint]) expect(touches(label.box, footprint)).toBe(false);
    }
  });

  it("never lets a name cover another point's sign, even when nothing else is in the way", () => {
    // A work's sign sits just where the place's name would start, and nothing
    // else is on the plate: the name has to go round it rather than through it.
    const place1 = point({ text: "Aboukir Island" });
    const sign = point({ kind: "work", text: "ISLAND BATTERY", at: { x: 410, y: 300 }, footprint: { x: 403.5, y: 293.5, width: 13, height: 13 }, gap: 11 });
    const labels = place([place1, sign]);
    expect(touches(named(labels, "Aboukir Island").box, sign.footprint)).toBe(false);
  });

  it("keeps a name inside the plate, so one near the edge turns about rather than running off it", () => {
    const edge = point({ text: "Saltholm", at: { x: PLATE.width - 12, y: 300 } });
    const [label] = place([edge]);
    expect(label?.align).toBe("right");
    expect(label?.box.x).toBeGreaterThanOrEqual(PLATE.x);
    expect((label?.box.x ?? 0) + (label?.box.width ?? 0)).toBeLessThanOrEqual(PLATE.x + PLATE.width);
  });

  it("clears the furniture, which is why the placer takes obstacles at all", () => {
    const beside = point({ text: "Copenhagen" });
    const legend: Rect = { x: 400, y: 260, width: 200, height: 80 };
    const [label] = place([beside], [legend]);
    expect(label?.slot).not.toBe("E");
    expect(touches(label?.box ?? PLATE, legend)).toBe(false);
  });

  /**
   * The rule the code states: a name with no slot free is dropped. The dot or
   * sign stays — `drawMap` draws every point's own whatever the placer says —
   * so what is lost is the word, never the thing.
   */
  it("drops a name that can stand in no slot at all", () => {
    const walled: Rect[] = [
      { x: 0, y: 0, width: 900, height: 280 },
      { x: 0, y: 320, width: 900, height: 280 },
      { x: 0, y: 0, width: 390, height: 600 },
      { x: 410, y: 0, width: 490, height: 600 },
    ];
    expect(place([point({ text: "Middle Ground" })], walled)).toEqual([]);
  });

  it("places in the map file's order, so the author decides which name wins the slot", () => {
    const first = point({ text: "one" });
    const second = point({ text: "two", at: { x: 402, y: 300 } });
    expect(named(place([first, second]), "one").slot).toBe("E");
    expect(named(place([second, first]), "two").slot).toBe("E");
  });

  it("keeps every name it places clear of every other, whatever order they came in", () => {
    const points = [
      point({ text: "Copenhagen", at: { x: 300, y: 300 } }),
      point({ text: "King's Deep", at: { x: 306, y: 302 } }),
      point({ text: "Middle Ground", at: { x: 300, y: 312 } }),
      point({ text: "Amager", at: { x: 296, y: 296 } }),
    ];
    const labels = place(points);
    for (const [i, label] of labels.entries()) {
      for (const other of labels.slice(i + 1)) expect(touches(label.box, other.box)).toBe(false);
      for (const { footprint } of points) expect(touches(label.box, footprint)).toBe(false);
    }
  });
});
