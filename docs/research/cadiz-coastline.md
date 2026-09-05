# Cadiz coastline data: candidates by licence and resolution

*Research note for GitHub issue #15 (part of wayfinder map #1). Verified 2026-09-05 by fetching each licence and download page and, where a dataset was small enough, by downloading it and clipping it to the extent with mapshaper. Nothing below is from memory except the approximate place coordinates in the last section, which are flagged.*

## Gist

Five dataset families can supply a geo-registered coastline for the extent 35.9N-36.8N, 6.8W-5.8W, and they fall into four licence classes: public domain (Natural Earth), LGPL v3+ (GSHHG), ODbL share-alike (OpenStreetMap and everything built on it, including the EMODnet "world coastline"), and CC BY 4.0 (EEA coastline for analysis, Spain's IGN/CNIG). Measured on the actual files: Natural Earth 1:10m does keep Cadiz bay as a bay, but with 56 vertices for the whole extent it is a caricature (Rota's coast is displaced offshore). GSHHG `h` (165 vertices) is the coarsest level that keeps both the bay and the Cadiz isthmus; `i` drops Cadiz city into the sea and `l` fills the inner bay. GSHHG `f` and the EEA polygon simplified to a 250 m tolerance both land at about 160 vertices with every test point correct, so a stylised-but-registered file of a few kilobytes is achievable from either. OSM has 7,459 coastline nodes in the extent (2,859 in the bay), far more than needed. The NOAA/NGA public-domain route is effectively closed: NCEI decommissioned its GSHHG mirror in May 2025 and the underlying World Vector Shoreline is not published as a separate download. Hand-digitising from Tofiño's 1787 chart (public domain; scans on Commons via the BnF) or Johnston's 1848 plan is a viable fallback that produces a file under our own licence, at the cost of a QGIS georeferencing session. No recommendation is made; see the final section for the licence classes the data-licensing ticket must weigh.

## What the map file needs (ADR-0005)

A GeoJSON `FeatureCollection` with `Polygon`/`MultiPolygon` features carrying `properties.kind: "land"` and `Point` features carrying `properties.kind: "place"` and `properties.name`; coordinates as `[lon, lat]`; no styling; the map may extend past the battle extent and the renderer clips. Simplified geometry is acceptable, hand-drawn (unregistered) geometry is not. ([ADR-0005](../adr/0005-map-background-is-a-referenced-geojson-file.md))

## Comparison table

Vertex counts are measured on the land polygons after clipping to the extent (`-6.8,35.9,-5.8,36.8`); "bay box" is 36.45-36.65N, 6.40-6.15W. Test points: outer bay water (36.58N 6.30W), inner bay water (36.49N 6.23W), Cadiz city (36.53N 6.29W), Rota (36.62N 6.36W), Cape Trafalgar (36.18N 6.03W, just offshore of the cape). A dataset "keeps the bay" if both water points read as sea and Cadiz city reads as land.

