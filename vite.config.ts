/**
 * The Vite config. The site serves from the root of its own domain, so there is
 * no base path to set: Vite's default `/` is right on the dev server, in the
 * build and in `npm run preview` alike, and `src/data/paths.ts` hangs the data
 * URLs off `BASE_URL` whatever it is. Until the custom domain this build set
 * `base` to the path a GitHub Pages project site is served under, and the
 * domain deleted that literal rather than rewriting it (ADR-0020). The plugin
 * that makes the data URLs real is `vite/serve-data.ts`.
 */
import { defineConfig } from "vitest/config";
import { serveData } from "./vite/serve-data.ts";

export default defineConfig({
  plugins: [serveData()],

  test: {
    include: ["src/**/*.test.ts", "vite/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
