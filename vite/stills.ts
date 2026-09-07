/**
 * The stills: one picture of every battle in the library, and one social card
 * apiece, drawn by the app's own renderer running in Node (ADR-0025,
 * ADR-0028). A sibling of `serve-data.ts` and the same shape as it — rendered
 * per request in dev, so a battle file edited while the server runs changes
 * its picture on reload, and written into `dist/data/` at build.
 *
 * **Why a plugin and not a script.** The views reach their faces through
 * `src/fonts/`, whose `.woff2` imports only Vite can resolve; Node's type
 * stripping dies on them. A plugin has Vite's own loader to hand, so
 * everything under `src/render/` is *loaded* rather than imported
 * (`StillModules`, `loadStillModules`), and the `node:module` hook #126
 * measured is never written. The timeline's and the schema's pure functions
 * touch no canvas and are ordinary imports.
 *
 * **What a still is** (ADR-0025): the phase the battle marks, in the view it
 * opens in, at the coarsest level, drawn **cold** — a fresh renderer, with no
 * earlier phase drawn first, so the picture is a pure function of its
 * arguments and the sticky label placer has no path taken to bake in. The
 * thumbnail is the plate alone, the caption band measured and cropped off the
 * bottom; the card is the same call at 1200 × 630 with the band kept, because
 * at that size the caption is readable and it is the battle's own words.
 *
 * A still or card that will not render **fails the build**, on `readLibrary`'s
 * own precedent: a blank box on the front door is worse than a red build.
 */
import { type Canvas, createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import { type LayoutMode, layoutMode } from "../src/render/layout.ts";
import { formatClock } from "../src/render/text.ts";
import { stillPhase } from "../src/schema/stillPhase.ts";
import type { Battle, MapFile } from "../src/schema/types.ts";
import { validateBattle } from "../src/schema/validateBattle.ts";
import { validateMap } from "../src/schema/validateMap.ts";
import { errorLine, type ValidationError } from "../src/schema/validation.ts";
import { clockIntervals } from "../src/timeline/intervals.ts";
import type { Picture } from "../src/timeline/picture.ts";
import { pictureAt } from "../src/timeline/pictureAt.ts";
import { readLibrary } from "./library.ts";

/** Where the battle files and their maps live inside the data directory. */
const BATTLES_DIR = "battles";
const MAPS_DIR = "maps";

/** Where the pictures go beneath it: the thumbnails the library shows, and the cards a shared link unfurls as. Both are build outputs and neither is ever committed. */
const STILLS_DIR = "stills";
const CARDS_DIR = "cards";

/** The level a still is drawn at: the coarsest, which is where the player opens (ADR-0017). */
const COARSEST_LEVEL = 0;

/**
 * How big a still is drawn and how much of it survives. The **width** picks
 * the layout mode, so it is a desktop width at a low ratio and never a small
 * canvas (`PHONE_MAX_WIDTH`); the **height** is the picture that is kept; and
 * `crop` says whether the caption band is drawn below that height and left
 * behind, or kept inside it.
 */
export interface StillSize {
  /** CSS pixels. */
  width: number;
  /** CSS pixels of picture kept: the plate box when the band is cropped, the whole frame when it is not. */
  height: number;
  /** Device pixels per CSS pixel. The PNG is `width × dpr` by `height × dpr`. */
  dpr: number;
  /** Whether the caption band is cropped off the bottom. */
  crop: boolean;
}

/** The library's thumbnail: a plate box of 1160 × 720 inside `PLATE_MARGIN`, at half a device pixel — a 600 × 380 PNG (ADR-0025). */
export const THUMBNAIL: StillSize = { width: 1200, height: 760, dpr: 0.5, crop: true };

/** The social card: the same render at the size a link preview crops to, with the band kept and readable (ADR-0028). */
export const CARD: StillSize = { width: 1200, height: 630, dpr: 1, crop: false };

/** Everything one still is a function of (ADR-0025): the battle and its map, the phase, the view, the level, and the size above. */
export interface StillOptions extends StillSize {
  battle: Battle;
  /** The battle's map, when it names one. */
  map: MapFile | undefined;
  /** Index into `battle.phases`. */
  phase: number;
  /** The view id, as `views.ts` spells it. */
  view: string;
  /** The depth of the unit tree drawn; `0` is the coarsest. */
  level: number;
}

/** One drawn still. */
export interface Still {
  /** The PNG. */
  png: Buffer;
  /** Its own width in device pixels. */
  width: number;
  /** Its own height in device pixels. */
  height: number;
  /** The caption band's height in CSS pixels, as the view's own hand measured it: the strip cropped off the bottom, or the strip kept inside the picture. */
  band: number;
}

/** One bundled face as Skia takes it: the family the view's font strings ask for, and the bytes behind the URL the app serves it at. */
export interface StillFace {
  /** The family a font shorthand names, e.g. `IM Fell English`. */
  family: string;
  /** The woff2 itself, as `GlobalFonts.register` takes it. */
  bytes: Buffer;
}

/**
 * As much of a view as a still needs: its caption band, which the crop is
 * measured against. The palette and the type travel straight back into the
 * view's own hand, so they need no shape here (ADR-0021).
 */
export interface StillView {
  /** The id `viewById` answered to. */
  id: string;
  /** The view's materials, handed straight back to its own caption hand. */
  palette: unknown;
  /** The view's type, likewise. */
  type: unknown;
  /** Only the one piece of it a still measures. */
  furniture: {
    caption: {
      measure(request: {
        ctx: SKRSContext2D;
        battle: Battle;
        picture: Picture;
        width: number;
        mode: LayoutMode;
        palette: unknown;
        type: unknown;
      }): { height: number };
    };
  };
}

/**
 * The app's drawing code, as this file reaches it: loaded through Vite, which
 * resolves the faces' `.woff2` imports the way the browser build does, rather
 * than imported, which Node cannot do.
 *
 * Declared in the Node canvas's own terms. The renderer is written against a
 * browser canvas and asks for one, but all it ever uses is a 2D context, and a
 * Skia canvas gives it one — #126 counted every member and found nothing
 * missing.
 */
export interface StillModules {
  createRenderer(canvas: Canvas): {
    render(battle: Battle, map: MapFile | undefined, picture: Picture, viewer: { view: string; level: number }): unknown;
  };
  /** The view an id names, so the band is measured in the same view it is drawn in. */
  viewById(id: string): StillView;
  /** The view a battle opens in, which is the view its still is drawn in (ADR-0025; ADR-0014 as amended, no battle names one). */
  DEFAULT_VIEW: { id: string };
  /** Every face the app bundles, read off the disk: `faces.ts` is the list, so a face added for a view cannot be missed here. */
  faces: readonly StillFace[];
}

/** How a module of the app is reached: the dev server's SSR loader, or a throwaway server's at build. */
export type LoadModule = (id: string) => Promise<Record<string, unknown>>;

/**
 * A Vite server for its module loader alone, which is what a build and a test
 * have to make for themselves: no watcher and no HMR socket, since nothing
 * will be served from it, and `configFile: false` so that loading it does not
 * load this plugin a second time.
 */
export function createStillLoader(root: string): Promise<ViteDevServer> {
  return createServer({
    configFile: false,
    root,
    logLevel: "warn",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, watch: null, hmr: false },
  });
}

