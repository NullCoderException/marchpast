# Marchpast

*Concept document — started September 2026 for v0.1, roadmap and decisions log kept current through v0.3. Living doc; expand freely.*

## One-liner

A web app that plays back famous battles as animated 2D "grand strategy" sequences, driven by a reusable JSON timeline format, with the timelines extracted from public-domain primary and secondary sources.

## Why this exists

I've been listening to military history podcasts and wanted to see the battles, not just hear about them. Documentary-style map animations (blocks, arrows, captions) communicate the shape of a battle better than prose. I have no game dev or 3D art ability, so this deliberately is *not* a game and *not* 3D. It's a data-driven animation player where the interesting work is the data.

## What it is / what it isn't

**It is**
- A timeline player: map, unit markers, movement arrows, play/pause/scrub, narration captions.
- A JSON schema for describing a battle as a sequence of phases.
- Eventually, a library of battles sharing one renderer.
- Eventually, an LLM-assisted pipeline that turns source texts into draft timelines.

**It isn't**
- A game. No AI opponents, no simulation of outcomes, no player input beyond playback controls.
- 3D. No engine, no assets, no camera work. (Godot or Three.js is a possible phase-N experiment, not a plan.)
- A Ridley Scott movie. The bar is "scripted Total War replay" or "History Channel map with arrows."

## Architecture (as decided so far)

- **Language:** TypeScript.
- **Renderer:** HTML Canvas (PixiJS is the upgrade path if plain Canvas gets painful). Stylized/parchment map look rather than real basemap tiles, at least initially.
- **Core principle:** battle = data. The renderer knows nothing about any specific battle. Everything battle-specific lives in `data/battles/<name>.json`.
- **Agents:** Claude Code does most of the TypeScript. Keeping everything 2D and data-driven is what makes agent-driven development viable here — there is no visual scene an agent has to eyeball.

## Data model sketch

*Superseded: the sketch below is the September 2026 starting point, kept for the record. The format as built is [`docs/schema.md`](schema.md) (schema v2 since 2026-09-06), with the reasoning in [`docs/adr/`](adr/) and the vocabulary in [`CONTEXT.md`](../CONTEXT.md). The sketch's `t_start`/`t_end` became one instant per phase, `struck` became the battle-neutral `destroyed`, moves nest under units, and units gained an arm and an authored hierarchy.*

A battle file is a list of **phases**. Each phase has:

- `id`, `label` — e.g. `approach`, "Nelson's columns bear down"
- `t_start`, `t_end` — battle-clock time (historical time of day)
- `playback_rate` — how fast this phase plays relative to real time. Hours of approach can compress to seconds; the decisive minutes can play slow.
- `wind` — direction and strength (needed for naval battles; ignorable on land)
- `units[]` — each with `id`, `side`, `position`, `heading`, `formation`, `strength`, `state` (intact / engaged / broken / struck)
- `moves[]` — arrows: from unit, to position, style
- `caption` — narration text, ideally quoting or paraphrasing a primary source
- `source_refs[]` — where this phase's facts came from

Units can be hierarchical (fleet → column/squadron → ship; army → wing → legion). Start coarse, subdivide only when it earns its keep.

Open schema questions live in the "Open questions" section below.

## First battle: Trafalgar (21 October 1805)

Chosen over Cannae because it stress-tests the schema in useful ways:
- Wind is a first-class element of the animation.
- Units need heading and speed, not just position.
- Hours of slow approach followed by chaotic melee forces the `playback_rate` decision early.
- No terrain problem: water, one coastline, done.

