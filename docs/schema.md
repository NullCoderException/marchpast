# Schema v1: the battle file and the map file

*Derived from ADR-0001 to ADR-0010 and `CONTEXT.md` on 2026-09-05 for the v0.1 build. The source of truth is now the code: the types in `src/schema/types.ts`, the licence table in `src/schema/licenses.ts`, and the validators `src/schema/validateBattle.ts` and `src/schema/validateMap.ts`. This document is kept in step with them, never edited against them; a test validates the two JSON examples below against the validators so they cannot drift.*

Two data files describe a battle. The **battle file** at `data/battles/<name>.json` is the timeline: a roster of units and a list of phases, each phase the picture of every unit at one battle-clock instant. The optional **map file** at `data/maps/<name>.geojson` is the static geography the battle plays over. The renderer knows nothing about any specific battle; everything battle-specific is in these two files.

Vocabulary follows `CONTEXT.md`. Field names are `snake_case`. The one deliberate spelling split: the data field is `license` (SPDX and JSON convention) while prose keeps "licence".

## 1. Conventions shared by both files

| Convention | Rule | Decided in |
|---|---|---|
| Angles | Degrees true, `0` is north, clockwise, a number with `0 <= x < 360`. Decimals allowed so the sixteen compass points round-trip exactly (WNW is `292.5`). Used by `heading` and `wind.from`. | ADR-0001, ADR-0008 |
| Battle-clock time | A 24-hour `"HH:MM"` string on the battle's date. Two digits each, `00:00` to `23:59`. Nothing finer: ships' logs are quarter-hour precision at best. Multi-day battles are not v1. | ADR-0002 |
| Coordinates in the battle file | `{ "lat": number, "lon": number }` objects, WGS84 decimal degrees, north and east positive, `-90 <= lat <= 90`, `-180 <= lon <= 180`. | ADR-0001 |
| Coordinates in the map file | GeoJSON `[lon, lat]` arrays, WGS84. Nothing converts one file into the other's convention. | ADR-0005 |
| Lengths | None. Schema v1 has no length field anywhere. The only unit-bearing field is `scale_unit`, a display unit for the scale bar. | ADR-0001 |
| Uncertainty | No uncertainty or confidence field anywhere. Disagreement between sources is caption and `notes` matter. | ADR-0001, ADR-0006 |
| Styling | None in data. No colour, glyph, stroke or style field in either file; the renderer styles each state, move kind, formation and feature kind. | ADR-0003, ADR-0004, ADR-0005, ADR-0009 |
| Licence vocabulary | An SPDX identifier from the allowlist below, or the literal `public-domain`. | ADR-0007 |
| Unknown fields | Rejected. Both validators are strict: an unrecognised key at any level is an error, not ignored. | ADR-0005, ADR-0007 |

### 1.1 Licence identifiers and classes

The allowlist lives in code as a table from identifier to class. v1 ships with:

| Identifier | Class |
|---|---|
| `public-domain`, `CC0-1.0` | public-domain |
| `CC-BY-4.0`, `OGL-UK-3.0` | attribution |
| `CC-BY-SA-3.0`, `CC-BY-SA-4.0`, `ODbL-1.0`, `LGPL-3.0-or-later` | share-alike |

Classes rank `public-domain` < `attribution` < `share-alike`. Adding an identifier is a code change with a class assignment, not a data change. An identifier not in the table is a validation error.

## 2. The battle file

`data/battles/<name>.json`, one JSON object. Ships under CC BY 4.0 (`data/LICENSE`) and may draw on no share-alike source.

