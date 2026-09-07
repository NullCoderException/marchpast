/**
 * The Vite config. The site serves from the root of its own domain, so there is
 * no base path to set: Vite's default `/` is right on the dev server, in the
 * build and in `npm run preview` alike, and `src/data/paths.ts` hangs the data
 * URLs off `BASE_URL` whatever it is. Until the custom domain this build set
 * `base` to the path a GitHub Pages project site is served under, and the
 * domain deleted that literal rather than rewriting it (ADR-0020). The plugins
 * that make the data URLs real are `vite/serve-data.ts` and `vite/stills.ts`.
 */
import { defineConfig } from "vitest/config";
import { pages } from "./vite/pages.ts";
import { serveData } from "./vite/serve-data.ts";
import { stills } from "./vite/stills.ts";

export default defineConfig({
  // `stills()` first: the pictures it draws sit under the data route and no
  // file on disk answers for them, so `serveData()` would 404 them first.
  // `pages()` is build-only and answers for nothing in dev, so its place in
  // the list is free.
  plugins: [stills(), serveData(), pages()],

  test: {
    include: ["src/**/*.test.ts", "vite/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
