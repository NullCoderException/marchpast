/**
 * Serves the repo's `data/` directory at `/data/...` in dev and copies it into
 * the build output, so `battleUrl()` / `mapUrl()` (src/data/paths.ts) resolve
 * the same way in both. Anything under `/data/` that is not a file is a plain
 * 404, never the SPA's index.html fallback.
 *
 * Two kinds of file on that route are on no one's disk. The pictures —
 * `/data/stills/` and `/data/cards/` — belong to `stills.ts`, which is
 * registered before this plugin so its middleware answers them before the 404
 * below can. The other is the library: `/data/index.json` is the
 * library, built from the battle files themselves by `library.ts` (ADR-0011).
 * The build writes it into `dist/data/`; dev generates it per request, so a
 * battle file added or edited while the server runs shows up on the front door
 * without a restart. A battle file that fails the validator fails the build,
 * and reads as a 500 in dev, rather than dropping quietly out of the list.
 *
 * Vite's `publicDir` cannot mount a directory under a prefix, which is why this
 * is a small plugin rather than a config line.
 */
import fs from "node:fs";
import type { ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";
import { libraryJson } from "./library.ts";

const URL_PREFIX = "/data";

/** The generated file: `data/index.json` is a build output and is never committed. */
const INDEX_FILE = "index.json";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".json": "application/json",
  ".geojson": "application/geo+json",
};

/** Whether a request URL belongs to the data route: `/data` itself or anything beneath it. */
export function isDataUrl(url: string): boolean {
  const pathname = url.split("?")[0] ?? "";
  return pathname === URL_PREFIX || pathname.startsWith(`${URL_PREFIX}/`);
}

/** Media type for a data file, by extension. */
export function contentTypeFor(fileName: string): string {
  return CONTENT_TYPES[path.extname(fileName)] ?? "application/octet-stream";
}

/**
 * Turns a request URL into an absolute path inside `dataDir`, or `null` when
 * the URL is not under `/data/`, names the directory itself, or would escape it.
 */
export function resolveDataFile(url: string, dataDir: string): string | null {
  const pathname = url.split("?")[0] ?? "";
  if (!pathname.startsWith(`${URL_PREFIX}/`)) return null;

  let relative: string;
  try {
    relative = decodeURIComponent(pathname.slice(URL_PREFIX.length + 1));
  } catch {
    return null;
  }
  if (relative === "") return null;

  const root = path.resolve(dataDir);
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

/** Whether a request URL names the generated library rather than a file on disk. */
export function isIndexUrl(url: string): boolean {
  return (url.split("?")[0] ?? "") === `${URL_PREFIX}/${INDEX_FILE}`;
}

/** Answers a request for the library with the generated JSON, or with the validator's complaint. */
function sendIndex(res: ServerResponse, dataDir: string, headOnly: boolean): void {
  let json: string;
  try {
    json = libraryJson(dataDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(headOnly ? undefined : message);
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", CONTENT_TYPES[".json"] ?? "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.end(headOnly ? undefined : json);
}

export function serveData(): Plugin {
  let dataDir = "";
  let outDir = "";

  return {
    name: "marchpast:serve-data",

    configResolved(config) {
      dataDir = path.resolve(config.root, "data");
      outDir = path.resolve(config.root, config.build.outDir);
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!isDataUrl(url)) return next();
        if (req.method !== "GET" && req.method !== "HEAD") return next();

        if (isIndexUrl(url)) return sendIndex(res, dataDir, req.method === "HEAD");

        const file = resolveDataFile(url, dataDir);
        if (file === null || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`Not found: ${url}`);
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", contentTypeFor(file));
        res.setHeader("Cache-Control", "no-cache");
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        fs.createReadStream(file).pipe(res);
      });
    },

    writeBundle() {
      if (!fs.existsSync(dataDir)) return;
      const outData = path.join(outDir, "data");
      fs.cpSync(dataDir, outData, { recursive: true });
      // Last, so it wins over a stale index.json left in `data/` by an earlier build.
      fs.writeFileSync(path.join(outData, INDEX_FILE), libraryJson(dataDir));
    },
  };
}
