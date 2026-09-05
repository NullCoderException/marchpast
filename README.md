# sandtable
Animated 2D playbacks of historic battles, driven by a reusable JSON timeline format and public-domain sources.

## Running it

Needs Node 22 or later.

```sh
npm install        # once
npm run dev        # dev server with hot reload on http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm test           # Vitest, once
npm run typecheck  # tsc over the app and the Vite config
npm run validate   # check data/ against schema v1 (or: npm run validate data/battles/x.json)
```

CI (`.github/workflows/ci.yml`) runs `npm ci`, `typecheck`, `test` and `build` on every pull request and on `main`, and checks that a PR's title is a conventional commit line. Changes reach `main` only through squash-merged pull requests; see `docs/agents/git-workflow.md`.

### How data is served

Battle and map files stay where they are in the repo, `data/battles/<name>.json` and `data/maps/<name>.geojson`, and the app fetches them at the same paths under `/data/`. The only app module that knows this is `src/data/paths.ts` (`battleUrl(name)`, `mapUrl(name)`); the Vite plugin below mounts the same `/data/` prefix, and nothing else spells out where data lives.

The mapping is made real by a small Vite plugin, `vite/serve-data.ts`, rather than by `publicDir`, because `publicDir` serves a directory at the site root and cannot mount it under a `/data/` prefix. In dev the plugin answers `/data/...` requests straight from the `data/` directory and returns a plain 404 (never the HTML fallback page) for anything missing. In the build it copies `data/` into `dist/data/`, so `vite preview` and any static host serve the same URLs for the files that exist (what they return for a missing file is their own fallback behaviour; the plain-404 guarantee is the dev server's).

### Validating data

Schema v1 lives in code under `src/schema/`: `types.ts` is the source of truth for both file kinds, `licenses.ts` is the licence allowlist, and `validateBattle.ts` / `validateMap.ts` are the runtime validators (`docs/schema.md` is the prose copy, kept in step). The validators never throw; they return every error with a JSON-pointer path such as `/phases/3/units/1/heading`.

`npm run validate` runs `scripts/validate.ts` over every `data/battles/*.json` and `data/maps/*.geojson`, follows each battle's `map` to its file, prints every error with file and path, and exits 1 if there is any. Pass file paths to check only those. The script runs on Node's built-in type stripping, which is why imports inside `src/schema/` spell out their `.ts` extension.

### The plate typeface

The renderer's typeface is IM Fell English (Igino Marini, SIL Open Font License 1.1), bundled as a woff2 under `src/fonts/` with its licence text beside it, so the app works offline. `loadPlateFont()` in `src/fonts/plate.ts` loads it as a `FontFace` and is awaited before the first frame, because Canvas text falls back silently if the face is not ready.
