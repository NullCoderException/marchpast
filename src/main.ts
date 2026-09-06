/**
 * The app entry: the Library, or the battle the URL names.
 *
 * With `?battle=<name>` on the URL that battle is fetched through the path
 * module and validated, along with the map it names, and the player takes
 * over. With no battle named the page is the Library instead, the site's front
 * door, built from `data/index.json`; there is no default battle (ADR-0011).
 * Either way the page shows every error on the plate, and in the console.
 *
 * The layout is the plate above and the controls beneath, set in `index.html`;
 * this file only fills the two slots, and takes them both down again when the
 * page is the Library, which has no plate to draw and nothing to control.
 */
import { battleNameFrom, battleQuery } from "./app/battleName.ts";
import { createLibrary, createLibraryLink } from "./app/library.ts";
import { formatLoadErrors, type LoadError } from "./app/load.ts";
import { loadBattle, type LoadResult } from "./app/loadBattle.ts";
import { loadIndex, type IndexResult } from "./app/loadIndex.ts";
import { showNotice } from "./app/notice.ts";
import { loadPlateFont } from "./fonts/plate.ts";
import { createPlayer } from "./player/index.ts";

/** The two slots `index.html` sets out. */
interface Page {
  canvas: HTMLCanvasElement;
  controlsRoot: HTMLElement;
}

async function start(): Promise<void> {
  const canvas = document.querySelector("canvas");
  const controlsRoot = document.getElementById("controls");
  if (canvas === null || controlsRoot === null) throw new Error("index.html must hold a <canvas> and a #controls element");
  const page: Page = { canvas, controlsRoot };

  const name = battleNameFrom(window.location.search);
  // Both pages want the index: it is the Library's list, and it fills the
  // player's Picker. Every fetch starts before the face is awaited.
  const index = loadIndex();
  const battle = name === null ? undefined : loadBattle(name);

  // The plate face is bundled, so this is quick; if it fails all the same, the
  // fallback serif in every font string is better than a blank page.
  await loadPlateFont().catch((error: unknown) => console.warn("Sandtable: the plate typeface did not load", error));

  // `battle` is set exactly when the URL named one; the two move together.
  if (name === null || battle === undefined) await showLibrary(page, index);
  else await playBattle(page, name, battle, index);
}

/** The front door: every battle, oldest first, as a page rather than a plate. */
async function showLibrary(page: Page, loading: Promise<IndexResult>): Promise<void> {
  const hideNotice = showNotice(page.canvas, { heading: document.title, lines: ["Loading the library…"] });
  const result = await loading;
  hideNotice();

  if (!result.ok) {
    report(page.canvas, "Could not load the library", result.errors);
    return;
  }

  // The title is index.html's `Sandtable` already: only a battle changes it.
  page.canvas.remove();
  page.controlsRoot.remove();
  document.documentElement.classList.add("st-library-page");
  document.body.append(createLibrary(result.index));
}

/** One battle, played. An unknown or invalid name keeps the notice and gains the way back to the Library. */
async function playBattle(page: Page, name: string, loading: Promise<LoadResult>, index: Promise<IndexResult>): Promise<void> {
  const hideNotice = showNotice(page.canvas, { heading: document.title, lines: [`Loading ${name}…`] });
  const result = await loading;
  hideNotice();

  if (!result.ok) {
    report(page.canvas, `Could not load the battle “${name}”`, result.errors);
    page.controlsRoot.append(createLibraryLink());
    return;
  }

  document.title = `${result.battle.title} — Sandtable`;
  const library = await index;
  createPlayer({
    canvas: page.canvas,
    controlsRoot: page.controlsRoot,
    battle: result.battle,
    map: result.map,
    // A Library that would not load costs the Picker, not the battle.
    picker: library.ok
      ? { battles: library.index, current: name, choose: (chosen) => window.location.assign(battleQuery(chosen)) }
      : undefined,
  });
}

/** What stopped the page, on the plate and in the console: file, path and message, as `npm run validate` prints them. */
function report(canvas: HTMLCanvasElement, heading: string, errors: readonly LoadError[]): void {
  const lines = formatLoadErrors(errors);
  console.error(`Sandtable: ${heading}\n${lines.join("\n")}`);
  showNotice(canvas, { heading, lines });
}

void start();
