# Map geography is an optional, separate GeoJSON file the battle points at

The renderer is battle-agnostic, so whatever it draws behind the units has to come from data. We considered nothing but the extent (a plain fill), a georeferenced public-domain chart raster, an SVG path, and vector features in the battle's own lat/lon. We chose vector features, kept in a **separate map file** in `data/maps/<name>.geojson` that the battle file names with an optional `map` field; the file is literal GeoJSON (RFC 7946) restricted to a narrow profile, and it carries static geography only. A raster or SVG would have needed its own georeferencing inside a renderer that already has real coordinates, and inlining geometry in the battle file would have put hundreds of coastline vertices in a document people and models write by hand.

## Considered options

- **Extent only**: fine for open sea, but Trafalgar without Cadiz and the Cape is a picture of nothing. Kept as the fallback when a battle names no map.
- **Georeferenced raster chart**: the 1805 and 1848 public-domain plans exist, but fitting an engraving to Web Mercator is a projection problem and the engraving style fights the parchment look. They remain tracing references and provenance.
- **SVG path**: no earth coordinates, so it needs georeferencing too, and no GIS tool produces it.
- **Vector features in lat/lon** (chosen): reuses ADR-0001 directly and is what every GIS tool exports.

## Consequences

- **The map file is real GeoJSON, so its coordinates are `[lon, lat]` arrays**, the reverse of the battle file's `{ lat, lon }` objects. This is a deliberate inconsistency: battle files speak `{ lat, lon }` because people and models write them, map files speak GeoJSON because geojson.io, QGIS and Natural Earth write them. Nothing in a battle file ever uses array coordinates.
- **The profile is narrow and the validator enforces it.** A `FeatureCollection` whose features have `properties.kind` from a fixed enum: `land` (`Polygon` or `MultiPolygon`, filled as land; the rest of the extent is sea) and `place` (`Point` with a required `properties.name`, rendered as a label). The enum is fixed by the schema, not per battle, like unit `state`; v0.2 extends it (rivers, terrain) without breaking v1 files. Shoals are caption matter in v1.
- **A map is optional.** A battle with no `map` field renders a plain fill over its extent. The validator checks only that a named map exists and fits the profile.
- **The battle file names the map by bare name**, resolved by convention to `data/maps/<name>.geojson`, mirroring `data/battles/<name>.json`. One map per battle; layers are a v0.2 question.
- **The extent stays a battle property** (ADR-0001). A battle chooses its framing of a shared map; the renderer clips features to the extent, and a map that covers less than the extent leaves sea.
- **No styling in data.** The renderer owns the parchment look and styles by `kind`.
- **Compass rose, scale bar and wind indicator are renderer furniture**, never map features. North is always up given real lat/lon and Web Mercator; the scale bar uses the battle's display unit; wind steps per phase (ADR-0002), so it is a phase property, not background.
- **The map file carries its own top-level `sources` member** (a foreign member RFC 7946 permits), with the same entry shape as the battle-level sources table (ADR-0004, narrative). A shared map must not depend on any one battle for its attribution; the data-licensing decision fixes the licence wording. Natural Earth coastline data is public domain; OpenStreetMap coastlines are ODbL and would pull a share-alike obligation into the repo.
