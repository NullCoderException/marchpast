import { describe, expect, it } from "vitest";
import { MINIMAL_BATTLE } from "./examples.ts";
import type { Battle } from "./types.ts";
import { validateBattle } from "./validateBattle.ts";

/** The minimal example from `docs/schema.md` 2.12, as a fresh deep copy each time so tests can break it freely. */
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

/** The message reported at `path`, for the rules whose wording is the point. */
function errorMessage(result: ReturnType<typeof validateBattle>, path: string): string {
  if (result.ok) throw new Error("expected validation to fail");
  const error = result.errors.find((e) => e.path === path);
  if (error === undefined) throw new Error(`no error at ${path}; got ${result.errors.map((e) => e.path).join(", ")}`);
  return error.message;
}

describe("validateBattle: a well-formed file", () => {
  it("accepts the minimal example and hands back the typed battle", () => {
    const result = validateBattle(minimalBattle());
    expect(result).toEqual({ ok: true, battle: MINIMAL_BATTLE });
  });

  it("accepts a file without the optional fields", () => {
    const result = validateBroken((b) => {
      delete b.map;
      delete b.end_day;
      delete b.sources["collingwood-dispatch"].url;
      delete b.sources["collingwood-dispatch"].license_note;
      for (const u of b.units) {
        delete u.commander;
        delete u.short_label;
      }
      for (const p of b.phases) {
        delete p.day;
        delete p.wind;
        delete p.notes;
      }
      delete b.phases[0].references[0].quote;
      delete b.phases[0].units[4].moves;
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
      delete b.summary;
      delete b.dates;
      delete b.sort_date;
      delete b.extent;
      delete b.scale_unit;
      delete b.end;
      delete b.license;
      delete b.sources;
      delete b.units;
      delete b.phases;
    });
    expect(errorPaths(result)).toEqual(
      expect.arrayContaining([
        "/title",
        "/summary",
        "/dates",
        "/sort_date",
        "/extent",
        "/scale_unit",
        "/end",
        "/license",
        "/sources",
        "/units",
        "/phases",
      ]),
    );
  });

  it("rejects unknown keys at every level", () => {
    const result = validateBroken((b) => {
      b.colour = "red";
      b.extent.depth = 3;
      b.sort_date.era = "AD";
      b.sources["collingwood-dispatch"].isbn = "x";
      b.units[0].ships = 12;
      b.phases[0].duration = 5;
      b.phases[0].wind.beaufort = 3;
      b.phases[0].references[0].page = 1;
      b.phases[0].units[0].position.alt = 0;
      b.phases[0].units[0].speed = 4;
      b.phases[0].units[4].moves[0].label = "escape";
      b.phases[0].units[4].moves[0].to.z = 1;
    });
    expect(errorPaths(result)).toEqual([
      "/colour",
      "/sort_date/era",
      "/extent/depth",
      "/sources/collingwood-dispatch/isbn",
      "/units/0/ships",
      "/phases/0/duration",
      "/phases/0/wind/beaufort",
      "/phases/0/references/0/page",
      "/phases/0/units/0/speed",
      "/phases/0/units/0/position/alt",
      "/phases/0/units/4/moves/0/label",
      "/phases/0/units/4/moves/0/to/z",
    ]);
  });

  it("rejects a v1 file's `date` as an unknown key", () => {
    expect(errorPaths(validateBroken((b) => (b.date = "21 October 1805")))).toEqual(["/date"]);
  });

  it("checks field types", () => {
    const result = validateBroken((b) => {
      b.title = 1;
      b.summary = null;
      b.dates = "21 October 1805";
      b.sort_date = "1805-10-21";
      b.extent = "big";
      b.map = 3;
      b.attribution = ["x"];
      b.sources = [];
      b.levels = "Columns";
      b.units = {};
      b.phases = "none";
    });
    expect(errorPaths(result)).toEqual([
      "/title",
      "/summary",
      "/dates",
      "/sort_date",
      "/extent",
      "/map",
      "/attribution",
      "/sources",
      "/levels",
      "/units",
      "/phases",
    ]);
  });

  it("checks nested field types", () => {
    const result = validateBroken((b) => {
      b.extent.north = "36";
      b.dates[0] = 1805;
      b.levels[1] = 2;
      b.sources["collingwood-dispatch"].label = 1;
      b.sources["collingwood-dispatch"].url = 1;
      b.units[1].commander = 7;
      b.units[1].short_label = 7;
      b.phases[0].playback_rate = "fast";
      b.phases[0].caption = 5;
      b.phases[0].notes = false;
      b.phases[0].references[0].locator = 1;
      b.phases[0].units[0].position.lat = "36";
      b.phases[0].units[0].heading = "north";
      b.phases[0].units[1].strength = "half";
      b.phases[0].units[4].moves[0].to = [36, -6];
    });
    expect(errorPaths(result)).toEqual([
      "/dates/0",
      "/extent/north",
      "/sources/collingwood-dispatch/label",
      "/sources/collingwood-dispatch/url",
      "/levels/1",
      "/units/1/short_label",
      "/units/1/commander",
      "/phases/0/playback_rate",
      "/phases/0/caption",
      "/phases/0/notes",
      "/phases/0/references/0/locator",
      "/phases/0/units/0/position/lat",
      "/phases/0/units/0/heading",
      "/phases/0/units/1/strength",
      "/phases/0/units/4/moves/0/to",
    ]);
  });

  it("checks enums", () => {
    const result = validateBroken((b) => {
      b.scale_unit = "miles";
      b.units[0].arm = "artillery";
      b.phases[0].wind.force = "strong";
      b.phases[0].units[0].formation = "crescent";
      b.phases[0].units[0].state = "struck";
      b.phases[0].units[4].moves[0].kind = "retreat";
    });
    expect(errorPaths(result)).toEqual([
      "/scale_unit",
      "/units/0/arm",
      "/phases/0/wind/force",
      "/phases/0/units/0/formation",
      "/phases/0/units/0/state",
      "/phases/0/units/4/moves/0/kind",
    ]);
  });

  it("checks battle-clock times are HH:MM", () => {
    const result = validateBroken((b) => {
      b.end = "5pm";
      b.phases[0].t = "05:40:00";
    });
    expect(errorPaths(result)).toEqual(["/end", "/phases/0/t"]);
  });

  it("checks position and extent ranges", () => {
    const result = validateBroken((b) => {
      b.extent.north = 91;
      b.extent.west = -181;
      b.phases[0].units[0].position.lat = -90.5;
      b.phases[0].units[0].position.lon = 180.5;
      b.phases[0].units[4].moves[0].to.lat = 100;
    });
    expect(errorPaths(result)).toEqual([
      "/extent/north",
      "/extent/west",
      "/phases/0/units/0/position/lat",
      "/phases/0/units/0/position/lon",
      "/phases/0/units/4/moves/0/to/lat",
    ]);
  });

  it("rejects non-finite numbers", () => {
    const result = validateBroken((b) => {
      b.phases[0].units[0].heading = Number.NaN;
      b.phases[0].playback_rate = Number.POSITIVE_INFINITY;
    });
    expect(errorPaths(result)).toEqual(["/phases/0/playback_rate", "/phases/0/units/0/heading"]);
  });

  it("requires at least one unit, one phase and one date", () => {
    expect(errorPaths(validateBroken((b) => (b.units = [])))).toContain("/units");
    expect(errorPaths(validateBroken((b) => (b.phases = [])))).toContain("/phases");
    expect(errorPaths(validateBroken((b) => (b.dates = [])))).toContain("/dates");
  });

  it("requires each array element to be an object", () => {
    const result = validateBroken((b) => {
      b.units.push("frigate");
      b.phases[0].references.push(null);
      b.phases[0].units[4].moves.push(1);
    });
    expect(errorPaths(result)).toEqual(["/units/5", "/phases/0/references/1", "/phases/0/units/4/moves/1"]);
  });

  it("requires each source to be an object", () => {
    expect(errorPaths(validateBroken((b) => (b.sources.mahan = "Mahan")))).toEqual(["/sources/mahan"]);
  });
});

