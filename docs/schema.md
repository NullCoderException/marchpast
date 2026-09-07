# Schema v2: the battle file and the map file

*Derived from ADR-0001 to ADR-0019, `CONTEXT.md` and the decisions recorded on the v0.2 wayfinder map ([#36](https://github.com/NullCoderException/marchpast/issues/36)) on 2026-09-06, for the v0.2 build. Until the schema v2 build issue lands, this document is the spec the code is built to; from then on the source of truth is the code (the types in `src/schema/types.ts`, the licence table in `src/schema/licenses.ts`, the validators `src/schema/validateBattle.ts` and `src/schema/validateMap.ts`) and this document is kept in step with it, never edited against it. A test validates the two JSON examples below against the validators so they cannot drift.*

Two data files describe a battle. The **battle file** at `data/battles/<name>.json` is the timeline: a roster of units and a list of phases, each phase the picture of every unit at one battle-clock instant. The optional **map file** at `data/maps/<name>.geojson` is the static geography the battle plays over. The renderer knows nothing about any specific battle; everything battle-specific is in these two files.

Vocabulary follows `CONTEXT.md`. Field names are `snake_case`. The one deliberate spelling split: the data field is `license` (SPDX and JSON convention) while prose keeps "licence".

## 0. What changed from v1

v2 is the land-battle generalisation forced by Cannae, plus what the Nile, Copenhagen and a four-battle site needed. The battle file's version number changes; the map file's format grows without one.

| Change | Where | Decided in |
|---|---|---|
| `schema_version` is `2`; a v1 battle file is rejected | 2.1 | this document (see 2.10 rule 1) |
| `date` becomes `dates`, one display string per day; `sort_date` added, required; a phase may carry `day`; `end` gains `end_day` | 2.1, 2.4 | ADR-0013 |
| `summary` added, required | 2.1 | ADR-0011 |
| `arm` added to the roster unit, required: `infantry`, `cavalry` or `ship` | 2.3 | ADR-0015 |
| `parent` and top-level `levels` added: authored hierarchy the viewer picks a level of | 2.3, 2.9 | ADR-0017 |
| `short_label` added to the roster unit, optional | 2.3 | [Label prototype #39](https://github.com/NullCoderException/marchpast/issues/39) |
| `formation` gains `mass` | 2.7 | ADR-0016 |
| `heading` is where the unit's force is directed; `broken` and `strength` sharpened | 2.7 | ADR-0018, ADR-0019 |
| Map features gain `river`, `shoal`, `work` and `contour`; `LineString` and `MultiLineString` become legal for the two line kinds | 3.2 | ADR-0012 |
| More than sixteen units drawn at one level is a validation error | 2.10 rule 17 | ADR-0017 |

Everything else in v1 stands: positions, the extent, wind, sources and references, licences, moves, the track, the tween rules. A v1 **map** file is a valid v2 map file unchanged. A v1 **battle** file needs `schema_version: 2`, `summary`, `dates` in place of `date`, `sort_date`, and `arm` on every unit.

## 1. Conventions shared by both files

| Convention | Rule | Decided in |
|---|---|---|
| Angles | Degrees true, `0` is north, clockwise, a number with `0 <= x < 360`. Decimals allowed so the sixteen compass points round-trip exactly (WNW is `292.5`). Used by `heading` and `wind.from`. | ADR-0001, ADR-0008 |
| Battle-clock time | A 24-hour `"HH:MM"` string, two digits each, `00:00` to `23:59`, on the day its `day` names. Nothing finer: ships' logs are quarter-hour precision at best. The clock is a **reading**, not an instant: it carries no timezone, is never UTC and is never a `Date`. Every time in a file is copied verbatim from the source that gives it. | ADR-0002, ADR-0013 |
| Day | A non-negative integer counting days from the battle's first day at `0`. A battle that never crosses midnight has only day `0`. | ADR-0013 |
| Coordinates in the battle file | `{ "lat": number, "lon": number }` objects, WGS84 decimal degrees, north and east positive, `-90 <= lat <= 90`, `-180 <= lon <= 180`. | ADR-0001 |
| Coordinates in the map file | GeoJSON `[lon, lat]` arrays, WGS84. Nothing converts one file into the other's convention. | ADR-0005 |
| Lengths | None in the battle file. The only unit-bearing fields are `scale_unit`, a display unit for the scale bar, and a contour's `elevation` in metres in the map file. | ADR-0001, ADR-0012 |
| Uncertainty | No uncertainty or confidence field anywhere. Disagreement between sources, an estimated time or position, and a modern river standing in for an ancient channel are caption and `notes` matter. | ADR-0001, ADR-0006, ADR-0012, ADR-0018 |
| Styling | None in data. No colour, glyph, stroke, style, index-contour or view field in either file; the renderer styles each state, move kind, formation, arm and feature kind, and the viewer picks the view and the level. | ADR-0003, ADR-0004, ADR-0005, ADR-0012, ADR-0014, ADR-0017 |
| Licence vocabulary | An SPDX identifier from the allowlist below, or the literal `public-domain`. | ADR-0007 |
| Unknown fields | Rejected. Both validators are strict: an unrecognised key at any level is an error, not ignored. | ADR-0005, ADR-0007 |

### 1.1 Licence identifiers and classes

The allowlist lives in code as a table from identifier to class. v2 ships with the v1 table unchanged:

| Identifier | Class |
|---|---|
| `public-domain`, `CC0-1.0` | public-domain |
| `CC-BY-4.0`, `OGL-UK-3.0` | attribution |
| `CC-BY-SA-3.0`, `CC-BY-SA-4.0`, `ODbL-1.0`, `LGPL-3.0-or-later` | share-alike |

Classes rank `public-domain` < `attribution` < `share-alike`. Adding an identifier is a code change with a class assignment, not a data change. An identifier not in the table is a validation error. Bespoke attribution licences with no SPDX identifier (the Copernicus DEM licence, for one) are not on the list; a map cut from such a source needs an identifier added first, and the v0.2 maps avoid the need by preferring public-domain sources (ADR-0012).

## 2. The battle file

`data/battles/<name>.json`, one JSON object. Ships under CC BY 4.0 (`data/LICENSE`) and may draw on no share-alike source.

### 2.1 Battle level

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema_version` | literal `2` | yes | Rejected if anything else. A v1 file is rejected with a message saying what v2 needs (section 0). |
| `title` | string | yes | Display title, e.g. `"The Battle of Trafalgar"`. |
| `summary` | string | yes | One plain sentence the battle carries to describe itself wherever it is named but not played: the Library's list, the Picker. Display only. |
| `dates` | string[] | yes, at least one | Human-readable date of each day the battle spans, in order, one entry per day: `["21 October 1805"]`, `["1 August 1798", "2 August 1798"]`. Display only; never parsed. The caption band shows `dates[day]` for the current phase; the Library shows `dates[0]`. |
| `sort_date` | `{ year, month, day }` | yes | The first day as integers, for the Library to sort on: `month` `1` to `12`, `day` `1` to `31`, `year` in ordinary historical numbering with BC negative and no year zero (Cannae is `-216`, not `-215`). Compared freely; counted from only for the interval between two battles that the Library's chronology rail writes, never for any duration within one battle (ADR-0013, ADR-0022). Restates `dates[0]` in machine form; nothing checks the two agree. |
| `extent` | `{ north, south, east, west }` | yes | The lat/lon bounding box the battle plays inside, fixed for the whole playback. Numbers in degrees; `south < north`, `west < east`, each within range. The renderer fits it to the canvas preserving aspect ratio and letterboxes the rest. Authoring guideline, not a rule: make it landscape. |
| `scale_unit` | `"nmi"` or `"km"` | yes | The unit the renderer's scale bar is drawn in. |
| `map` | string | no | Bare name of the map file, resolved to `data/maps/<map>.geojson`. Never a path. One map per battle. Absent means plain parchment inside the extent. |
| `end` | battle-clock time | yes | When the last phase's picture stops holding, on day `end_day`. Must be later than the last phase on the pair (`day`, `t`). |
| `end_day` | day | no, default the last phase's `day` | Which day `end` falls on. Never less than the last phase's `day`. |
| `license` | licence identifier | yes | The battle file's own licence. For files under `data/battles/` this is `CC-BY-4.0`. |
| `attribution` | string | if the licence class demands it | Free-text credit line naming the licensor. Required when `license` is in the attribution or share-alike class, optional otherwise. Wording is authoring, not schema. |
| `sources` | object: id to Source | yes | The works the battle draws on, keyed by a short id. Every phase must reference at least one, so in practice at least one entry. Unreferenced entries are allowed. |
| `levels` | string[] | required when any unit has a `parent`, forbidden otherwise | One display name per depth of the unit tree, from the roots down: `["Columns", "Squadrons"]`. Its length equals the tree's depth (section 2.9). The Level chooser shows these names; the renderer never invents one. |
| `units` | Unit[] | yes | The roster: identity only, no per-phase data. At least one unit. Ids unique. A parent precedes its children. |
| `phases` | Phase[] | yes | At least one phase, in battle-clock order on (`day`, `t`). |

### 2.2 Source

One entry in `sources`, keyed by an id such as `collingwood-dispatch`. Unchanged from v1.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `label` | string | yes | Short display label the player may show without parsing prose, e.g. `"Collingwood's dispatch"`. |
| `work` | string | yes | Title, author, edition, enough to identify the cited edition. |
| `url` | string | no | Where to read it. For a public-domain text this may point at a transcription (Wikisource, Gutenberg) whose own licence does not make the text a share-alike source. |
| `license` | licence identifier | yes | The licence of the work itself, not of the transcription or scan. Collingwood's 1805 dispatch is `public-domain` even when read on Wikisource. |
| `license_note` | string | no | Evidence for the licence: a Commons template string, a Gutenberg header, the reason a transcription is treated as public domain. |

A work consulted only for uncopyrightable facts is not a source; it belongs in a research note. Diagrams and plans consulted for positions are sources with a `url`; no image ships.

### 2.3 Unit (roster entry)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique across the roster. Referenced from every phase and from `parent`. |
| `side` | string | yes | The side's display name, e.g. `"British"`, `"Carthaginian"`. Sides are ordered by first appearance in `units[]`; the renderer's fixed palette (red ink first, blue second, then a short list) follows that order. There is no `sides` block; this derivation is the only mechanism. A unit's side equals its parent's. |
| `label` | string | yes | The unit's display name, e.g. `"Weather column"`, `"Libyan foot (river flank)"`. |
| `short_label` | string | no | A shorter name the label pass may fall back to when the full one will not fit (collapse step 3). Absent means the unit has no short form and that step is skipped for it. Recommended on every unit of a battle with more than eight units at a level; never derived from `label` or `commander`, because both derivations collide at Cannae. |
| `commander` | string | no | Display only: the person the sources name the unit by, e.g. `"Nelson"`. Identity, not state; a change of command mid-battle is caption matter. |
| `arm` | `"infantry"`, `"cavalry"` or `"ship"` | yes | What the unit is made of. Identity, never per-phase state. A closed list kept in code like the licence table: a new arm is a code change that also adds a sign in every view. No qualifier: heavy and light, a ship of the line and a frigate, are label and caption matter. A parent carries one arm, that of its main body; there is no `mixed`. |
| `parent` | string | no | The id of the roster unit this one belongs to (a squadron's column). Must name an earlier roster entry with the same `side`. A parent and a child are both full units with a snapshot in every phase; nothing about a parent is computed from its children. |

There is no per-unit ship count, composition, length, or free text. Counts are caption matter.

### 2.4 Phase

The authored picture of every unit at one battle-clock instant, with the caption and wind that hold until the next phase's instant. The player tweens positions and headings linearly to the next phase; every other field steps at the instant and holds.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique across phases, e.g. `"lee-column-breaks"`. |
| `label` | string | yes | Short title shown in the caption band, e.g. `"Royal Sovereign breaks the rear"`. |
| `day` | day | no, default `0` | Which day of the battle `t` falls on. The first phase is on day `0`. |
| `t` | battle-clock time | yes | The instant this picture is true, on `day`. Strictly increasing across `phases` on the pair (`day`, `t`). The phase's end is the next phase's instant, or (`end_day`, `end`) for the last phase. |
| `playback_rate` | number `> 0` | yes | Battle-clock seconds per real second while this phase plays. The player derives the phase's playback duration: `interval seconds / playback_rate`. A viewer's speed multiplier scales every rate uniformly and is never stored. |
| `wind` | Wind | all or nothing | See 2.5. Either every phase has `wind` or none does. Absent means the battle does not track wind; it never means calm. |
| `caption` | string | yes | Narration shown verbatim, holding until the next phase. May quote, paraphrase, modernise or trim. Length unbounded; about three sentences is the guideline. The caption is where anchoring, a truce, a crescent, a wedge, a fort's fire, an estimated time or a modern river standing in for an unknown channel are said, because no field carries them. |
| `notes` | string | no | The author's reasoning about the sources for this phase (which reading of a disputed time was chosen and why, where a position was estimated from, that a strength is a reading rather than a count). Surfaced on demand in the Details panel; never animated. The only per-phase free text beside the caption. |
| `references` | Reference[] | yes, at least one | Pointers into `sources` vouching for the phase as a whole: time, positions, states, caption. |
| `units` | UnitSnapshot[] | yes | Exactly one snapshot for every roster unit, parents and children alike, no more, no fewer, no duplicates. |

### 2.5 Wind

Unchanged from v1.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `from` | angle | when `force` is not `calm`; forbidden when it is | Degrees true the wind blows *from*, the sources' convention. "Wind WNW" is written `292.5` with no conversion. |
| `force` | `"calm"`, `"light"`, `"moderate"`, `"fresh"`, `"gale"` | yes | How hard it blows, in the words the sources use. Not Beaufort, not knots. |

Wind steps at the phase instant; a shift is the next phase's value, never tweened. The indicator is furniture and its styling is the renderer's. The wind also drives the engaged mark, which drifts to the unit's lee flank; a battle with no wind gets the glyph's own fallback. Night touches nothing here: the Nile's darkness is the clock saying it is 23:00, not a flag.

### 2.6 Reference

Unchanged from v1.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `source` | string | yes | Must be a key of `sources`. Error otherwise. |
| `locator` | string | yes | Free text precise enough for a human to find the passage in the cited edition: a page, a chapter and paragraph opening, a Gazette page number. |
| `quote` | string | no | Verbatim from the cited edition, long-s spellings and all. Its job is checking the caption against the source, not display. |
| `note` | string | no | Anything about this reference in particular. |

### 2.7 UnitSnapshot

One unit's picture at the phase instant.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | A roster `units[].id`. |
| `position` | `{ lat, lon }` | yes | The unit's centre point. A source's flagship distance is corrected for the unit's depth by the author. Tweens linearly to the next phase. A unit that leaves the field keeps a position on the plate; where part of it went is a move. |
| `heading` | angle | yes | **Where the unit's force is directed**: its course while it is moving, the way its guns or its line face while it is fighting. So a unit retiring in good order keeps its heading toward the enemy and its track runs behind it, and a moored fleet in line of battle has its broadside as its heading, not its bows. A unit fought from both sides has one front: the side the attack came from. Tweens along the shortest arc; an exact 180-degree difference resolves clockwise. A turn through more than a quarter circle wants an intermediate phase so the direction of the turn is authored, not guessed, and that phase must earn its caption. |
| `formation` | `"column"`, `"line"` or `"mass"` | yes | `column` is signs in file along the heading; `line` is abreast across the heading; `mass` is in ranks, four across and two deep. A styled label, not geometry: the renderer draws a fixed number of signs in that arrangement at a fixed plate size. A shape and never a condition: a fleet at anchor is drawn in the shape it lies in and its anchoring is caption matter; a fleet in line of battle is a `line`, as a line of foot is. A crescent, a wedge or a hollow is `line` plus caption. One flat list for every arm, never cross-checked against it. Steps. |
| `state` | `"intact"`, `"engaged"`, `"broken"`, `"destroyed"` | yes | `intact`: not yet in action. `engaged`: in the action or its aftermath, cohesion held; a unit that has fought stays `engaged` when the firing stops, under a flag of truce included. `broken`: no longer acting as one body, whether it flees or fights on in fragments; the caption says which. `destroyed`: ceased to exist as a fighting unit, whatever became of its men; battle-neutral, so `struck` is `destroyed` and an army killed where it stood is `destroyed` with survivors in the caption. A state is a condition and never a place: a wing that has ridden off the field keeps whatever state its condition earns. A state change inside one phase is the signal to split the phase. Steps. |
| `strength` | number, `0 <= x <= 1` | no, default `1` | Fraction of the unit's opening fighting strength still fighting as part of the unit during this phase. Never a casualty count: damage to ships or men who stay in the fight does not reduce it, and a unit that has run is near zero before any of its men are dead. Ships or men that have struck, fled, or been detached and do not return **within the battle the file holds** have left the unit and do; a detachment that returns never left and costs nothing. An author's reading held to the standard `t` already is; a step wants a source event to hang on. Steps; never tweens; no rule forbids a rise. |
| `moves` | Move[] | no, default empty | Authored arrows for what the position cannot show. Any number. |

Not cross-checked by the validator: a `destroyed` unit may carry any strength, a `broken` one may carry moves or not, a `ship` may be a `mass`. Validation is shape only.

### 2.8 Move

Unchanged from v1; both kinds proved sufficient for Cannae and the naval battles.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `kind` | `"detachment"` or `"intent"` | yes | `detachment`: part of the unit going where the unit's own position does not (Dumanoir's van escaping to sea; the Numidian pursuit off the field; a grounded ship left behind). `intent`: what the unit was ordered to do, whether or not it happened (a column's cut point during the approach; a flag-of-truce boat; a cavalry wing's ride round the enemy's rear, because the whole unit goes). |
| `to` | `{ lat, lon }` | yes | The arrow head. May lie outside the extent; the renderer clips at the edge. Does not tween. |

The tail is structural: it follows the unit's tweened position through the interval. A move steps and has no identity: it appears at its phase's instant, holds, and is gone at the next phase unless re-listed. No free text; the caption says what the arrow means. A unit's own motion is never a move, a feigned withdrawal included: the renderer draws that as the **track**, an arrow along the tween, with no schema field, and the track may run behind a unit that keeps its heading.

### 2.9 Hierarchy

A roster may be a tree. A unit with no `parent` is a root at depth `0`; a unit's depth is its parent's plus one. `levels[n]` names depth `n`, and `levels.length` is the depth of the deepest unit plus one. Roster order puts every parent before its children, so depth falls out in one pass and roster order stays the label-priority and numeral order within a level.

**Showing a level draws every unit at that depth plus every shallower unit that has no children.** A unit the author chose not to split stands for itself at every finer level, so nothing vanishes from the plate. Every unit, drawn or not, has a snapshot in every phase; a parent keeps its own position, heading, formation, state, strength and moves in phases where only its children are drawn, and nothing rolls up or is checked between levels: each level is a self-contained picture authored from the sources.

The tree stops at units. A side is not a unit and has no node; every unit in a subtree carries the same `side`. A parent carries one `arm`; a child's need not match it. There is no depth cap.

**Unit count.** More than sixteen units drawn at one level is a validation error (rule 17), the label placement proof's break point made a rule. Twelve is the guideline: twelve carry full labels, sixteen still read with a few short names, twenty break. Counted per level, never per roster: Trafalgar at three columns and their squadrons is drawn as three or as the squadrons, never both.

A battle with no `parent` anywhere has one level, no `levels` field, and no Level chooser.

### 2.10 Validator rules for the battle file

Shape rules follow from the tables above (types, required fields, enums, ranges, no unknown keys). The rules that cross fields:

1. `schema_version` is exactly `2`. A `1` is rejected with a message naming the v2 fields (section 0), not silently read.
2. `extent.south < extent.north` and `extent.west < extent.east`, all four in range.
3. `units[].id` unique; `phases[].id` unique.
4. Phases strictly increase on (`day`, `t`); the first phase's `day` is `0`; (`end_day`, `end`) is later than the last phase, and `end_day` is not less than the last phase's `day`.
5. `dates` has exactly `max(last phase's day, end_day) + 1` entries: no `day` points past it and no trailing entry goes unused.
6. `sort_date.month` is `1` to `12`, `sort_date.day` is `1` to `31`, all three integers; `year` is not `0`.
7. Every phase lists every roster unit exactly once, by id, and no id that is not on the roster.
8. Every phase has at least one reference, and every `references[].source` is a key of `sources`.
9. Wind is all or nothing: either every phase has `wind` or no phase does.
10. In a wind, `from` is present if and only if `force` is not `calm`.
11. `license` is in the allowlist. `attribution` is present when the licence class is attribution or share-alike.
12. Every `sources[].license` is in the allowlist, and no source's class ranks above the file's class. A share-alike source in a `CC-BY-4.0` file is an error; there is no "consulted only" waiver.
13. `map`, when present, is a bare name: no path separators, no extension.
14. Angles (`heading`, `wind.from`) satisfy `0 <= x < 360`; `strength` satisfies `0 <= x <= 1`; `playback_rate > 0`; `day` and `end_day` are non-negative integers.
15. `arm` is on the allowlist (`infantry`, `cavalry`, `ship`).
16. `parent`, when present, names a roster unit that appears **earlier** in `units[]` (so no unit is its own ancestor and no cycle is possible) and has the same `side`.
17. `levels` is present if and only if some unit has a `parent`; its length equals the tree's depth (the deepest unit's depth plus one); and **no level draws more than sixteen units**, counting at each depth `n` the units at depth `n` plus the shallower units with no children.

What the validator does not check: that positions lie inside the extent (a move head may not; a unit usually does), the direction of a heading tween, caption length, that `sort_date` agrees with `dates[0]`, or any consistency between `state`, `strength` and `moves`, between a parent and its children, or between `arm` and `formation`.

### 2.11 Player semantics the file relies on

- **Battle clock is the master timeline.** Inside the engine the clock is a running total of seconds from midnight of the battle's first day, so day `1` at `05:05` is `104,700`, it stays monotonic, and the timeline core keeps comparing plain numbers: tweening, intervals and scrubbing are untouched by the day. Within a phase the player converts wall time to battle-clock time through `playback_rate`; within a phase a unit moves at constant historical speed.
- **The readouts.** The scrubber's readout is a bare `"HH:MM"`, the time of day. The caption band shows the clock and, beneath it, `dates[day]` of the current phase, so the date advances with the battle while the viewer scrubs.
- **Geometry tweens, everything else steps.** `position` and `heading` interpolate linearly from a phase's value to the next phase's value over the interval between their instants. `formation`, `state`, `strength`, `moves`, `wind`, `caption`, `notes` and `references` take the phase's value for the whole interval. Renderer cross-fades on a state or strength change are cosmetic, short, and never on the scrubber.
- **The last phase holds** from its instant until (`end_day`, `end`), then the player pauses on it.
- **Loading** lands paused on the first phase, on the Chart plate, at the coarsest level, with no unit card open. None of the viewer's choices (view, level, speed multiplier, pinned card) is remembered across a reload or carried on the URL.
- **The level filters the picture, not the phases.** The timeline computes every unit's picture; the renderer draws the units the chosen level selects (2.9). The scrubber, the legend's numeral key and the phases are level-independent.

### 2.12 Minimal example

Trafalgar at two levels, cut to two phases and to one squadron per column so it fits on a page. Positions are illustrative; the real file authors them against Collingwood's fix and the public-domain plans.

```json
{
  "schema_version": 2,
  "title": "The Battle of Trafalgar",
  "summary": "Nelson's two columns cut Villeneuve's line off Cape Trafalgar and destroy the Combined Fleet in an afternoon.",
  "dates": ["21 October 1805"],
  "sort_date": { "year": 1805, "month": 10, "day": 21 },
  "extent": { "north": 36.61, "south": 36.05, "east": -6.0, "west": -6.8 },
  "scale_unit": "nmi",
  "map": "cadiz",
  "end": "17:30",
  "license": "CC-BY-4.0",
  "attribution": "Marchpast contributors, CC BY 4.0",
  "sources": {
    "collingwood-dispatch": {
      "label": "Collingwood's dispatch",
      "work": "Collingwood to Marsden, Euryalus off Cape Trafalgar, 22 October 1805, London Gazette Extraordinary no. 15858, 6 November 1805, pp. 1365-1368",
      "url": "https://en.wikisource.org/wiki/The_London_Gazette/Number_15858",
      "license": "public-domain",
      "license_note": "Crown copyright in an 1805 publication long expired; Wikisource transcription used for the text"
    }
  },
  "levels": ["Columns", "Squadrons"],
  "units": [
    { "id": "weather-column", "side": "British", "label": "Weather column", "short_label": "Weather", "commander": "Nelson", "arm": "ship" },
    { "id": "weather-van", "side": "British", "label": "Van of the weather column", "short_label": "Weather van", "commander": "Nelson", "arm": "ship", "parent": "weather-column" },
    { "id": "lee-column", "side": "British", "label": "Lee column", "short_label": "Lee", "commander": "Collingwood", "arm": "ship" },
    { "id": "lee-van", "side": "British", "label": "Van of the lee column", "short_label": "Lee van", "commander": "Collingwood", "arm": "ship", "parent": "lee-column" },
    { "id": "combined-fleet", "side": "Combined Fleet", "label": "Combined Fleet", "commander": "Villeneuve", "arm": "ship" }
  ],
  "phases": [
    {
      "id": "dawn-sighting",
      "label": "Dawn: the fleets sight each other",
      "t": "05:40",
      "playback_rate": 600,
      "wind": { "from": 292.5, "force": "light" },
      "caption": "At daylight, Cape Trafalgar bearing east by south about seven leagues, the enemy is discovered six or seven miles to the eastward, the wind about west and very light.",
      "notes": "Collingwood's dawn fix anchors the British position; Mahan and Southey put the enemy at ten to twelve miles, Collingwood at six or seven.",
      "references": [
        { "source": "collingwood-dispatch", "locator": "p. 1365, first paragraph of the dispatch", "quote": "On Monday the 21st Instant, at Daylight, when Cape Trafalgar bore E. by S. about Seven Leagues, the Enemy was discovered Six or Seven Miles to the Eastward, the Wind about West, and very light" }
      ],
      "units": [
        { "id": "weather-column", "position": { "lat": 36.26, "lon": -6.47 }, "heading": 45, "formation": "column", "state": "intact" },
        { "id": "weather-van", "position": { "lat": 36.27, "lon": -6.46 }, "heading": 45, "formation": "column", "state": "intact" },
        { "id": "lee-column", "position": { "lat": 36.24, "lon": -6.44 }, "heading": 45, "formation": "column", "state": "intact" },
        { "id": "lee-van", "position": { "lat": 36.25, "lon": -6.43 }, "heading": 45, "formation": "column", "state": "intact" },
        { "id": "combined-fleet", "position": { "lat": 36.22, "lon": -6.30 }, "heading": 180, "formation": "column", "state": "intact",
          "moves": [ { "kind": "intent", "to": { "lat": 36.0, "lon": -6.2 } } ] }
      ]
    },
    {
      "id": "melee",
      "label": "The melee",
      "day": 0,
      "t": "13:30",
      "playback_rate": 120,
      "wind": { "from": 292.5, "force": "light" },
      "caption": "The action is general; the Combined Fleet's line is cut in two places and its centre and rear are a melee.",
      "references": [
        { "source": "collingwood-dispatch", "locator": "p. 1366" }
      ],
      "units": [
        { "id": "weather-column", "position": { "lat": 36.27, "lon": -6.24 }, "heading": 90, "formation": "column", "state": "engaged" },
        { "id": "weather-van", "position": { "lat": 36.28, "lon": -6.23 }, "heading": 90, "formation": "column", "state": "engaged" },
        { "id": "lee-column", "position": { "lat": 36.23, "lon": -6.24 }, "heading": 90, "formation": "column", "state": "engaged" },
        { "id": "lee-van", "position": { "lat": 36.24, "lon": -6.23 }, "heading": 90, "formation": "column", "state": "engaged" },
        { "id": "combined-fleet", "position": { "lat": 36.25, "lon": -6.22 }, "heading": 275, "formation": "line", "state": "broken", "strength": 0.6 }
      ]
    }
  ]
}
```

A battle that crosses midnight adds `day` to the later phases and a second entry to `dates`: the Nile's daybreak phase is `"day": 1, "t": "05:05"` under `"dates": ["1 August 1798", "2 August 1798"]`, and the battle ends `"end": "14:00", "end_day": 1`.

## 3. The map file

`data/maps/<name>.geojson`, one GeoJSON `FeatureCollection` per RFC 7946, with two foreign members. A map file is an independent database the battle file only points at, so it carries whatever licence its source requires, share-alike included. **One map file is one moment**: a modern and a historical coastline are two files under two names, and a battle names exactly one.

### 3.1 Collection level

Unchanged from v1.

| Member | Type | Required | Meaning |
|---|---|---|---|
| `type` | literal `"FeatureCollection"` | yes | |
| `features` | Feature[] | yes | Only the six feature kinds below. |
| `license` | licence identifier | yes | The map file's own licence, e.g. `public-domain` for a Natural Earth cut with SRTM contours, `CC-BY-4.0` for a file with the project's own tracings, `ODbL-1.0` for an OpenStreetMap cut. A file inherits the strictest class of its inputs; where a public-domain source still reads at the extent, it wins. |
| `attribution` | string | if the licence class demands it | The credit line, one string however many sources it names. The renderer always draws it as a small credit line in the frame, because attribution licences oblige a visible credit wherever the work is displayed. |

No other foreign member (`bbox`, `name`, `crs`, `sources`, a raster, a contour interval, anything) is allowed. Provenance beyond these two fields (dataset version, clip box, simplification tolerance, contour interval, which plan a shoal was traced from) is for the research note and the commit that adds the file.

### 3.2 Features

Every feature is `{ "type": "Feature", "geometry": ..., "properties": { "kind": ... } }`. Coordinates are `[lon, lat]` in WGS84, exactly two elements. A feature's `properties` may carry only the keys listed for its kind. Natural features carry no name; a contour carries its level; named things carry a name.

| `properties.kind` | Geometry | Properties | Meaning |
|---|---|---|---|
| `"land"` | `Polygon` or `MultiPolygon` | `kind` only | Land. Everything not covered by a land polygon is sea. An island, artificial or not, is `land`. |
| `"river"` | `LineString` or `MultiLineString` | `kind` only | A watercourse, drawn as a line: two banks with the sea's material between. No name and no width. Where the ancient channel is unknown, the modern line stands in and the battle's caption says so. |
| `"shoal"` | `Polygon` or `MultiPolygon` | `kind` only | Water too shallow to fight over, drawn as an outline with a fine stipple: the Aboukir shoal, the Middle Ground. No name and no depth; neither land nor open sea. |
| `"contour"` | `LineString` or `MultiLineString` | `kind`, `elevation` (number, required, metres, `-500 <= x <= 9000`) | A line joining ground at one height. The set of them is how a map holds elevation; nothing else does. `MultiLineString` because `gdal_contour` emits many segments per level. No index flag: the renderer weights every fifth level from the levels it is given. |
| `"place"` | `Point` | `kind`, `name` (string, required, non-empty) | A named point drawn as a label so captions can refer to it: Cadiz, Cape Trafalgar, the Aufidus, the Middle Ground. The one naming mechanism: a river or a shoal that must be labelled gets a place on it. |
| `"work"` | `Point` | `kind`, `name` (string, required, non-empty) | A named built thing on the ground, drawn as a plan sign with its name in small capitals: a fort, a battery, a camp. Trekroner, Abu Qir castle, the Roman camps. A point, never a polygon; independent of any `land` under it. A work takes no part as a unit unless the battle file rosters one at the same coordinates, which none of the v0.2 battles does. |

Any other kind, any other geometry type for a kind (`LineString` for `land`, `Polygon` for `work`, `GeometryCollection` anywhere, a bare geometry without a Feature wrapper), a `null` geometry, or an extra property (a `name` on a `river`, a `depth` on a `shoal`, a `conjectural` flag on anything) is a validation error. No `road` kind; it arrives additively when a battle needs one.

### 3.3 Validator rules for the map file

1. Top level is a `FeatureCollection` with `type`, `features`, `license`, and optionally `attribution`, and nothing else.
2. `license` is in the allowlist; `attribution` present when the class demands it.
3. Every feature has `type: "Feature"`, a non-null geometry, and `properties.kind` of `land`, `river`, `shoal`, `contour`, `place` or `work`.
4. `land` and `shoal` geometry is `Polygon` or `MultiPolygon`; `river` and `contour` geometry is `LineString` or `MultiLineString`; `place` and `work` geometry is `Point`.
5. `contour` carries a finite `properties.elevation` with `-500 <= x <= 9000`; `place` and `work` carry a non-empty `properties.name`.
6. Every coordinate is `[lon, lat]` with `-180 <= lon <= 180`, `-90 <= lat <= 90` (a third element is rejected).
7. No property beyond those listed for the kind.

Not checked: ring winding, polygon validity, whether contours are closed or nested, whether a shoal overlaps land, or whether the map covers the battle's extent. A map may extend beyond the extent and the renderer clips.

### 3.4 Minimal example

```json
{
  "type": "FeatureCollection",
  "license": "public-domain",
  "attribution": "Coastline and river from Natural Earth (public domain); contours from SRTM 1 arc-second (NASA, public domain)",
  "features": [
    { "type": "Feature", "properties": { "kind": "land" },
      "geometry": { "type": "Polygon", "coordinates": [[[16.05, 41.25], [16.30, 41.25], [16.30, 41.38], [16.05, 41.38], [16.05, 41.25]]] } },
    { "type": "Feature", "properties": { "kind": "river" },
      "geometry": { "type": "LineString", "coordinates": [[16.06, 41.28], [16.15, 41.31], [16.20, 41.36]] } },
    { "type": "Feature", "properties": { "kind": "shoal" },
      "geometry": { "type": "Polygon", "coordinates": [[[16.26, 41.36], [16.29, 41.36], [16.29, 41.375], [16.26, 41.375], [16.26, 41.36]]] } },
    { "type": "Feature", "properties": { "kind": "contour", "elevation": 50 },
      "geometry": { "type": "MultiLineString", "coordinates": [[[16.14, 41.29], [16.16, 41.30], [16.15, 41.31]], [[16.20, 41.27], [16.22, 41.28]]] } },
    { "type": "Feature", "properties": { "kind": "place", "name": "Aufidus" },
      "geometry": { "type": "Point", "coordinates": [16.15, 41.31] } },
    { "type": "Feature", "properties": { "kind": "work", "name": "Roman camp" },
      "geometry": { "type": "Point", "coordinates": [16.12, 41.32] } }
  ]
}
```

### 3.5 Authoring guidelines, not rules

- **Contour interval and simplification are per map.** Nothing constrains the levels to be evenly spaced. Cannae is cut at a 10 m interval, simplified with Douglas-Peucker at 60 m, closed rings under 8 vertices dropped (a surface model's buildings and tree crowns throw off thousands of one-cell rings): as shipped, 62 lines over 16 levels, 85 kB, cut from SRTM 1 arc-second. (ADR-0012 quotes 64 lines and 116 kB; those were measured on Copernicus GLO-30, a noisier surface model, over a slightly larger box.) A 20 m interval draws the Cannae hill as two rings, too thin for the one piece of ground the battle is about.
- **Prefer the public-domain source per map.** SRTM or ASTER contours with the Natural Earth Ofanto keep Cannae `public-domain` and its credit to one sentence; Copernicus GLO-30 would add a fixed credit, a liability sentence, a pass-through obligation and a licence identifier the allowlist lacks; an OpenStreetMap river would make the whole file ODbL.
- **Period plans for the historical shoal and shoreline.** No open bathymetry resolves the Aboukir shoal or the Middle Ground; both are traced from the public-domain Brydon plans (1798 and 1802), and Copenhagen's inner shoreline with them, with the two forts built after 1801 cut out of any modern polygon set. Tracings are the project's own work and set the file's licence with the modern layer they sit beside.
- **Nothing marks geometry as conjectural.** The Aufidus of 216 BC is unknowable, so the modern Ofanto is drawn and the Cannae captions say so.
- **Nelson's Island is `land` plus a `place`**; a fort is a `work`; a camp is a `work`; a shoal that captions name gets a `place` on it.

## 4. What the renderer and player draw that is not in either file

For the reader wondering where a field went: these are renderer or player behaviour with no data, decided on the map and its tickets.

- **Views**: named whole visual treatments the viewer picks, built from one engraved system: the Chart plate (default), the Night plate and Atlas. A view is a palette, a set of pens and a glyph, nothing else; the map, furniture, caption and label passes are shared. Chosen with the View chooser, never authored, never remembered. (ADR-0014, [#47](https://github.com/NullCoderException/marchpast/issues/47), [#58](https://github.com/NullCoderException/marchpast/issues/58))
- **Glyph and signs**: eight signs per unit arranged by formation at a fixed 72px plate length; a sign per arm per view (the plate's chevron tick, rank bar and barred rank bar; Atlas's block with crossed, single or no diagonal); shown signs follow strength, a `mass` losing its rear rank first; the engaged mark is Billow, outlined puffs drifting to the lee flank under the wind, laid down for every unit before any unit's body. (ADR-0014, ADR-0015, ADR-0016)
- **Track**: the unit's own motion, a fine dotted line along the tween with an open head, ahead or behind the unit as its heading dictates. Derived from two positions. (ADR-0004, ADR-0016)
- **Level**: which depth of the roster tree is drawn, chosen with the Level chooser, present only when the battle has `levels`, opening on the coarsest every visit. (ADR-0017)
- **Unit label**: the unit's `label` in the side ink and beneath it the state word and, when strength is below 1, the percentage; placed on the glyph's flank clear of its signs by a sticky search with a five-step collapse (full, displaced, no state, `short_label`, numeral keyed in the legend), a leader when the label's own glyph is not the nearest one, and the furniture as an obstacle. (ADR-0009, [#39](https://github.com/NullCoderException/marchpast/issues/39))
- **Unit card**: the label unfolded, a canvas panel beside the glyph carrying the full label and commander, the arm, formation, state and strength as words, and the unit's parent or children; hover shows, click or tap pins, one at a time, never pausing. ([#60](https://github.com/NullCoderException/marchpast/issues/60))
- **Map drawing**: land in a darker paper with an ink coastline; relief as contours weighted by level, every fifth numbered; a shoal as a dotted edge with a fine stipple; a river as two banks clipped to the land; a work as a bastioned-square sign with its name in small capitals; a place as a dot with its name in italic. Drawn in that order, land first and the named things last. The index contours are every fifth level, found from the levels the file carries and never flagged in it; a view re-tunes the two contour alphas and nothing else about the pass, except that **Atlas alone lays tint bands** above 30, 50, 100, 150 and 200 m under its contours — a palette value like the alphas, so the map pass stays shared and no pass tests a view id. On a plate with contours the furniture sits on paper panels and the scale bar carries the interval. (ADR-0012, ADR-0014, [#62](https://github.com/NullCoderException/marchpast/issues/62))
- **Furniture**: compass rose with the wind arrow and text (top-left), plate title (top-right), scale bar in `scale_unit` and the always-on legend (bottom-left), the map file's `attribution` credit line (bottom-right). North is always up. (ADR-0005, ADR-0009, #58)
- **Legend**: each side's colour and `side` name, the four state glyphs, the three line styles (track, intent, detachment), one row per arm when the roster has two or more, and a numeral key for any unit showing one this frame. No row for formation or level. (ADR-0015, ADR-0016, ADR-0017, #39)
- **Caption band**: battle clock and `dates[day]` left, phase `label` and `caption` right, the phase's reference source `label`s beneath. (ADR-0009, ADR-0013)
- **Controls**: play/pause, the phase-segmented scrubber with an `HH:MM` readout, next/previous phase, the 0.5x/1x/2x/4x speed multiplier, the View chooser, the Level chooser, the Details toggle, and last the Picker, which leaves the battle rather than moving about inside it. None stored. (#13, #47, ADR-0017, ADR-0011)
- **Library and Picker**: the bare URL lists every battle oldest first by `title`, `dates[0]`, its side names and `summary`, down a chronology rail that writes the years between consecutive battles and never groups them (ADR-0022), generated by the build from the battle files into `data/index.json` (name, title, date, sort date, summary, side names); a battle plays at `?battle=<name>`; there is no default battle and no memory. Every file in `data/battles/` is a battle the library offers, so only battles go there; a fixture, which is battle-shaped but exists to exercise the code, lives in `src/app/fixtures.ts` and plays at `?fixture=<name>`, outside the library. (ADR-0011)
- **Phone**: at a narrow width the plate keeps its extent; the title goes into the band, the compass becomes a north arrow and a wind sentence, the legend a side strip with states and arms in Details, the credit into Details; labels start at the short name with the state word kept. (#58, #39)
- **Projection**: Web Mercator. Never a field. **Palette, typeface, glyph sizes**: the view's inks by side order, IM Fell English, a fixed glyph length.

## 5. Decision trail

| Topic | Where |
|---|---|
| Real lat/lon, extent, heading, no lengths, no uncertainty | [ADR-0001](adr/0001-real-lat-lon-coordinates.md) |
| Phases as snapshots, `t`, `end`, `playback_rate`, tween and step rules | [ADR-0002](adr/0002-phases-are-snapshots-tweened-by-the-player.md) |
| `state` enum and `strength` fraction | [ADR-0003](adr/0003-casualties-are-authored-state-and-strength.md) |
| `moves[]` with `kind` and `to`; the track | [ADR-0004](adr/0004-moves-are-authored-arrows-not-unit-motion.md) |
| Map file: GeoJSON, `land` and `place`, strict validator, referenced by name | [ADR-0005](adr/0005-map-background-is-a-referenced-geojson-file.md) |
| `caption`, `notes`, `sources`, `references` | [ADR-0006](adr/0006-one-caption-per-phase-with-a-battle-level-sources-table.md) |
| `license`, `attribution`, `license_note`, class ranking | [ADR-0007](adr/0007-battle-data-ships-cc-by-with-no-share-alike-sources.md) |
| `wind { from, force }`, all or nothing | [ADR-0008](adr/0008-wind-is-a-per-phase-from-direction-and-five-word-force.md) |
| The engraved chart plate, formation as arrangement, the three line styles | [ADR-0009](adr/0009-renderer-draws-an-engraved-chart-plate.md) |
| `commander`; `intact` and detachment wording; v1 lock | [ADR-0010](adr/0010-schema-v1-locks-after-the-extraction-test-adding-only-a-commander.md) |
| `summary`; the Library, `data/index.json`, `?battle=`, the Picker | [ADR-0011](adr/0011-the-library-is-built-from-the-battle-files-and-the-url-names-a-battle-by-query.md) |
| `river`, `shoal`, `work`, `contour`; one map file is one moment; no `ground` | [ADR-0012](adr/0012-map-format-v2-adds-river-shoal-work-and-contour-features.md) |
| `day`, `end_day`, `dates`, `sort_date`; the clock as a reading | [ADR-0013](adr/0013-the-battle-clock-crosses-midnight-by-a-per-phase-day-offset.md) |
| Views: palette, pens and glyph; the two-pass glyph; the view in player state | [ADR-0014](adr/0014-the-renderer-draws-views-and-the-chart-plate-is-the-default.md) |
| `arm`; a sign per arm per view; arms in the legend | [ADR-0015](adr/0015-units-carry-an-arm-and-every-view-draws-every-arm.md) |
| `mass`; land signs; the fixed glyph length; heading is the front | [ADR-0016](adr/0016-land-units-draw-as-ranks-of-signs-at-a-fixed-plate-size-and-formation-gains-mass.md) |
| `parent`, `levels`; the Level chooser; the sixteen-unit rule | [ADR-0017](adr/0017-hierarchy-is-authored-at-every-level-and-the-viewer-picks-the-level.md) |
| `broken` widened; a returning detachment costs nothing; no third move kind | [ADR-0018](adr/0018-state-strength-and-moves-carry-cannae-with-broken-widened.md) |
| Anchoring and the truce as caption matter; heading as the fighting front; groundings | [ADR-0019](adr/0019-anchoring-and-the-truce-are-caption-matter-and-heading-is-the-fighting-front.md) |
| Label placement, collapse order, leader rule, `short_label` (no ADR) | [Label prototype #39](https://github.com/NullCoderException/marchpast/issues/39) |
| The View chooser (no ADR) | [Views ticket #47](https://github.com/NullCoderException/marchpast/issues/47) |
| The design language, Billow, the three views, the phone (no ADR) | [Design language #58](https://github.com/NullCoderException/marchpast/issues/58) |
| The unit card (no ADR) | [Unit card #60](https://github.com/NullCoderException/marchpast/issues/60) |
| Drawing the v2 map features (no ADR) | [Map features #62](https://github.com/NullCoderException/marchpast/issues/62) |
| Player controls (no ADR) | [Player controls ticket #13](https://github.com/NullCoderException/marchpast/issues/13) |
