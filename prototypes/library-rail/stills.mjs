/**
 * Renders the library stills for #151's drawing, by the recipe #126 measured:
 * the real renderer on a `@napi-rs/canvas` canvas, with a `node:module` hook
 * answering the `.woff2` import and the two DOM touches stubbed.
 *
 * ADR-0025 fixes what a still is: the phase the battle marks (or the earliest
 * phase at the battle's engaged maximum), the view the battle opens in, cold
 * placement, cropped to the plate, 1200 CSS px wide at DPR 0.5. The plate
 * box's height is this ticket's to set, so it is an argument here.
 *
 *   node --experimental-strip-types stills.mjs [height]
 *
 * Writes `stills/<name>.png` beside itself. Nothing here is app code: it is a
 * throwaway that stands in for `vite/stills.ts` until the build has one.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..");

/** The plate box, in CSS pixels. ADR-0025 starts from 630 and hands the number here. */
const WIDTH = 1200;
const HEIGHT = Number(process.argv[2] ?? 630);
/** A wide canvas at a low ratio: width picks the layout mode, so a thumbnail is never a small canvas. */
const DPR = 0.5;

GlobalFonts.register(readFileSync(join(repo, "src/fonts/IMFellEnglish-Regular.woff2")), "IM Fell English");

globalThis.window = { devicePixelRatio: DPR };
globalThis.document = { createElement: () => createCanvas(1, 1) };

const { validateBattle } = await import(pathToFileURL(join(repo, "src/schema/validateBattle.ts")));
const { validateMap } = await import(pathToFileURL(join(repo, "src/schema/validateMap.ts")));
const { pictureAt } = await import(pathToFileURL(join(repo, "src/timeline/pictureAt.ts")));
const { clockIntervals } = await import(pathToFileURL(join(repo, "src/timeline/intervals.ts")));
const { createRenderer } = await import(pathToFileURL(join(repo, "src/render/renderer.ts")));
const { layoutCaption } = await import(pathToFileURL(join(repo, "src/render/drawCaption.ts")));

/** The phase a battle marks, or ADR-0025's fallback: the earliest phase at the battle's engaged maximum. */
function stillPhase(battle) {
  const marked = battle.phases.findIndex((phase) => phase.still === true);
  if (marked >= 0) return marked;
  const engaged = battle.phases.map((phase) => phase.units.filter((unit) => unit.state === "engaged").length);
  const most = Math.max(...engaged);
  return engaged.indexOf(most);
}

/** One still: the plate alone, at the box this run is measuring. */
function still(name, phaseIndex, root = join(repo, "data")) {
  const battle = validateBattle(JSON.parse(readFileSync(join(root, `battles/${name}.json`), "utf8"))).battle;
  const mapName = battle.map;
  const map = mapName
    ? validateMap(JSON.parse(readFileSync(join(root, `maps/${mapName}.geojson`), "utf8"))).map
    : undefined;

  const index = phaseIndex ?? stillPhase(battle);
  const picture = pictureAt(battle, clockIntervals(battle)[index].startSeconds);

  // The band is measured first, so the plate above it is the box we asked for.
  const scratch = createCanvas(WIDTH, 10).getContext("2d");
  const band = layoutCaption(scratch, battle, picture, WIDTH, "desktop").height;

  const canvas = createCanvas(WIDTH, HEIGHT + band);
  createRenderer(canvas).render(battle, map, picture, { view: "plate", level: 0 });

  // The crop: the top of the frame, the band left behind.
  const out = createCanvas(Math.round(WIDTH * DPR), Math.round(HEIGHT * DPR));
  out.getContext("2d").drawImage(canvas, 0, 0);
  mkdirSync(join(here, "stills"), { recursive: true });
  writeFileSync(join(here, "stills", `${name}.png`), out.toBuffer("image/png"));
  // The design canvas inlines every image as base64, so it takes the JPEG.
  writeFileSync(join(here, "stills", `${name}.jpg`), out.toBuffer("image/jpeg", 88));
  return { name, index, label: picture.label, band };
}

/**
 * The phase each battle marks, from ADR-0025's table. The flag itself is
 * `still: true` on the phase and does not exist in the files yet, so the four
 * indices stand in for it; the metric fallback above ties three ways at
 * Copenhagen and five at the Nile, which is the ADR's own argument.
 */
const MARKED = { cannae: 4, copenhagen: 3, nile: 7, trafalgar: 4 };

/** The three v0.3 battles that have no file yet, drawn from `sketch-data/` (see sketches.mjs). Phase 1 is the marked one in each. */
const SKETCHED = { alesia: 1, "little-bighorn": 1, midway: 1 };

for (const [name, index] of Object.entries(MARKED)) {
  const drawn = still(name, index);
  console.log(`${drawn.name}: phase ${drawn.index}, band ${drawn.band}px — ${drawn.label}`);
}
for (const [name, index] of Object.entries(SKETCHED)) {
  const drawn = still(name, index, join(here, "sketch-data"));
  console.log(`${drawn.name} (sketch): phase ${drawn.index}, band ${drawn.band}px — ${drawn.label}`);
}