/**
 * The app's drawing code, loaded through Vite, and its faces read off the disk
 * beneath `root`: an asset import answers with the URL the app serves the file
 * at, which under Vite's own pipeline is its path in the repo. The cast is the
 * seam — the loader answers in `unknown`s, and `StillModules` above says what
 * the three modules are expected to hold.
 */
export async function loadStillModules(load: LoadModule, root: string): Promise<StillModules> {
  const [renderer, views, faces] = await Promise.all([
    load("/src/render/renderer.ts"),
    load("/src/render/views.ts"),
    load("/src/fonts/faces.ts"),
  ]);
  const registry = faces.FACES as Readonly<Record<string, { family: string; url: string }>>;
  return {
    createRenderer: renderer.createRenderer,
    viewById: views.viewById,
    DEFAULT_VIEW: views.DEFAULT_VIEW,
    faces: Object.values(registry).map(({ family, url }) => ({ family, bytes: fs.readFileSync(path.join(root, url)) })),
  } as StillModules;
}

/**
 * Registers every bundled face with Skia, once per process. Every font string
 * ends in a fallback family, so a still drawn without its face is a wrong still
 * rather than a failed one (ADR-0009) — and a fallback is honoured only if the
 * machine happens to have the family, which a CI runner does not.
 */
function registerFaces(faces: readonly StillFace[]): void {
  for (const { family, bytes } of faces) {
    if (GlobalFonts.has(family)) continue;
    GlobalFonts.register(bytes, family);
  }
}

/**
 * The renderer's two touches of the DOM, which are the whole of its contract
 * with a browser (ADR-0025): the ratio `fitBackingStore` sizes the backing
 * store by, and the canvases the ground buffer and the engaged cloud's scratch
 * are composited on. Set around one render and put back, so nothing else in
 * the process ever sees a half-made window.
 */
