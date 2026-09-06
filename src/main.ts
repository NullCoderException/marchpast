/**
 * The app entry: play the battle named on the URL.
 *
 * `?battle=<name>` (default `trafalgar`) is fetched through the path module
 * and validated, along with the map it names; the player takes over on
 * success, and the page shows every error on the plate, and in the console,
 * otherwise. The layout is the plate above and the controls beneath, set in
 * `index.html`; this file only fills the two slots.
 */
import { battleNameFrom } from "./app/battleName.ts";
import { formatLoadErrors, loadBattle } from "./app/loadBattle.ts";
import { paintNotice, type Notice } from "./app/notice.ts";
import { loadPlateFont } from "./fonts/plate.ts";
import { createPlayer } from "./player/index.ts";

/** Calls `onChange` whenever devicePixelRatio changes (zoom, or a move between monitors). */
function watchDevicePixelRatio(onChange: () => void): () => void {
  let query: MediaQueryList | undefined;
  const listenForNextChange = (): void => {
    query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener("change", handleChange, { once: true });
  };
  const handleChange = (): void => {
    onChange();
    listenForNextChange();
  };
  listenForNextChange();
  return () => query?.removeEventListener("change", handleChange);
}

/** Keeps `notice` painted on the canvas through resizes and zooms until the returned function is called. */
function showNotice(canvas: HTMLCanvasElement, notice: Notice): () => void {
  const paint = (): void => paintNotice(canvas, notice);
  window.addEventListener("resize", paint);
  const stopWatching = watchDevicePixelRatio(paint);
  paint();
  return () => {
    window.removeEventListener("resize", paint);
    stopWatching();
  };
}

async function start(): Promise<void> {
  const canvas = document.querySelector("canvas");
  const controlsRoot = document.getElementById("controls");
  if (canvas === null || controlsRoot === null) throw new Error("index.html must hold a <canvas> and a #controls element");

  const name = battleNameFrom(window.location.search);
  const loading = loadBattle(name);

  await loadPlateFont();
  const hideNotice = showNotice(canvas, { heading: document.title, lines: [`Loading ${name}…`] });
  const result = await loading;
  hideNotice();

  if (!result.ok) {
    const lines = formatLoadErrors(result.errors);
    console.error(`Sandtable could not load the battle "${name}":\n${lines.join("\n")}`);
    showNotice(canvas, { heading: `Could not load the battle “${name}”`, lines });
    return;
  }

  document.title = `${result.battle.title} — Sandtable`;
  createPlayer({ canvas, controlsRoot, battle: result.battle, map: result.map });
}

void start();