**Granularity plan:** three units first (Nelson's weather column, Collingwood's lee column, the Combined Fleet's line). Then squadrons. Then individual ships only if it still matters. The ships' own logs disagree by 30+ minutes because each kept its own clock, so minute-level precision is a fiction anyway.

**Sources (public domain):**
- Nelson's memorandum of 9 October 1805 — the plan, one page, ideal caption material
- Collingwood's dispatch to the Admiralty (London Gazette, November 1805)
- Southey, *The Life of Nelson* — narrative color
- Mahan, *The Life of Nelson* — tactical analysis
- Wikipedia: "Order of battle at the Battle of Trafalgar" — every ship, guns, column position; ready to become JSON
- Wikimedia Commons — CC-licensed battle diagrams for reference

## Source strategy (general)

Prefer public-domain and CC material so battles can be shipped with their sources:
- Project Gutenberg, Internet Archive, Perseus Digital Library (ancient sources: Polybius, Livy, Caesar, Thucydides)
- US Army Center of Military History (public domain; Civil War through WWII)
- Wikipedia / Wikimedia Commons for orders of battle and maps

**Extraction pipeline (later):** feed a source chapter plus the JSON schema to a model, get a draft timeline, hand-correct it. First test: Nelson's memorandum + Mahan's battle chapter → Trafalgar phases. If the draft is decent, the pipeline idea has legs; if not, timelines get hand-authored and that's fine.

## Weekend 1 scope

Done means:
1. Repo scaffolded, `CLAUDE.md` and this doc in place.
2. `schema.md` written; `trafalgar.json` with ~5–8 phases at three-unit granularity.
3. Canvas renderer: draws map, units, arrows; play/pause/scrub; shows captions.
4. It plays Trafalgar end to end and looks at least legible.

Explicitly out of scope this weekend: per-ship detail, terrain, the extraction pipeline, a second battle, a name that's been checked against npm.

## Roadmap (loose)

- **v0.1** — Trafalgar plays. Schema v1. *Done 2026-09-06; hosted on GitHub Pages.*
- **v0.2** — Three more battles on the hosted site, one of them on land: Cannae forces schema v2 (arms, a third formation word, an authored hierarchy, rivers, shoals, works and contours in the map, a clock that crosses midnight); the Nile and Copenhagen are the naval reuse tests; the renderer becomes a set of viewer-picked views (chart plate, night plate, atlas); the site gets a library as its front door and a picker; Trafalgar is re-authored at squadron level. *Spec: [`docs/schema.md`](schema.md) and ADR-0011 to ADR-0019; build issues under the v0.2 milestone. Done 2026-09-06.*
- **v0.3** — Three more battles across two millennia on a branded site whose views reach the player surface. Alesia (52 BC) brings a siege, a quiet day and the rampart as a map feature; the Little Bighorn (1876) brings conjecture, answered as notes matter; Midway (1942) brings aircraft as an arm, a unit absent from a phase and an extent across the 180th meridian. The product is renamed Marchpast and gets a mark, an icon set, a manifest and its own domain; the library gains a chronology rail and build-rendered stills; every battle gets a page and a social card of its own; a view is five hands over a fixed anatomy, drives the player's surface and is remembered; the Staff map is the first view outside the engraved system. *Spec: [`docs/schema.md`](schema.md) and ADR-0020 to ADR-0030; build issues under the v0.3 milestone, handed off 2026-09-07. Done 2026-09-07; live at marchpast.com.*
- **v0.4** — Extraction pipeline prototype, with the Cannae extraction test from Polybius as its first trial.
- **v0.5** — Real basemap option; ship or unit level below squadrons where it earns its keep.
- **Someday** — 3D experiment in Godot, if the 2D version proves the data is the valuable part; a store app, once there is a brand and seven battles to package; a parchment or medieval view, when someone can name the battle it serves.

## Open questions

The v0.1 questions are all answered: real lat/lon from day one (ADR-0001), a linear tween between snapshots (ADR-0002), authored state and strength rather than a simulation (ADR-0003), one caption per phase with the argument in `notes` (ADR-0006). The name is settled the other way: the product was renamed from Sandtable to Marchpast on 2026-09-07 (ADR-0020). The v0.2 questions closed on the v0.3 map: thumbnails are stills the build renders from the phase a battle marks (ADR-0025), and the Little Bighorn and Midway are v0.3 battles with the schema changes they forced (ADR-0024, ADR-0027). What remains open is what the next map charts:

- The extraction pipeline, with the Cannae test from Polybius as its first trial (v0.4).
- A store app: a native wrapper, store accounts, pricing and offline, once v0.3 has shipped a brand and seven battles to package.
- A parchment or medieval view, or any fifth view: the seam is cut (ADR-0021) and a view waits for the battle it serves.
- Grouping the library, when it passes twelve battles or a grouping would hold three entries that chronology does not already make contiguous (ADR-0022).
- Labels beside the three choosers, if a control's width can be found for them (#137).
- A forced-colours repair, only if the real Windows High Contrast check (#181) finds the opt-out does not hold (ADR-0030).

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-09-05 | 2D data-driven player, not a game engine | No game dev/3D skill; agents work far better on 2D TypeScript |
| 2026-09-05 | TypeScript + Canvas | Existing skillset; simplest thing that works |
| 2026-09-05 | Battle = JSON timeline, renderer is battle-agnostic | Reusability is the whole point |
| 2026-09-05 | First battle: Trafalgar | Stress-tests wind, heading, time compression; sources are rich and free |
| 2026-09-05 | Three units first, subdivide later | Avoid the 60-ship rabbit hole before anything renders |
| 2026-09-05 | Schema v1 locked after an extraction test, adding only `commander` (ADR-0001 to ADR-0010) | Two independent model runs produced valid files; the one unreliable field was position, a pipeline input, not a schema gap |
| 2026-09-06 | v0.2 is Cannae, the Nile and Copenhagen on a hosted site; hosting is GitHub Pages | Cannae forces the land generalisation; the two naval battles test reuse; Azure and a custom domain wait |
| 2026-09-06 | The library is the front door, built from the battle files; a battle plays at `?battle=<name>` (ADR-0011) | A battle joins the site by existing; pretty paths and hashes lose on Pages |
| 2026-09-06 | Map format v2: `river`, `shoal`, `work`, `contour`; elevation as contour lines; one map file is one moment (ADR-0012) | The three battles need exactly these; contours are ordinary GeoJSON at a tenth of the cost of bands; hachures would need a raster |
| 2026-09-06 | The battle clock crosses midnight by a per-phase `day` offset; the clock is a reading, never an instant (ADR-0013) | The Nile runs past midnight; ISO datetimes assert an instant the sources cannot give and break at 216 BC |
| 2026-09-06 | One engraved design language; a view is a palette, pens and a glyph; three views, the chart plate default (ADR-0014) | Decided once above the renderer, so the views cannot drift into second aesthetics |
| 2026-09-06 | Every unit carries an `arm` and every view draws every arm (ADR-0015) | Cannae's horse and foot must be tellable apart without reading the label |
| 2026-09-06 | Land units draw as ranks of signs at a fixed plate size; formation gains `mass` (ADR-0016) | A nominal true length drew a 560px unit at Cannae; a glyph is type-sized, never geometry |
| 2026-09-06 | Hierarchy is authored at every level and the viewer picks the level; sixteen units drawn at once is the ceiling (ADR-0017) | Both the coarse and the fine picture are facts from the sources, never a roll-up; the label proof set the ceiling |
| 2026-09-06 | v1's states, strength and moves carry Cannae, the Nile and Copenhagen unchanged; `broken` widened; heading is the fighting front; anchoring and the truce are caption matter (ADR-0018, ADR-0019) | Every proposed fifth state or third move kind priced a glyph and a legend row for a sentence the caption already writes |
| 2026-09-06 | Labels place by a sticky search with a five-step collapse and an authored `short_label`; the unit card is the label unfolded; the view and level choosers are `<select>`s that never remember | Measured over whole playbacks: the only algorithm with no overlap to sixteen units; neither derived short name survives Cannae |
| 2026-09-07 | The product is renamed from Sandtable to Marchpast (ADR-0020) | The name research found a live USPTO application for SANDTABLE in classes 9 and 42 for software that simulates forces over terrain, a registered SIMTABLE beside it, the npm name taken and every useful domain held; a brand ticket was about to draw a logo and a task ticket about to buy a domain, so this was the cheapest hour the rename would ever cost |
| 2026-09-07 | Hosting stays GitHub Pages, now behind the custom domain `marchpast.com` (`.app` and `.org` held alongside and redirected); the Pages base becomes a bare `/` (ADR-0020) | A brand needs its own address and an unregistered name can go any day; the domain in front of Pages is also what makes the repository rename free, and it deletes the base-path literal rather than rewriting it twice |
| 2026-09-07 | The anatomy is fixed and a view owns how it is drawn: a view is a palette, pens and five hands, and there may be any number of aesthetics (ADR-0021, #139) | The staff map broke ADR-0014's closed list in four places at once; a rule can be applied by the session that meets the next case, a list only amended by another one |
| 2026-09-07 | The library is a chronology with a rail, not a grouping (ADR-0022) | The sort already makes every cluster worth having; the 1,848 years between Alesia and the Nile need writing, not drawing |
| 2026-09-07 | The view reaches the player surface and is remembered; the surface derives its tokens from the palette, the choosers stay native, the strip carries `← All battles` (ADR-0023, ADR-0030) | A view already supplies every value the strip needs; hand-copied colours in three files were the only reason it did not follow, and a shared link made a way back necessary |
| 2026-09-07 | `aircraft` is an arm and a unit may be absent from a phase (ADR-0024) | Midway is about aeroplanes, and under the old rule a carrier whose strike was airborne dropped off the plate |
| 2026-09-07 | The library shows a build-rendered still of the phase a battle marks; a battle is a page at `/<name>/` with its own social card (ADR-0025, ADR-0028) | Every battle opens pre-contact, so the picture is authored; a static host cannot vary a card from a query string, so the card is downstream of the URL |
| 2026-09-07 | A rampart is the seventh map feature, and Alesia needs nothing else (ADR-0026) | Thirty-seven kilometres of ditch and rampart are the subject of the battle and `work` is a point; everything else on the research's list closed with a caption or a rule |
| 2026-09-07 | Conjecture is notes matter, `notes` is required and a battle authors one reading (ADR-0027) | The evidence is compound and a field is atomic; a flag would price a glyph and a legend row for a reason rather than a picture |
| 2026-09-07 | The site reads no operating-system preference and the surface declines forced colours (ADR-0029) | All motion is requested, a view cannot be derived from two values, and the one query that breaks a page is the one that gets a rule |
| 2026-09-07 | The brand is A · The Review; the Staff map is the fourth view; the aircraft sign is an aeroplane in plan; the unit card is reached through a muster (#135, #139, #140, #130; no ADR) | Drawn and chosen on canvases, or decided against the code as it stands; none changes a rule |

## Known risks

- **Decision paralysis.** Comparing renderers and map libraries instead of writing the schema. Mitigation: this doc, and the decisions log above. Re-litigate only with a new reason.
- **Fidelity creep.** Per-ship tracks before the three-unit version plays. Mitigation: weekend scope above.
- **Source quality.** Public-domain histories are old and sometimes wrong. Mitigation: cross-check against Wikipedia order-of-battle pages; keep `source_refs` per phase so corrections are traceable.