| Candidate | Licence class | Obligations | Finest resolution | Cadiz bay at finest | Vertices in extent (bay box) | Download | Size |
|---|---|---|---|---|---|---|---|
| Natural Earth 1:10m land v5.1.1 | Public domain | None ("Crediting the authors is unnecessary") | ~1:10,000,000, from WDBII with Illustrator simplification | Yes, barely; Rota test point reads as sea | 56 (26) | naciscdn.org / naturalearthdata.com | 3.1 MB zip |
| GSHHG 2.3.7, `GSHHS_f_L1` | LGPL v3 or later (plus a legacy UH/NOAA permission notice) | Keep the licence and notices with copies; convey modified copies under the LGPL; LGPL is a software licence and says nothing about database rights | `f` = WVS source (~1:250,000); `h`/`i`/`l`/`c` are 0.2/1/5/25 km Douglas-Peucker cuts | `f` and `h` yes; `i` sinks Cadiz city; `l` fills the inner bay; `c` is a 4-vertex quad | f 1,377 (641); h 165 (79); i 47 (24); l 13 (5); c 4 (0) | soest.hawaii.edu/pwessel/gshhg (NCEI mirror decommissioned May 2025) | 149 MB zip (all resolutions) |
| OpenStreetMap coastline (osmdata.openstreetmap.de land polygons, or Geofabrik extract + osmcoastline) | ODbL 1.0 | Attribution ("OpenStreetMap" linked to openstreetmap.org/copyright, or "(c) OpenStreetMap contributors") plus the ODbL text or link in the data's readme/metadata; share-alike: a clipped extract is a Derivative Database and must itself be ODbL; must offer the derivative or a diff (s.4.6); covers the EU sui generis database right | Survey/imagery detail, metres | Yes, with detail to spare (individual quays) | 7,459 coastline nodes in extent (2,859 in bay) via Overpass, before polygonising | osmdata.openstreetmap.de (world file) or Overpass/Geofabrik | 926 MB zip (world land polygons) or 184 MB pbf (Andalucia) |
| EEA coastline for analysis (polygon) v3.0, March 2017 | CC BY 4.0, copyright holder EEA | Attribution and licence link; no share-alike; CC BY 4.0 covers sui generis database rights | 1:100,000 MMU, EU-Hydro (Image2006) primary, GSHHG as filler | Yes, in detail (Rota reads as land) | 2,809 (1,085) | sdi.eea.europa.eu record 9faa6ea1-... (datashare link) | 55 MB zip (EPSG:3035) |
| NOAA / NGA shorelines (GSHHG at NCEI; World Vector Shoreline) | US government work: CC0 on the NCEI accession record; the data itself is GSHHG (LGPL) | See GSHHG; WVS itself is not published as a download | WVS nominal 1:250,000 (= GSHHG `f`) | As GSHHG `f` | As GSHHG | NCEI accession 0304143 (archived, "no further updates"); WVS datasheet at shoreline.noaa.gov returned 403 | 149 MB |
| EMODnet Bathymetry World Coastline 2022 | Record says CC BY 4.0, but the vector lines "derive from land polygons available from OpenStreetMap" (ODbL) | Inconsistent: CC BY 4.0 metadata over ODbL-derived geometry; treat as ODbL | OSM detail; the Deltares satellite-derived lines (LAT/MSL/MHW) are 10 m Sentinel-2 lines, not polygons | Yes | not measured | downloads.emodnet-bathymetry.eu, WFS | not measured |
| Eurostat GISCO Countries 1:1M | Eurostat download rules: non-commercial only, "(c) EuroGeographics for the administrative boundaries" | Non-commercial restriction excludes it from redistribution in an open project | 1:1,000,000 | probably (not measured) | not measured | ec.europa.eu/eurostat/web/gisco | not measured |
| Spain IGN/CNIG (BTN100 / BCN200 / "Linea de costa") | IGN licence per Orden FOM/2807/2015, "compatible con CC BY 4.0"; CC BY 4.0 for other bodies' data on the same portal | Name IGN as origin and owner in the form the CNIG attribution tool gives | 1:100,000 (BTN100), 1:200,000 (BCN200) | probably (not measured; portal requires interactive download) | not measured | centrodedescargas.cnig.es | not measured |
| Hand-digitised from a public-domain chart (Tofiño 1787; Johnston 1848) | Underlying chart: public domain. Scan: PD-tagged on Commons (BnF copy), CC BY 4.0 (Biblioteca Virtual de Defensa), CC BY-NC-SA 3.0 (David Rumsey), Gallica non-commercial terms. The traced GeoJSON is a new work under whatever licence the project chooses | None on the geometry if traced from a PD-tagged scan; credit the chart and scan source as good practice | Whatever you trace; the 1787 chart is a large-scale coastal survey | Yes; also shows the 1805-era coast rather than today's | authored | Commons `File:Carta esferica desde Punta Candor hasta Cabo de Trafalgar ... btv1b53269573v.jpg` (8,028 x 11,506 px) | 6.7 MB jpg |

Simplification check (mapshaper `-simplify interval=250`, i.e. 250 m tolerance): GSHHG `f` goes 1,377 -> 163 vertices (4.6 kB GeoJSON), EEA goes 2,809 -> 159 vertices (9.6 kB with 30 small islands/features), and every test point still reads correctly in both. At 100 m: 440 and 436 vertices.

## Per candidate

### 1. Natural Earth 1:10m physical vectors (land, coastline)

