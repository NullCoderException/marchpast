https://github.com/NullCoderException/sandtable/issues/126
# A still per battle at build time: four routes measured against the renderer

*Research note for GitHub issue #126 (part of wayfinder map #121). Verified 2026-09-07 by driving the real renderer at `bad362a` (v0.2) through `@napi-rs/canvas` 1.0.8 under Node 22.14 and diffing the result pixel by pixel against headless Chrome 152 showing the same instants from the dev server, and by reading the Playwright, GitHub runner-image, `@napi-rs/canvas`, `node-canvas` and Vite documentation. Every timing and byte count below is measured on those runs (on Windows; the CI runner is Linux, and the one place that matters is flagged). The throwaway scripts are not committed; the method section says what they did.*

## Gist

The renderer is already a function of `(battle, map, picture, viewer)` on a `CanvasRenderingContext2D`, with two touches of the DOM (`window.devicePixelRatio`, `document.createElement("canvas")` for the smoke's scratch) and one Vite-only import (the `.woff2` URL). Given a canvas of a size, a `Picture` from `pictureAt` and a view id, it draws the whole plate synchronously, and every random in it is seeded. That shape decides the question. **A Node canvas is the route**: `@napi-rs/canvas` (Skia, one prebuilt binary, no system packages) covers every one of the 35 context members the renderer uses, registers the bundled woff2 directly, honours `destination-out` on the scratch canvas so the engaged cloud's interior stays empty, and renders a 1200 by 630 plate in 10 to 70 ms (six stills of four battles in three views, 1.3 s of wall time for the whole process, module loading included). Two runs give byte-identical PNGs. Against Chrome's own picture of the same instant the layout is the same to the pixel — `measureText` widths agree to 0.005 px over 80 strings, so every label lands where the browser puts it — and what differs is glyph antialiasing and a 1 to 3 px vertical offset on text set on the `middle`, `top` and `bottom` baselines, from Chrome rounding the face's ascent and descent where Skia keeps the fraction. A thumbnail, a social card and a README screenshot are all the same call at a different size, and a Node still is cheap enough to render every battle in every view on every push. `node-canvas` is out on two verified blockers: it cannot parse the bundled woff2 and its `letterSpacing` is inert, so the map's work labels would lose their tracking silently. Playwright is the fallback if some future view needs the browser (nothing today): the `ubuntu-latest` image already ships Chrome 152, so `playwright-core` over `channel: 'chrome'` costs no download, but it needs a served page and a driver, and its docs promise no pixel stability across images. Hand-committed PNGs and in-browser rendering on the library page are recorded and rejected below.

## What a still needs from the renderer

The facts every route answers to, read from `src/render/` and `src/fonts/`:

- **The entry point is synchronous and stateless but for its canvas.** `createRenderer(canvas).render(battle, map, picture, viewer)` draws one instant; the player owns the loop ([renderer.ts](../../src/render/renderer.ts)). The picture comes from `pictureAt(battle, clockSeconds)` ([pictureAt.ts](../../src/timeline/pictureAt.ts)), and a phase's own instant is `clockIntervals(battle)[i].startSeconds` ([intervals.ts](../../src/timeline/intervals.ts)). The viewer is `{ view: "plate" | "night" | "atlas", level: number }` ([view.ts](../../src/render/view.ts), [views.ts](../../src/render/views.ts)). Nothing in the call needs a document.
- **Two touches of the DOM.** `fitBackingStore` reads `window.devicePixelRatio` and `canvas.clientWidth || canvas.width` ([renderer.ts](../../src/render/renderer.ts)); the engaged cloud's scratch is `document.createElement("canvas")`, grown to the largest cloud asked for and composited back with `drawImage` ([glyphs/ticks.ts](../../src/render/glyphs/ticks.ts), ADR-0014). A canvas object with no `clientWidth` falls through to its own width, so a Node canvas needs no CSS box.
- **One Vite-only import.** `src/fonts/plate.ts` imports `./IMFellEnglish-Regular.woff2` as a URL, which Vite resolves and Node's type stripping cannot (it dies on the `.woff2`). The renderer only reaches that module for `plateFont()`, the font string; `loadPlateFont()` (a `FontFace` and `document.fonts.add`) is called by `main.ts` alone. A one-line module hook that answers a `.woff2` import with a string is enough to import the renderer into Node.
- **The face.** `IM Fell English`, bundled as woff2 under the OFL, loaded before the first frame because Canvas text falls back silently (ADR-0009). Every font string ends `, Georgia, serif`, so a still drawn without the face registered is a wrong still, not a failed one.
- **Determinism.** The stipple is `seeded(7)` and every other random is seeded (`primitives.ts`); the project already proves plates unchanged by pixel diff of browser screenshots. A still is therefore a pure function of `(battle, map, clock, view, level, width, height, dpr)`, plus the label memory of the frame before, which matters below.
- **The canvas API surface.** Every context member the renderer, the notice and the details panel use, counted over `src/` (tests excluded):

| Member | Uses | Where it matters |
|---|---|---|
| `fillStyle`, `strokeStyle`, `lineWidth`, `lineJoin`, `lineCap` | 39, 20, 21, 6, 5 | everywhere |
| `save`, `restore` | 36, 36 | every pass |
| `beginPath`, `moveTo`, `lineTo`, `arc`, `rect`, `closePath` | 33, 24, 34, 7, 4, 5 | coast, contours, glyphs, stipple |
| `fill`, `stroke`, `fillRect`, `strokeRect`, `clip` | 13, 22, 13, 6, 6 | plate, extent clip, legend panel |
| `font`, `fillText`, `strokeText`, `textAlign`, `textBaseline`, `measureText` | 34, 29, 1, 15, 14, 5 | labels, caption, furniture; `measureText().width` only |
| `letterSpacing` (string, `"0.5px"`) | 4 | the map's work labels (`drawMap.ts`) |
| `setLineDash` | 6 | pens, shoal edge, broken block |
| `roundRect` | 1 | the destroyed sign (`glyphs/ticks.ts`) |
| `translate`, `rotate`, `setTransform`, `getTransform` | 7, 6, 2, 1 | glyphs; the scratch's density is read off `getTransform()` |
| `globalAlpha` | 2 | tint bands |
| `globalCompositeOperation = "destination-out"` | 1 | the engaged cloud, on the scratch canvas only |
| `drawImage(canvas, sx, sy, sw, sh, dx, dy, dw, dh)` | 1 | stamping the scratch onto the plate |
| `clearRect` | 1 | the scratch |
| `canvas.getContext("2d")`, `canvas.width/height` setters | | the plate and the scratch |

Not used anywhere: `Path2D`, `createPattern`, gradients, `filter`, `getImageData`/`putImageData`, `OffscreenCanvas`, `fontKerning`, `textRendering`, `ellipse`, shadows, `toDataURL`/`toBlob`. The surface is plain 2D drawing plus text; nothing in it is exotic.

## Route 1: a headless browser in the Actions job

Playwright driving Chromium over a page that loads the built site (or a harness page that imports the renderer), then `canvas.toDataURL()` or a clipped screenshot per battle.

**What it costs.** Minutes are free: "GitHub Actions usage is free for public repositories that use standard GitHub-hosted runners", and a job may run six hours ([billing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions), [limits](https://docs.github.com/en/actions/reference/limits)). The `ubuntu-latest` image (Ubuntu 24.04, image 20260831) ships Google Chrome 152.0.7977.64 and Chromium 152 ([runner image readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)), and Playwright launches the installed browser with `channel: 'chrome'` ([browsers](https://playwright.dev/docs/browsers), [`launch`](https://playwright.dev/docs/api/class-browsertype#browser-type-launch)), so the cheapest form is `playwright-core` (13.5 MB unpacked, no install script, no browser download — [registry](https://registry.npmjs.org/playwright-core/latest)) over the runner's Chrome. The documented form is `npx playwright install --with-deps chromium` ([CI](https://playwright.dev/docs/ci)), which downloads Chrome for Testing: 196 MB for the full build or 120 MB for the headless shell (measured by `curl -I` on the CDN URLs `--dry-run` prints; the docs give no size). Playwright's own advice is not to cache the browsers, since restoring the cache "is comparable to the time it takes to download" ([browsers](https://playwright.dev/docs/browsers)). The old `microsoft/playwright-github-action` is archived in favour of the CLI. Either way the job also needs a server for the page (`vite preview` on `dist/`, or `file://` with a harness) and a script that waits on the app's own readiness.

**Font.** The real path: `loadPlateFont()` runs, `document.fonts` holds the face, the plate is exactly the site's plate. A harness must await `document.fonts.ready` (or the promise `loadPlateFont` returns) before drawing, which `main.ts` already does.

**Determinism.** The site's own frames are byte-stable across runs on one machine (the pixel-diff practice above). Playwright promises nothing more: "Browser rendering can vary based on the host OS, version, settings, hardware, power source (battery vs. power adapter), headless mode, and other factors" ([snapshots](https://playwright.dev/docs/test-snapshots)), and since 1.49 headless runs default to the `chromium-headless-shell` build whose screenshots differ from new headless (`channel: 'chromium'`) ([issue 33566](https://github.com/microsoft/playwright/issues/33566)). No Chromium or Playwright document promises pixel-identical canvas rasterization run to run on a GPU-less runner. A still regenerated on every build never needs a reference, so this costs nothing until someone wants to diff stills across builds. `page.screenshot` itself waits on `document.fonts.ready` before capturing ([screenshotter.ts](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/screenshotter.ts)); `deviceScaleFactor` on the context sets the DPR ([browser](https://playwright.dev/docs/api/class-browser)); `page.screenshot({ clip })` or `locator.screenshot()` takes the canvas alone ([screenshots](https://playwright.dev/docs/screenshots)).

**What else it can render.** Anything the page can show: the plate at any size and DPR (`deviceScaleFactor`), the library page itself, the player with its controls for README screenshots, a card open by a real pointer event. It is the only route that can photograph the *page*.

**Blockers.** None hard. The soft ones: a browser install or cache step in `pages.yml`, a server or a `file://` harness for the page to load, and a driver script that waits on the app's own readiness rather than a sleep.

## Route 2: a Node canvas

Import the renderer into Node, hand it a `@napi-rs/canvas` (or `node-canvas`) canvas, write the PNG. No browser, no page, no server.

### Measured with `@napi-rs/canvas` 1.0.8

The whole shim was: a `node:module` `load` hook that answers a `.woff2` URL with `export default "<url>"`; `globalThis.window = { devicePixelRatio }`; `globalThis.document = { createElement: () => createCanvas(1, 1) }`; `GlobalFonts.register(woff2Bytes, "IM Fell English")`. Then the repo's own `validateBattle`, `validateMap`, `pictureAt`, `clockIntervals` and `createRenderer`, imported by path under `--experimental-strip-types`, and `canvas.toBuffer("image/png")`.

| Still | Backing store | `render` | PNG |
|---|---|---|---|
| Trafalgar, chart plate, 1200 x 630 @1 | 1200 x 630 | 35 ms | 190 kB |
| Trafalgar, atlas, 1200 x 630 @1 | 1200 x 630 | 9 ms | 135 kB |
| Cannae, chart plate, 1200 x 630 @1 | 1200 x 630 | 62 ms | 287 kB |
| Cannae, night plate, 640 x 360 @1 | 640 x 360 | 210 ms | 101 kB |
| The Nile, night plate, 1200 x 630 @1 | 1200 x 630 | 35 ms | 232 kB |
| Copenhagen, chart plate, 480 x 270 @1 | 480 x 270 | 71 ms | 55 kB |
| the same six @2 | 2400 x 1260 etc. | 10 to 227 ms | 167 to 755 kB |

Whole process, six stills, cold: **1.3 s** wall time. A second run produced six byte-identical PNGs (`cmp` on every file). The woff2 registered straight from the file's bytes (`GlobalFonts.has("IM Fell English")` true), with no conversion to TTF. The stills show IM Fell English throughout, the caption band, the legend's glyph samples, the contour tints, the work labels' tracking, and engaged clouds whose interiors are empty paper rather than ink — which is `destination-out` on the scratch behaving as ADR-0014 requires.

**Against Chrome.** The same four instants (Trafalgar phase 4 in the plate and in atlas, Cannae phase 5, the Nile phase 3 at night) were shot from headless Chrome 152 over the DevTools protocol at 1x, clipped to the canvas (1200 by 722 or 766), and rendered in Node at the same size and the same `startSeconds`:

| Frame | Pixels differing at all | Differing by more than 40/255 in a channel |
|---|---|---|
| Trafalgar, plate, phase 4 | 9.6% | 2.5% |
| Trafalgar, atlas, phase 4 | 6.5% | 2.6% |
| Cannae, plate, phase 5 | 20.0% | 2.5% |
| The Nile, night, phase 3 | 14.0% | 3.7% |

Every strong difference is on text: each glyph's edge pixels, and a downward shift of the ink of 1 to 3 px. No difference is on the map, the glyphs, the pens, the stipple or the clouds beyond antialiasing. Two findings behind that:

- **`measureText` agrees.** Eighty strings in five font strings at two tracking values: widths differ by at most 0.005 px (napi-rs rounds to two decimals; Chrome does not). The label placer, the caption's line breaks and the furniture's boxes are therefore identical, and the labels land where the browser puts them.
- **The vertical offset is the baseline, not the layout.** `fontBoundingBoxAscent/Descent` for the face at 24 px is 22/9 in Chrome and 21.73/8.72 in Skia-in-Node: Chrome rounds the face's metrics to whole pixels, Skia does not. `alphabetic` text lands on the same row; text on `middle`, `top` or `bottom` (14 of the renderer's 14 assignments) lands 1 px lower at 11 px, 2 px at 15 px and 3 px at 24 px. The plate's boxes are computed from widths and sizes, so nothing moves but the ink inside its box.
- **The label memory is a confound to know about.** The first Node comparison put "Weather column" and "Lee column" elsewhere than Chrome did; the browser had drawn phase 0 before the jump and the labels stayed where they stood (#39), while Node drew phase 4 cold. Drawing the first phase before the still's phase on the same renderer reproduced the browser's placement exactly. A build that wants the still to match what a viewer sees after scrubbing should do the same; a build that wants the cleanest placement for the phase should not. Either is one line.

**Font.** `GlobalFonts.register(buffer, family)` takes the woff2 bytes; no `FontFace`, no document. The family name is whatever the font string asks for, so `plateFont()` needs no change.

**Cost in the job.** One `npm` dependency: `@napi-rs/canvas` (152 kB) plus the platform package (`@napi-rs/canvas-linux-x64-gnu` on `ubuntu-latest`; the Windows one measured here is 37 MB). No apt packages, no browser, no cache step. The render script is one `node --experimental-strip-types` invocation after `vite build`, on the pattern `scripts/validate.ts` already uses, writing into `dist/`.

The documented facts behind that: the README says "0 System dependencies", Skia at `chrome/m151`, and a glibc floor of 2.18 ([README](https://github.com/Brooooooklyn/canvas)); Ubuntu 24.04 ships glibc 2.39 ([release notes](https://discourse.ubuntu.com/t/noble-numbat-release-notes/39890)). Version 1.0.8 was published 2026-08-24, `engines >= 10`, with `@napi-rs/canvas-linux-x64-gnu` at 33.98 MB unpacked as the optional platform package the runner resolves ([registry](https://registry.npmjs.org/@napi-rs/canvas/latest), [linux-x64-gnu](https://registry.npmjs.org/@napi-rs/canvas-linux-x64-gnu/latest)). woff2 has been accepted since 0.1.0 (2021), `letterSpacing` since 0.1.50 (2024), `roundRect` and a `DOMMatrix` from `getTransform` since 0.1.32 ([CHANGELOG](https://github.com/Brooooooklyn/canvas/blob/main/CHANGELOG.md), [global_fonts.rs](https://github.com/Brooooooklyn/canvas/blob/main/src/global_fonts.rs)); the `register(Buffer)` aliasing bug was fixed by [PR 1194](https://github.com/Brooooooklyn/canvas/pull/1194) in January 2026. pdf.js moved from node-canvas to it ([pdf.js 19145](https://github.com/mozilla/pdf.js/issues/19145)). A second probe in a `node:22` Linux container (glibc 2.36) registered the woff2, exercised `letterSpacing`, `destination-out`, `roundRect`, `getTransform`, dashes, clip and a nine-argument `drawImage` from a canvas, and produced the **same sha256 on Linux as on Windows** for the same test render. One caveat from that container: a fallback family the font string names (Georgia) is honoured only if installed, so the face must be registered before every render and never left to the fallback — which `loadPlateFont` already insists on in the browser.

**Node and Vite.** Type stripping is on by default from Node 22.18 and the runner caches Node 22.23.2 ([typescript](https://nodejs.org/api/typescript.html), [runner image](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)); the repo's imports already carry `.ts` extensions for it. The alternative to a `.woff2` module hook is Vite loading the renderer itself: `createServer({ server: { middlewareMode: true } })` and `ssrLoadModule` transform the source for Node with the asset import resolved ([SSR](https://vite.dev/guide/ssr)), or the newer `createServerModuleRunner` ([environment runtimes](https://vite.dev/guide/api-environment-runtimes)). If the stills are to be Vite outputs rather than files written beside them, a build-only plugin's `generateBundle` can `this.emitFile({ type: "asset", fileName, source })` and `closeBundle` runs last, both still called by Vite 8 on Rolldown ([plugin API](https://vite.dev/guide/api-plugin), [Rolldown Plugin](https://rolldown.rs/reference/Interface.Plugin), [Rollup hooks](https://rollupjs.org/plugin-development/)). The native package must stay out of the browser graph either way; a script after `vite build` is the simplest shape and the one `serve-data.ts` already models for `index.json`.

**What else it can render.** Any size and DPR of the plate in any view: the 1200 by 630 social card, a 2x thumbnail, a README plate. Not the page: no controls, no library masthead, no open card unless the viewer state is passed by hand (`viewer.card` is a plain id, so a card *can* be drawn).

**Blockers.** None found for the current renderer. The rules that keep it so: the renderer must stay a function of a context and never reach for `document` beyond the scratch canvas, and a future view that wanted `filter`, `createPattern` or `Path2D` should check the support table below first (all three exist in napi-rs; none is used).

### `node-canvas` (Cairo and Pango)

Two hard blockers, both verified on 3.2.3 (latest, 2026-03-31) and on the 4.0.0-rc3 `next` release (2026-08-15):

- **It cannot read the bundled face.** `registerFont` on the woff2 throws "Could not parse font file" on Linux (and "Could not load font to the system's font host" on Windows); 4.0's `FontFace(woff2)` stays `unloaded` and text falls back, and its README says the source is "a path to the font file or a buffer in TrueType format" ([README at master](https://github.com/Automattic/node-canvas/blob/master/README.md), [issue 1737](https://github.com/Automattic/node-canvas/issues/1737)). The way round is a TTF copy of IM Fell English in the repo for the build alone.
- **`letterSpacing` is inert.** Not in the typings, no effect on `measureText` in either version; the request has been open since 2017 ([issue 1014](https://github.com/Automattic/node-canvas/issues/1014)) and the 2020 PR was closed in August 2026 because version 4 replaced Pango ([PR 1615](https://github.com/Automattic/node-canvas/pull/1615), [PR 2602](https://github.com/Automattic/node-canvas/pull/2602)). The map's work labels would draw untracked, silently.

The rest is fine: all the standard composite operations including `destination-out`, `roundRect`, `getTransform`, dashes, clip and `drawImage` from a canvas all work, and same-machine renders are byte-identical. The 3.x prebuild for Linux x64 is 8.7 MB via `prebuild-install`, which npm now flags as unmaintained, with a `node-gyp` fallback that needs `libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev` ([release](https://github.com/Automattic/node-canvas/releases), [registry](https://registry.npmjs.org/canvas/latest)); 4.0 cross-compiles a package per target and drops the install script, but has no GitHub release yet. Nothing here beats `@napi-rs/canvas`, and two things lose to it.

## Route 3: rendered once by hand and committed

The method today: `docs/screenshots/` holds 41 files and 11 MB of browser screenshots taken over the DevTools protocol, and the README links one of them. Nothing in the build touches them.

**Cost.** No build machinery; a repository that grows by a few hundred kB per battle per view; a person (or a session) who remembers to re-shoot. **Staleness is structural**: ADR-0011 made "a battle joins the library by existing" the rule, and a committed thumbnail breaks it in the small — a new battle has no still until someone makes one, and a changed renderer (the label placer arrived in #102 and was retuned in #111, #117, #118 and #119 inside one release) leaves every committed still showing the old plate. There is no check that could catch it short of re-rendering, which is Route 2.

**What else.** It is the right home for stills that are *not* a function of the data: a designed social card with the brand's masthead, a screenshot with a card open and a pointer in it, a phone frame. The README's screenshots can stay hand-made for as long as they show the page rather than the plate.

**Blocker.** None technical; it fails the ADR-0011 rule rather than a test.

## Route 4: rendered in the browser on the library page

A hidden canvas per battle on the front door, the renderer drawing each battle's still after the page loads.

**Cost.** Today the library fetches `data/index.json` only (ADR-0011 rejected fetching every battle file to show four titles). A thumbnail per battle would fetch every battle file (35 to 66 kB each) and its map (3 to 85 kB), about 300 kB for four battles today and growing with the library, before drawing four plates at 10 to 200 ms each on the visitor's device. At seven battles (the grouping threshold on #121) that is half a megabyte the library page did not need.

**Font and determinism.** The real ones: it is the site.

**What else.** Nothing beyond the page: no social card (crawlers do not run the renderer), no README screenshot.

**Blocker.** The social card. An Open Graph image has to be a URL to a file, and a thumbnail that only exists in a visitor's browser is not one. Since #121 lists the social card as the other thing the still machinery should render, this route cannot be the one.

## The renderer's canvas API surface versus each library

"Verified" means exercised in this research on the current package (1.0.8, 3.2.3, 4.0.0-rc3, Chrome 152); "typed" means present in the package's `index.d.ts` and not exercised.

| What the renderer does | `@napi-rs/canvas` 1.0.8 | `node-canvas` 3.2.3 | `node-canvas` 4.0.0-rc3 | Headless Chrome (Playwright) |
|---|---|---|---|---|
| Paths, fills, strokes, `fillRect`, `strokeRect`, `arc`, `rect`, `clip` | Verified, the whole plate | Verified | Typed | Native |
| `save`/`restore`, `translate`/`rotate`, `setTransform`, `getTransform` (a `DOMMatrix`) | Verified | Verified (since 2.8.0) | Typed | Native |
| `setLineDash` | Verified | Verified | Typed | Native |
| `roundRect` | Verified (since 0.1.32) | Verified (fixed 3.2.1) | Verified | Native |
| `font`, `fillText`, `strokeText`, `textAlign`, `textBaseline` | Verified; `middle`/`top`/`bottom` land 1 to 3 px lower than Chrome | Verified draws | Verified draws | Native |
| `measureText().width` | Verified, matches Chrome to 0.005 px; 12-field `TextMetrics` | Verified; 8 fields, no `fontBoundingBox*` | Typed | Native |
| `letterSpacing = "0.5px"` | Verified (since 0.1.50) | **Inert** (issue 1014) | **Inert** | Native |
| `globalAlpha` | Verified (tint bands drew) | Verified | Typed | Native |
| `globalCompositeOperation = "destination-out"` on a scratch canvas | Verified, cloud interiors empty | Verified | Verified | Native |
| `drawImage(scratchCanvas, 8 args)` | Verified (canvas source fixed 0.1.67) | Verified | Verified | Native |
| `clearRect` | Verified | Verified | Typed | Native |
| A second canvas for the scratch | `createCanvas` behind a `document.createElement` stub | same | same | `document.createElement` itself |
| `window.devicePixelRatio` | a global stub, any value including below 1 | same | same | `deviceScaleFactor` on the context |
| The woff2 face | `GlobalFonts.register(bytes, family)`, verified | **Cannot parse** | **Stays `unloaded`** | `FontFace` + `document.fonts`, the app's own code |
| PNG out | `toBuffer("image/png")` (sync) or `encode("png")` | `toBuffer("image/png")` | `toBuffer` | `canvas.toDataURL()` in `page.evaluate`, or a clipped screenshot |
| Same bytes run to run | Verified, and the same sha256 on Windows and Linux | Same machine only | Not tested | Not promised by the docs |
| Cost on `ubuntu-latest` | one 34 MB npm package | 8.7 MB prebuild via an unmaintained installer, or apt and a compile | not released | 0 with the runner's Chrome 152, else 120 to 196 MB per job |

## Recommendation

**Render the stills in Node with `@napi-rs/canvas`, as a script the Pages workflow runs after `vite build`.** One dependency, no browser, sub-second for the whole library, byte-stable, and proven on the real renderer over the real data today: the only visible difference from the browser's plate is antialiasing and text a pixel or three lower, which a thumbnail cannot show and a social card does not care about. The same call at 1200 by 630 is the social card, and at any size is a README plate.

What the build has to do, concretely: a `scripts/stills.ts` on the `validate.ts` pattern; a `node:module` hook (or Vite's own `ssrLoadModule`, which resolves the woff2 import natively — see the Vite section) so the renderer imports; two globals for the renderer's two DOM touches; the woff2 registered from `src/fonts/`; one PNG per battle (and view, if #134 wants more than the chart plate) written to `dist/data/stills/` or beside `index.json`, and the library's index carrying the still's URL. The renderer needs no change, and should be kept needing none: the two DOM touches are the whole contract.

Keep Playwright in reserve for the day a view needs the browser (a CSS-driven surface, a `filter`, a screenshot of the page with its controls), and keep hand-made screenshots for what shows the page rather than the plate.

## Facts the thumbnails decision (#134) depends on

- A still costs 10 to 230 ms and is deterministic, so **every battle in every view on every push** is affordable; the decision can pick a view per battle or all three without a cost argument.
- **The still is the whole frame, caption band included,** letterboxed to the battle's extent like the page. There is no plate-only render: the band's height is computed inside `render` and not returned, so a thumbnail without the band is either a renderer option (a `Viewer` flag, or `render` returning the plate rect so the script can crop) or a crop by a number the script recomputes. A crop to the action is the same story with an extent.
- **Width picks the layout mode.** A canvas 560 CSS px wide or narrower draws in phone mode (`layout.ts`): furniture collapsed, labels at the phone floor, and at 480 by 270 the band is most of the frame. A thumbnail should not be a small canvas; it should be a desktop-width canvas at a DPR below 1, which `fitBackingStore` already does — 1200 by 630 at DPR 0.4 gave a 480 by 252 desktop plate, legible, in 34 ms, with no renderer change.
- `render` accepts `viewer.card`, so a still with a card open is possible; hover is not (it is player state).
- The still can be told to **warm the label memory** with the first phase or drawn cold; the placement differs, both are correct.
- `pictureAt` accepts any clock, so a still can be a phase's instant or a mid-tween one, but a phase's own instant is what the ticks show.
- The social card is the same call at 1200 by 630 and needs a file URL, which rules out in-browser rendering; a **designed** card with the masthead is Route 3's business or a second script drawing over the still.
- Nothing in the battle file is needed: the phase to render can be a build rule (`#134` lists the candidates) or a field; the machinery is indifferent.

## Method

Throwaway scripts in the session's scratchpad, not committed. `stills.mjs`: the shim above, six stills from the four battle files, sha1 per file, run twice and `cmp`'d. `cdp.mjs`: headless Chrome 152 launched with `--remote-debugging-port`, `Emulation.setDeviceMetricsOverride` 1200 by 820 at 1x, the dev server's `?battle=` page polled for `.st-controls`, the view `<select>` set and `change` dispatched, the phase's `.st-tick` clicked, the pointer moved off the plate, `Page.captureScreenshot` clipped to the canvas rect. `compare.mjs`: the same frames in Node at the canvas's size and the phase's `startSeconds`, decoded with `loadImage` and `getImageData`, counted at two thresholds, with a diff image. `measure.mjs` and `baseline.mjs`: the same strings and fonts measured and drawn in both engines. All timings from `performance.now()` around `render`; sizes from the PNG files.
