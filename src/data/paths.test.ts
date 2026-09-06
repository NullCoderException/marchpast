import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { battleUrl, mapUrl } from "./paths";

describe("data served by name", () => {
  it("resolves a battle name to data/battles/<name>.json", () => {
    expect(battleUrl("trafalgar")).toBe("/data/battles/trafalgar.json");
  });

  it("resolves a map name to data/maps/<name>.geojson", () => {
    expect(mapUrl("cadiz")).toBe("/data/maps/cadiz.geojson");
  });
});

describe("data under a base path", () => {
  beforeEach(() => {
    vi.stubEnv("BASE_URL", "/sandtable/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("puts a battle beneath the app's base URL", () => {
    expect(battleUrl("trafalgar")).toBe("/sandtable/data/battles/trafalgar.json");
  });

  it("puts a map beneath the app's base URL", () => {
    expect(mapUrl("cadiz")).toBe("/sandtable/data/maps/cadiz.geojson");
  });
});
