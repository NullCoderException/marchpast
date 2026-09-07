# Sandtable (working title)

*Concept document — started September 2026 for v0.1, roadmap and decisions log kept current through v0.2. Living doc; expand freely.*

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
- **v0.2** — Three more battles on the hosted site, one of them on land: Cannae forces schema v2 (arms, a third formation word, an authored hierarchy, rivers, shoals, works and contours in the map, a clock that crosses midnight); the Nile and Copenhagen are the naval reuse tests; the renderer becomes a set of viewer-picked views (chart plate, night plate, atlas); the site gets a library as its front door and a picker; Trafalgar is re-authored at squadron level. *Spec: [`docs/schema.md`](schema.md) and ADR-0011 to ADR-0019; build issues under the v0.2 milestone.*
- **v0.3** — Extraction pipeline prototype.
- **v0.4** — Real basemap option; ship or unit level below squadrons where it earns its keep; library thumbnails.
- **Someday** — 3D experiment in Godot, if the 2D version proves the data is the valuable part.

## Open questions

The v0.1 questions are all answered: real lat/lon from day one (ADR-0001), a linear tween between snapshots (ADR-0002), authored state and strength rather than a simulation (ADR-0003), one caption per phase with the argument in `notes` (ADR-0006). "Sandtable" stuck. What remains open is what the next map charts:

- An extraction test on Cannae from Polybius, before or alongside the pipeline effort (v0.3).
- Library thumbnails: a still per battle rendered by the build from a chosen phase in a decided view.
- Little Bighorn and any WWII battle: the arms and elevation are designed with them in mind; each is its own effort.

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
| 2026-09-07 | Hosting stays GitHub Pages, now behind the custom domain `marchpast.com` (`.app` and `.org` held alongside and redirected); the Pages base becomes a bare `/` (ADR-0020) | A brand needs its own address and an unregistered name can go any day; the domain in front of Pages is also what makes the repository rename free, and it deletes the base-path literal rather than rewriting it twice |

## Known risks

- **Decision paralysis.** Comparing renderers and map libraries instead of writing the schema. Mitigation: this doc, and the decisions log above. Re-litigate only with a new reason.
- **Fidelity creep.** Per-ship tracks before the three-unit version plays. Mitigation: weekend scope above.
- **Source quality.** Public-domain histories are old and sometimes wrong. Mitigation: cross-check against Wikipedia order-of-battle pages; keep `source_refs` per phase so corrections are traceable.