/** Appends a copy of the first phase at `t` on day 0, so cross-phase rules have another phase to compare. */
function addPhase(b: any, t: string, id = `phase-at-${t}`): any {
  const phase = structuredClone(b.phases[0]);
  phase.id = id;
  phase.t = t;
  delete phase.day;
  b.phases.push(phase);
  return phase;
}

/**
 * Re-times the battle over several days: one `[day, t]` pair per phase (a
 * `day` of `undefined` leaves the field off), `end` on `end_day`, and one
 * `dates` entry per day the battle then spans. Everything else stays as it is,
 * so a day fixture reports the day rule it means and nothing else.
 */
function retime(b: any, phases: [day: number | undefined, t: string][], end: string, endDay?: number): void {
  while (b.phases.length < phases.length) addPhase(b, "23:59", `phase-${b.phases.length}`);
  b.phases.length = phases.length;
  phases.forEach(([day, t], index) => {
    const phase = b.phases[index];
    phase.id = `phase-${index}`;
    phase.t = t;
    if (day === undefined) delete phase.day;
    else phase.day = day;
  });
  b.end = end;
  if (endDay === undefined) delete b.end_day;
  else b.end_day = endDay;
  const lastDay = Math.max(endDay ?? 0, ...phases.map(([day]) => day ?? 0));
  b.dates = Array.from({ length: lastDay + 1 }, (_, index) => `day ${index}`);
}

