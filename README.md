# sandtable
Animated 2D playbacks of historic battles, driven by a reusable JSON timeline format and public-domain sources.

## Running it

Needs Node 22 or later.

```sh
npm install        # once
npm run dev        # dev server with hot reload, opens on http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm test           # Vitest, once
npm run typecheck  # tsc over the app and the Vite config
npm run validate   # placeholder until the schema slice lands
```

CI (`.github/workflows/ci.yml`) runs `npm ci`, `typecheck`, `test` and `build` on every push and pull request.

### How data is served

Battle and map files stay where they are in the repo, `data/battles/<name>.json` and `data/maps/<name>.geojson`, and the app fetches them at the same paths under `/data/`. The only module that knows this is `src/data/paths.ts` (`battleUrl(name)`, `mapUrl(name)`); nothing else spells out where data lives.

The mapping is made real by a small Vite plugin, `vite/serve-data.ts`, rather than by `publicDir`, because `publicDir` serves a directory at the site root and cannot mount it under a `/data/` prefix. In dev the plugin answers `/data/...` requests straight from the `data/` directory and returns a plain 404 (never the HTML fallback page) for anything missing. In the build it copies `data/` into `dist/data/`, so `vite preview` and any static host serve the same URLs.

### The plate typeface

The renderer's typeface is IM Fell English (Igino Marini, SIL Open Font License 1.1), bundled as a woff2 under `src/fonts/` with its licence text beside it, so the app works offline. `loadPlateFont()` in `src/fonts/plate.ts` loads it as a `FontFace` and is awaited before the first frame, because Canvas text falls back silently if the face is not ready.
