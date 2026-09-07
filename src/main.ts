/**
 * The app entry: the library, or the battle the URL names.
 *
 * With `?battle=<name>` on the URL that battle is fetched through the path
 * module and validated, along with the map it names, and the player takes
 * over. With no battle named the page is the library instead, the site's front
 * door; there is no default battle (ADR-0011). Either way the page shows every
 * error where the plate would be, as words rather than as a painting (#130),
 * and in the console.
 *
 * `?fixture=<name>` plays a renderer fixture from `app/fixtures.ts` instead:
 * no fetch, no library and no Picker. It is a way to look at a slice before
 * its battle file exists, and nothing else uses it; both registers are empty
 * just now, so the route answers with the notice below. `&map=<name>` draws a
 * map fixture from `app/mapFixtures.ts` under it, for the same reason; without
 * it a fixture plays over bare parchment.
 *
 * The layout is the heading, the plate and the controls beneath it, all inside
 * one `<main>` set out by `index.html`; this file only fills those slots, and
 * takes the landmark down whole when the page is the library, which has no
 * plate to draw and nothing to control.
 */
import { battleNameFrom, battleQuery } from "./app/battleName.ts";
import { fixtureNameFrom, FIXTURES, fixturesThereAre } from "./app/fixtures.ts";
import { createLibraryLink, createLibraryPage } from "./app/libraryPage.ts";
import { formatLoadErrors, type LoadError } from "./app/load.ts";
import { loadBattle, type LoadResult } from "./app/loadBattle.ts";
import { loadLibrary, type LibraryResult } from "./app/loadLibrary.ts";
import { mapFixtureNameFrom, MAP_FIXTURES, mapFixturesThereAre } from "./app/mapFixtures.ts";
import { showNotice } from "./app/notice.ts";
import { loadPlateFont } from "./fonts/plate.ts";
import { createPlayer } from "./player/index.ts";

/** The player's landmark and the three slots inside it that `index.html` sets out. */
interface Page {
  /** The `<main>` the plate, its heading and the strip sit in; the library route takes it off whole. */
  main: HTMLElement;
  /** The page's own heading, read but never seen: the battle's title once one is playing. */
  heading: HTMLElement;
  canvas: HTMLCanvasElement;
  controlsRoot: HTMLElement;
}

async function start(): Promise<void> {
  const main = document.getElementById("player");
  const heading = document.getElementById("title");
  const canvas = document.querySelector("canvas");
  const controlsRoot = document.getElementById("controls");
  if (main === null || heading === null || canvas === null || controlsRoot === null) {
    throw new Error("index.html must hold a #player <main> around a #title heading, a <canvas> and a #controls element");
  }
  const page: Page = { main, heading, canvas, controlsRoot };

  // A fixture is not a battle: nothing is fetched, so the library is never asked for either.
  const fixture = fixtureNameFrom(window.location.search);
  if (fixture !== undefined) {
    await loadFace();
    playFixture(page, fixture, mapFixtureNameFrom(window.location.search));
    return;
  }

  const name = battleNameFrom(window.location.search);
  // Both pages want the library: it is the front door's list, and it fills the
  // player's Picker. Every fetch is started before the face is awaited.
  const library = loadLibrary();

  if (name === null) {
    await loadFace();
    await showLibrary(page, library);
    return;
  }

  const battle = loadBattle(name);
  await loadFace();
  await playBattle(page, name, battle, library);
}

/** The front door: every battle, oldest first, as a page rather than a plate. */
async function showLibrary(page: Page, loading: Promise<LibraryResult>): Promise<void> {
  const hideNotice = showNotice(page.canvas, { heading: document.title, lines: ["Loading the library…"] });
  const result = await loading;
  hideNotice();

  if (!result.ok) {
    report(page.canvas, "Could not load the library", result.errors);
    return;
  }

  // The title is index.html's library title already: only a battle changes it.
  // The whole landmark goes, heading and all: the library page is a `<main>`
  // with a masthead of its own, and two of either would be one too many.
  page.main.remove();
  document.documentElement.classList.add("st-library-page");
  document.body.append(createLibraryPage(result.library));
}

/** One battle, played. An unknown or invalid name keeps the notice and gains the way back to the library. */
async function playBattle(page: Page, name: string, loading: Promise<LoadResult>, loadingLibrary: Promise<LibraryResult>): Promise<void> {
  const hideNotice = showNotice(page.canvas, { heading: document.title, lines: [`Loading ${name}…`] });
  // Both were asked for at once, and the notice holds the plate until both are
  // in: the Picker is part of the controls the player builds, so it cannot be
  // hung on the strip afterwards.
  const [result, library] = await Promise.all([loading, loadingLibrary]);
  hideNotice();

  if (!result.ok) {
    report(page.canvas, `Could not load the battle “${name}”`, result.errors);
    page.controlsRoot.append(createLibraryLink());
    return;
  }

  nameThePage(page, result.battle.title);
  createPlayer({
    canvas: page.canvas,
    controlsRoot: page.controlsRoot,
    battle: result.battle,
    map: result.map,
    // A library that would not load costs the Picker, not the battle.
    picker: library.ok
      ? { battles: library.library, current: name, choose: (chosen) => window.location.assign(battleQuery(chosen)) }
      : undefined,
  });
}

/**
 * A renderer fixture straight from code, over a map fixture when the URL names
 * one. It carries no Picker: a fixture is not in the library, so there is
 * nothing for the chooser to put it among.
 */
function playFixture(page: Page, name: string, mapName: string | undefined): void {
  const battle = FIXTURES[name];
  if (battle === undefined) {
    console.error(`Marchpast has no fixture "${name}"`);
    showNotice(page.canvas, { heading: `No fixture “${name}”`, lines: [fixturesThereAre()] });
    page.controlsRoot.append(createLibraryLink());
    return;
  }
  const map = mapName === undefined ? undefined : MAP_FIXTURES[mapName];
  if (mapName !== undefined && map === undefined) {
    console.error(`Marchpast has no map fixture "${mapName}"`);
    showNotice(page.canvas, { heading: `No map fixture “${mapName}”`, lines: [mapFixturesThereAre()] });
    page.controlsRoot.append(createLibraryLink());
    return;
  }
  nameThePage(page, battle.title);
  createPlayer({ canvas: page.canvas, controlsRoot: page.controlsRoot, battle, map });
}

/**
 * What the page is now called, in both places a battle's title belongs: the
 * document title, and the page's own heading, which is read but never seen
 * (#130). The heading is the only `h1` on the player route.
 */
function nameThePage(page: Page, title: string): void {
  document.title = `${title} — Marchpast`;
  page.heading.textContent = title;
}

/** The plate face. It is bundled, so this is quick; if it fails all the same, the fallback serif in every font string is better than a blank page. */
function loadFace(): Promise<void> {
  return loadPlateFont().catch((error: unknown) => console.warn("Marchpast: the plate typeface did not load", error));
}

/** What stopped the page, where the plate would be and in the console: file, path and message, as `npm run validate` prints them. */
function report(canvas: HTMLCanvasElement, heading: string, errors: readonly LoadError[]): void {
  const lines = formatLoadErrors(errors);
  console.error(`Marchpast: ${heading}\n${lines.join("\n")}`);
  showNotice(canvas, { heading, lines });
}

void start();
