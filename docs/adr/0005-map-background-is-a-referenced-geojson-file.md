# The map background is a separate GeoJSON file the battle file points at

Everything drawn behind the units must come from data, because the renderer knows nothing about any specific battle. We considered a bounding box alone (parchment, no geography), vector features inline in the battle file, an SVG path, a positioned raster of a public-domain chart, and vector features in a separate file. We chose a separate **map** file in plain GeoJSON, referenced from the battle file by name and optional: the map's points are real lat/lon, so the renderer projects the coastline through the same function it uses for unit positions and the two cannot drift apart, while the battle file stays a short, human-and-model-authored document with no geometry to preserve.

## Considered options

- **Bounding box only**: survives as the degenerate case when a battle references no map.
- **Inline features**: buries five to eight authored phases under a few hundred coordinate pairs and asks the extraction pipeline to carry geometry it has no business touching.
- **SVG path**: lives in pixel space, so it needs its own registration to lat/lon and a second projection path in the renderer.
- **Raster chart**: fights the parchment styling, cannot be restyled by the renderer, and is one step from the basemap tiles ruled out of v1.
- **Separate GeoJSON file** (chosen): the format every coastline dataset and tool (mapshaper, QGIS) emits; reusable across battles on the same coast.

## Consequences

- **A map is optional; the extent is not.** A battle with no map renders plain parchment inside its extent. The extent stays in the battle file (ADR-0001); a map may extend beyond it and the renderer clips.
- **The battle file names its map, it does not path to it.** The optional `map` field holds a bare name resolved by convention to `data/maps/<name>.geojson`, mirroring `data/battles/<name>.json`, so data files never carry paths that break when directories move. One map per battle; layers are a v0.2 question. (Agreed on the ticket after this ADR was first written; the ticket's other addendum, a map-level `sources` member, was superseded by ADR-0007, which allows exactly two foreign members.)
- **Two coordinate conventions, one per file.** GeoJSON is `[lon, lat]` arrays because that is what tools produce; the battle file keeps `{ lat, lon }` objects because people write it. Nothing converts one file into the other's convention.
- **Two feature kinds in v1.** `Polygon` / `MultiPolygon` features with `properties.kind: "land"`, and `Point` features with `properties.kind: "place"` and a `properties.name` (Cadiz, Cape Trafalgar) so captions can name what the map shows. Rivers, roads, and terrain wait for the land-battle generalisation.
- **The validator is strict.** A `FeatureCollection` of exactly those shapes; an unknown kind or geometry type is rejected, not ignored. A new feature kind is a schema change. The only foreign members allowed on the collection are `license` and `attribution` (ADR-0007).
- **No styling in data.** The renderer styles each feature kind, as it styles each unit state (ADR-0003). No colours, strokes, or fills in the map file.
- **Map furniture is the renderer's.** Compass rose, scale bar, and wind indicator are drawn from decisions already made: north is always up (no rotation field), the scale-bar unit is per battle, wind is phase data. Wind is therefore a phase property, never a map property; the map carries only static geography.
- **Ground is sea.** Everything not covered by a land polygon is water. A `ground` field for land battles is additive and deferred to v0.2.
- **Fidelity bar: stylised but geo-registered.** Simplified geometry is fine; hand-drawn geometry is not, because units sit at real coordinates. Which dataset to cut the coastline from is a per-map choice made under ADR-0007's rule (any licence per map file, preferring public domain when the bay still reads); the Cadiz candidates are surveyed in the `research/cadiz-coastline` note.
