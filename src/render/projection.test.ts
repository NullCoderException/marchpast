import { describe, expect, it } from "vitest";
import { fitProjection } from "./projection.ts";

/** Trafalgar's extent (ADR-0009): landscape, 0.56 degrees of latitude by 0.80 of longitude. */
const EXTENT = { north: 36.64, south: 36.08, east: -5.85, west: -6.65 };

describe("fitProjection", () => {
  it("maps the extent's corners onto the frame's corners with north up", () => {
    const p = fitProjection(EXTENT, { x: 0, y: 0, width: 800, height: 600 });
    const nw = p.project(EXTENT.north, EXTENT.west);
    const se = p.project(EXTENT.south, EXTENT.east);
    expect(nw.x).toBeCloseTo(p.frame.x, 6);
    expect(nw.y).toBeCloseTo(p.frame.y, 6);
    expect(se.x).toBeCloseTo(p.frame.x + p.frame.width, 6);
    expect(se.y).toBeCloseTo(p.frame.y + p.frame.height, 6);
    expect(nw.y).toBeLessThan(se.y);
  });

  it("round-trips project and unproject", () => {
    const p = fitProjection(EXTENT, { x: 20, y: 30, width: 1000, height: 700 });
    for (const [lat, lon] of [
      [36.265, -6.285],
      [36.08, -6.65],
      [36.64, -5.85],
      [36.4, -6.2],
    ] as const) {
      const { x, y } = p.project(lat, lon);
      const back = p.unproject(x, y);
      expect(back.lat).toBeCloseTo(lat, 9);
      expect(back.lon).toBeCloseTo(lon, 9);
    }
  });

  it("preserves the extent's aspect ratio and letterboxes a wide viewport left and right", () => {
    const p = fitProjection(EXTENT, { x: 0, y: 0, width: 2000, height: 500 });
    expect(p.frame.height).toBeCloseTo(500, 6);
    expect(p.frame.width).toBeLessThan(2000);
    // Centred: equal margins either side.
    expect(p.frame.x).toBeCloseTo((2000 - p.frame.width) / 2, 6);
    expect(p.frame.y).toBeCloseTo(0, 6);
  });

  it("letterboxes a tall viewport top and bottom", () => {
    const p = fitProjection(EXTENT, { x: 0, y: 0, width: 400, height: 1000 });
    expect(p.frame.width).toBeCloseTo(400, 6);
    expect(p.frame.height).toBeLessThan(1000);
    expect(p.frame.x).toBeCloseTo(0, 6);
    expect(p.frame.y).toBeCloseTo((1000 - p.frame.height) / 2, 6);
  });

  it("offsets the frame by the viewport's origin", () => {
    const p = fitProjection(EXTENT, { x: 100, y: 50, width: 2000, height: 500 });
    expect(p.frame.y).toBeCloseTo(50, 6);
    expect(p.frame.x).toBeCloseTo(100 + (2000 - p.frame.width) / 2, 6);
  });

  it("keeps the same aspect ratio whatever the viewport", () => {
    const a = fitProjection(EXTENT, { x: 0, y: 0, width: 800, height: 600 });
    const b = fitProjection(EXTENT, { x: 0, y: 0, width: 300, height: 900 });
    expect(a.frame.width / a.frame.height).toBeCloseTo(b.frame.width / b.frame.height, 9);
  });

  it("is Web Mercator: the same latitude span covers more pixels further from the equator", () => {
    const p = fitProjection({ north: 60, south: 0, east: 10, west: 0 }, { x: 0, y: 0, width: 1000, height: 1000 });
    const low = p.project(0, 0).y - p.project(10, 0).y;
    const high = p.project(50, 0).y - p.project(60, 0).y;
    expect(high).toBeGreaterThan(low);
  });

  it("reports metres per pixel at a latitude from the projection's scale", () => {
    // One degree of longitude at the equator is 111.32 km. Extent 10 degrees wide, frame 1000 px wide.
    const p = fitProjection({ north: 5, south: -5, east: 10, west: 0 }, { x: 0, y: 0, width: 1000, height: 5000 });
    expect(p.frame.width).toBeCloseTo(1000, 6);
    expect(p.metresPerPixel(0)).toBeCloseTo(1113.2, 0);
    // At 60 degrees a pixel spans half as many metres (cos 60 = 0.5).
    expect(p.metresPerPixel(60)).toBeCloseTo(p.metresPerPixel(0) / 2, 6);
  });
});
