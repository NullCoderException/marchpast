/**
 * The library read off a fixture directory: one entry per battle file, oldest
 * first, and a loud failure for a file the site could not list.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINIMAL_BATTLE } from "../src/schema/examples.ts";
import type { Battle, SortDate } from "../src/schema/types.ts";
import { libraryJson, readLibrary } from "./library.ts";

/** A data directory, thrown away after each test. */
let dataDir: string;

beforeEach(() => {
  dataDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sandtable-library-")), "data");
});

afterEach(() => {
  fs.rmSync(path.dirname(dataDir), { recursive: true, force: true });
});

/** Writes `battles/<name>.json`: the minimal example, titled and dated. */
function writeBattle(name: string, sort_date: SortDate, fields: Partial<Battle> = {}): void {
  const battle = { ...structuredClone(MINIMAL_BATTLE), title: `The Battle of ${name}`, sort_date, ...fields };
  const file = path.join(dataDir, "battles", `${name}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(battle, null, 2));
}

describe("the library read from the battle files", () => {
  it("is empty when there are no battle files, or no data directory at all", () => {
    expect(readLibrary(dataDir)).toEqual([]);
    fs.mkdirSync(path.join(dataDir, "battles"), { recursive: true });
    expect(readLibrary(dataDir)).toEqual([]);
  });

  it("holds one entry per battle file, oldest first", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    writeBattle("cannae", { year: -216, month: 8, day: 2 });
    const library = readLibrary(dataDir);
    expect(library.map((battle) => battle.name)).toEqual(["cannae", "trafalgar"]);
    expect(library[1]).toMatchObject({
      title: "The Battle of trafalgar",
      date: "21 October 1805",
      sides: ["British", "Combined Fleet"],
    });
  });

  it("ignores anything in the directory that is not a battle file", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    fs.writeFileSync(path.join(dataDir, "battles", "notes.md"), "not a battle");
    expect(readLibrary(dataDir).map((battle) => battle.name)).toEqual(["trafalgar"]);
  });

  it("refuses to build a library over a battle file that fails validation", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    writeBattle("broken", { year: 1798, month: 8, day: 1 }, { summary: 7 as unknown as string });
    expect(() => readLibrary(dataDir)).toThrow(/broken\.json[\s\S]*\/summary/);
  });

  it("refuses to build a library over a battle file that is not JSON", () => {
    fs.mkdirSync(path.join(dataDir, "battles"), { recursive: true });
    fs.writeFileSync(path.join(dataDir, "battles", "half-written.json"), "{");
    expect(() => readLibrary(dataDir)).toThrow(/half-written\.json[\s\S]*not valid JSON/);
  });
});

describe("the bytes written and served", () => {
  it("are the library as pretty-printed JSON, ending in a newline", () => {
    writeBattle("trafalgar", { year: 1805, month: 10, day: 21 });
    const json = libraryJson(dataDir);
    expect(JSON.parse(json)).toEqual(readLibrary(dataDir));
    expect(json.endsWith("\n")).toBe(true);
    expect(json).toContain('\n  {\n    "name": "trafalgar"');
  });
});
