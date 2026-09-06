/**
 * `npm run validate [paths...]`: checks the data files against schema v2.
 *
 * With no arguments it validates every `data/battles/*.json` and
 * `data/maps/*.geojson` under the current directory; with arguments, only
 * those files. For each battle whose `map` is set it also checks that
 * `data/maps/<map>.geojson` exists and is valid. Every error is printed with
 * its file and JSON-pointer path, and the exit code is 1 when there is any.
 *
 * Runs on Node's built-in type stripping, which is why every import in
 * `src/schema/` spells out its `.ts` extension.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBattle } from "../src/schema/validateBattle.ts";
import { validateMap } from "../src/schema/validateMap.ts";
import { errorLine, type ValidationError } from "../src/schema/validation.ts";

/** The outcome for one file: no errors means it is valid. */
export interface FileReport {
  file: string;
  errors: ValidationError[];
}

/** Every battle and map file under `dataDir`, in a stable order. */
function defaultFiles(dataDir: string): string[] {
  const list = (subdir: string, extension: string): string[] => {
    const dir = path.join(dataDir, subdir);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(extension))
      .sort()
      .map((name) => path.join(dir, name));
  };
  return [...list("battles", ".json"), ...list("maps", ".geojson")];
}

/**
 * Validates `files` (default: everything under `dataDir`), following each
 * battle's `map` to `dataDir/maps/<map>.geojson`. Each file is reported once,
 * in the order first encountered.
 */
export function validateDataDir(dataDir: string, files: string[] = defaultFiles(dataDir)): FileReport[] {
  const reports = new Map<string, FileReport>();
  const queue = files.map((file) => path.resolve(file));

  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (reports.has(file)) continue;
    const report = validateFile(file);
    reports.set(file, report);
    if (report.mapName !== undefined) {
      const mapFile = path.resolve(dataDir, "maps", `${report.mapName}.geojson`);
      if (fs.existsSync(mapFile)) queue.push(mapFile);
      else report.errors.push({ path: "/map", message: `map file not found: ${path.relative(dataDir, mapFile)}` });
    }
  }
  return [...reports.values()].map(({ file, errors }) => ({ file, errors }));
}

/** One file's report plus, for a valid battle, the map it points at. */
function validateFile(file: string): FileReport & { mapName?: string } {
  const json = readJson(file);
  if (!json.ok) return { file, errors: [{ path: "", message: json.message }] };

  switch (path.extname(file)) {
    case ".json": {
      const result = validateBattle(json.value);
      if (!result.ok) return { file, errors: result.errors };
      return { file, errors: [], mapName: result.battle.map };
    }
    case ".geojson": {
      const result = validateMap(json.value);
      return { file, errors: result.ok ? [] : result.errors };
    }
    default:
      return { file, errors: [{ path: "", message: "not a battle (.json) or map (.geojson) file" }] };
  }
}

function readJson(file: string): { ok: true; value: unknown } | { ok: false; message: string } {
  let text: string;
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch (error) {
    return { ok: false, message: `cannot read file: ${(error as Error).message}` };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, message: `not valid JSON: ${(error as Error).message}` };
  }
}

/** Human-readable report: one block per failing file, then a one-line summary. */
export function formatReports(reports: FileReport[]): string {
  const lines: string[] = [];
  let errorCount = 0;
  for (const report of reports) {
    if (report.errors.length === 0) continue;
    errorCount += report.errors.length;
    lines.push(report.file);
    for (const error of report.errors) lines.push(errorLine(error));
  }
  const failing = reports.filter((report) => report.errors.length > 0).length;
  if (reports.length === 0) lines.push("no data files found");
  else if (failing === 0) lines.push(`${reports.length} ${reports.length === 1 ? "file" : "files"} valid`);
  else lines.push(`${errorCount} ${errorCount === 1 ? "error" : "errors"} in ${failing} of ${reports.length} files`);
  return lines.join("\n");
}

function main(args: string[]): number {
  const dataDir = path.resolve("data");
  const reports = args.length > 0 ? validateDataDir(dataDir, args) : validateDataDir(dataDir);
  console.log(formatReports(reports));
  return reports.some((report) => report.errors.length > 0) ? 1 : 0;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
