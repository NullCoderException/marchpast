/**
 * The library, read off the disk: every battle file in `data/battles/`,
 * validated, as the list the site's front door and Picker are built from
 * (ADR-0011). Serving and writing that list is `serve-data.ts`; the shape of
 * it, and the order, is `src/data/library.ts`.
 *
 * Reading here rather than at runtime is the whole point of the file: the
 * front door shows four titles without downloading four phase lists.
 */
import fs from "node:fs";
import path from "node:path";
import { buildLibrary, type Library, type NamedBattle } from "../src/data/library.ts";
import { validateBattle } from "../src/schema/validateBattle.ts";
import { errorLine } from "../src/schema/validation.ts";

/** Where the battle files live inside the data directory. */
const BATTLES_DIR = "battles";

/**
 * The library the battle files in `dataDir/battles` make, oldest first.
 *
 * Throws when any of them fails to parse or validate, listing every offending
 * file with the same file / path / message lines `npm run validate` prints. A
 * battle the site cannot list is a broken build, not a shorter library; CI
 * runs `npm run validate` first, so this is belt and braces.
 */
export function readLibrary(dataDir: string): Library {
  const dir = path.join(dataDir, BATTLES_DIR);
  if (!fs.existsSync(dir)) return [];

  const battles: NamedBattle[] = [];
  const errors: string[] = [];
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
    const report = (lines: string[]): void => {
      errors.push(path.join(dir, file), ...lines);
    };

    let json: unknown;
    try {
      json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    } catch (error) {
      report([errorLine({ path: "", message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}` })]);
      continue;
    }

    const result = validateBattle(json);
    if (!result.ok) {
      report(result.errors.map(errorLine));
      continue;
    }
    battles.push({ name: path.basename(file, ".json"), battle: result.battle });
  }

  if (errors.length > 0) throw new Error(["Sandtable: the library cannot be built.", ...errors].join("\n"));
  return buildLibrary(battles);
}

/** The library as the bytes served and written: pretty-printed, so a build output stays readable. */
export function libraryJson(dataDir: string): string {
  return `${JSON.stringify(readLibrary(dataDir), null, 2)}\n`;
}
