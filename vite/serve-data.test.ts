import fs from "node:fs";
import type { ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINIMAL_BATTLE } from "../src/schema/examples.ts";
import type { Battle, SortDate } from "../src/schema/types.ts";
import { readLibrary } from "./library.ts";
import { contentTypeFor, isDataUrl, isIndexUrl, resolveDataFile, serveData } from "./serve-data";

const dataDir = path.resolve("/repo/data");

describe("data route resolution", () => {
  it("maps /data/battles/<name>.json onto the data directory", () => {
    expect(resolveDataFile("/data/battles/trafalgar.json", dataDir)).toBe(
      path.join(dataDir, "battles", "trafalgar.json"),
    );
  });

  it("maps /data/maps/<name>.geojson onto the data directory", () => {
    expect(resolveDataFile("/data/maps/cadiz.geojson", dataDir)).toBe(
      path.join(dataDir, "maps", "cadiz.geojson"),
    );
  });

  it("ignores a query string", () => {
    expect(resolveDataFile("/data/battles/trafalgar.json?t=1", dataDir)).toBe(
      path.join(dataDir, "battles", "trafalgar.json"),
    );
  });

  it("refuses to escape the data directory", () => {
    expect(resolveDataFile("/data/../package.json", dataDir)).toBeNull();
    expect(resolveDataFile("/data/%2e%2e/package.json", dataDir)).toBeNull();
  });

  it("refuses the bare data directory itself", () => {
    expect(resolveDataFile("/data", dataDir)).toBeNull();
    expect(resolveDataFile("/data/", dataDir)).toBeNull();
  });
});

describe("content types", () => {
  it("serves JSON and GeoJSON with their registered media types", () => {
    expect(contentTypeFor("trafalgar.json")).toBe("application/json");
    expect(contentTypeFor("cadiz.geojson")).toBe("application/geo+json");
  });

  it("falls back to octet-stream for anything else", () => {
    expect(contentTypeFor("LICENSE")).toBe("application/octet-stream");
  });
});

describe("route ownership", () => {
  it("claims /data and everything beneath it", () => {
    expect(isDataUrl("/data")).toBe(true);
    expect(isDataUrl("/data/")).toBe(true);
    expect(isDataUrl("/data/battles/trafalgar.json")).toBe(true);
    expect(isDataUrl("/data?x=1")).toBe(true);
  });

  it("leaves routes that merely start with the letters alone", () => {
    expect(isDataUrl("/database.js")).toBe(false);
    expect(isDataUrl("/data-notes.html")).toBe(false);
    expect(isDataUrl("/src/data/paths.ts")).toBe(false);
  });

  it("recognises the generated library, and only it", () => {
    expect(isIndexUrl("/data/index.json")).toBe(true);
    expect(isIndexUrl("/data/index.json?t=1")).toBe(true);
    expect(isIndexUrl("/data/battles/index.json")).toBe(false);
    expect(isIndexUrl("/data/index.geojson")).toBe(false);
  });
});

/** A repository root with a `data/` directory in it, thrown away after each test. */
let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sandtable-serve-data-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/** Writes `data/battles/<name>.json` under the fixture root: the minimal example, dated and titled. */
function writeBattle(name: string, sort_date: SortDate, fields: Partial<Battle> = {}): void {
  const battle = { ...structuredClone(MINIMAL_BATTLE), title: `The Battle of ${name}`, sort_date, ...fields };
  const file = path.join(root, "data", "battles", `${name}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(battle, null, 2));
}

/** What a middleware is handed, reduced to the parts the plugin touches. */
interface Response {
  statusCode: number;
  headers: Map<string, string>;
  body: string;
}

/** The plugin's dev middleware, resolved against the fixture root the way Vite resolves it. */
function devServer(): (url: string, method?: string) => Response {
  const plugin = serveData();
  const stack: ((req: unknown, res: unknown, next: () => void) => void)[] = [];
  (plugin.configResolved as unknown as (config: unknown) => void)({ root, build: { outDir: "dist" } });
  (plugin.configureServer as unknown as (server: unknown) => void)({
    middlewares: { use: (handler: (req: unknown, res: unknown, next: () => void) => void) => stack.push(handler) },
  });

  return (url, method = "GET") => {
    const response: Response = { statusCode: 0, headers: new Map(), body: "" };
    const res = {
      set statusCode(value: number) {
        response.statusCode = value;
      },
      setHeader: (name: string, value: string) => response.headers.set(name, value),
      end: (chunk?: string) => {
        if (chunk !== undefined) response.body = chunk;
      },
    } as unknown as ServerResponse;
    stack[0]?.({ url, method }, res, () => {
      // The plugin answers everything under /data itself; passing the request
      // on to Vite is a distinct outcome from answering it with a 404.
      response.statusCode = -1;
    });
    return response;
  };
}

describe("the dev route for the library", () => {
  it("serves JSON generated from the battle files, with no such file on disk", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    writeBattle("cannae", { year: -216, month: 8, day: 2 });

    const response = devServer()("/data/index.json");
    expect(response.statusCode).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(response.body)).toEqual(readLibrary(path.join(root, "data")));
    expect(fs.existsSync(path.join(root, "data", "index.json"))).toBe(false);
  });

  it("generates it on every request, so a new battle file needs no restart", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    const request = devServer();
    expect(JSON.parse(request("/data/index.json").body)).toHaveLength(1);

    writeBattle("cannae", { year: -216, month: 8, day: 2 });
    expect(JSON.parse(request("/data/index.json").body).map((battle: { name: string }) => battle.name)).toEqual([
      "cannae",
      "trafalgar",
    ]);
  });

  it("answers a HEAD with the headers and no body", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    const response = devServer()("/data/index.json", "HEAD");
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("");
  });

  it("reports a battle file that fails validation rather than serving a short library", () => {
    writeBattle("broken", { year: 1798, month: 8, day: 1 }, { summary: 7 as unknown as string });
    const response = devServer()("/data/index.json");
    expect(response.statusCode).toBe(500);
    expect(response.body).toMatch(/broken\.json/);
  });

  it("leaves the rest of the data route alone: a missing battle file is still a 404", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    expect(devServer()("/data/battles/nonsense.json").statusCode).toBe(404);
  });
});
