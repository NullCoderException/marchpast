import { describe, expect, it } from "vitest";
import { MINIMAL_BATTLE } from "./examples.ts";
import type { Battle } from "./types.ts";
import { validateBattle } from "./validateBattle.ts";

/** The minimal example from `docs/schema.md` 2.11, as a fresh deep copy each time so tests can break it freely. */
function minimalBattle(): Battle {
  return structuredClone(MINIMAL_BATTLE);
}

/** Applies `mutate` to a fresh minimal battle (typed loosely so tests can write invalid shapes) and validates it. */
function validateBroken(mutate: (battle: any) => void) {
  const battle = minimalBattle() as any;
  mutate(battle);
  return validateBattle(battle);
}

/** The error paths a failed validation reports. Fails the test when validation unexpectedly passed. */
function errorPaths(result: ReturnType<typeof validateBattle>): string[] {
  if (result.ok) throw new Error("expected validation to fail");
  return result.errors.map((e) => e.path);
}

describe("validateBattle: a well-formed file", () => {
  it("accepts the minimal example and hands back the typed battle", () => {
    const result = validateBattle(minimalBattle());
    expect(result).toEqual({ ok: true, battle: MINIMAL_BATTLE });
  });

  it("accepts a file without the optional fields", () => {
    const result = validateBroken((b) => {
      delete b.map;
      delete b.sources["collingwood-dispatch"].url;
      delete b.sources["collingwood-dispatch"].license_note;
      for (const u of b.units) delete u.commander;
      delete b.phases[0].wind;
      delete b.phases[0].notes;
      delete b.phases[0].references[0].quote;
      delete b.phases[0].units[2].moves;
    });
    expect(result.ok).toBe(true);
  });
});

describe("validateBattle: the document itself", () => {
  it("rejects anything that is not a JSON object, at the root path", () => {
    for (const notAnObject of [null, undefined, 1, "battle", [], true]) {
      const result = validateBattle(notAnObject);
      expect(result.ok).toBe(false);
      expect(errorPaths(result)).toEqual([""]);
    }
  });
});