/** Gives every phase one snapshot per roster unit, copied from the first unit's. */
function snapshotEveryUnit(b: any): void {
  const snapshot = structuredClone(b.phases[0].units[0]);
  for (const phase of b.phases) {
    phase.units = b.units.map((unit: any) => ({ ...structuredClone(snapshot), id: unit.id }));
  }
}

/** Replaces the roster with `count` parentless units and drops `levels`, so the battle has one level. */
function flatRoster(b: any, count: number): void {
  b.units = Array.from({ length: count }, (_, index) => ({
    id: `unit-${index}`,
    side: "British",
    label: `Unit ${index}`,
    arm: "ship",
  }));
  delete b.levels;
  snapshotEveryUnit(b);
}

/**
 * Replaces the roster with one root carrying `children` children plus a second,
 * childless root, and gives every phase the matching snapshots. Level 0 draws
 * the two roots; level 1 draws the children plus the childless root.
 */
function withChildren(b: any, children: number): void {
  const units = [{ id: "root", side: "British", label: "Root", arm: "ship" }];
  for (let index = 0; index < children; index += 1) {
    units.push({ id: `child-${index}`, side: "British", label: `Child ${index}`, arm: "ship", parent: "root" } as any);
  }
  units.push({ id: "lone", side: "British", label: "Lone", arm: "ship" });
  b.units = units;
  b.levels = ["Columns", "Squadrons"];
  snapshotEveryUnit(b);
}

