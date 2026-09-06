import { defineConfig } from "vitest/config";
import { serveData } from "./vite/serve-data.ts";

/**
 * Where the built site lives: GitHub Pages serves a project site under the
 * repository name, so every asset URL the build writes is prefixed with it.
 * `src/data/paths.ts` hangs the data URLs off the same base.
 */
const PAGES_BASE = "/sandtable/";

export default defineConfig(({ command, isPreview }) => ({
  // The dev server keeps the root, so `npm run dev` still opens at
  // http://localhost:5173/. The build, and `npm run preview` serving that
  // build, use the Pages path, which is what the hosted site needs.
  base: command === "build" || isPreview === true ? PAGES_BASE : "/",

  plugins: [serveData()],

  test: {
    include: ["src/**/*.test.ts", "vite/**/*.test.ts", "scripts/**/*.test.ts"],
  },
}));