function withDom<T>(dpr: number, draw: () => T): T {
  const globals = globalThis as unknown as Record<string, unknown>;
  const had = { window: globals.window, document: globals.document };
  globals.window = { devicePixelRatio: dpr };
  globals.document = { createElement: () => createCanvas(1, 1) };
  try {
    return draw();
  } finally {
    globals.window = had.window;
    globals.document = had.document;
  }
}

/** A phase's own instant, in the seconds the clock counts, which is where a still is taken. */
function phaseInstant(battle: Battle, phase: number): number {
  const interval = clockIntervals(battle)[phase];
  if (interval === undefined) throw new RangeError(`${battle.title} has no phase ${phase}`);
  return interval.startSeconds;
}

/**
 * One still: the picture of one phase of one battle, as a PNG.
 *
 * The band is measured before anything is drawn, because `height` is the
 * picture that survives and the band is what the renderer adds beneath it. It
 * is measured by the view's own caption hand, the one `render` will call
 * (ADR-0021), and `measureText` owes nothing to the transform, so a bare
 * scratch context of the same width answers exactly what the frame will.
 *
 * The renderer is made here and thrown away, which is what **cold** means: no
 * label memory carried in from a phase drawn before this one. The two things
 * that reach outside the call are the face registration, which is idempotent,
 * and the DOM stubs, which are put back; the picture is a function of the
 * arguments alone, which is the whole of ADR-0025's claim for it.
 */
export function still(modules: StillModules, options: StillOptions): Still {
  const { battle, map, phase, view: viewId, level, width, height, dpr, crop } = options;
  registerFaces(modules.faces);

  const picture = pictureAt(battle, phaseInstant(battle, phase));
  const view = modules.viewById(viewId);
  const band = view.furniture.caption.measure({
    ctx: createCanvas(width, 1).getContext("2d"),
    battle,
    picture,
    width,
    mode: layoutMode(width),
    palette: view.palette,
    type: view.type,
  }).height;

  const canvas = createCanvas(width, crop ? height + band : height);
  withDom(dpr, () => modules.createRenderer(canvas).render(battle, map, picture, { view: viewId, level }));
  if (!crop) return { png: canvas.toBuffer("image/png"), width: canvas.width, height: canvas.height, band };

  // The crop keeps the top of the frame at its own scale: the backing store is
  // already device pixels, so the picture is copied one for one.
  const cropped = createCanvas(Math.round(width * dpr), Math.round(height * dpr));
  cropped.getContext("2d").drawImage(canvas, 0, 0);
  return { png: cropped.toBuffer("image/png"), width: cropped.width, height: cropped.height, band };
}

/** Where `stillPhase`'s answer sits in the phase list, which is how the clock numbers it. */
function stillPhaseIndex(battle: Battle): number {
  return battle.phases.indexOf(stillPhase(battle));
}

/** The still ADR-0025 defines for a battle — its marked phase, the view it opens in, the coarsest level — at one of the two sizes above. */
export function battleStill(modules: StillModules, battle: Battle, map: MapFile | undefined, size: StillSize): Still {
  return still(modules, { battle, map, phase: stillPhaseIndex(battle), view: modules.DEFAULT_VIEW.id, level: COARSEST_LEVEL, ...size });
}

/**
 * What a shared card says when its picture does not arrive: the battle, the
 * still phase's clock, and that phase's label (ADR-0028). Written here because
 * the build has the material in hand as it renders, and read by the page per
 * battle (#176). The thumbnail's alt stays empty, since the library entry
 * beside it is already named by title, date and summary.
 */
export function cardAlt(battle: Battle): string {
  const phase = stillPhase(battle);
  const clock = formatClock(phaseInstant(battle, stillPhaseIndex(battle)));
  return `${battle.title} at ${clock}: ${phase.label}`;
}

/** A battle file and the map it names, both validated: everything a still is drawn from. */
export interface StillSource {
  battle: Battle;
  /** The map the battle names, or nothing when it names none. */
  map: MapFile | undefined;
}

/** The validator's complaint about one file, as the same file / path / message lines `npm run validate` prints. */
function unreadable(file: string, errors: readonly ValidationError[]): Error {
  return new Error(["Marchpast: a still cannot be drawn.", file, ...errors.map(errorLine)].join("\n"));
}