describe("validateBattle: cross-field rules (schema.md 2.10)", () => {
  it("1. schema_version is exactly 2", () => {
    expect(errorPaths(validateBroken((b) => (b.schema_version = 3)))).toEqual(["/schema_version"]);
    expect(errorPaths(validateBroken((b) => (b.schema_version = "2")))).toEqual(["/schema_version"]);
  });

  it("1. a v1 file is rejected with a message naming what v2 needs", () => {
    const result = validateBroken((b) => {
      b.schema_version = 1;
      b.date = "21 October 1805";
      delete b.summary;
      delete b.dates;
      delete b.sort_date;
      for (const unit of b.units) delete unit.arm;
    });
    const message = errorMessage(result, "/schema_version");
    expect(message).toContain("summary");
    expect(message).toContain("dates");
    expect(message).toContain("date");
    expect(message).toContain("sort_date");
    expect(message).toContain("arm");
  });

  it("2. extent has south below north and west of east", () => {
    expect(errorPaths(validateBroken((b) => (b.extent.south = 36.61)))).toEqual(["/extent"]);
    expect(errorPaths(validateBroken((b) => (b.extent.south = 37)))).toEqual(["/extent"]);
    expect(errorPaths(validateBroken((b) => (b.extent.west = -6.0)))).toEqual(["/extent"]);
    expect(errorPaths(validateBroken((b) => (b.extent.west = 0)))).toEqual(["/extent"]);
  });

  it("3. unit ids and phase ids are unique", () => {
    expect(errorPaths(validateBroken((b) => (b.units[4].id = "lee-column")))).toContain("/units/4/id");
    expect(errorPaths(validateBroken((b) => addPhase(b, "14:00", "dawn-sighting")))).toEqual(["/phases/2/id"]);
  });

  it("4. phases strictly increase on (day, t)", () => {
    expect(errorPaths(validateBroken((b) => addPhase(b, "13:30")))).toEqual(["/phases/2/t"]);
    expect(errorPaths(validateBroken((b) => addPhase(b, "05:30")))).toEqual(["/phases/2/t"]);
    expect(validateBroken((b) => addPhase(b, "13:31")).ok).toBe(true);
  });

  it("4. a day 1 phase may not come before a day 0 one, and equal (day, t) pairs are rejected", () => {
    expect(
      errorPaths(validateBroken((b) => retime(b, [[0, "05:40"], [1, "06:00"], [0, "20:00"], [1, "21:00"]], "22:00", 1))),
    ).toEqual(["/phases/2/t"]);
    expect(errorPaths(validateBroken((b) => retime(b, [[0, "05:40"], [1, "06:00"], [1, "06:00"]], "07:00", 1)))).toEqual([
      "/phases/2/t",
    ]);
    expect(validateBroken((b) => retime(b, [[0, "13:30"], [1, "05:05"]], "14:00", 1)).ok).toBe(true);
  });

  it("4. the first phase is on day 0", () => {
    expect(errorPaths(validateBroken((b) => retime(b, [[1, "05:40"], [1, "13:30"]], "17:30", 1)))).toEqual(["/phases/0/day"]);
    expect(validateBroken((b) => retime(b, [[0, "05:40"], [0, "13:30"]], "17:30")).ok).toBe(true);
  });

  it("4. end is later than the last phase, on end_day", () => {
    expect(errorPaths(validateBroken((b) => (b.end = "13:30")))).toEqual(["/end"]);
    expect(errorPaths(validateBroken((b) => (b.end = "05:00")))).toEqual(["/end"]);
    // The last phase is on day 1, so an earlier time of day on day 1 is earlier.
    expect(errorPaths(validateBroken((b) => retime(b, [[0, "05:40"], [1, "13:30"]], "09:00", 1)))).toEqual(["/end"]);
    // The same time of day, one day later, is later.
    expect(validateBroken((b) => retime(b, [[0, "05:40"], [0, "13:30"]], "09:00", 1)).ok).toBe(true);
  });

  it("4. end_day is not less than the last phase's day", () => {
    expect(errorPaths(validateBroken((b) => retime(b, [[0, "05:40"], [1, "13:30"]], "17:30", 0)))).toEqual(["/end_day"]);
  });

  it("4. end_day defaults to the last phase's day", () => {
    const result = validateBroken((b) => {
      retime(b, [[0, "05:40"], [1, "13:30"]], "17:30", 1);
      delete b.end_day;
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.battle.end_day).toBeUndefined();
  });

  it("5. dates has one entry per day of the battle", () => {
    expect(errorPaths(validateBroken((b) => b.dates.push("22 October 1805")))).toEqual(["/dates"]);
    expect(
      errorPaths(
        validateBroken((b) => {
          retime(b, [[0, "05:40"], [1, "13:30"]], "17:30", 1);
          b.dates.pop();
        }),
      ),
    ).toEqual(["/dates"]);
    expect(
      errorPaths(
        validateBroken((b) => {
          retime(b, [[0, "05:40"], [1, "13:30"]], "17:30", 1);
          b.dates.push("3 August 1798");
        }),
      ),
    ).toEqual(["/dates"]);
    // `end_day` past the last phase's day still needs its own date.
    expect(
      errorPaths(
        validateBroken((b) => {
          retime(b, [[0, "05:40"], [0, "13:30"]], "01:00", 1);
          b.dates.pop();
        }),
      ),
    ).toEqual(["/dates"]);
  });

  it("6. sort_date is three integers, a real month and day, and no year zero", () => {
    expect(errorPaths(validateBroken((b) => (b.sort_date.month = 13)))).toEqual(["/sort_date/month"]);
    expect(errorPaths(validateBroken((b) => (b.sort_date.month = 0)))).toEqual(["/sort_date/month"]);
    expect(errorPaths(validateBroken((b) => (b.sort_date.day = 0)))).toEqual(["/sort_date/day"]);
    expect(errorPaths(validateBroken((b) => (b.sort_date.day = 32)))).toEqual(["/sort_date/day"]);
    expect(errorPaths(validateBroken((b) => (b.sort_date.year = 0)))).toEqual(["/sort_date/year"]);
    expect(errorPaths(validateBroken((b) => (b.sort_date.year = 1805.5)))).toEqual(["/sort_date/year"]);
    expect(errorPaths(validateBroken((b) => (b.sort_date.day = 21.5)))).toEqual(["/sort_date/day"]);
    // Cannae: BC is a negative year, and there is no year zero to sort into.
    expect(validateBroken((b) => (b.sort_date = { year: -216, month: 8, day: 2 })).ok).toBe(true);
  });

  it("7. every phase lists every roster unit exactly once and nothing else", () => {
    expect(errorPaths(validateBroken((b) => b.phases[0].units.pop()))).toEqual(["/phases/0/units"]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].units[4].id = "lee-column")))).toEqual([
      "/phases/0/units/4/id",
      "/phases/0/units",
    ]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].units[4].id = "frigates")))).toEqual([
      "/phases/0/units/4/id",
      "/phases/0/units",
    ]);
    const result = validateBroken((b) => {
      b.phases[1].units.push(structuredClone(b.phases[1].units[0]));
    });
    expect(errorPaths(result)).toEqual(["/phases/1/units/5/id"]);
  });

  it("8. every phase has a reference, each pointing at a source", () => {
    expect(errorPaths(validateBroken((b) => (b.phases[0].references = [])))).toEqual(["/phases/0/references"]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].references[0].source = "mahan")))).toEqual([
      "/phases/0/references/0/source",
    ]);
  });

  it("9. wind is all or nothing across phases", () => {
    const result = validateBroken((b) => {
      addPhase(b, "14:00");
      delete b.phases[1].wind;
    });
    expect(errorPaths(result)).toEqual(["/phases/1/wind"]);
    expect(
      validateBroken((b) => {
        for (const phase of b.phases) delete phase.wind;
      }).ok,
    ).toBe(true);
  });

  it("10. wind.from is present exactly when force is not calm", () => {
    expect(errorPaths(validateBroken((b) => (b.phases[0].wind = { force: "calm", from: 90 })))).toEqual([
      "/phases/0/wind/from",
    ]);
    expect(errorPaths(validateBroken((b) => (b.phases[0].wind = { force: "fresh" })))).toEqual(["/phases/0/wind/from"]);
    expect(validateBroken((b) => (b.phases[0].wind = { force: "calm" })).ok).toBe(true);
    expect(validateBroken((b) => (b.phases[0].wind = { force: "gale", from: 0 })).ok).toBe(true);
  });

  it("11. license is allowlisted and attribution follows its class", () => {
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

  it("keeps checking references and ranks when another source is malformed", () => {
    const result = validateBroken((b) => {
      b.sources.mahan = { label: "Mahan" };
      b.sources.wiki = { label: "Wikipedia", work: "Trafalgar", license: "CC-BY-SA-4.0" };
      b.phases[0].references.push({ source: "mahan", locator: "ch. 1" }, { source: "clowes", locator: "p. 1" });
    });
    expect(errorPaths(result)).toEqual([
      "/sources/mahan/work",
      "/sources/mahan/license",
      "/sources/wiki/license",
      "/phases/0/references/2/source",
    ]);
  });

  it("12. every source licence is allowlisted and ranks no higher than the file's", () => {
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

  it("13. map is a bare name", () => {
    for (const notBare of ["maps/cadiz", "cadiz.geojson", "..\\cadiz", "../cadiz", ""]) {
      expect(errorPaths(validateBroken((b) => (b.map = notBare))), notBare).toEqual(["/map"]);
    }
    expect(validateBroken((b) => (b.map = "cadiz-bay")).ok).toBe(true);
    expect(validateBroken((b) => (b.map = "Cádiz bay")).ok).toBe(true);
  });

  it("14. angles, strength and playback_rate are in range", () => {
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

  it("14. day and end_day are non-negative integers", () => {
    expect(errorPaths(validateBroken((b) => (b.phases[1].day = -1)))).toEqual(["/phases/1/day"]);
    expect(errorPaths(validateBroken((b) => (b.phases[1].day = 0.5)))).toEqual(["/phases/1/day"]);
    expect(errorPaths(validateBroken((b) => (b.phases[1].day = "1")))).toEqual(["/phases/1/day"]);
    expect(errorPaths(validateBroken((b) => (b.end_day = -1)))).toEqual(["/end_day"]);
    expect(errorPaths(validateBroken((b) => (b.end_day = 1.5)))).toEqual(["/end_day"]);
  });

  it("15. arm is required and on the allowlist", () => {
    expect(errorPaths(validateBroken((b) => delete b.units[1].arm))).toEqual(["/units/1/arm"]);
    expect(errorPaths(validateBroken((b) => (b.units[1].arm = "artillery")))).toEqual(["/units/1/arm"]);
    for (const arm of ["infantry", "cavalry", "ship"]) {
      expect(validateBroken((b) => (b.units[1].arm = arm)).ok, arm).toBe(true);
    }
  });

  it("16. parent names an earlier roster entry on the same side", () => {
    expect(errorPaths(validateBroken((b) => (b.units[1].parent = "van-of-the-van")))).toEqual(["/units/1/parent"]);
    // The parent must come first, so a forward reference is rejected even though the id exists.
    expect(errorPaths(validateBroken((b) => (b.units[1].parent = "combined-fleet")))).toEqual(["/units/1/parent"]);
    expect(errorPaths(validateBroken((b) => (b.units[1].parent = "weather-van")))).toEqual(["/units/1/parent"]);
    expect(
      errorPaths(
        validateBroken((b) => {
          b.units[4].parent = "weather-column";
        }),
      ),
    ).toEqual(["/units/4/parent"]);
  });

  it("17. levels is present exactly when some unit has a parent", () => {
    expect(
      errorPaths(
        validateBroken((b) => {
          delete b.levels;
        }),
      ),
    ).toEqual(["/levels"]);
    const flat = validateBroken((b) => {
      b.units = b.units.filter((unit: any) => unit.parent === undefined);
      const ids = new Set(b.units.map((unit: any) => unit.id));
      for (const phase of b.phases) phase.units = phase.units.filter((unit: any) => ids.has(unit.id));
      delete b.levels;
    });
    expect(flat.ok).toBe(true);
    expect(
      errorPaths(
        validateBroken((b) => {
          b.units = b.units.filter((unit: any) => unit.parent === undefined);
          const ids = new Set(b.units.map((unit: any) => unit.id));
          for (const phase of b.phases) phase.units = phase.units.filter((unit: any) => ids.has(unit.id));
        }),
      ),
    ).toEqual(["/levels"]);
  });

  it("17. levels has one name per level of the tree", () => {
    expect(errorPaths(validateBroken((b) => b.levels.push("Ships")))).toEqual(["/levels"]);
    expect(errorPaths(validateBroken((b) => b.levels.pop()))).toEqual(["/levels"]);
  });

  it("17. no level draws more than sixteen units, a childless root counted at every level", () => {
    // Level 1 draws the sixteen children and the childless root: seventeen.
    const seventeen = validateBroken((b) => withChildren(b, 16));
    expect(errorPaths(seventeen)).toEqual(["/units"]);
    expect(errorMessage(seventeen, "/units")).toContain("17");
    // Fifteen children plus the childless root is sixteen, which still reads,
    // on a roster of seventeen: the rule counts per level, never per roster.
    const sixteen = validateBroken((b) => withChildren(b, 15));
    expect(sixteen.ok).toBe(true);
    if (sixteen.ok) expect(sixteen.battle.units).toHaveLength(17);
  });

  it("17. a flat roster of seventeen is rejected at its only level", () => {
    expect(errorPaths(validateBroken((b) => flatRoster(b, 17)))).toEqual(["/units"]);
    expect(validateBroken((b) => flatRoster(b, 16)).ok).toBe(true);
  });
});

describe("validateBattle: what the validator deliberately does not cross-check", () => {
  it("accepts a ship drawn as a mass", () => {
    expect(validateBroken((b) => (b.phases[0].units[0].formation = "mass")).ok).toBe(true);
  });

  it("accepts a destroyed unit at full strength, and a broken one with moves", () => {
    expect(
      validateBroken((b) => {
        b.phases[0].units[0].state = "destroyed";
        b.phases[0].units[0].strength = 1;
      }).ok,
    ).toBe(true);
  });

  it("does not check that sort_date agrees with dates[0]", () => {
    expect(validateBroken((b) => (b.sort_date = { year: 1798, month: 8, day: 1 })).ok).toBe(true);
  });

  it("does not check a child's arm against its parent's", () => {
    expect(validateBroken((b) => (b.units[1].arm = "infantry")).ok).toBe(true);
  });
});
