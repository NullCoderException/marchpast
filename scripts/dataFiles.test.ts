/**
 * The data files this repository ships are valid against schema v1.
 *
 * `npm run validate` is the command a person runs against `data/`; CI runs
 * `npm test`, so this is what keeps an invalid battle or map file off `main`.
 * Everything about the validator itself is tested in `validate.test.ts`
 * against fixtures; this checks only the real files.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatReports, validateDataDir } from "./validate.ts";

describe("data/", () => {
  it("holds data files, and every one of them is valid", () => {
    const reports = validateDataDir(path.resolve(__dirname, "..", "data"));
    // A summary line is the whole report when nothing failed; when something
    // did, it names the file and the JSON-pointer path, so the failure reads.
    expect(formatReports(reports)).toMatch(/^\d+ files? valid$/);
    expect(reports.length).toBeGreaterThan(0);
  });
});
