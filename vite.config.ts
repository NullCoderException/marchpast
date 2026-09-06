/**
 * The Vite config, and with it the one decision about where the app is served
 * from. GitHub Pages hosts a project site under the repository path, so the
 * build writes every asset URL beneath `/sandtable/`, and `src/data/paths.ts`
 * hangs the data URLs off the same base. The dev server keeps the root, so
 * `npm run dev` is unaffected; `npm run preview` uses the build's base, so the
 * built site can be checked locally the way it is hosted. The plugin that
 * makes the data URLs real is `vite/serve-data.ts`.
 */
import { defineConfig } from "vitest/config";
import { serveData } from "./vite/serve-data.ts";

/** The path GitHub Pages serves this repository's site under. */
const PAGES_BASE = "/sandtable/";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview === true ? PAGES_BASE : "/",

  plugins: [serveData()],

  test: {
    include: ["src/**/*.test.ts", "vite/**/*.test.ts", "scripts/**/*.test.ts"],
  },
}));
