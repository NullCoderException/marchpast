/**
 * Map fixtures: maps that live in code rather than in `data/maps/`, drawn
 * under a battle fixture with `?fixture=<battle>&map=<map>` so the map pass
 * can be looked at before a real cut of the ground exists.
 *
 * A map fixture is **not** a map. Nothing here is geo-registered and nothing
 * is traced from a source: it is a synthetic Cannae-shaped valley, laid on the
 * same extent as the Cannae battle fixture so the two draw together. The only
 * thing it is held to is the schema, which `mapFixtures.test.ts` checks by
 * running each one through the validator. When `data/maps/cannae.geojson`
 * lands, this goes.
 */
import type { ContourFeature, LonLat, MapFile } from "../schema/types.ts";

/**
 * The hill the relief pass is judged on: one summit in the south of the
 * extent, cut at a 10 m interval from 10 to 300 m. Thirty closed rings, so the
 * renderer finds a 10 m interval, weights and numbers the 50 m multiples, and
 * has a closed line at every one of the atlas's five tint bands (#62).
 */
const HILL = { lon: 16.148, lat: 41.2945 };
/** The summit stands above the highest line drawn, so the top ring is a ring and not a point. */
const HILL_SUMMIT = 400;
const HILL_INTERVAL = 10;
const HILL_LEVELS = 30;
/** Half the base ring, in degrees of latitude, and the same distance east-west: the plate stretches longitude, so the hill is drawn round. */
const HILL_BASE_RADIUS = 0.012;
const LON_PER_LAT = 1.331;
/** How far the summit stands north-east of the base's centre, so the south-west face is the steep one and its lines crowd. */
const HILL_SUMMIT_DRIFT = { lon: 0.0028, lat: 0.0022 };
/** Vertices per ring: enough that a ring reads as ground rather than as a polygon. */
const RING_POINTS = 72;

/**
 * A synthetic land board for the map pass: a coastline with the sea in the
 * north-east, a river running out through it, a shoal offshore, a work, two
 * places and the hill's thirty contours. Every kind the format has, on the
 * Cannae battle fixture's extent.
 */
const CANNAE_GROUND: MapFile = {
  type: "FeatureCollection",
  license: "CC-BY-4.0",
  attribution: "Sandtable contributors, CC BY 4.0. A renderer fixture: the ground is invented and nothing here is geo-registered.",
  features: [
    // The shore runs north-west to south-east with the gulf beyond it; the ring
    // is carried past the extent on three sides so the plate has no seam at its edge.
    {
      type: "Feature",
      properties: { kind: "land" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [16.1, 41.27],
            [16.1, 41.345],
            [16.136, 41.345],
            [16.143, 41.331],
            [16.151, 41.323],
            [16.159, 41.318],
            [16.167, 41.311],
            [16.174, 41.305],
            [16.183, 41.3],
            [16.193, 41.295],
            [16.205, 41.291],
            [16.205, 41.27],
            [16.1, 41.27],
          ],
        ],
      },
    },
    // The river crosses the shore about two thirds along, so its mouth is a
    // clip against the coastline rather than a line stopping in the sea.
    {
      type: "Feature",
      properties: { kind: "river" },
      geometry: {
        type: "LineString",
        coordinates: [
          [16.109, 41.297],
          [16.12, 41.3],
          [16.132, 41.302],
          [16.144, 41.304],
          [16.156, 41.306],
          [16.167, 41.308],
          [16.177, 41.31],
          [16.187, 41.313],
          [16.197, 41.316],
        ],
      },
    },
    // Shallow water off the mouth: neither the land's tone nor the sea's mottle.
    {
      type: "Feature",
      properties: { kind: "shoal" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [16.176, 41.312],
            [16.186, 41.309],
            [16.194, 41.311],
            [16.197, 41.317],
            [16.19, 41.321],
            [16.18, 41.32],
            [16.174, 41.316],
            [16.176, 41.312],
          ],
        ],
      },
    },
    { type: "Feature", properties: { kind: "work", name: "Roman camp" }, geometry: { type: "Point", coordinates: [16.114, 41.302] } },
    { type: "Feature", properties: { kind: "place", name: "Cannae" }, geometry: { type: "Point", coordinates: [16.17, 41.284] } },
    { type: "Feature", properties: { kind: "place", name: "Aufidus" }, geometry: { type: "Point", coordinates: [16.134, 41.3025] } },
    ...hillContours(),
  ],
};

/** Every map fixture there is, by the name `?map=` calls it. */
export const MAP_FIXTURES: Readonly<Record<string, MapFile>> = { "cannae-ground": CANNAE_GROUND };

/** The map fixture named in a query string such as `?map=cannae-ground`, or `undefined` when none is. */
export function mapFixtureNameFrom(search: string): string | undefined {
  const name = new URLSearchParams(search).get("map")?.trim() ?? "";
  return name === "" ? undefined : name;
}

/** The hill as the map file would carry it: one `MultiLineString` per level, the way `gdal_contour` writes them. */
function hillContours(): ContourFeature[] {
  return Array.from({ length: HILL_LEVELS }, (_, i) => {
    const elevation = (i + 1) * HILL_INTERVAL;
    return {
      type: "Feature" as const,
      properties: { kind: "contour" as const, elevation },
      geometry: { type: "MultiLineString" as const, coordinates: [hillRing(elevation)] },
    };
  });
}

/**
 * One closed ring at a level. The radius falls linearly with height and is
 * pulled about by two harmonics, so the hill has a steep face and a shoulder
 * rather than being a set of circles.
 */
function hillRing(elevation: number): LonLat[] {
  const height = (HILL_SUMMIT - elevation) / HILL_SUMMIT;
  const lon = HILL.lon + HILL_SUMMIT_DRIFT.lon * (1 - height);
  const lat = HILL.lat + HILL_SUMMIT_DRIFT.lat * (1 - height);
  const ring: LonLat[] = [];
  for (let i = 0; i < RING_POINTS; i++) {
    const angle = (i / RING_POINTS) * Math.PI * 2;
    const shape = 1 + 0.26 * Math.cos(angle + 0.4) + 0.14 * Math.sin(2 * angle - 0.7) + 0.08 * Math.sin(3 * angle + 1.1);
    const radius = HILL_BASE_RADIUS * height * shape;
    ring.push([round(lon + Math.cos(angle) * radius * LON_PER_LAT), round(lat + Math.sin(angle) * radius)]);
  }
  ring.push(ring[0]!);
  return ring;
}

/** Six places, which is under a metre on the ground and keeps the fixture readable. */
function round(degrees: number): number {
  return Number(degrees.toFixed(6));
}

