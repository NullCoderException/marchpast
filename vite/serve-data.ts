/**
 * Serves the repo's `data/` directory at `/data/...` in dev and copies it into
 * the build output, so `battleUrl()` / `mapUrl()` (src/data/paths.ts) resolve
 * the same way in both. Anything under `/data/` that is not a file is a plain
 * 404, never the SPA's index.html fallback.
 *
 * Vite's `publicDir` cannot mount a directory under a prefix, which is why this
 * is a small plugin rather than a config line.
 */
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const URL_PREFIX = "/data";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".json": "application/json",
  ".geojson": "application/geo+json",
};

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

export function serveData(): Plugin {
  let dataDir = "";
  let outDir = "";

  return {
    name: "sandtable:serve-data",

    configResolved(config) {
      dataDir = path.resolve(config.root, "data");
      outDir = path.resolve(config.root, config.build.outDir);
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith(URL_PREFIX)) return next();
        if (req.method !== "GET" && req.method !== "HEAD") return next();

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
      fs.cpSync(dataDir, path.join(outDir, "data"), { recursive: true });
    },
  };
}