describe("validateBattle: shape rules", () => {
  it("reports every missing required field, not just the first", () => {
    const result = validateBroken((b) => {
      delete b.title;
      delete b.date;
      delete b.extent;
      delete b.scale_unit;
      delete b.end;
      delete b.license;
      delete b.sources;
      delete b.units;
      delete b.phases;
    });
    expect(errorPaths(result)).toEqual(
      expect.arrayContaining(["/title", "/date", "/extent", "/scale_unit", "/end", "/license", "/sources", "/units", "/phases"]),
    );
  });

  it("rejects unknown keys at every level", () => {
    const result = validateBroken((b) => {
      b.colour = "red";
      b.extent.depth = 3;
      b.sources["collingwood-dispatch"].isbn = "x";
      b.units[0].ships = 12;
      b.phases[0].duration = 5;
      b.phases[0].wind.beaufort = 3;
      b.phases[0].references[0].page = 1;
      b.phases[0].units[0].position.alt = 0;
      b.phases[0].units[0].speed = 4;
      b.phases[0].units[2].moves[0].label = "escape";
      b.phases[0].units[2].moves[0].to.z = 1;
    });
    expect(errorPaths(result)).toEqual([
      "/colour",
      "/extent/depth",
      "/sources/collingwood-dispatch/isbn",
      "/units/0/ships",
      "/phases/0/duration",
      "/phases/0/wind/beaufort",
      "/phases/0/references/0/page",
      "/phases/0/units/0/speed",
      "/phases/0/units/0/position/alt",
      "/phases/0/units/2/moves/0/label",
      "/phases/0/units/2/moves/0/to/z",
    ]);
  });

  it("checks field types", () => {
    const result = validateBroken((b) => {
      b.title = 1;
      b.date = null;
      b.extent = "big";
      b.map = 3;
      b.attribution = ["x"];
      b.sources = [];
      b.units = {};
      b.phases = "none";
    });
    expect(errorPaths(result)).toEqual(["/title", "/date", "/extent", "/map", "/attribution", "/sources", "/units", "/phases"]);
  });

  it("checks nested field types", () => {
    const result = validateBroken((b) => {
      b.extent.north = "36";
      b.sources["collingwood-dispatch"].label = 1;
      b.sources["collingwood-dispatch"].url = 1;
      b.units[1].commander = 7;
      b.phases[0].playback_rate = "fast";
      b.phases[0].caption = 5;
      b.phases[0].notes = false;
      b.phases[0].references[0].locator = 1;
      b.phases[0].units[0].position.lat = "36";
      b.phases[0].units[0].heading = "north";
      b.phases[0].units[1].strength = "half";
      b.phases[0].units[2].moves[0].to = [36, -6];
    });
    expect(errorPaths(result)).toEqual([
      "/extent/north",
      "/sources/collingwood-dispatch/label",
      "/sources/collingwood-dispatch/url",
      "/units/1/commander",
      "/phases/0/playback_rate",
      "/phases/0/caption",
      "/phases/0/notes",
      "/phases/0/references/0/locator",
      "/phases/0/units/0/position/lat",
      "/phases/0/units/0/heading",
      "/phases/0/units/1/strength",
      "/phases/0/units/2/moves/0/to",
    ]);
  });

  it("checks enums", () => {
    const result = validateBroken((b) => {
      b.scale_unit = "miles";
      b.phases[0].wind.force = "strong";
      b.phases[0].units[0].formation = "crescent";
      b.phases[0].units[0].state = "struck";
      b.phases[0].units[2].moves[0].kind = "retreat";
    });
    expect(errorPaths(result)).toEqual([
      "/scale_unit",
      "/phases/0/wind/force",
      "/phases/0/units/0/formation",
      "/phases/0/units/0/state",
      "/phases/0/units/2/moves/0/kind",
    ]);
  });

  it("checks battle-clock times are HH:MM", () => {
    const result = validateBroken((b) => {
      b.end = "5pm";
      b.phases[0].t = "05:40:00";
    });
    expect(errorPaths(result)).toEqual(["/end", "/phases/0/t"]);
  });

  it("checks coordinate ranges", () => {
    const result = validateBroken((b) => {
      b.extent.north = 91;
      b.extent.west = -181;
      b.phases[0].units[0].position.lat = -90.5;
      b.phases[0].units[0].position.lon = 180.5;
      b.phases[0].units[2].moves[0].to.lat = 100;
    });
    expect(errorPaths(result)).toEqual([
      "/extent/north",
      "/extent/west",
      "/phases/0/units/0/position/lat",
      "/phases/0/units/0/position/lon",
      "/phases/0/units/2/moves/0/to/lat",
    ]);
  });

  it("rejects non-finite numbers", () => {
    const result = validateBroken((b) => {
      b.phases[0].units[0].heading = Number.NaN;
      b.phases[0].playback_rate = Number.POSITIVE_INFINITY;
    });
    expect(errorPaths(result)).toEqual(["/phases/0/playback_rate", "/phases/0/units/0/heading"]);
  });

  it("requires at least one unit and at least one phase", () => {
    expect(errorPaths(validateBroken((b) => (b.units = [])))).toContain("/units");
    expect(errorPaths(validateBroken((b) => (b.phases = [])))).toContain("/phases");
  });

  it("requires each array element to be an object", () => {
    const result = validateBroken((b) => {
      b.units.push("frigate");
      b.phases[0].references.push(null);
      b.phases[0].units[2].moves.push(1);
    });
    expect(errorPaths(result)).toEqual(["/units/3", "/phases/0/references/1", "/phases/0/units/2/moves/1"]);
  });

  it("requires each source to be an object", () => {
    expect(errorPaths(validateBroken((b) => (b.sources.mahan = "Mahan")))).toEqual(["/sources/mahan"]);
  });
});

