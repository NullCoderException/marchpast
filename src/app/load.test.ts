import { describe, expect, it } from "vitest";
import { battleUrl, mapUrl } from "../data/paths.ts";
import { formatLoadErrors } from "./load.ts";

describe("formatLoadErrors", () => {
  it("groups errors under their file, one line each, the root path written as (root)", () => {
    const lines = formatLoadErrors([
      { file: battleUrl("x"), path: "/phases/3/units/1/heading", message: "must be a number" },
      { file: battleUrl("x"), path: "", message: "unknown key: extra" },
      { file: mapUrl("y"), path: "/features", message: "must be an array" },
    ]);
    expect(lines).toEqual([
      battleUrl("x"),
      "  /phases/3/units/1/heading: must be a number",
      "  (root): unknown key: extra",
      mapUrl("y"),
      "  /features: must be an array",
    ]);
  });
});
