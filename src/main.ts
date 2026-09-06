import { loadPlateFont, plateFont } from "./fonts/plate.ts";
import { FIXTURES } from "./render/fixtures/trafalgar.ts";
import { createRenderer, fitBackingStore } from "./render/index.ts";
import { INK, PARCHMENT } from "./render/style.ts";

/** Calls `onChange` whenever devicePixelRatio changes (zoom, or a move between monitors). */
function watchDevicePixelRatio(onChange: () => void): void {
  const listenForNextChange = (): void => {
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener(
      "change",
      () => {
        onChange();
        listenForNextChange();
      },
      { once: true },
    );
  };
  listenForNextChange();
}

/** The placeholder until a battle plays: the title on parchment. */
function paintTitle(canvas: HTMLCanvasElement, message: string): void {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is not available in this browser");
  const { width, height } = fitBackingStore(canvas, ctx);

  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = INK;
  ctx.font = plateFont(Math.max(24, Math.min(width, height) / 12));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, width / 2, height / 2);
}

async function start(): Promise<void> {
  await loadPlateFont();

  const canvas = document.createElement("canvas");
  document.body.append(canvas);

  // `?fixture=phase4` or `?fixture=phase7` renders a fixture battle at a fixed instant, for reproducible screenshots.
  const fixtureName = new URLSearchParams(window.location.search).get("fixture");
  const fixture = fixtureName === null ? undefined : FIXTURES[fixtureName];

  let redraw: () => void;
  if (fixture === undefined) {
    const message = fixtureName === null ? document.title : `No fixture named ${fixtureName}`;
    redraw = () => paintTitle(canvas, message);
  } else {
    const { battle, map, picture } = fixture();
    const renderer = createRenderer(canvas);
    redraw = () => renderer.render(battle, map, picture);
  }

  window.addEventListener("resize", redraw);
  watchDevicePixelRatio(redraw);
  redraw();
}

void start();
