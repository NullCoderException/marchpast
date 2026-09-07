import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createHash } from "node:crypto";
import path from "node:path";
import type { ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MINIMAL_BATTLE, MINIMAL_MAP } from "../src/schema/examples.ts";
import {
  battleStill,
  CARD,
  cardAlt,
  createStillLoader,
  loadStillModules,
  readBattle,
  still,
  type StillModules,
  stillRequest,
  type StillSource,
  THUMBNAIL,
} from "./stills.ts";

const dataDir = path.resolve("data");

/** The four battle files the repo ships, which every still the build writes is one of. */
const SHIPPED = ["cannae", "copenhagen", "nile", "trafalgar"];

/**
 * The renderer, loaded the way the build loads it: through the same throwaway
 * Vite server, which resolves the faces' `.woff2` imports. That makes
 * `createStillLoader` and `loadStillModules` the first thing every test here
 * exercises.
 */
let server: ViteDevServer;
let modules: StillModules;

beforeAll(async () => {
  server = await createStillLoader(process.cwd());
  modules = await loadStillModules((id) => server.ssrLoadModule(id), process.cwd());
}, 60_000);

afterAll(async () => {
  await server?.close();
});

/**
 * The schema's own two-phase example: no phase carries `still`, so the metric
 * rule answers, and its second phase is the only one with anybody engaged.
 */
const EXAMPLE = { battle: MINIMAL_BATTLE, map: MINIMAL_MAP, phase: 1, view: "plate", level: 0 };

/** A drawn picture as its bytes. */
function hash(png: Buffer): string {
  return createHash("sha256").update(png).digest("hex");
}

/** What a PNG draws in its top-left `width` by `height`, so two of different heights are compared by their picture. */
async function pixels(png: Buffer, width: number, height: number): Promise<string> {
  const ctx = createCanvas(width, height).getContext("2d");
  ctx.drawImage(await loadImage(png), 0, 0);
  return createHash("sha256").update(Buffer.from(ctx.getImageData(0, 0, width, height).data.buffer)).digest("hex");
}

/** The size in the PNG's own header, so the file is checked rather than the bookkeeping. */
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** One of the shipped battles, read off the disk. */
function shipped(name: string): StillSource {
  const source = readBattle(dataDir, name);
  if (source === undefined) throw new Error(`No battle file for ${name}`);
  return source;
}

describe("a still is a pure function of its arguments", () => {
  it("draws the same bytes twice", () => {
    const options = { ...EXAMPLE, ...THUMBNAIL };
    expect(hash(still(modules, options).png)).toBe(hash(still(modules, options).png));
  });

  it("is cold: another battle drawn in between changes nothing", () => {
    const options = { ...EXAMPLE, ...THUMBNAIL };
    const first = still(modules, options);
    battleStill(modules, shipped("cannae").battle, shipped("cannae").map, THUMBNAIL);
    expect(hash(still(modules, options).png)).toBe(hash(first.png));
  });

  it("draws a battle's still from the phase, view and level ADR-0025 names", () => {
    const asked = battleStill(modules, MINIMAL_BATTLE, MINIMAL_MAP, THUMBNAIL);
    expect(hash(asked.png)).toBe(hash(still(modules, { ...EXAMPLE, ...THUMBNAIL }).png));
  });
});

describe("the crop", () => {
  it("keeps the box it was asked for and leaves the measured band behind", async () => {
    const box = { ...EXAMPLE, width: THUMBNAIL.width, dpr: THUMBNAIL.dpr };
    const cropped = still(modules, { ...box, height: THUMBNAIL.height, crop: true });
    const whole = still(modules, { ...box, height: THUMBNAIL.height + cropped.band, crop: false });

    expect(cropped.band).toBeGreaterThan(0);
    expect(whole.band).toBe(cropped.band);
    // The same plate in both: the one that keeps the band is exactly the band taller.
    expect(pngSize(cropped.png)).toEqual({ width: 600, height: 380 });
    expect(pngSize(whole.png)).toEqual({ width: 600, height: Math.round((THUMBNAIL.height + cropped.band) * THUMBNAIL.dpr) });
    expect(await pixels(cropped.png, cropped.width, cropped.height)).toBe(await pixels(whole.png, cropped.width, cropped.height));
  });

  it("keeps the band inside the height when it is not cropped, which is what the card is", () => {
    const card = battleStill(modules, MINIMAL_BATTLE, MINIMAL_MAP, CARD);
    expect(pngSize(card.png)).toEqual({ width: 1200, height: 630 });
    expect(card.band).toBeGreaterThan(0);
    expect(card.band).toBeLessThan(630);
  });
});

