import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { battleUrl, indexUrl, mapUrl, stillUrl } from "./paths";

describe("data served by name", () => {
  it("resolves a battle name to data/battles/<name>.json", () => {
    expect(battleUrl("trafalgar")).toBe("/data/battles/trafalgar.json");
  });

  it("resolves a map name to data/maps/<name>.geojson", () => {
    expect(mapUrl("cadiz")).toBe("/data/maps/cadiz.geojson");
  });

  it("puts the library index at data/index.json", () => {
    expect(indexUrl()).toBe("/data/index.json");
  });

  it("resolves a battle name to the still data/stills/<name>.png", () => {
    expect(stillUrl("trafalgar")).toBe("/data/stills/trafalgar.png");
  });
});

describe("data under a base path", () => {
  beforeEach(() => {
    vi.stubEnv("BASE_URL", "/under-a-path/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("puts a battle beneath the app's base URL", () => {
    expect(battleUrl("trafalgar")).toBe("/under-a-path/data/battles/trafalgar.json");
  });

  it("puts a map beneath the app's base URL", () => {
    expect(mapUrl("cadiz")).toBe("/under-a-path/data/maps/cadiz.geojson");
  });

  it("puts the index beneath the app's base URL", () => {
    expect(indexUrl()).toBe("/under-a-path/data/index.json");
  });

  it("puts a still beneath the app's base URL", () => {
    expect(stillUrl("trafalgar")).toBe("/under-a-path/data/stills/trafalgar.png");
  });
});
