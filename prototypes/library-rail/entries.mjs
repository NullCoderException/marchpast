/** The library entries for the seven, real four plus sketched three, as JSON for the canvas builder. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const { libraryEntry, compareBattles } = await import("../../src/data/library.ts");
const { validateBattle } = await import("../../src/schema/validateBattle.ts");
const load = (root, name) => libraryEntry(name, validateBattle(JSON.parse(readFileSync(join(root, `battles/${name}.json`), "utf8"))).battle);
const entries = [
  ...["cannae", "copenhagen", "nile", "trafalgar"].map((n) => load(join(repo, "data"), n)),
  ...["alesia", "little-bighorn", "midway"].map((n) => load(join(here, "sketch-data"), n)),
].sort(compareBattles);
writeFileSync(join(here, "entries.json"), `${JSON.stringify(entries, null, 2)}\n`);
for (const e of entries) console.log(e.name, "|", e.date, "|", e.sides.join(" / "), "|", e.summary.length, "chars");
