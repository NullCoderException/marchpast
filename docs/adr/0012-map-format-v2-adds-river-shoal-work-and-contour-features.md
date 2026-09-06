# Map format v2 adds river, shoal, work and contour features, and elevation ships as contour lines

*Amended 2026-09-06: whether a work is also a unit was closed by ADR-0015 (Trekroner stays a work, not a unit); how each kind is drawn was decided on #62 (contours weighted by level, hachures rejected, so the raster escape hatch stays closed and this ADR stands unamended in substance).*

ADR-0005 gave the map file two feature kinds, `land` and `place`, and deferred "rivers, roads, and terrain" to the land-battle generalisation. That generalisation is now due: none of the three battles on the v0.2 map can be drawn with two kinds. Cannae is fought along the Aufidus over a 59 m hill standing on a 25 m floodplain; the Nile turns on the Aboukir shoal that wrecked the French van's anchorage; Copenhagen turns on the Middle Ground that grounded three of Nelson's ships, and on Trekroner, the only fixed work in the Danish line. Two research notes measured what could fill each gap ([#44](https://github.com/NullCoderException/sandtable/issues/44) for elevation and the river, [#45](https://github.com/NullCoderException/sandtable/issues/45) for coastline, shoal, island and fort). We chose **four new feature kinds** (`river`, `shoal`, `work`, `contour`), **contour polylines** as the form elevation takes, and **one map file per moment** rather than a file carrying both a modern and a historical coastline. We also withdrew ADR-0005's promised `ground` field, because no battle on this map needs it.

## Considered options

**How elevation rides in the file**, measured on the Cannae box (1080 x 720 cells, 25 x 22 km, 213 m of relief):

- **Hypsometric band polygons**: 538 kB at a 20 m interval simplified to 60 m, roughly nine times the line figure, and never below double it however hard they are filtered, because every band edge is stored twice. Closest to an engraved plate's tint layers and rejected only on cost.
- **A raster as a foreign member**: 266 kB as a 16-bit PNG at 30 m, 765 kB as Terrain-RGB, 47 kB subsampled to 90 m. The only form that carries slope and aspect, so hachures and hillshade come free rather than being derived. Rejected for v2 because a raster is not GeoJSON geometry, so it needs a third foreign member against ADR-0007's "exactly two", and because canvas `getImageData` returns 8-bit channels, so a 16-bit height loses its low byte unless it is split across RGB.
- **Contour polylines** (chosen): 34 lines, 2,870 vertices, 61 kB (15 kB gzipped) at a 20 m interval simplified to 60 m; 64 lines and 116 kB at 10 m. Ordinary GeoJSON, simplified by the same mapshaper pass as the coastline, written directly by `gdal_contour -a`.

**Which features named in the ticket become kinds**:

- **A kind each for river, shoal, island, fortification and camp**: rejected as two kinds too many. The naval note found that Nelson's Island is an ordinary `land` polygon plus a `place` point and that a separate `island` kind buys nothing but a label; `fort` and `camp` differ only in what their name says, which is authoring, not schema.
- **`river`, `shoal` and one `work` kind** (chosen): the two natural features v1 genuinely cannot express, plus a single built-work kind covering Trekroner, Abu Qir castle, the Nelson's Island battery and Cannae's three camps.

**Whether a map may carry both a modern and a historical coastline**, with the battle selecting one:

- **Per-feature epochs, or two layers in one file**: rejected. It puts a viewer-facing choice inside the map file, which collides with ADR-0005's "no styling in data" and with layer toggles being out of scope on this map, and it makes the credit line ambiguous.
- **One file, one moment** (chosen): a modern Copenhagen and an 1801 Copenhagen are two files under two names, and a battle still names exactly one map.

## Consequences

- **Six feature kinds, in three tiers.** Natural features carry `kind` alone; the contour carries its level; named things carry a name.

  | `properties.kind` | Geometry | Properties |
  |---|---|---|
  | `land` | `Polygon`, `MultiPolygon` | `kind` |
  | `river` | `LineString`, `MultiLineString` | `kind` |
  | `shoal` | `Polygon`, `MultiPolygon` | `kind` |
  | `contour` | `LineString`, `MultiLineString` | `kind`, `elevation` |
  | `place` | `Point` | `kind`, `name` |
  | `work` | `Point` | `kind`, `name` |

  `LineString` and `MultiLineString`, a validation error in v1, are now legal for exactly the two line kinds. `MultiLineString` earns its place because `gdal_contour` emits many segments per level.

- **Natural features are never named; naming lives in one mechanism.** A `river` carries no name and a `shoal` carries no depth. If the Aufidus or the Middle Ground must be labelled, a `place` point is authored on it, the same way Cape Trafalgar is labelled today. Two naming mechanisms would mean two label-placement problems for the renderer to solve.

- **`work` is a point, never a polygon.** Trekroner is about 0.027 km2 inside an 11 x 11 km extent: a glyph, not an outline, and ADR-0009 already settled that glyphs are styled labels rather than geometry. A `work` and the `land` polygon under it are independent; an artificial island is land that happens to have a work on it.

- **Whether a work is also a unit is a separate question.** Trekroner fired 60 to 66 guns and may well be a unit in the Copenhagen battle file; the map draws the work, the battle file places the unit. Both can be true of the same coordinates, and the unit-types decision owns that half.

- **Elevation is contour polylines with the level in `properties.elevation`,** in metres, finite and bounds-checked between -500 and 9000 like every other number in the schema. The level goes in `properties`, where `gdal_contour -a` writes it, not in a Z coordinate: RFC 7946 allows a third element but mapshaper drops Z on import, and the simplification pass is not optional.

- **Interval and simplification tolerance are per-map authoring, not schema.** The file declares no interval; nothing constrains the levels to be evenly spaced. As a worked guideline rather than a rule, in the manner of ADR-0009's "extents should be landscape": Cannae is cut at a **10 m interval, simplified with Douglas-Peucker at 60 m, closed rings under 8 vertices dropped**, giving 64 lines and 116 kB. A 20 m interval renders the hill as two rings, which is too thin for the one piece of ground the battle is about; the ring filter is needed because every public-domain global DEM is a surface model, so buildings and tree crowns throw off thousands of one-cell rings (2,265 raw lines at 10 m become about 103 real contours).

- **No index-contour flag in the data.** The renderer weights every fifth line, or does not, from the levels it is given. A flag saying "draw this one heavier" is styling in data, which ADR-0005 forbids.

- **One map file is one moment, and a battle still names exactly one map.** This resolves the "layers are a v0.2 question" that ADR-0005 left open, in the negative. Copenhagen's map is authored as a single coherent 1801 picture — its inner shoreline and the Middle Ground traced from Brydon's 1802 plan, Middelgrundsfortet (1890-94) and Flakfortet cut out of any modern polygon set, a modern dataset only for Saltholm, the Swedish shore and the outer extent. Aboukir's is the modern western headland, which is rock and has not moved, plus the 1798 shoal traced from Brydon; its eastern delta shore is scenery and has advanced kilometres since.

- **No `ground` field. ADR-0005's deferral is withdrawn, not merely unexercised.** The field was promised on the assumption that a land battle would need to invert "everything not covered by a land polygon is water". Cannae does not: its extent runs the Ofanto to the Gulf of Manfredonia and clips the edge of Barletta, so it has a real coastline and the v1 rule holds unchanged. A genuinely inland battle can add the field additively when one is authored; adding it now would be schema no battle exercises.

- **Nothing in the map file marks geometry as conjectural.** The 216 BC course of the Aufidus is unknowable — the bank itself is disputed, Connolly put the channel further north, and no source reconstructs it — so any river line we draw is modern geometry standing in for unknown geometry, and Copenhagen's traced 1801 shoreline is a reconstruction rather than a survey. The caveat belongs in the phase caption and the sources table, where a reader can be told why, not in a `conjectural` property that the renderer would have to style. **The cost of this choice, recorded so it is not forgotten:** ADR-0005's fidelity bar is "stylised but geo-registered", and a modern channel is geo-registered to the wrong century. The decision leans on the caption actually carrying the caveat, so the Cannae battle file must say in prose that the river drawn is the modern Ofanto and the ancient channel is unknown.

- **`attribution` stays a single free-text string, and the format prefers the public-domain source per map.** A combined map credits its sources in one line the author writes; an array would be schema serving authoring convenience, and the renderer draws one line of furniture either way. ADR-0007's rule that a file inherits the strictest class of its inputs is unchanged, and the new rule is that where a public-domain source still reads at the extent, it wins. For Cannae that means SRTM 1-arc-second or ASTER GDEM v3 contours with the Natural Earth Ofanto, keeping the file `public-domain` and the credit to one sentence, rather than Copernicus GLO-30 (a fixed DLR/Airbus credit, a liability sentence and a pass-through obligation) or an OpenStreetMap river (which would make the whole file ODbL).

- **The validator gains four kinds and one property, and stays strict.** An unknown kind, a geometry type the kind does not allow, a missing or out-of-range `elevation`, a named `river` or `shoal`, a polygon `work`, or any extra property is a validation error, not something ignored. Ring winding, polygon validity, and whether contours are closed or nested are still unchecked.

- **No `road` kind.** ADR-0005 named roads alongside rivers and terrain, and none of the three battles needs one. It arrives additively when a battle does.

- **A raster remains the escape hatch, and it is additive.** If the design-language decision lands on hachures, deriving slope from contour normals and neighbour spacing is the harder path, and admitting a raster foreign member is a later, non-breaking change. Choosing lines now does not foreclose it.

- **This ADR decides what the renderer is given, not what it draws.** How relief, a shoal edge, a river and a work are inked — in the default chart plate and in every other view — is the design-language decision, which is deliberately made once above the renderer prototypes rather than a piece at a time inside them.

- **The change is purely additive: every v1 map file stays valid.** The feature vocabulary grows and nothing already legal becomes illegal, so Trafalgar’s map needs no edit and no battle file is touched. The code changes (`src/schema/types.ts`, `validateMap.ts` and their tests) are handoff work, not part of this decision.