### 2.1 Battle level

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema_version` | literal `1` | yes | Rejected if anything else. |
| `title` | string | yes | Display title, e.g. `"The Battle of Trafalgar"`. |
| `date` | string | yes | Human-readable battle date, e.g. `"21 October 1805"`. Display only; not parsed. |
| `extent` | `{ north, south, east, west }` | yes | The lat/lon bounding box the battle plays inside, fixed for the whole playback. Numbers in degrees; `south < north`, `west < east`, each within range. The renderer fits it to the canvas preserving aspect ratio and letterboxes the rest. Authoring guideline, not a rule: make it landscape. |
| `scale_unit` | `"nmi"` or `"km"` | yes | The unit the renderer's scale bar is drawn in. |
| `map` | string | no | Bare name of the map file, resolved to `data/maps/<map>.geojson`. Never a path. One map per battle. Absent means plain parchment inside the extent. |
| `end` | battle-clock time | yes | When the last phase's picture stops holding. Must be later than the last phase's `t`. |
| `license` | licence identifier | yes | The battle file's own licence. For files under `data/battles/` this is `CC-BY-4.0`. |
| `attribution` | string | if the licence class demands it | Free-text credit line naming the licensor. Required when `license` is in the attribution or share-alike class, optional otherwise. Wording is authoring, not schema. |
| `sources` | object: id to Source | yes | The works the battle draws on, keyed by a short id. Every phase must reference at least one, so in practice at least one entry. Unreferenced entries are allowed. |
| `units` | Unit[] | yes | The roster: identity only, no per-phase data. At least one unit. Ids unique. |
| `phases` | Phase[] | yes | At least one phase, in battle-clock order. |

### 2.2 Source

One entry in `sources`, keyed by an id such as `collingwood-dispatch`.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `label` | string | yes | Short display label the player may show without parsing prose, e.g. `"Collingwood's dispatch"`. |
| `work` | string | yes | Title, author, edition, enough to identify the cited edition. |
| `url` | string | no | Where to read it. For a public-domain text this may point at a transcription (Wikisource, Gutenberg) whose own licence does not make the text a share-alike source. |
| `license` | licence identifier | yes | The licence of the work itself, not of the transcription or scan. Collingwood's 1805 dispatch is `public-domain` even when read on Wikisource. |
| `license_note` | string | no | Evidence for the licence: a Commons template string, a Gutenberg header, the reason a transcription is treated as public domain. |

A work consulted only for uncopyrightable facts is not a source; it belongs in a research note. Diagrams consulted for positions are sources with a `url`; no image ships in v1.

### 2.3 Unit (roster entry)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique across the roster. Referenced from every phase. |
| `side` | string | yes | The side's display name, e.g. `"British"`, `"Combined Fleet"`. Sides are ordered by first appearance in `units[]`; the renderer's fixed palette (red ink first, blue second, then a short list) follows that order. The legend shows each side's colour and this name. |
| `label` | string | yes | The unit's display name, e.g. `"Weather column"`. |
| `commander` | string | no | Display only: the person the sources name the unit by, e.g. `"Nelson"`. Identity, not state; a change of command mid-battle is caption matter. |

There is no per-unit ship count, composition, length, or free text. Counts are caption matter.

### 2.4 Phase

The authored picture of every unit at one battle-clock instant `t`, with the caption and wind that hold until the next phase's `t`. The player tweens positions and headings linearly to the next phase; every other field steps at `t` and holds.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique across phases, e.g. `"lee-column-breaks"`. |
| `label` | string | yes | Short title shown in the caption band, e.g. `"Royal Sovereign breaks the rear"`. |
| `t` | battle-clock time | yes | The instant this picture is true. Strictly increasing across `phases`. The phase's end is the next phase's `t`, or `end` for the last phase. |
| `playback_rate` | number `> 0` | yes | Battle-clock seconds per real second while this phase plays. The player derives the phase's playback duration: `(next_t - t) / playback_rate`. A viewer's speed multiplier scales every rate uniformly and is never stored. |
| `wind` | Wind | all or nothing | See 2.5. Either every phase has `wind` or none does. Absent means the battle does not track wind; it never means calm. |
| `caption` | string | yes | Narration shown verbatim, holding until the next phase. May quote, paraphrase, modernise or trim. Length unbounded; about three sentences is the guideline. |
| `notes` | string | no | The author's reasoning about the sources for this phase (which reading of a disputed time was chosen and why, where a position was estimated from). Surfaced on demand in the details panel; never animated. The only per-phase free text beside the caption. |
| `references` | Reference[] | yes, at least one | Pointers into `sources` vouching for the phase as a whole: time, positions, states, caption. |
| `units` | UnitSnapshot[] | yes | Exactly one snapshot for every roster unit, no more, no fewer, no duplicates. |

### 2.5 Wind

| Field | Type | Required | Meaning |
|---|---|---|---|
| `from` | angle | when `force` is not `calm`; forbidden when it is | Degrees true the wind blows *from*, the sources' convention. "Wind WNW" is written `292.5` with no conversion. |
| `force` | `"calm"`, `"light"`, `"moderate"`, `"fresh"`, `"gale"` | yes | How hard it blows, in the words the sources use. Not Beaufort, not knots. |

Wind steps at the phase instant; a shift is the next phase's value, never tweened. The indicator is furniture and its styling is the renderer's: a feather per step from light (one) to gale (four), no arrow at calm.

### 2.6 Reference

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
| `position` | `{ lat, lon }` | yes | The unit's centre point. A source's flagship distance is corrected for the unit's depth by the author. Tweens linearly to the next phase. |
| `heading` | angle | yes | The direction the unit's front faces. Tweens along the shortest arc; an exact 180-degree difference resolves clockwise. A turn through more than a quarter circle wants an intermediate phase so the direction of the turn is authored, not guessed. |
| `formation` | `"column"` or `"line"` | yes | `column` is ships or men in line ahead along the heading; `line` is abreast across the heading. A styled label, not geometry; the renderer draws a fixed number of ticks in that arrangement. A crescent is written `line` and described in the caption. Steps. |
| `state` | `"intact"`, `"engaged"`, `"broken"`, `"destroyed"` | yes | `intact`: not yet in action. `engaged`: in action, cohesion held; a unit that has fought stays `engaged` when the firing stops so long as cohesion holds. `broken`: cohesion lost, no longer fighting as a body. `destroyed`: ceased to exist as a fighting unit. Battle-neutral: `struck` is `destroyed`. Steps. |
| `strength` | number, `0 <= x <= 1` | no, default `1` | Fraction of the unit's opening fighting strength still fighting as part of the unit. Damage to ships or men who stay in the fight does not reduce it; ships that have struck or detached have left the unit and do. Whether a ship that was never in company counts in the opening strength is the author's call. Steps; never tweens. |
| `moves` | Move[] | no, default empty | Authored arrows for what the position cannot show. Any number. |

Not cross-checked by the validator: a `destroyed` unit may carry any strength, a `broken` one may carry moves or not. Validation is shape only.

### 2.8 Move

| Field | Type | Required | Meaning |
|---|---|---|---|
| `kind` | `"detachment"` or `"intent"` | yes | `detachment`: part of the unit going where the unit's own position does not (Dumanoir's van escaping to sea). `intent`: what the unit was ordered to do, whether or not it happened (a column's cut point during the approach). |
| `to` | `{ lat, lon }` | yes | The arrow head. May lie outside the extent; the renderer clips at the edge. Does not tween. |

The tail is structural: it follows the unit's tweened position through the interval. A move steps and has no identity: it appears at its phase's `t`, holds, and is gone at the next phase unless re-listed. No free text; the caption says what the arrow means. A unit's own motion is never a move: the renderer draws that as the **track**, an arrow ahead along the tween, with no schema field.

### 2.9 Validator rules for the battle file

Shape rules follow from the tables above (types, required fields, enums, ranges, no unknown keys). The rules that cross fields:

1. `schema_version` is exactly `1`.
2. `extent.south < extent.north` and `extent.west < extent.east`, all four in range.
3. `units[].id` unique; `phases[].id` unique.
4. `phases[].t` strictly increasing; `end` later than the last `t`.
5. Every phase lists every roster unit exactly once, by id, and no id that is not on the roster.
6. Every phase has at least one reference, and every `references[].source` is a key of `sources`.
7. Wind is all or nothing: either every phase has `wind` or no phase does.
8. In a wind, `from` is present if and only if `force` is not `calm`.
9. `license` is in the allowlist. `attribution` is present when the licence class is attribution or share-alike.
10. Every `sources[].license` is in the allowlist, and no source's class ranks above the file's class. A share-alike source in a `CC-BY-4.0` file is an error; there is no "consulted only" waiver.
11. `map`, when present, is a bare name: no path separators, no extension.
12. Angles (`heading`, `wind.from`) satisfy `0 <= x < 360`; `strength` satisfies `0 <= x <= 1`; `playback_rate > 0`.

What the validator does not check: that positions lie inside the extent (a move head may not; a unit usually does), the direction of a heading tween, caption length, or any consistency between `state`, `strength` and `moves`.

### 2.10 Player semantics the file relies on

- **Battle clock is the master timeline.** Within a phase the player converts wall time to battle-clock time through `playback_rate`; within a phase a unit moves at constant historical speed.
- **Geometry tweens, everything else steps.** `position` and `heading` interpolate linearly from a phase's value to the next phase's value over the interval between their `t`s. `formation`, `state`, `strength`, `moves`, `wind`, `caption`, `notes` and `references` take the phase's value for the whole interval. Renderer cross-fades on a state or strength change are cosmetic, short, and never on the scrubber.
- **The last phase holds** from its `t` until `end`, then the player pauses on it.
- **Loading** lands paused on the first phase.

### 2.11 Minimal example

```json
{
  "schema_version": 1,
  "title": "The Battle of Trafalgar",
  "date": "21 October 1805",
  "extent": { "north": 36.61, "south": 36.05, "east": -6.0, "west": -6.8 },
  "scale_unit": "nmi",
  "map": "cadiz",
  "end": "17:30",
  "license": "CC-BY-4.0",
  "attribution": "Sandtable contributors, CC BY 4.0",
  "sources": {
    "collingwood-dispatch": {
      "label": "Collingwood's dispatch",
      "work": "Collingwood to Marsden, Euryalus off Cape Trafalgar, 22 October 1805, London Gazette Extraordinary no. 15858, 6 November 1805, pp. 1365-1368",
      "url": "https://en.wikisource.org/wiki/The_London_Gazette/Number_15858",
      "license": "public-domain",
      "license_note": "Crown copyright in an 1805 publication long expired; Wikisource transcription used for the text"
    }
  },
  "units": [
    { "id": "weather-column", "side": "British", "label": "Weather column", "commander": "Nelson" },
    { "id": "lee-column", "side": "British", "label": "Lee column", "commander": "Collingwood" },
    { "id": "combined-fleet", "side": "Combined Fleet", "label": "Combined Fleet", "commander": "Villeneuve" }
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
        { "id": "lee-column", "position": { "lat": 36.24, "lon": -6.44 }, "heading": 45, "formation": "column", "state": "intact" },
        { "id": "combined-fleet", "position": { "lat": 36.22, "lon": -6.30 }, "heading": 180, "formation": "column", "state": "intact",
          "moves": [ { "kind": "intent", "to": { "lat": 36.0, "lon": -6.2 } } ] }
      ]
    }
  ]
}
```

Positions in the example are illustrative; the real file authors them against Collingwood's fix and the public-domain plans.

## 3. The map file

`data/maps/<name>.geojson`, one GeoJSON `FeatureCollection` per RFC 7946, with two foreign members. A map file is an independent database the battle file only points at, so it carries whatever licence its source requires, share-alike included.

### 3.1 Collection level

| Member | Type | Required | Meaning |
|---|---|---|---|
| `type` | literal `"FeatureCollection"` | yes | |
| `features` | Feature[] | yes | Only the two feature kinds below. |
| `license` | licence identifier | yes | The map file's own licence, e.g. `public-domain` for a Natural Earth cut, `CC-BY-4.0` for an EEA cut, `ODbL-1.0` for an OpenStreetMap cut. |
| `attribution` | string | if the licence class demands it | The credit line. The renderer always draws it as a small credit line in the frame, because attribution licences oblige a visible credit wherever the work is displayed. |

No other foreign member (`bbox`, `name`, `crs`, `sources`, anything) is allowed. Provenance beyond these two fields (dataset version, clip box, simplification tolerance) is for the research note and the commit that adds the file.

### 3.2 Features

Every feature is `{ "type": "Feature", "geometry": ..., "properties": { "kind": ... } }`. Coordinates are `[lon, lat]` in WGS84. A feature's `properties` may carry only the keys listed for its kind.

| `properties.kind` | Geometry | Properties | Meaning |
|---|---|---|---|
| `"land"` | `Polygon` or `MultiPolygon` | `kind` only | Land. Everything not covered by a land polygon is sea. |
| `"place"` | `Point` | `kind`, `name` (string, required) | A named point drawn as a label so captions can refer to it: Cadiz, Cape Trafalgar. |

Any other kind, any other geometry type (`LineString`, `GeometryCollection`, a bare geometry without a Feature wrapper), a `null` geometry, or an extra property is a validation error. Rivers, roads, terrain and a `ground` field wait for the land-battle generalisation; the format is additive so they arrive without breaking v1 files.

### 3.3 Validator rules for the map file

1. Top level is a `FeatureCollection` with `type`, `features`, `license`, and optionally `attribution`, and nothing else.
2. `license` is in the allowlist; `attribution` present when the class demands it.
3. Every feature has `type: "Feature"`, a non-null geometry, and `properties.kind` of `land` or `place`.
4. `land` geometry is `Polygon` or `MultiPolygon`; `place` geometry is `Point` with a non-empty `properties.name`.
5. Every coordinate is `[lon, lat]` with `-180 <= lon <= 180`, `-90 <= lat <= 90` (a third element is rejected).
6. No property beyond those listed for the kind.

Not checked: ring winding, polygon validity, whether the map covers the battle's extent. A map may extend beyond the extent and the renderer clips.

### 3.4 Minimal example

```json
{
  "type": "FeatureCollection",
  "license": "public-domain",
  "attribution": "Coastline from Natural Earth (public domain)",
  "features": [
    { "type": "Feature", "properties": { "kind": "land" },
      "geometry": { "type": "Polygon", "coordinates": [[[-6.03, 36.18], [-6.0, 36.2], [-5.95, 36.25], [-5.95, 36.18], [-6.03, 36.18]]] } },
    { "type": "Feature", "properties": { "kind": "place", "name": "Cape Trafalgar" },
      "geometry": { "type": "Point", "coordinates": [-6.034, 36.183] } }
  ]
}
```

## 4. What the renderer draws that is not in either file

For the reader wondering where a field went: these are renderer or player behaviour with no data.

- **Track**: the unit's own motion, a fine dotted line ahead along the tween with an open head. Derived from two positions.
- **Furniture**: compass rose with the wind arrow and text (top-left), scale bar in `scale_unit` and the always-on legend (bottom-left), the map file's `attribution` credit line. North is always up.
- **Legend**: each side's colour and `side` name, the four state glyphs, the three line styles (track, intent, detachment).
- **Unit label**: the unit's `label` and a second line with the state word and, when strength is below 1, the percentage. Ticks per glyph are a renderer constant.
- **Caption band**: battle clock and `date` left, phase `label` and `caption` right, the phase's reference source `label`s beneath.
- **Controls**: play/pause, the phase-segmented scrubber with an `HH:MM` readout, next/previous phase, the 0.5x/1x/2x/4x speed multiplier, the details-panel toggle. None stored.
- **Projection**: Web Mercator, so later basemap tiles line up. Never a field.
- **Palette, typeface, glyph sizes**: red and blue ink by side order, IM Fell English, a minimum readable glyph length whatever the extent.

## 5. Decision trail

| Topic | ADR |
|---|---|
| Real lat/lon, extent, heading, no lengths, no uncertainty | [ADR-0001](adr/0001-real-lat-lon-coordinates.md) |
| Phases as snapshots, `t`, `end`, `playback_rate`, tween and step rules | [ADR-0002](adr/0002-phases-are-snapshots-tweened-by-the-player.md) |
| `state` enum and `strength` fraction | [ADR-0003](adr/0003-casualties-are-authored-state-and-strength.md) |
| `moves[]` with `kind` and `to`; the track | [ADR-0004](adr/0004-moves-are-authored-arrows-not-unit-motion.md) |
| Map file: GeoJSON, `land` and `place`, strict validator, referenced by name | [ADR-0005](adr/0005-map-background-is-a-referenced-geojson-file.md) |
| `caption`, `notes`, `sources`, `references` | [ADR-0006](adr/0006-one-caption-per-phase-with-a-battle-level-sources-table.md) |
| `license`, `attribution`, `license_note`, class ranking | [ADR-0007](adr/0007-battle-data-ships-cc-by-with-no-share-alike-sources.md) |
| `wind { from, force }`, all or nothing | [ADR-0008](adr/0008-wind-is-a-per-phase-from-direction-and-five-word-force.md) |
| Formation vocabulary, what the renderer draws | [ADR-0009](adr/0009-renderer-draws-an-engraved-chart-plate.md) |
| `commander`; `intact` and detachment wording; v1 field set closed | [ADR-0010](adr/0010-schema-v1-locks-after-the-extraction-test-adding-only-a-commander.md) |
| Player controls (no ADR; recorded on the ticket) | [Player controls ticket](https://github.com/NullCoderException/sandtable/issues/13) |