/** One file as parsed JSON, or the complaint that it is not JSON at all. */
function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    throw unreadable(file, [{ path: "", message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}` }]);
  }
}

/**
 * The battle called `name` and the map it names, or `undefined` when there is
 * no such battle file — which on the dev route is a 404, and in the build
 * cannot happen, the names coming from the library itself.
 *
 * A file that is there and will not validate **throws**, so a picture the site
 * cannot draw is a broken build rather than a blank box (ADR-0025).
 */
export function readBattle(dataDir: string, name: string): StillSource | undefined {
  const dir = path.join(dataDir, BATTLES_DIR);
  const file = path.join(dir, `${name}.json`);
  // A name is a bare file stem. Anything with a separator in it, or a climb
  // out of the directory, names no battle.
  if (path.dirname(file) !== dir) return undefined;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return undefined;

  const result = validateBattle(readJson(file));
  if (!result.ok) throw unreadable(file, result.errors);
  const battle = result.battle;
  if (battle.map === undefined) return { battle, map: undefined };

  const mapFile = path.join(dataDir, MAPS_DIR, `${battle.map}.geojson`);
  const map = validateMap(readJson(mapFile));
  if (!map.ok) throw unreadable(mapFile, map.errors);
  return { battle, map: map.map };
}

/** A request for a picture: which battle, and which of the two sizes. */
export interface StillRequest {
  /** The battle's bare name, as `data/battles/<name>.json` spells it. */
  name: string;
  /** Which of the two pictures was asked for. */
  size: StillSize;
}

/** The route: `/data/stills/<name>.png` is the library's thumbnail, `/data/cards/<name>.png` the social card. */
const STILL_URL = new RegExp(`^/data/(${STILLS_DIR}|${CARDS_DIR})/(.+)\\.png$`);

/** What a request URL asks for, or `null` when it asks for neither picture. */
export function stillRequest(url: string): StillRequest | null {
  const match = STILL_URL.exec(url.split("?")[0] ?? "");
  if (match === null) return null;
  let name: string;
  try {
    name = decodeURIComponent(match[2] ?? "");
  } catch {
    return null;
  }
  return { name, size: match[1] === STILLS_DIR ? THUMBNAIL : CARD };
}

/** Answers a request for a picture with the PNG, with a 404 for a battle that is not there, or with the validator's complaint. */
function sendStill(res: ServerResponse, root: string, load: LoadModule, request: StillRequest, headOnly: boolean): void {
  const sendText = (status: number, message: string): void => {
    res.statusCode = status;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(headOnly ? undefined : message);
  };

  void (async () => {
    let png: Buffer;
    try {
      const source = readBattle(path.join(root, "data"), request.name);
      if (source === undefined) return sendText(404, `Not found: ${request.name}`);
      png = battleStill(await loadStillModules(load, root), source.battle, source.map, request.size).png;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      return sendText(500, message);
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache");
    res.end(headOnly ? undefined : png);
  })();
}

/** Writes one picture, making its directory on the way. */
function writePicture(file: string, drawn: Still): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, drawn.png);
}

/**
 * The plugin. In dev it owns `/data/stills/` and `/data/cards/`, which is why
 * it is registered **before** `serveData()` in `vite.config.ts`: those URLs
 * are under the data route and no file on disk answers them, so the plugin
 * that reads the disk would 404 them first.
 */
export function stills(): Plugin {
  let root = "";
  let dataDir = "";
  let outDir = "";

  return {
    name: "marchpast:stills",

    configResolved(config) {
      root = config.root;
      dataDir = path.resolve(config.root, "data");
      outDir = path.resolve(config.root, config.build.outDir);
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const request = stillRequest(req.url ?? "");
        if (request === null) return next();
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        sendStill(res, root, (id) => server.ssrLoadModule(id), request, req.method === "HEAD");
      });
    },

    // `closeBundle` rather than `writeBundle`, so the pictures land after
    // `serve-data.ts` has copied `data/` into the output, whatever order the
    // plugins happen to sit in.
    async closeBundle() {
      if (!fs.existsSync(dataDir)) return;

      // A server of its own, because a build has none.
      const loader = await createStillLoader(root);
      try {
        const modules = await loadStillModules((id) => loader.ssrLoadModule(id), root);
        // The library is the list, so `dist/data/stills/` holds exactly the
        // pictures the front door shows and a stray file is obvious.
        for (const { name } of readLibrary(dataDir)) {
          const source = readBattle(dataDir, name);
          if (source === undefined) throw new Error(`Marchpast: the library lists ${name}, which has no battle file.`);
          writePicture(path.join(outDir, "data", STILLS_DIR, `${name}.png`), battleStill(modules, source.battle, source.map, THUMBNAIL));
          writePicture(path.join(outDir, "data", CARDS_DIR, `${name}.png`), battleStill(modules, source.battle, source.map, CARD));
        }
      } finally {
        await loader.close();
      }
    },
  };
}
