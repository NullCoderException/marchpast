# Sandtable

Sandtable plays back famous battles as animated 2D "grand strategy" sequences: a map, its units and their moves, a caption band and play/pause/scrub controls, driven by a reusable JSON timeline format whose timelines are extracted from public-domain primary and secondary sources. It is not a game and not 3D. It is a data-driven animation player where the interesting work is the data, and the bar is a documentary map with arrows, drawn here as an engraved chart plate. The concept in full is [`docs/CONCEPT.md`](docs/CONCEPT.md).

It is live at **https://nullcoderexception.github.io/sandtable/**. The bare URL is the library: every battle it holds, oldest first, with its date and the sentence it describes itself by. A battle is addressed by name on the query string, [`?battle=trafalgar`](https://nullcoderexception.github.io/sandtable/?battle=trafalgar), and the player's picker switches to another one. There is no default battle and the site remembers nothing (ADR-0011).

v0.1 plays the Battle of Trafalgar at three-unit granularity: Nelson's weather column, Collingwood's lee column and the Combined Fleet, from the dawn sighting to the last shots.

![Trafalgar at 12:00: Royal Sovereign breaks the rear](docs/screenshots/v0.1/lee-column-breaks.png)

## Running it

Needs Node 22 or later.

```sh
npm install        # once
npm run dev        # dev server with hot reload on http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm test           # Vitest, once
npm run typecheck  # tsc over the app, the Vite config and the scripts
npm run validate   # check data/ against schema v2 (or: npm run validate data/battles/x.json)
```

Open the dev server's URL and the library lists what it holds; click a battle and it loads, paused on its first phase. Space plays and pauses, the arrow keys jump a phase, the scrubber scrubs, the "Details" button opens the phase notes and the sources table, and the picker at the end of the strip leaves for another battle.

CI (`.github/workflows/ci.yml`) runs `npm ci`, `typecheck`, `test`, `validate` and `build` on every pull request and on `main`, so a broken data file fails the pipeline, and checks that a PR's title is a conventional commit line. A second workflow (`.github/workflows/pages.yml`) builds with Vite and publishes to GitHub Pages on every push to `main`; Pages serves the site under the repository path, which is why `vite.config.ts` sets `base` to `/sandtable/` for the build, and for `npm run preview` so the built site can be checked locally the way it is hosted. `npm run dev` is unaffected and still serves from the root. Changes reach `main` only through squash-merged pull requests; see [`docs/agents/git-workflow.md`](docs/agents/git-workflow.md).

## Adding a battle

1. Write `data/battles/<name>.json` following [`docs/schema.md`](docs/schema.md). `data/battles/trafalgar.json` is the worked example.
2. If the battle plays over a coastline, add `data/maps/<name>.geojson` and set the battle's `map` field to that bare name. The map is a GeoJSON `FeatureCollection` with its own `license` and `attribution` members.
3. Run `npm run validate`. It reports every error with the file and the JSON-pointer path of the offending value, and exits 1 if there is any.
4. Open `http://localhost:5173/`. The library lists the new battle as soon as the file exists: the list is generated from `data/battles/` on every request, so nothing needs restarting and nothing needs editing by hand. Clicking it, or opening `http://localhost:5173/?battle=<name>`, plays it: the app fetches the battle, validates it in the browser too, follows its `map`, and plays it. If the file cannot be fetched or fails validation, the errors are drawn on the plate instead, file, path and message as the command line prints them, logged to the console, and the plate gains a link back to the library.

The design decisions behind the format and the renderer are recorded as ADRs in [`docs/adr/`](docs/adr/): real lat/lon coordinates, phases as snapshots tweened by the player, authored state and strength rather than simulated casualties, moves as authored arrows, the referenced GeoJSON map, one caption per phase with a sources table, the data licence, wind as direction and force, the engraved chart plate, the library built from the battle files, and the schema v1 lock.

## Licences

- **Code** is MIT ([`LICENSE`](LICENSE)).
- **Battle files** under `data/battles/` are CC BY 4.0; each file's `license` and `attribution` fields are authoritative, and battle files draw only on public-domain or attribution-only sources, never share-alike ones (ADR-0007).
- **Map files** under `data/maps/` each declare their own licence in the file's `license` member, with the credit line in `attribution`. The Cadiz coast is cut from Natural Earth, public domain.

The full statement is [`data/LICENSE`](data/LICENSE). The plate typeface, IM Fell English, is under the SIL Open Font License 1.1 (`src/fonts/OFL.txt`).

## How it is put together

- `src/schema/` is schema v2 in code: `types.ts` is the source of truth for both file kinds, `licenses.ts` the licence allowlist, `arms.ts` the arm allowlist, `hierarchy.ts` the roster tree and the units a level draws, `validateBattle.ts` and `validateMap.ts` the runtime validators. They never throw; they return every error with a JSON-pointer path. `docs/schema.md` is the prose copy, kept in step.
- `src/timeline/` turns a battle and a battle-clock instant into a `Picture`: which phase, every unit's tweened position and heading, stepped formation and state, and the phase's caption.
- `src/render/` draws a `Picture` on a Canvas as the chart plate: parchment, Web Mercator projection, coastline, ship-tick glyphs, tracks and move arrows, compass rose with the wind, scale bar, legend and caption band.
- `src/player/` is the animation loop and the controls beneath the plate; every rule about what a control does lives in `state.ts` and is tested without a browser.
- `src/app/` loads a battle by name (`loadBattle.ts`) and the library (`loadLibrary.ts`), both over the one fetch and the one error report in `load.ts`; it reads `?battle=` (`battleName.ts`), draws the library page (`libraryPage.ts`, the only part of the site that is DOM rather than canvas, because a list has nothing to animate) and paints the loading and error plates (`notice.ts`). `src/main.ts` decides between the two pages and wires whichever it is together.
- `src/data/paths.ts` is the only module that knows where data lives: `<base>data/battles/<name>.json` and `<base>data/maps/<name>.geojson`, where `<base>` is the app's base URL, `/` on the dev server and `/sandtable/` on Pages. A small Vite plugin, `vite/serve-data.ts`, serves the repo's `data/` directory at that prefix in dev (a plain 404 for anything missing, never the HTML fallback) and copies it into `dist/data/` in the build, because Vite's `publicDir` cannot mount a directory under a prefix. A static host serves the same URLs for the files that exist; what it returns for a missing one is its own fallback behaviour, so a battle that is not there may read as "not valid JSON" rather than a 404. One file on that route is on no one's disk: `data/index.json` is the library, built from the battle files themselves by `vite/library.ts` over the shape in `src/data/library.ts`, written into `dist/data/` by the build and generated per request in dev. It is a build output, never committed, and a battle file that fails validation fails the build rather than dropping out of the library.
- `scripts/validate.ts` is `npm run validate`. It runs on Node's built-in type stripping, which is why imports inside `src/schema/` spell out their `.ts` extension.
- `src/fonts/plate.ts` loads the bundled typeface as a `FontFace` before the first frame, because Canvas text falls back silently if the face is not ready.