**Licence.** "All versions of Natural Earth raster + vector map data found on this website are in the public domain. You may use the maps in any manner, including modifying the content and design, electronically or in print. No permission is needed to use Natural Earth. Crediting the authors is unnecessary." ([Terms of use](https://www.naturalearthdata.com/about/terms-of-use/)) No attribution, share-alike or database-right obligations.

**Resolution.** Built for 1:10,000,000 mapping. The coastline page states the source: "The ocean coastline, the foundation for building all of NEV, primarily derives from World Data Bank 2 with modest generalization applied via line simplification in Adobe Illustrator", and warns that "World Data Bank 2 coastlines have suspect accuracy for certain parts of the world" (the listed problem areas do not include Iberia). ([10m coastline](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-coastline/)) Current versions on the download page: Land 5.1.1, Coastline 4.1.0, Minor Islands 4.1.0, Ocean 5.1.1. ([10m physical vectors](https://www.naturalearthdata.com/downloads/10m-physical-vectors/))

**Cadiz bay.** Measured: the clip yields one polygon with 56 vertices, 26 of them in the bay box. Both bay-water test points read as sea and Cadiz city as land, so the bay survives as a shape. The Rota test point reads as sea, i.e. the Rota-Chipiona coast sits a few hundred metres inland of where the finer datasets put it, and the Cadiz isthmus is a single spike. Usable as a caricature, not at the "units sit at real coordinates" bar where a ship anchored off Rota would appear on the beach. The ticket's premise ("1:10m believed too coarse") is confirmed for anything that zooms on the bay, but not for a whole-extent view.

**Download.** `https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip` (3,269,070 bytes, Last-Modified 13 May 2022) or the same path under `naturalearthdata.com/http//www.naturalearthdata.com/download/10m/physical/`. Populated places at `ne_10m_populated_places.zip` on the same CDN are a public-domain source of place points if hand-typed coordinates are not wanted.

**Tool steps (verified with mapshaper 0.6.104).**

```sh
curl -LO https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip && unzip ne_10m_land.zip
npx mapshaper ne_10m_land.shp \
  -clip bbox=-6.8,35.9,-5.8,36.8 \
  -each 'kind="land"' -filter-fields kind \
  -o precision=0.0001 format=geojson cadiz-land.geojson
```

ogr2ogr equivalent: `ogr2ogr -f GeoJSON -clipsrc -6.8 35.9 -5.8 36.8 -select "" -lco COORDINATE_PRECISION=4 cadiz-land.geojson ne_10m_land.shp`, then add `kind` with `-sql "SELECT 'land' AS kind FROM ne_10m_land"`. No simplification needed; there is nothing left to remove.

### 2. GSHHG 2.3.7 (Wessel & Smith)

**Licence.** The SOEST page: "Starting with version 2.2.2, GSHHG has been released under the GNU Lesser General Public License." ([GSHHG](https://www.soest.hawaii.edu/pwessel/gshhg/)) `LICENSE.TXT` inside the shapefile zip: "As of GSHHG 2.2.2, GSHHG is distributed under the GNU Lesser General Public License (LGPL) version 3 or later," followed by an older permission notice: "Permission to use, copy, modify, and distribute (with no more than a reasonable redistribution fee) this data and its documentation for any purpose is hereby granted, provided that the above copyright notice appear in all copies, that both that copyright notice and this permission notice appear in supporting documentation, and that the name of GSHHG not be used in advertising or publicity pertaining to distribution of the software without specific, written prior permission." `README.TXT`: "now released under the lesser GNU License, v3 or any earlier version." NCEI's old shorelines page adds that commercial users should notify the authors of changes. ([NCEI shorelines](https://www.ngdc.noaa.gov/mgg/shorelines/shorelines.html))

*Obligations, read against the licence text.* LGPL v3 incorporates GPL v3 and is written for software libraries: a redistributed (modified or not) copy must carry the licence notices and be conveyed under the LGPL/GPL terms, and "source" must be available. ([LGPL v3](https://www.gnu.org/licenses/lgpl-3.0.en.html)) Applied to a data file, that is workable (the GeoJSON is its own source; ship `COPYING.LESSERv3` and the notice) but awkward: the LGPL says nothing about the EU sui generis database right, and the legacy notice's "name of GSHHG not be used in advertising" clause still travels with the file. Whether a clipped-and-simplified extract is a "modified version" that must itself be LGPL, or an "application that uses the library", is a question the LGPL was not drafted to answer for data. The University of Hawaii and NOAA disclaim all warranty.

**Resolution.** Five levels. README: "The ocean-land shorelines derive from WVS (World Vector Shoreline project) [Soluri and Woodson, 1990] while the polygons for lakes ... derive from WDBII." Wessel & Smith (1996): the lower resolutions were produced by Douglas-Peucker with tolerances of "0.2 km, 1 km, 5 km, and 25 km which typically lead to ~80% reduction in data size for each step in resolution" ([paper PDF](https://www.soest.hawaii.edu/pwessel/gshhg/Wessel+Smith_1996_JGR.pdf), text extracted locally). The GMT `coast` documentation says the same: "The resolution drops off by 80% between data sets." ([GMT coast](https://docs.generic-mapping-tools.org/latest/coast.html)) WVS's nominal scale is 1:250,000 (Soluri & Woodson 1990, *International Hydrographic Review*; seen only via the article abstract, not the NOAA datasheet, which returned 403). README caveat: "the GSHHG data are geodetic longitude, latitude locations on the WGS-84 ellipsoid. This is certainly true of the WVS data (the coastlines)... Offsets have been noted between GSHHG and modern GPS positions."

**Cadiz bay.** Measured per level (land polygons `GSHHS_x_L1` clipped to the extent): `f` 7 features, 1,377 vertices, 641 in the bay box, all test points correct; `h` 165 / 79, all correct; `i` 47 / 24, bay water correct but Cadiz city reads as sea (isthmus gone); `l` 13 / 5, inner bay reads as land; `c` 4 vertices, a quadrilateral. So `h` is the coarsest shipped level that meets the bar, and `f` simplified at 250 m matches `h` in size with better shape.

**Download.** `http://www.soest.hawaii.edu/pwessel/gshhg/gshhg-shp-2.3.7.zip` (149,157,845 bytes; contains `GSHHS_shp/{f,h,i,l,c}/GSHHS_?_L1..L6.shp`, `WDBII_shp`, `LICENSE.TXT`, `COPYING.LESSERv3`, `README.TXT`). Version 2.3.7, 15 June 2017; no newer release. The NOAA mirror `ngdc.noaa.gov/mgg/shorelines/data/gshhg/latest/` is gone (see candidate 5).

**Tool steps (verified).**

```sh
curl -LO http://www.soest.hawaii.edu/pwessel/gshhg/gshhg-shp-2.3.7.zip && unzip gshhg-shp-2.3.7.zip
# either take the h level as-is ...
npx mapshaper GSHHS_shp/h/GSHHS_h_L1.shp -clip bbox=-6.8,35.9,-5.8,36.8 \
  -each 'kind="land"' -filter-fields kind -o precision=0.0001 cadiz-land.geojson
# ... or simplify f (better shape at the same size)
npx mapshaper GSHHS_shp/f/GSHHS_f_L1.shp -clip bbox=-6.8,35.9,-5.8,36.8 \
  -simplify interval=250 keep-shapes \
  -each 'kind="land"' -filter-fields kind -o precision=0.0001 cadiz-land.geojson
```

ogr2ogr: `ogr2ogr -f GeoJSON -clipsrc -6.8 35.9 -5.8 36.8 -simplify 0.0025 cadiz-land.geojson GSHHS_shp/f/GSHHS_f_L1.shp` (`-simplify` is in degrees; 0.0025 deg is about 250 m here).

### 3. OpenStreetMap coastline (ODbL)

**Licence.** OSM: "You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors. If you alter or build upon our data, you may distribute the result only under the same license." ([openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)) osmdata.openstreetmap.de: "all files containing data directly based on the original OpenStreetMap data are available under the same license as the original OpenStreetMap data, the Open Database License (ODbL)." ([osmdata licence](https://osmdata.openstreetmap.de/info/license.html)) Geofabrik extracts: "License: ODbL 1.0". ([Geofabrik Andalucia](https://download.geofabrik.de/europe/spain/andalucia.html))

*Obligations.* ODbL 1.0 s.4.2: publicly conveyed databases and Derivative Databases must include the licence (or its URI) and keep notices; s.4.4 share-alike: a publicly used Derivative Database must be under ODbL or a compatible licence; s.4.6: recipients of a Derivative Database must be able to get the whole derivative or a diff. "Derivative Database" is "a database based upon the Database, and includes any translation, adaptation, arrangement, modification, or any other alteration of the Database or of a Substantial part of the Contents"; a "Produced Work" is "a work (such as an image, audiovisual material, text, or sounds) resulting from using the whole or a Substantial part of the Contents". ([ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)) The OSMF Produced Work guideline: "If the published result of your project is intended for the extraction of the original data, then it is a database and not a Produced Work"; "Database dumps are usually not Produced Works." A clipped, simplified GeoJSON of OSM coastline distributed in the repo is therefore a Derivative Database and must itself be ODbL, even though the rendered battle animation is a Produced Work. ([Produced Work guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline)) Attribution: "OpenStreetMap" (minimum), preferably linked to openstreetmap.org/copyright; for a database, "You must include attribution to OpenStreetMap and either the text of the ODbL or a link to it as part of the database", in a readme or metadata. ([OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)) ODbL expressly licenses the sui generis database right, so the database-right question is answered by the same share-alike terms.

**Resolution.** Whatever contributors mapped; here it is imagery-traced at metre scale. Overpass (`way["natural"="coastline"]` in the extent, 2026-09-05): 153 ways, 7,459 nodes, 2,859 of them in the bay box. Cadiz bay, the Trocadero, the Sancti Petri channel and every quay survive; the problem is having too much, not too little.

**Download.** Three routes.
- Pre-built world land polygons: `https://osmdata.openstreetmap.de/download/land-polygons-split-4326.zip` (925,630,369 bytes, rebuilt daily; also `land-polygons-complete-4326.zip`, 920 MB, and `coastlines-split-4326.zip`, lines). Shapefile, WGS84 or Mercator; "The coastline in OpenStreetMap is often broken. The update process will try to repair it, but this does not always work." ([land polygons](https://osmdata.openstreetmap.de/data/land-polygons.html), [coastlines](https://osmdata.openstreetmap.de/data/coastlines.html))
- Regional extract: `https://download.geofabrik.de/europe/spain/andalucia-latest.osm.pbf` (184 MB) plus osmcoastline (GPL-3 tool that "extracts the coastline from an OSM planet file and assembles all the pieces into polygons"). ([osmcoastline](https://osmcode.org/osmcoastline/))
- Overpass for the raw ways (498 kB of JSON for this extent), useful for inspection; not a polygon source without closing rings against the bbox.

**Tool steps.**

```sh
# Route A: world land polygons, clip (needs ~1 GB download, nothing else)
curl -LO https://osmdata.openstreetmap.de/download/land-polygons-split-4326.zip && unzip land-polygons-split-4326.zip
npx mapshaper land-polygons-split-4326/land_polygons.shp \
  -clip bbox=-6.8,35.9,-5.8,36.8 -dissolve \
  -simplify interval=250 keep-shapes \
  -each 'kind="land"' -filter-fields kind -o precision=0.0001 cadiz-land.geojson
# (-dissolve merges the split tiles back into one polygon; drop it if seams are acceptable)

# Route B: regional extract + osmcoastline (Linux/macOS; needs osmium-tool and osmcoastline)
curl -LO https://download.geofabrik.de/europe/spain/andalucia-latest.osm.pbf
osmium extract -b -6.8,35.9,-5.8,36.8 andalucia-latest.osm.pbf -o cadiz.osm.pbf
osmcoastline --output-polygons=land --close-distance=0 -o cadiz-coast.db cadiz.osm.pbf
ogr2ogr -f GeoJSON -clipsrc -6.8 35.9 -5.8 36.8 cadiz-land-raw.geojson cadiz-coast.db land_polygons
npx mapshaper cadiz-land-raw.geojson -simplify interval=250 keep-shapes \
  -each 'kind="land"' -filter-fields kind -o precision=0.0001 cadiz-land.geojson
```

Route B's caveat: a bbox extract cuts the coastline ways at the edge, and osmcoastline can only close small gaps (`--close-distance`), so the land polygon may fail to close along the extent edge; route A avoids this because the world polygons are already closed. Either way the output must ship with an `OpenStreetMap` attribution and ODbL link, and the map file itself is ODbL.

### 4. EEA coastline for analysis (polygon), version 3.0, March 2017

**Licence.** Metadata record: "License CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Copyright holder: European Environment Agency (EEA)." ([EEA SDI record](https://sdi.eea.europa.eu/catalogue/water/api/records/9faa6ea1-372a-4826-a3c7-fb5b05e31c52)) Obligations: attribution and a licence link; no share-alike. CC BY 4.0 explicitly licenses sui generis database rights, so the EU database right is covered. The bundled `README.md` restates the lineage and links the record.

**Resolution.** "created for detailed analysis with a Minimum Mapping Unit of e.g. 1:100000, for geographical Europe"; a hybrid of EU-Hydro (Image2006 satellite scenes) with GSHHG used "without modifications" outside the EU-DEM coverage, and "altitude level = 0 from EUDEM" as the defining criterion. Coordinate system EPSG:3035 (LAEA Europe), so it must be reprojected. ([EEA record](https://sdi.eea.europa.eu/catalogue/water/api/records/9faa6ea1-372a-4826-a3c7-fb5b05e31c52); README inside the zip)

**Cadiz bay.** Measured after reprojection and clipping: 30 features, 2,809 vertices, 1,085 in the bay box; all test points correct including Rota. Simplified at 250 m: 159 vertices, still correct. Noticeably finer than GSHHG `f` around the bay (the EU-Hydro component, not the GSHHG filler, is what covers Spain).

**Download.** Record `9faa6ea1-372a-4826-a3c7-fb5b05e31c52`; the landing page `https://sdi.eea.europa.eu/data/9faa6ea1-372a-4826-a3c7-fb5b05e31c52` links the file at `https://sdi.eea.europa.eu/datashare/s/gcJSme8gWebRHBa/download` (54,992,151 bytes; zip containing `EEA_Coastline_20170228.shp` and metadata XML). Superseded versions 2.0 (2015) and 1.0 (2013) are listed on the EEA datahub item `af40333f-9e94-4926-a4f0-0a787f1d2b8f`. ([EEA datahub](https://www.eea.europa.eu/en/datahub/datahubitem-view/af40333f-9e94-4926-a4f0-0a787f1d2b8f))

**Tool steps (verified).**

```sh
curl -L -o eea_coast.zip https://sdi.eea.europa.eu/datashare/s/gcJSme8gWebRHBa/download && unzip eea_coast.zip
npx mapshaper eea_v_3035_100_k_coastline-poly_p_1995-2017_v03_r00/EEA_Coastline_20170228.shp \
  -proj wgs84 -clip bbox=-6.8,35.9,-5.8,36.8 \
  -simplify interval=250 keep-shapes \
  -each 'kind="land"' -filter-fields kind -o precision=0.0001 cadiz-land.geojson
```

ogr2ogr: `ogr2ogr -f GeoJSON -t_srs EPSG:4326 -clipdst -6.8 35.9 -5.8 36.8 -simplify 0.0025 cadiz-land.geojson EEA_Coastline_20170228.shp`.

### 5. NOAA / NGA and other government shorelines

**What exists.** NOAA NCEI hosted GSHHG (the same Wessel & Smith data) and describes it as "amalgamated from three data bases in the public domain: World Vector Shorelines (WVS), CIA World Data Bank II (WDBII), and Atlas of the Cryosphere". The NCEI accession record 0304143 carries "Creative Commons Public Domain Dedication (CC0 1.0)" as its use constraint while also noting the LGPL, and states: "NCEI decommissioned the Global Self-consistent, Hierarchical, High-resolution Geography Database in May 2025 with no further updates." Archive download: `https://www.ncei.noaa.gov/archive/accession/download/304143`. ([data.gov record](https://catalog.data.gov/dataset/a-global-self-consistent-hierarchical-high-resolution-geography-database-from-2010-02-19-t)) The old `ngdc.noaa.gov/mgg/shorelines/` URL now redirects to `ncei.noaa.gov/products/shoreline-coastline-resources` (timed out when fetched). The CC0 on the NCEI record conflicts with the LGPL in the file itself; NCEI is a mirror, not the rights holder, so the LGPL governs.

**World Vector Shoreline.** The 1:250,000 NGA/DMA product that GSHHG `f` is built from. Its NOAA datasheet (`shoreline.noaa.gov/data/datasheets/wvs.html`) returned HTTP 403 to two fetch attempts, and no current public download of WVS as a standalone product was found; the Soluri & Woodson (1990) abstract says distribution was then "limited to the U.S. Government and qualified contractors". Treat WVS as reachable only through GSHHG. Not verified: whether NGA's WVS Plus is downloadable today.

**NOAA's own shorelines** (Shoreline Data Explorer, Medium Resolution Shoreline, ENC-derived) cover US waters only and do not include Spain.

**Verdict.** No independent public-domain government coastline for Cadiz was found. The "government PD" class here is either the EEA (CC BY 4.0, not PD) or Spain's IGN (below).

### 6. Spain: IGN / CNIG (BTN100, BCN200, coastline)

**Licence.** The CNIG data policy: data produced by IGN/CNIG is under the IGN licence per Orden FOM/2807/2015, described as compatible with CC BY 4.0, whose core obligation is to "reconocer y mencionar el origen y propiedad" of IGN products in the wording the portal's attribution tool generates; data from other administrations on the portal is plain CC BY 4.0. ([CNIG politica de datos](https://centrodedescargas.cnig.es/CentroDescargas/politica-datos)) Products: BTN100 (Base Topografica Nacional 1:100,000), BCN200 (1:200,000), and a "Linea de costa" layer. ([CNIG BTN100](https://centrodedescargas.cnig.es/CentroDescargas/btn100))

**Not verified.** The download centre is interactive (product + sheet selection) and was not exercised; resolution around the bay and the exact attribution string are unconfirmed. Recorded as a CC BY-class alternative to the EEA with a national rather than EU rights-holder.

### 7. EMODnet Bathymetry World Coastline 2022 and Eurostat GISCO (recorded, not recommended for measurement)

- **EMODnet** record 36821cff-56db-4e96-8426-ddfe68240c4b: access constraint "Creative Commons Attribution 4.0 International"; source "vector lines derived from land polygons available from OpenStreetMap" plus Deltares satellite-derived LAT/MSL/MHW lines at 10 m. Download `https://downloads.emodnet-bathymetry.eu/v11/EMODnet_Bathymetry_2022_coastlines.zip`; WFS `https://ows.emodnet-bathymetry.eu/wfs`. ([EMODnet record](https://emodnet.ec.europa.eu/geonetwork/srv/api/records/36821cff-56db-4e96-8426-ddfe68240c4b)) The CC BY label on OSM-derived geometry is not something a downstream user can rely on; the ODbL share-alike follows the geometry. Lines, not polygons, so polygonising would be extra work anyway.
- **Eurostat GISCO** Countries/Coastal at 1:1M-1:60M in GeoJSON: download rules require "the data will not be used for commercial purposes" and the notice "(c) EuroGeographics for the administrative boundaries" in the legend and introductory page. ([GISCO administrative units](https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units)) The non-commercial clause rules it out for a redistributable open data file.

### 8. Hand-digitising from a public-domain chart (fallback)

**Chart candidates.**
- **Tofiño de San Miguel, *Carta esferica desde Punta Candor hasta Cabo de Trafalgar que contiene los baxos de la Azeytera* (1787, engraved Ballester, drawn Bauza; from the *Atlas Maritimo de Espana*, 1789).** Exactly the required stretch: Punta Candor is just north of Rota, and the sheet runs to Cape Trafalgar with Cadiz bay in the middle. Copies:
  - Commons `File:Carta esferica desde Punta Candor hasta Cabo de Trafalgar - construida por Vicente Tofiño de S. Miguel ; grabada por Joaquin Ballester ; Bauza lo delineo - btv1b53269573v.jpg`, 8,028 x 11,506 px, templates `{{PD-France}}{{PD-US-expired}}`, `LicenseShortName: Public domain`, credit "Bibliotheque nationale de France, departement Cartes et plans, GE SH 18 PF 61 DIV 1 P 14/1" (Commons API, `prop=imageinfo`). Gallica's own terms for the same scan: non-commercial reuse is free with the credit "Source gallica.bnf.fr / Bibliotheque nationale de France"; "La reutilisation commerciale de ces contenus est payante et fait l'objet d'une licence." ([Gallica conditions](https://gallica.bnf.fr/edit/und/conditions-dutilisation-des-contenus-de-gallica)) Commons hosts it on the basis that a faithful reproduction of a PD 2-D work carries no new copyright; the BnF asserts public-sector-information terms over its scans instead. Tracing a coastline from the scan does not reproduce the scan, so the resulting GeoJSON is ours either way; the scan itself should not be bundled if the project wants to avoid the Gallica commercial clause.
  - Internet Archive / David Rumsey list no. 13360.013: same chart, "Creative Commons CC BY-NC-SA 3.0", credit "David Rumsey Map Collection, David Rumsey Map Center, Stanford Libraries". ([IA item](https://archive.org/details/dr_carta-esferica-desde-punta-candor--hasta-cabo-de-trafalgar-que-contiene-lo-13360013); [Rumsey terms](https://www.davidrumsey.com/about/copyright-and-permissions)) Non-commercial and share-alike on the scan; avoid as the traced source unless the NC clause is acceptable, even though the geometry argument above applies.
  - Biblioteca Virtual de Defensa, *Atlas Maritimo de Espana* (1789), record BMDB20190011426: "La copia digital se distribuye bajo licencia CC BY 4.0 que permite compartir y adaptar el material siempre que se mencione la procedencia". ([BVD record](https://bibliotecavirtual.defensa.gob.es/BVMDefensa/es/consulta/registro.do?control=BMDB20190011426)) The cleanest scan licence of the three.
  - Companion sheets on Commons (18th-century maps of Cadiz category): *Plano de Cadiz y sus contornos*, *Plano del puerto de Cadiz*, and the French *Baie de Cadiz, plan leve en 1789* (Tofiño/Bouclet), all larger-scale plans of the bay.
- **A. K. Johnston, *Map of the Battle of Trafalgar* (1848)**, Commons `File:Map of the Battle of Trafalgar 1848.jpg`, 1,550 x 1,046 px, `{{PD-US-expired}}{{PD-old-70}}` (already catalogued in [trafalgar-sources](trafalgar-sources.md)). Covers Cadiz to Trafalgar but at battle-plan scale and low pixel count; usable for registering fleet positions, too coarse to trace a coastline that must survive zoom.
- Also on Commons (19th-century category): *1806 map - Plan der Bay von Cadiz*, A. M. A. Raoul *Plan hydrographique de la Baie de Cadiz*, *Plan du port de Cadix et de sa baie*. Not examined for licence templates.

**Licence of the result.** The 1787 and 1848 charts are public domain (authors died 1795 and 1871). A vector tracing is a new work; the project licenses it as it chooses. No share-alike or attribution obligation attaches to the geometry; citing the chart and scan (`commons:File:...btv1b53269573v.jpg`, BnF GE SH 18 PF 61 DIV 1 P 14/1) is good practice and satisfies Gallica's source-mention condition for non-commercial use of the image if it is ever shown.

**Fidelity.** Tofiño's survey is a scientific triangulated coastal chart at large scale, so the shape is reliable, but longitudes are reckoned from the Cadiz observatory meridian and the projection is an 18th-century "carta esferica"; georeferencing must use ground control points, not the printed graticule. Bonus: it shows the coast as it was in 1805 (the Trocadero, the Sancti Petri channel, the pre-reclamation bay), which is closer to the battle than any modern dataset. Cost: an afternoon in QGIS and a human eye.

**Tool steps.**

```text
1. QGIS > Raster > Georeferencer: load the Commons/BVD jpg.
2. Add 6-10 GCPs on features that still exist: Cadiz cathedral/San Sebastian castle,
   Rota, Chipiona, Cape Trafalgar lighthouse point, Sancti Petri castle, Puerto Real.
   Take target coordinates from any of candidates 1-4 (or from the ADR-0005 place list),
   transformation type Thin Plate Spline or Polynomial 2, target CRS EPSG:4326.
3. Layer > Create Layer > New GeoPackage layer (Polygon, EPSG:4326, field kind=text);
   digitise the land side of the coastline with the georeferenced raster underneath;
   set kind = "land".
4. Export: Layer > Export > Save Features As > GeoJSON, COORDINATE_PRECISION=4,
   or: ogr2ogr -f GeoJSON -lco COORDINATE_PRECISION=4 cadiz-land.geojson cadiz.gpkg land
5. Optional: npx mapshaper cadiz-land.geojson -simplify interval=100 keep-shapes -o cadiz-land.geojson
```

## Assembling the map file

Whichever land source is chosen, the last step is the same: merge the land polygons with the place points and validate the shape ADR-0005 expects.

```sh
# places.geojson: hand-authored Point features, [lon, lat], kind="place", name=...
npx mapshaper cadiz-land.geojson places.geojson combine-files \
  -merge-layers force -o precision=0.0001 format=geojson trafalgar-map.geojson
```

Approximate place coordinates, typed from general knowledge and **to be verified** against Natural Earth `ne_10m_populated_places` (public domain) or a gazetteer before use: Cadiz 36.535N 6.297W; Cape Trafalgar 36.183N 6.034W; Rota 36.623N 6.361W; Sanlucar de Barrameda 36.778N 6.353W; Cape Spartel 35.792N 5.921W; Tangier 35.767N 5.800W. Note that Cape Spartel and Tangier lie south of the 35.9N edge of the stated extent, and no African land falls inside 35.9-36.8N, so "if in extent" resolves to "no" unless the extent is widened to about 35.7N. Every measured dataset above returned "sea" for the Tangier test point for that reason, not because of resolution.

## For the licensing decision

The licence classes the data-licensing ticket has to choose among, as they apply to a coastline file shipped with the battle data:

| Class | Candidates | What travels with the map file |
|---|---|---|
| Public domain / CC0 | Natural Earth 1:10m | Nothing. Coarsest option; bay survives as a caricature only. |
| LGPL v3 or later (software copyleft applied to data) | GSHHG `f`/`h` | Licence text and notices in the repo; modified copies conveyed under LGPL; no database-right grant; "reasonable redistribution fee" and "no advertising use of the name" legacy notice. Finest PD-adjacent option; the only source for WVS-derived geometry. |
| ODbL 1.0 (attribution + share-alike + database right) | OpenStreetMap via osmdata.openstreetmap.de, Geofabrik + osmcoastline, or EMODnet's OSM-derived lines | "OpenStreetMap" attribution with a link, ODbL text or link in the data's readme, and the map file itself ODbL; the rendered playback is a Produced Work needing only the attribution notice. Finest geometry by far. |
| CC BY 4.0 (attribution, no share-alike, database right granted) | EEA coastline for analysis; Spain IGN/CNIG (IGN's own compatible licence); Biblioteca Virtual de Defensa scans | Attribution string and licence link; the map file may carry any licence compatible with attribution. EEA measured as the best shape-per-vertex after simplification. |
| Non-commercial classes (excluded unless the project accepts NC) | Eurostat GISCO (EuroGeographics NC), David Rumsey scans (CC BY-NC-SA 3.0), Gallica commercial-reuse fee on BnF scans | Not compatible with an open data file; listed so the ticket knows why they are out. |
| Own work traced from a PD chart | Tofiño 1787, Johnston 1848 | Whatever licence the project picks for its own data; cite the chart. Costs human hours; yields the 1805 coast. |

Mixed files inherit the strictest class of any input: an ODbL land polygon with hand-typed place points is an ODbL file; an EEA polygon with Natural Earth points is CC BY 4.0. A GSHHG polygon in the same repo as CC BY-SA 4.0 battle data (see the Wikipedia-derived order of battle in the Trafalgar sources note) means three licences travel with one battle, which is itself an input to that ticket.

## Sources consulted

- https://www.naturalearthdata.com/about/terms-of-use/ ; https://www.naturalearthdata.com/downloads/10m-physical-vectors/ ; https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-coastline/ ; https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip (downloaded, HEAD)
- https://www.soest.hawaii.edu/pwessel/gshhg/ ; https://www.soest.hawaii.edu/pwessel/gshhg/README.TXT ; https://www.soest.hawaii.edu/pwessel/gshhg/Wessel+Smith_1996_JGR.pdf (text extracted) ; `gshhg-shp-2.3.7.zip` `LICENSE.TXT`, `README.TXT` (downloaded) ; https://docs.generic-mapping-tools.org/latest/coast.html ; https://www.gnu.org/licenses/lgpl-3.0.en.html
- https://www.ngdc.noaa.gov/mgg/shorelines/shorelines.html ; https://www.ngdc.noaa.gov/mgg/shorelines/ (301 to ncei.noaa.gov/products/shoreline-coastline-resources, timed out) ; https://catalog.data.gov/dataset/a-global-self-consistent-hierarchical-high-resolution-geography-database-from-2010-02-19-t ; https://shoreline.noaa.gov/data/datasheets/wvs.html (403) ; Soluri & Woodson 1990 abstract via https://journals.lib.unb.ca/index.php/ihr/article/view/23315 (search snippet only)
- https://www.openstreetmap.org/copyright ; https://opendatacommons.org/licenses/odbl/1-0/ ; https://osmfoundation.org/wiki/Licence/Attribution_Guidelines ; https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline ; https://osmdata.openstreetmap.de/data/land-polygons.html ; https://osmdata.openstreetmap.de/data/coastlines.html ; https://osmdata.openstreetmap.de/info/license.html ; https://osmcode.org/osmcoastline/ ; https://download.geofabrik.de/europe/spain/andalucia.html ; Overpass API query for `natural=coastline` in the extent (2026-09-05)
- https://sdi.eea.europa.eu/catalogue/water/api/records/9faa6ea1-372a-4826-a3c7-fb5b05e31c52 ; https://sdi.eea.europa.eu/data/9faa6ea1-372a-4826-a3c7-fb5b05e31c52 ; https://sdi.eea.europa.eu/datashare/s/gcJSme8gWebRHBa/download (downloaded) ; https://www.eea.europa.eu/en/datahub/datahubitem-view/af40333f-9e94-4926-a4f0-0a787f1d2b8f
- https://emodnet.ec.europa.eu/geonetwork/srv/api/records/36821cff-56db-4e96-8426-ddfe68240c4b ; https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/coastal ; https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units ; https://centrodedescargas.cnig.es/CentroDescargas/politica-datos ; https://centrodedescargas.cnig.es/CentroDescargas/btn100
- Commons API (`prop=imageinfo|revisions`) for `File:Carta esferica desde Punta Candor hasta Cabo de Trafalgar ... btv1b53269573v.jpg` and `File:Map of the Battle of Trafalgar 1848.jpg` ; https://commons.wikimedia.org/wiki/Category:18th-century_maps_of_C%C3%A1diz ; https://commons.wikimedia.org/wiki/Category:19th-century_maps_of_C%C3%A1diz ; https://gallica.bnf.fr/edit/und/conditions-dutilisation-des-contenus-de-gallica ; https://archive.org/details/dr_carta-esferica-desde-punta-candor--hasta-cabo-de-trafalgar-que-contiene-lo-13360013 ; https://www.davidrumsey.com/about/copyright-and-permissions ; https://bibliotecavirtual.defensa.gob.es/BVMDefensa/es/consulta/registro.do?control=BMDB20190011426
- Measurements: mapshaper 0.6.104 via npx; vertex counts and point-in-polygon tests with a short Python script over the clipped GeoJSON.
