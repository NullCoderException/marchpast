import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentTypeFor, isDataUrl, resolveDataFile } from "./serve-data";

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
});