describe("the shipped battles", () => {
  it(
    "each render a thumbnail and a card at the sizes the library and a link preview want",
    () => {
      for (const name of SHIPPED) {
        const { battle, map } = shipped(name);
        expect(pngSize(battleStill(modules, battle, map, THUMBNAIL).png), name).toEqual({ width: 600, height: 380 });
        expect(pngSize(battleStill(modules, battle, map, CARD).png), name).toEqual({ width: 1200, height: 630 });
      }
    },
    30_000,
  );

  it("fill the plate top to bottom, so no thumbnail is letterboxed at the head or foot", async () => {
    const { fitProjection } = await server.ssrLoadModule("/src/render/projection.ts");
    const { PLATE_MARGIN } = await server.ssrLoadModule("/src/render/anatomy.ts");
    // The plate the thumbnail's box leaves: 1160 × 720, the rect ADR-0025 set 760 against.
    const plate = {
      x: PLATE_MARGIN,
      y: PLATE_MARGIN,
      width: THUMBNAIL.width - PLATE_MARGIN * 2,
      height: THUMBNAIL.height - PLATE_MARGIN * 2,
    };
    expect([plate.width, plate.height]).toEqual([1160, 720]);

    for (const name of SHIPPED) {
      const { extentRect } = fitProjection(shipped(name).battle.extent, plate);
      expect(extentRect.width, name).toBeLessThanOrEqual(plate.width);
      // Three of the four are height-fitted exactly; the Nile is a shade wider
      // than the plate (1.619 against 1.611), so it pays a strip at the head
      // and the foot — and at half a device pixel it draws nothing.
      expect((plate.height - extentRect.height) / 2, name).toBeLessThan(1 / THUMBNAIL.dpr);
    }
  });
});

describe("the card's alt", () => {
  it("names the battle, the still phase's clock and its label", () => {
    expect(cardAlt(MINIMAL_BATTLE)).toBe("The Battle of Trafalgar at 13:30: The melee");
  });

  it("reads the marked phase of a shipped battle", () => {
    expect(cardAlt(shipped("nile").battle)).toBe("The Battle of the Nile at 22:00: L'Orient blows up; the pause");
  });
});

describe("the picture route", () => {
  it("claims a still and a card by battle name", () => {
    expect(stillRequest("/data/stills/trafalgar.png")).toEqual({ name: "trafalgar", size: THUMBNAIL });
    expect(stillRequest("/data/cards/trafalgar.png")).toEqual({ name: "trafalgar", size: CARD });
  });

  it("ignores a query string", () => {
    expect(stillRequest("/data/stills/trafalgar.png?t=1")).toEqual({ name: "trafalgar", size: THUMBNAIL });
  });

  it("claims nothing else on the data route", () => {
    expect(stillRequest("/data/index.json")).toBeNull();
    expect(stillRequest("/data/battles/trafalgar.json")).toBeNull();
    expect(stillRequest("/data/stills/trafalgar.jpg")).toBeNull();
    expect(stillRequest("/data/stills/")).toBeNull();
  });
});

describe("reading a battle to draw", () => {
  it("returns the battle and the map it names", () => {
    const source = shipped("trafalgar");
    expect(source.battle.title).toBe("The Battle of Trafalgar");
    expect(source.map?.features.length).toBeGreaterThan(0);
  });

  it("has nothing for a name no battle file answers to", () => {
    expect(readBattle(dataDir, "waterloo")).toBeUndefined();
  });

  it("refuses a name that would climb out of the battles directory", () => {
    expect(readBattle(dataDir, "../maps/cadiz")).toBeUndefined();
    expect(readBattle(dataDir, "..\\maps\\cadiz")).toBeUndefined();
  });
});
