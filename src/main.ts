import { loadPlateFont, plateFont } from "./fonts/plate";

/** Chart-plate materials (ADR-0009), carried over from the static-frame prototype. */
const PARCHMENT = "#efe3c6";
const INK = "#2b2418";

/** Sizes the canvas's backing store to the window at the current devicePixelRatio. */
function fitToWindow(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

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

function paint(ctx: CanvasRenderingContext2D): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = INK;
  ctx.font = plateFont(Math.max(24, Math.min(width, height) / 12));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(document.title, width / 2, height / 2);
}

async function start(): Promise<void> {
  await loadPlateFont();

  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("Canvas 2D is not available in this browser");

  const redraw = (): void => {
    fitToWindow(canvas, ctx);
    paint(ctx);
  };
  window.addEventListener("resize", redraw);
  watchDevicePixelRatio(redraw);
  redraw();
}

void start();
