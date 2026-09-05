import { describe, expect, it } from "vitest";
import { attributionRequired, classOf, LICENSE_CLASSES, rankOf, ranksAbove } from "./licenses.ts";

describe("licence allowlist", () => {
  it("assigns each v1 identifier its class", () => {
    expect(classOf("public-domain")).toBe("public-domain");
    expect(classOf("CC0-1.0")).toBe("public-domain");
    expect(classOf("CC-BY-4.0")).toBe("attribution");
    expect(classOf("OGL-UK-3.0")).toBe("attribution");
    expect(classOf("CC-BY-SA-3.0")).toBe("share-alike");
    expect(classOf("CC-BY-SA-4.0")).toBe("share-alike");
    expect(classOf("ODbL-1.0")).toBe("share-alike");
    expect(classOf("LGPL-3.0-or-later")).toBe("share-alike");
  });

  it("knows nothing outside the table, and is case-sensitive like SPDX", () => {
    expect(classOf("MIT")).toBeUndefined();
    expect(classOf("cc-by-4.0")).toBeUndefined();
    expect(classOf("")).toBeUndefined();
    expect(Object.keys(LICENSE_CLASSES)).toHaveLength(8);
  });

  it("demands attribution for the attribution and share-alike classes only", () => {
    expect(attributionRequired("public-domain")).toBe(false);
    expect(attributionRequired("CC0-1.0")).toBe(false);
    expect(attributionRequired("CC-BY-4.0")).toBe(true);
    expect(attributionRequired("ODbL-1.0")).toBe(true);
  });

  it("ranks public-domain below attribution below share-alike", () => {
    expect(rankOf("public-domain")).toBeLessThan(rankOf("attribution"));
    expect(rankOf("attribution")).toBeLessThan(rankOf("share-alike"));
    expect(ranksAbove("CC-BY-SA-4.0", "CC-BY-4.0")).toBe(true);
    expect(ranksAbove("CC-BY-4.0", "CC-BY-4.0")).toBe(false);
    expect(ranksAbove("public-domain", "CC-BY-4.0")).toBe(false);
  });
});
