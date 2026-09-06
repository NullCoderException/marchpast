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
import { showNotice } from "./app/notice.ts";
import { loadPlateFont } from "./fonts/plate.ts";
import { createPlayer } from "./player/index.ts";
// PROTOTYPE (#39) — throwaway scaffolding; none of this belongs on main.
import { installHarness } from "./prototype/harness.ts";
import { settings } from "./prototype/state.ts";
import { stressBattle } from "./prototype/stress.ts";
import { mountSwitcher } from "./prototype/switcher.ts";

async function start(): Promise<void> {
  const canvas = document.querySelector("canvas");
  const controlsRoot = document.getElementById("controls");
  if (canvas === null || controlsRoot === null) throw new Error("index.html must hold a <canvas> and a #controls element");

  const name = battleNameFrom(window.location.search);
  const loading = loadBattle(name);

  // The plate face is bundled, so this is quick; if it fails all the same, the
  // fallback serif in every font string is better than a blank page.
  await loadPlateFont().catch((error: unknown) => console.warn("Sandtable: the plate typeface did not load", error));

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
  const battle = settings.stress > 0 ? stressBattle(result.battle, settings.stress) : result.battle;
  createPlayer({ canvas, controlsRoot, battle, map: result.map });
  mountSwitcher();
  installHarness(battle, result.map);
}

void start();
