import { describe, expect, it } from "vitest";
import { battleUrl, mapUrl } from "./paths";

describe("data served by name", () => {
  it("resolves a battle name to data/battles/<name>.json", () => {
    expect(battleUrl("trafalgar")).toBe("/data/battles/trafalgar.json");
  });

  it("resolves a map name to data/maps/<name>.geojson", () => {
    expect(mapUrl("cadiz")).toBe("/data/maps/cadiz.geojson");
  });
});
