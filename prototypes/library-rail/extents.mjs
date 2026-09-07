/** The extent aspect of each of the seven, so the still box's aspect can be set against the shape it has to hold. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");
const roots = { cannae: "data", copenhagen: "data", nile: "data", trafalgar: "data", alesia: "p", "little-bighorn": "p", midway: "p" };
for (const [name, kind] of Object.entries(roots)) {
  const root = kind === "data" ? join(repo, "data") : join(here, "sketch-data");
  const { extent } = JSON.parse(readFileSync(join(root, `battles/${name}.json`), "utf8"));
  const mid = ((extent.north + extent.south) / 2) * (Math.PI / 180);
  const h = (extent.north - extent.south) * 111.32;
  const w = (extent.east - extent.west) * 111.32 * Math.cos(mid);
  console.log(`${name.padEnd(15)} ${w.toFixed(1).padStart(6)} × ${h.toFixed(1).padStart(6)} km   aspect ${(w / h).toFixed(2)}`);
}
console.log("\nplate box aspects: 630 -> 1.90 : 1   760 -> 1.58 : 1   900 -> 1.33 : 1  (before the 20px plate margin)");
