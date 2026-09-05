import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINIMAL_BATTLE, MINIMAL_MAP } from "../src/schema/examples.ts";
import { formatReports, validateDataDir } from "./validate.ts";

let dataDir: string;

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "sandtable-validate-"));
});

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function writeBattle(name: string, battle: unknown): string {
  return writeFile(path.join("battles", `${name}.json`), JSON.stringify(battle, null, 2));
}

function writeMap(name: string, map: unknown): string {
  return writeFile(path.join("maps", `${name}.geojson`), JSON.stringify(map, null, 2));
}

function writeFile(relative: string, text: string): string {
  const file = path.join(dataDir, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

/** `[file, path]` pairs for every error, with `file` relative to the data directory and forward-slashed. */
function errorLocations(reports: ReturnType<typeof validateDataDir>): [string, string][] {
  return reports.flatMap((report) =>
    report.errors.map((error): [string, string] => [path.relative(dataDir, report.file).replaceAll("\\", "/"), error.path]),
  );
}

describe("validateDataDir", () => {
  it("succeeds on an empty data directory", () => {
    expect(validateDataDir(dataDir)).toEqual([]);
    fs.mkdirSync(path.join(dataDir, "battles"));
    fs.mkdirSync(path.join(dataDir, "maps"));
    expect(validateDataDir(dataDir)).toEqual([]);
  });

  it("validates every battle and map and reports each file once", () => {
    writeBattle("trafalgar", MINIMAL_BATTLE);
    writeMap("cadiz", MINIMAL_MAP);
    const reports = validateDataDir(dataDir);
    expect(reports.map((r) => path.relative(dataDir, r.file).replaceAll("\\", "/"))).toEqual([
      "battles/trafalgar.json",
      "maps/cadiz.geojson",
    ]);
    expect(reports.every((r) => r.errors.length === 0)).toBe(true);
  });

  it("reports a broken file with its path", () => {
    const battle = structuredClone(MINIMAL_BATTLE) as any;
    battle.phases[0].units[0].heading = 400;
    writeBattle("trafalgar", battle);
    writeMap("cadiz", MINIMAL_MAP);
    expect(errorLocations(validateDataDir(dataDir))).toEqual([["battles/trafalgar.json", "/phases/0/units/0/heading"]]);
  });

  it("reports a battle whose map file is missing", () => {
    writeBattle("trafalgar", MINIMAL_BATTLE);
    expect(errorLocations(validateDataDir(dataDir))).toEqual([["battles/trafalgar.json", "/map"]]);
  });

  it("does not require a map for a battle without one", () => {
    const battle = structuredClone(MINIMAL_BATTLE) as any;
    delete battle.map;
    writeBattle("plain", battle);
    expect(errorLocations(validateDataDir(dataDir))).toEqual([]);
  });

  it("reports unparseable JSON at the document root", () => {
    writeFile(path.join("battles", "broken.json"), "{ not json");
    writeFile(path.join("maps", "broken.geojson"), "");
    expect(errorLocations(validateDataDir(dataDir))).toEqual([
      ["battles/broken.json", ""],
      ["maps/broken.geojson", ""],
    ]);
  });

  it("validates only the given files when paths are passed, still following a battle's map", () => {
    const good = writeBattle("trafalgar", MINIMAL_BATTLE);
    const broken = structuredClone(MINIMAL_MAP) as any;
    broken.features[0].properties.kind = "sea";
    writeMap("cadiz", broken);
    const other = structuredClone(MINIMAL_BATTLE) as any;
    other.title = 1;
    writeBattle("other", other);

    const reports = validateDataDir(dataDir, [good]);
    expect(reports.map((r) => path.relative(dataDir, r.file).replaceAll("\\", "/"))).toEqual([
      "battles/trafalgar.json",
      "maps/cadiz.geojson",
    ]);
    expect(errorLocations(reports)).toEqual([["maps/cadiz.geojson", "/features/0/properties/kind"]]);
  });

  it("rejects a file it does not know how to validate", () => {
    const stray = writeFile("notes.txt", "hello");
    expect(errorLocations(validateDataDir(dataDir, [stray]))).toEqual([["notes.txt", ""]]);
  });
});

describe("formatReports", () => {
  it("prints each error as file, path and message, then a summary", () => {
    const text = formatReports([
      { file: "data/battles/a.json", errors: [] },
      { file: "data/battles/b.json", errors: [{ path: "/end", message: "required" }] },
    ]);
    expect(text).toContain("data/battles/b.json");
    expect(text).toContain("/end: required");
    expect(text).toMatch(/1 error in 1 of 2 files/);
  });

  it("says so when everything is valid", () => {
    expect(formatReports([{ file: "x.json", errors: [] }])).toMatch(/1 file valid/);
    expect(formatReports([])).toMatch(/no data files found/);
  });
});

describe("npm run validate", () => {
  const script = path.resolve(__dirname, "validate.ts");
  const run = (cwd: string, args: string[] = []) => {
    try {
      const stdout = execFileSync(
        process.execPath,
        ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, ...args],
        { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
      );
      return { code: 0, stdout };
    } catch (error) {
      const failure = error as { status: number; stdout: string; stderr: string };
      return { code: failure.status, stdout: failure.stdout + failure.stderr };
    }
  };

  it("exits 0 on an empty data directory", () => {
    fs.mkdirSync(path.join(dataDir, "data"));
    expect(run(dataDir)).toMatchObject({ code: 0 });
  });

  it("exits 1 and names the path on a broken file", () => {
    const battle = structuredClone(MINIMAL_BATTLE) as any;
    battle.end = "05:00";
    fs.mkdirSync(path.join(dataDir, "data", "battles"), { recursive: true });
    fs.writeFileSync(path.join(dataDir, "data", "battles", "late.json"), JSON.stringify(battle));
    fs.mkdirSync(path.join(dataDir, "data", "maps"), { recursive: true });
    fs.writeFileSync(path.join(dataDir, "data", "maps", "cadiz.geojson"), JSON.stringify(MINIMAL_MAP));
    const result = run(dataDir);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("late.json");
    expect(result.stdout).toContain("/end");
  });
});