/** Appends a copy of the first phase at `t`, so cross-phase rules have two phases to compare. */
function addPhase(b: any, t: string, id = `phase-at-${t}`): any {
  const phase = structuredClone(b.phases[0]);
  phase.id = id;
  phase.t = t;
  b.phases.push(phase);
  return phase;
}

describe("validateBattle: cross-field rules (schema.md 2.9)", () => {
  it("1. schema_version is exactly 1", () => {
    expect(errorPaths(validateBroken((b) => (b.schema_version = 2)))).toEqual(["/schema_version"]);
    expect(errorPaths(validateBroken((b) => (b.schema_version = "1")))).toEqual(["/schema_version"]);
  });

  it("2. extent has south below north and west of east", () => {
    expect(errorPaths(validateBroken((b) => (b.extent.south = 36.61)))).toEqual(["/extent"]);
    expect(errorPaths(validateBroken((b) => (b.extent.south = 37)))).toEqual(["/extent"]);
    expect(errorPaths(validateBroken((b) => (b.extent.west = -6.0)))).toEqual(["/extent"]);
    expect(errorPaths(validateBroken((b) => (b.extent.west = 0)))).toEqual(["/extent"]);
  });

  it("3. unit ids and phase ids are unique", () => {
    expect(errorPaths(validateBroken((b) => (b.units[2].id = "lee-column")))).toContain("/units/2/id");
    expect(errorPaths(validateBroken((b) => addPhase(b, "06:00", "dawn-sighting")))).toEqual(["/phases/1/id"]);
  });

  it("4. t is strictly increasing and end is later than the last t", () => {
    expect(errorPaths(validateBroken((b) => addPhase(b, "05:40")))).toEqual(["/phases/1/t"]);
    expect(errorPaths(validateBroken((b) => addPhase(b, "05:30")))).toEqual(["/phases/1/t"]);
    expect(validateBroken((b) => addPhase(b, "05:41")).ok).toBe(true);
    expect(errorPaths(validateBroken((b) => (b.end = "05:40")))).toEqual(["/end"]);
    expect(errorPaths(validateBroken((b) => (b.end = "05:00")))).toEqual(["/end"]);
    expect(
      errorPaths(
        validateBroken((b) => {
          addPhase(b, "12:00");
          b.end = "11:59";
        }),
      ),
    ).toEqual(["/end"]);
  });

  it("5. every phase lists every roster unit exactly once and nothing else", () => {
    expect(errorPaths(validateBroken((b) => b.phases[0].units.pop()))).toEqual(["/phases/0/units"]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].units[2].id = "lee-column")))).toEqual([
      "/phases/0/units/2/id",
      "/phases/0/units",
    ]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].units[2].id = "frigates")))).toEqual([
      "/phases/0/units/2/id",
      "/phases/0/units",
    ]);
    const result = validateBroken((b) => {
      addPhase(b, "06:00");
      b.phases[1].units.push(structuredClone(b.phases[1].units[0]));
    });
    expect(errorPaths(result)).toEqual(["/phases/1/units/3/id"]);
  });

  it("6. every phase has a reference, each pointing at a source", () => {
    expect(errorPaths(validateBroken((b) => (b.phases[0].references = [])))).toEqual(["/phases/0/references"]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].references[0].source = "mahan")))).toEqual([
      "/phases/0/references/0/source",
    ]);
  });

  it("7. wind is all or nothing across phases", () => {
    const result = validateBroken((b) => {
      addPhase(b, "06:00");
      addPhase(b, "07:00");
      delete b.phases[1].wind;
    });
    expect(errorPaths(result)).toEqual(["/phases/1/wind"]);
    expect(
      validateBroken((b) => {
        addPhase(b, "06:00");
        delete b.phases[0].wind;
        delete b.phases[1].wind;
      }).ok,
    ).toBe(true);
  });

  it("8. wind.from is present exactly when force is not calm", () => {
    expect(errorPaths(validateBroken((b) => (b.phases[0].wind = { force: "calm", from: 90 })))).toEqual([
      "/phases/0/wind/from",
    ]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].wind = { force: "fresh" })))).toEqual(["/phases/0/wind/from"]);
    expect(validateBroken((b) => (b.phases[0].wind = { force: "calm" })).ok).toBe(true);
    expect(validateBroken((b) => (b.phases[0].wind = { force: "gale", from: 0 })).ok).toBe(true);
  });

  it("9. license is allowlisted and attribution follows its class", () => {
    expect(errorPaths(validateBroken((b) => (b.license = "MIT")))).toEqual(["/license"]);
    expect(errorPaths(validateBroken((b) => delete b.attribution))).toEqual(["/attribution"]);
    expect(
      validateBroken((b) => {
        b.license = "public-domain";
        delete b.attribution;
      }).ok,
    ).toBe(true);
    expect(
      errorPaths(
        validateBroken((b) => {
          b.license = "CC-BY-SA-4.0";
          delete b.attribution;
        }),
      ),
    ).toEqual(["/attribution"]);
  });

  it("10. every source licence is allowlisted and ranks no higher than the file's", () => {
    const src = (b: any) => b.sources["collingwood-dispatch"];
    expect(errorPaths(validateBroken((b) => (src(b).license = "GPL-3.0")))).toEqual([
      "/sources/collingwood-dispatch/license",
    ]);
    expect(errorPaths(validateBroken((b) => (src(b).license = "CC-BY-SA-4.0")))).toEqual([
      "/sources/collingwood-dispatch/license",
    ]);
    expect(validateBroken((b) => (src(b).license = "CC-BY-4.0")).ok).toBe(true);
    expect(
      validateBroken((b) => {
        b.license = "public-domain";
        delete b.attribution;
        src(b).license = "public-domain";
      }).ok,
    ).toBe(true);
    expect(
      errorPaths(
        validateBroken((b) => {
          b.license = "public-domain";
          delete b.attribution;
          src(b).license = "CC-BY-4.0";
        }),
      ),
    ).toEqual(["/sources/collingwood-dispatch/license"]);
    expect(
      validateBroken((b) => {
        b.license = "CC-BY-SA-4.0";
        src(b).license = "ODbL-1.0";
      }).ok,
    ).toBe(true);
  });

  it("11. map is a bare name", () => {
    for (const notBare of ["maps/cadiz", "cadiz.geojson", "..\cadiz", "../cadiz", ""]) {
      expect(errorPaths(validateBroken((b) => (b.map = notBare))), notBare).toEqual(["/map"]);
    }
    expect(validateBroken((b) => (b.map = "cadiz-bay")).ok).toBe(true);
  });

  it("12. angles, strength and playback_rate are in range", () => {
    const snap = (b: any) => b.phases[0].units[0];
    expect(errorPaths(validateBroken((b) => (snap(b).heading = 360)))).toEqual(["/phases/0/units/0/heading"]);
    expect(errorPaths(validateBroken((b) => (snap(b).heading = -1)))).toEqual(["/phases/0/units/0/heading"]);
    expect(validateBroken((b) => (snap(b).heading = 359.9)).ok).toBe(true);
    expect(validateBroken((b) => (snap(b).heading = 0)).ok).toBe(true);
    expect(errorPaths(validateBroken((b) => (b.phases[0].wind.from = 360)))).toEqual(["/phases/0/wind/from"]);
    expect(errorPaths(validateBroken((b) => (snap(b).strength = 1.5)))).toEqual(["/phases/0/units/0/strength"]);
    expect(errorPaths(validateBroken((b) => (snap(b).strength = -0.1)))).toEqual(["/phases/0/units/0/strength"]);
    expect(validateBroken((b) => (snap(b).strength = 0)).ok).toBe(true);
    expect(validateBroken((b) => (snap(b).strength = 1)).ok).toBe(true);
    expect(errorPaths(validateBroken((b) => (b.phases[0].playback_rate = 0)))).toEqual(["/phases/0/playback_rate"]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].playback_rate = -5)))).toEqual(["/phases/0/playback_rate"]);
  });
});
