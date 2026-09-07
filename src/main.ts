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
import { createLibraryPage } from "./app/libraryPage.ts";
import { formatLoadErrors, type LoadError } from "./app/load.ts";
import { loadBattle, type LoadResult } from "./app/loadBattle.ts";
import { loadLibrary, type LibraryResult } from "./app/loadLibrary.ts";
import { mapFixtureNameFrom, MAP_FIXTURES, mapFixturesThereAre } from "./app/mapFixtures.ts";
import { showNotice } from "./app/notice.ts";
import { loadFace, prefetchFaces } from "./fonts/faces.ts";
import { applySurface, createLibraryStrip, createPlayer, openingView } from "./player/index.ts";
import { DEFAULT_VIEW } from "./render/index.ts";

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
    await loadOpeningFace();
    playFixture(page, fixture, mapFixtureNameFrom(window.location.search));
    return;
  }

  const name = battleNameFrom(window.location.search);
  // Both pages want the library: it is the front door's list, and it fills the
  // player's Picker. Every fetch is started before the face is awaited.
  const library = loadLibrary();

  if (name === null) {
    await loadOpeningFace();
    await showLibrary(page, library);
    return;
  }

  const battle = loadBattle(name);
  await loadOpeningFace();
  await playBattle(page, name, battle, library);
}

/** The front door: every battle, oldest first, as a page rather than a plate. */
async function showLibrary(page: Page, loading: Promise<LibraryResult>): Promise<void> {
  // The notice below is the *surface* and not the library: it stands where a
  // plate would be and is drawn in the strip's tokens (#130). There is no
  // opening view on this route (ADR-0023), so it takes the default view's, and
  // the list that follows declares the brand's own over them (library.css) —
  // the library page follows no view, and never has.
  applySurface(DEFAULT_VIEW);
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
    wayBackOnly(page);
    return;
  }

  nameThePage(page, result.battle.title);
  // Whatever else there is to fetch goes after first paint, never before it.
  prefetchFaces(OPENING_FACE);
  createPlayer({
    canvas: page.canvas,
    controlsRoot: page.controlsRoot,
    battle: result.battle,
    map: result.map,
    // A library that would not load costs the Picker, not the battle.
    picker: library.ok
      ? { battles: library.library, current: name, choose: (chosen) => window.location.assign(battleQuery(chosen)) }
      : undefined,
    view: OPENING_VIEW.id,
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
    wayBackOnly(page);
    return;
  }
  const map = mapName === undefined ? undefined : MAP_FIXTURES[mapName];
  if (mapName !== undefined && map === undefined) {
    console.error(`Marchpast has no map fixture "${mapName}"`);
    showNotice(page.canvas, { heading: `No map fixture “${mapName}”`, lines: [mapFixturesThereAre()] });
    wayBackOnly(page);
    return;
  }
  nameThePage(page, battle.title);
  prefetchFaces(OPENING_FACE);
  createPlayer({ canvas: page.canvas, controlsRoot: page.controlsRoot, battle, map, view: OPENING_VIEW.id });
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

/**
 * The strip with nothing on it but the way out, which is what a page that
 * could not build a player carries. The player themes the surface itself, so
 * this is the one route where nothing else would: without it the notice and
 * the strip would have no tokens to inherit and the link would come up in the
 * browser's own blue (ADR-0023).
 */
function wayBackOnly(page: Page): void {
  applySurface(OPENING_VIEW);
  page.controlsRoot.append(createLibraryStrip());
}

/**
 * The view this visit opens in: the one the last visit left, or the default
 * where there is none and on the library route, which offers no view at all
 * (ADR-0023). Read once, here, at the top of the page: `main.ts` reads the
 * memory and the player writes it.
 */
const OPENING_VIEW = openingView();

/**
 * The face the opening view is set in. It blocks the first frame, because
 * canvas text falls back silently to whatever font is there (ADR-0009); every
 * other view's face is fetched at idle once something is on the screen, and a
 * switch to a view whose face has not resolved waits rather than drawing in a
 * fallback (ADR-0021, ADR-0023). Today every view is engraved and there is one
 * face, so the prefetch has nothing to do; #175 gives it a second entry.
 */
const OPENING_FACE = OPENING_VIEW.type.face;

/** It is bundled, so this is quick; if it fails all the same, the fallback serif in every font string is better than a blank page. */
function loadOpeningFace(): Promise<void> {
  return loadFace(OPENING_FACE).catch((error: unknown) => console.warn("Marchpast: the opening view's typeface did not load", error));
}

/** What stopped the page, where the plate would be and in the console: file, path and message, as `npm run validate` prints them. */
function report(canvas: HTMLCanvasElement, heading: string, errors: readonly LoadError[]): void {
  const lines = formatLoadErrors(errors);
  console.error(`Marchpast: ${heading}\n${lines.join("\n")}`);
  showNotice(canvas, { heading, lines });
}

void start();
