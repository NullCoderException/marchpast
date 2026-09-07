/**
 * The data files this repository ships are valid against schema v2.
 *
 * `npm run validate` is the command a person runs against `data/`; CI runs
 * `npm test`, so this is what keeps an invalid battle or map file off `main`.
 * Everything about the validator itself is tested in `validate.test.ts`
 * against fixtures; this checks only the real files.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatReports, validateDataDir } from "./validate.ts";

const dataDir = path.resolve(__dirname, "..", "data");

describe("data/", () => {
  it("holds data files, and every one of them is valid", () => {
    const reports = validateDataDir(dataDir);
    // A summary line is the whole report when nothing failed; when something
    // did, it names the file and the JSON-pointer path, so the failure reads.
    expect(formatReports(reports)).toMatch(/^\d+ files? valid$/);
    expect(reports.length).toBeGreaterThan(0);
  });
});

/**
 * The Nile is the one battle that crosses midnight, and the day offset is the
 * whole reason `day`, `end_day` and a second `dates` entry exist (ADR-0013).
 * The validator checks the offset is *consistent*; only this checks the file
 * still uses it, so an edit that quietly collapsed the battle back into one
 * day would fail here rather than validate happily.
 */
describe("data/battles/nile.json", () => {
  const nile = JSON.parse(fs.readFileSync(path.join(dataDir, "battles", "nile.json"), "utf-8"));

  it("runs from 1 August into 2 August", () => {
    expect(nile.dates).toHaveLength(2);
    expect(nile.phases.map((phase: { day?: number }) => phase.day ?? 0).slice(-3)).toEqual([0, 1, 1]);
    expect(nile.end_day).toBe(1);
  });

  it("cites every phase with a verbatim quote", () => {
    const unquoted = nile.phases
      .filter((phase: { references: { quote?: string }[] }) => !phase.references.some((reference) => reference.quote))
      .map((phase: { id: string }) => phase.id);
    expect(unquoted).toEqual([]);
  });
});
