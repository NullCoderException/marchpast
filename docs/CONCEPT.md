# Sandtable (working title)

*Concept document — v0.1, September 2026. Living doc; expand freely.*

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

- **v0.1** — Trafalgar plays. Schema v1.
- **v0.2** — Second battle (Cannae: land, terrain-light, ancient sources) to force schema generalization.
- **v0.3** — Extraction pipeline prototype.
- **v0.4** — Battle library UI, real basemap option, subdivision to ship/unit level.
- **Someday** — 3D experiment in Godot, if the 2D version proves the data is the valuable part.

## Open questions

- Coordinates: abstract map units per battle, or real lat/lon from day one? (Lat/lon makes basemaps possible later; abstract is simpler now.)
- Interpolation between phases: linear tween, or keyframes within phases?
- How to represent casualties/strength decay visually without turning it into a simulation?
- Where does the "authoritative" narrative live when sources disagree? One `caption` field, or per-source alternates?
- Name. "Sandtable" is the front-runner; also considered Dispatches, Engage, ORBAT.

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-09-05 | 2D data-driven player, not a game engine | No game dev/3D skill; agents work far better on 2D TypeScript |
| 2026-09-05 | TypeScript + Canvas | Existing skillset; simplest thing that works |
| 2026-09-05 | Battle = JSON timeline, renderer is battle-agnostic | Reusability is the whole point |
| 2026-09-05 | First battle: Trafalgar | Stress-tests wind, heading, time compression; sources are rich and free |
| 2026-09-05 | Three units first, subdivide later | Avoid the 60-ship rabbit hole before anything renders |

## Known risks

- **Decision paralysis.** Comparing renderers and map libraries instead of writing the schema. Mitigation: this doc, and the decisions log above. Re-litigate only with a new reason.
- **Fidelity creep.** Per-ship tracks before the three-unit version plays. Mitigation: weekend scope above.
- **Source quality.** Public-domain histories are old and sometimes wrong. Mitigation: cross-check against Wikipedia order-of-battle pages; keep `source_refs` per phase so corrections are traceable.
