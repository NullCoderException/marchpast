# Naval map data: coastline, shoal, island and fort sources for Aboukir Bay and Copenhagen

*Research note for GitHub issue #45 (part of wayfinder map #36). Extends [cadiz-coastline.md](cadiz-coastline.md) (branch `research/cadiz-coastline`), which already documents the licence text and obligations of Natural Earth, GSHHG, OpenStreetMap and the EEA coastline; those are not repeated here, only what changes for these two bays. Verified 2026-09-06 by downloading the same datasets, clipping them to the two extents with mapshaper 0.6.x, running the Cadiz note's point-in-polygon script, querying Overpass, and fetching each licence and catalogue page cited. Claims taken from memory rather than a fetched page are flagged "not verified".*

## Gist

Both bays are held, at the "stylised but geo-registered" bar of ADR-0005, by the same four coastline families as Cadiz, and the licence ranking is unchanged: public domain (Natural Earth) < attribution-only (EEA CC BY 4.0, Copenhagen only; Danish national data under SDFI's own attribution terms) < LGPL (GSHHG) < ODbL (OpenStreetMap). Measured: Natural Earth keeps both bays as bays but sinks Nelson's Island, Trekroner and, at Copenhagen, the city-centre test point. GSHHG `f` is the coarsest public-domain-adjacent level that carries Nelson's Island (one of 30 small polygons in the Aboukir extent, the rest being the reef rocks along the Aboukir shoal), while no GSHHG level carries Trekroner. The EEA polygon (Copenhagen only) and OSM carry everything, including three artificial fort-islands, two of which (Middelgrundsfortet 1890-94, Flakfortet) did not exist in 1801 and must be cut out. Shoals are the real gap: no vector coastline dataset has them, OSM has no `natural=shoal` feature in either bay, Natural Earth bathymetry stops at the 200 m contour, GEBCO (public domain, 15 arc-second, about 400 m x 460 m cells at Aboukir and 260 m x 460 m at Copenhagen) blurs a shoal a few hundred metres wide, and EMODnet DTM 2024 (CC BY 4.0, about 115 m) resolves the Middle Ground from Danish survey data but is GEBCO-filled at Aboukir where it has no better source. Denmark's own 50 m depth model is attribution-only and the best modern source for the Middle Ground; Egypt publishes nothing open. For the *historical* shoal and shoreline the public-domain period plans are the better source at both bays: John Brydon's 1798 Aboukir plan (Royal Collection scan on Commons, soundings and the shoal) and his 1802 Copenhagen plan (RMG PY7985 on Commons, 6004 x 4680 px, Middle Ground drawn), with Luffman 1798 (10,135 x 7,672 px, National Library of Israel) and Pocock's annotated chart (RMG, 3,800 x 2,947 px) as cross-checks. Nelson's Island (Wikidata Q2397328, 31.3585N 30.1062E, 0.027 km2) and Trekroner (Q1126084, 55.7031N 12.6144E; the present island is the one begun in 1787 and unfinished but armed in 1801) can be point features from CC0 Wikidata coordinates or polygons from GSHHG `f` / EEA / OSM respectively. No recommendation is made on the dataset; the licence-class table at the end is the input to the map-format v2 ticket (#51).

## What the map file needs

ADR-0005's v1 shapes: `land` polygons and `place` points. Ticket #51 asks whether v2 adds shoal, island and fortification kinds and whether a map may carry a modern and a historical coastline; this note supplies what data could fill each, not the schema answer. Positions in the battle file are constructed against a sourced fix (ADR-0010), so the period plans matter twice: as the historical shoreline and shoal, and as the anchor for where the anchored lines lay.

## Extents used

| Bay | Clip bbox (W,S,E,N) | "Bay box" for counts | Test points (expected reading) |
|---|---|---|---|
| Aboukir Bay | 29.85, 31.10, 30.45, 31.50 | 30.00-30.35E, 31.25-31.45N | Nelson's Island centroid 31.358N 30.107E (land); Aboukir fort "Tabyet al Burg" 31.325N 30.064E (land); bay water 31.33N 30.15E (sea); Rosetta mouth water 31.47N 30.35E (sea); Alexandria 31.20N 29.90E (land) |
| Copenhagen | 12.50, 55.60, 12.85, 55.80 | 12.58-12.75E, 55.65-55.75N | Trekroner centroid 55.703N 12.613E (land); Saltholm 55.64N 12.76E (land); King's Deep 55.69N 12.63E (sea); Middle Ground 55.69N 12.65E (sea, it is a shoal not land); Amager 55.63N 12.62E (land); Copenhagen centre 55.676N 12.57E (land); Middelgrundsfortet 55.720N 12.666E and Flakfortet 55.703N 12.731E (land today, absent in 1801) |

The Nelson's Island and Trekroner coordinates were first typed from memory (31.335N 30.062E and 55.703N 12.622E), both wrong by 1-5 km; the OSM/Wikidata centroids above replaced them. The lesson for the place list: take coordinates from Wikidata or OSM, never from memory.

## Coastline measurements

Vertex counts are on land polygons after clipping (raw), then after `-simplify interval=250 keep-shapes` (250 m) and `interval=100`. "Polys" is the number of polygons after clipping. Readings are for the test points above; only the failures are listed.

### Aboukir Bay

| Dataset | Polys | Vertices raw (bay box) | 250 m | 100 m | Failures | File at 250 m |
|---|---|---|---|---|---|---|
| Natural Earth 1:10m land 5.1.1 | 1 | 95 (43) | 82 | 92 | Nelson's Island sea | 3.8 kB raw |
| Natural Earth minor islands 4.1.0 | 0 | 0 | - | - | nothing in the extent | - |
| GSHHG 2.3.7 `f` | 30 | 885 (531) | 187 | 333 | none | 10.0 kB |
| GSHHG `h` | 9 | 88 (46) | 84 | 88 | Nelson's Island sea | 3.7 kB raw |
| GSHHG `i` | 1 | 23 (7) | 23 | 23 | Nelson's Island sea | |
| GSHHG `l` | 1 | 11 (3) | 11 | 11 | Nelson's Island sea; Rosetta-mouth water reads land | |
| OpenStreetMap coastline (Overpass, 2026-09-06) | 70 ways, 3 closed | 6,717 nodes (2,489 in bay box) | not polygonised | | none; Nelson Island is closed way 251440402 (100 nodes) | |
| EEA coastline | not applicable (Europe only) | | | | | |

GSHHG `f`'s 30 polygons are the mainland plus 29 islets of 6-8 vertices each, 28 of them inside the bay box with centroids strung from 30.01E 31.29N to 30.07E 31.34N: that is World Vector Shoreline's rendering of the rocks and reef along the Aboukir shoal between the fort and Nelson's Island, the feature the French line anchored behind. They are the closest any vector coastline comes to drawing the shoal. At the `h` level they collapse to 8 islets and Nelson's Island itself is gone. Natural Earth keeps the bay outline (all water and mainland points correct) but has no island at all.

### Copenhagen

| Dataset | Polys | Vertices raw (bay box) | 250 m | 100 m | Failures | File at 250 m |
|---|---|---|---|---|---|---|
| Natural Earth 1:10m land | 3 | 49 (12) | 37 | 47 | Copenhagen centre reads sea; Trekroner sea | 2.4 kB raw |
| Natural Earth minor islands | 1 (Saltholm) | 19 (1) | 14 | 18 | duplicates Saltholm only | |
| GSHHG `f` | 4 | 499 (182) | 75 | 194 | Trekroner sea (no polygon) | 2.4 kB |
| GSHHG `h` | 4 | 90 (35) | 67 | 88 | Trekroner sea | |
| GSHHG `i` | 2 | 23 (8) | 22 | 23 | Trekroner sea | |
| GSHHG `l` | 1 | 8 (1) | 8 | 8 | Saltholm and Copenhagen centre read sea | |
| EEA coastline for analysis v3.0 (EPSG:3035, reprojected) | 134 | 4,077 (846) | 587 | 728 | none; Trekroner (7 vertices), Middelgrundsfortet (32 and 77), Flakfortet (24 and 59) all present as polygons; at 250 m the two later forts drop out, Trekroner survives | 47 kB |
| OpenStreetMap coastline (Overpass, 2026-09-06) | 159 ways, 74 closed | 9,267 nodes (3,637 in bay box) | not polygonised | | none; Trekroner way 305473012 (37 nodes, `historic=castle`, `place=islet`, `wikidata=Q1126084`), Middelgrunds Fort way 4244980 (70 nodes), Flakfortet way 4218311 (32 nodes) | |

Natural Earth's Copenhagen failure is the same displacement seen at Rota in the Cadiz note: its coast runs east of the centre point, so the city reads as sea. GSHHG `f` has Amager, Zealand, Saltholm and one islet, and no fort-islands. The EEA file is the only attribution-only source with Trekroner as a polygon; it also carries Refshaleoen, Nordhavn, Provestenen and the Amager Strandpark lagoon in their present, reclaimed shapes (see "Historical shoreline").

### Reproduction

Identical to the Cadiz note's commands with the bbox swapped; the only additions are the minor-islands file and the EEA reprojection for Copenhagen.

```sh
# Aboukir (GSHHG f, the only public-domain-adjacent level with Nelson's Island)
npx mapshaper GSHHS_shp/f/GSHHS_f_L1.shp -clip bbox=29.85,31.10,30.45,31.50 \
  -simplify interval=250 keep-shapes -each 'kind="land"' -filter-fields kind \
  -o precision=0.0001 format=geojson nile-land.geojson
# Copenhagen (EEA, CC BY 4.0, keeps Trekroner)
npx mapshaper EEA_Coastline_20170228.shp -proj wgs84 -clip bbox=12.50,55.60,12.85,55.80 \
  -simplify interval=250 keep-shapes -each 'kind="land"' -filter-fields kind \
  -o precision=0.0001 format=geojson copenhagen-land.geojson
# OSM, either bay: Overpass
# [out:json][timeout:120];way["natural"="coastline"](S,W,N,E);out geom;
```

Downloads observed: `ne_10m_land.zip` 3,269,070 bytes (Last-Modified 13 May 2022), `ne_10m_minor_islands.zip` 314,932 bytes (4 Sep 2021), `gshhg-shp-2.3.7.zip` 149,157,845 bytes (15 Jun 2017; `soest.hawaii.edu` now 301-redirects http to https), EEA datashare zip 54,992,151 bytes. Overpass `osm3s` base timestamp 2026-09-06T15:39Z.

## Historical shoreline: modern data versus the period plans

Both bays have changed since the battles, in opposite ways, and the change decides which source draws the coast.

**Aboukir Bay.** The bay's western headland (Abu Qir point, the fort, the reef and Nelson's Island) is rock and has not moved; the Wikidata area of the island today is 0.0267 km2 ([Q2397328](https://www.wikidata.org/wiki/Q2397328)). The eastern half is Nile delta. The Rosetta promontory at the bay's eastern end "continued growing up actively till the beginning of the 20th century where it extended seaward by about 14 km" and has since retreated at 70-130 m/year at the tip after the Aswan barrages and High Dam, while Abu Qir Bay itself is a sediment sink with accretion "up to 38.2 m/yr" along its shore (Frihy et al., abstracts via [ResearchGate](https://www.researchgate.net/publication/286110774_Evolution_of_rosetta_promontory_on_nile_delta_coast_during_the_period_from_1500_to_2005_Egypt), [Geomorphology 2014](https://www.sciencedirect.com/science/article/abs/pii/S0169555X14004292), [Marine Geology 1994](https://www.sciencedirect.com/science/article/abs/pii/0025322794900310); only abstracts were read). Modern coastlines therefore put the Rosetta mouth kilometres from where Brydon's 1798 plan shows it and add the Abu Qir power station and Lake Idku outlets. Because the action happened along the western headland, where the coast is stable, a modern dataset for the land polygon is defensible provided the 1798 shoal is added from a period plan; the eastern delta shore is scenery.

**Copenhagen.** Everything between the Kastellet and the King's Deep is reclaimed: Refshaleoen (naval yard, 1870s onward), Nordhavn, Provestenen island (now the oil harbour; in 1801 "Provestenen" was a blockship, not land), Amager's east coast (Amager Strandpark, 2005) and the Lynetteholm works. Dates in this paragraph are from general knowledge and **not verified** against a Danish source in this pass; the shapes are visible in the EEA and OSM polygons and absent from Brydon's 1802 plan. Trekroner is the exception: the present island is the one the Danes began "in 1787 by filling the site with earth within a construction of driven piles", the original 1713 sunken-ship fort having lain "about 200 m further north"; at the battle it was unfinished but "equipped with as many as 60 cannons" (Danish Wikipedia, [Trekroner (o)](https://da.wikipedia.org/wiki/Trekroner_(%C3%B8)); Slots- og Kulturstyrelsen gives 66 guns and 650 men, [Sofortet Trekroner](https://slks.dk/omraader/slotte-og-ejendomme/slotte-og-haver/soefortet-trekroner), and says it was finished only in 1827). Middelgrundsfortet was built 1890-1894 on the Middle Ground ([Middelgrunden (Oresund)](https://da.wikipedia.org/wiki/Middelgrunden_(%C3%98resund))); Flakfortet is 20th-century (date not verified). Both must be removed from any modern polygon set used for 1801, and the Danish line's own shore, from the Kastellet down the Amager coast, is closer to the 1802 plan than to any modern file. Here the period plan is the better source for the whole inner shoreline, and a modern dataset only for Saltholm, the Swedish shore and the outer extent.

**Answer to the ticket's question.** For the historical shoreline the public-domain 1798/1802 plans win at both bays, but for different amounts of the map: the Aboukir shoal only at the Nile; the whole western shore and the Middle Ground at Copenhagen. Tracing them costs the same QGIS georeferencing session the Cadiz note priced for Tofino; the Brydon plans carry compass and scale, and Trekroner, the Kastellet, Aboukir castle and Nelson's Island are ground-control points that still exist.

## Shoals and depths

| Source | Licence (fetched) | Resolution | Aboukir shoal | Middle Ground | Notes |
|---|---|---|---|---|---|
| GEBCO_2026 Grid | "The GEBCO Grid is placed in the public domain and may be used free of charge"; users may "Copy, publish, distribute and transmit", "Adapt" and "Commercially exploit" it, must "Acknowledge the source of The GEBCO Grid", and it "should NOT be used for navigation" ([terms](https://www.gebco.net/data-products/gridded-bathymetry/terms-of-use)) | 15 arc-second: 463 m north-south, about 396 m east-west at 31.3N and 261 m at 55.7N | Cells are the width of the reef; expect a smeared shallow band, not an outline | Marginal: the shoal is a few cells wide | Download by bbox at download.gebco.net (netCDF, GeoTIFF, ASCII); a TID grid says which cells are measured and which interpolated ([product page](https://www.gebco.net/data-products/gridded-bathymetry-data)). The "acknowledge" clause makes it attribution-in-practice despite the public-domain wording. |
| EMODnet Digital Bathymetry (DTM 2024) | CC BY 4.0; attribution "EMODnet Digital Bathymetry (DTM 2024). EMODnet Bathymetry Consortium https://doi.org/10.12770/cf51df64-56f9-4a99-b1aa-36b8d7b743a1" ([product page](https://emodnet.ec.europa.eu/en/bathymetry); [EMODnet terms](https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products): products "owned by the EU and licensed under the Creative Commons Attribution 4.0 International (CC BY 4.0) license") | 1/16 arc-minute, "ca 115 * 115 meters" | Extent box 36W-43E, 15N-90N covers Egypt, but "areas not covered by observations are completed by integrating GEBCO 2024"; whether Aboukir has survey coverage was not checked in the viewer | Yes: Danish waters are survey-covered and the shoal is several cells wide | Contours can be cut from the GeoTIFF with `gdal_contour`; a coastline-contours vector product also exists (record [cf51df64...](https://emodnet.ec.europa.eu/geonetwork/srv/api/records/cf51df64-56f9-4a99-b1aa-36b8d7b743a1)). |
| Danmarks Dybdemodel (DDM) 2.0, 50 m | Geodatastyrelsen's own marine-data terms: worldwide, free, non-exclusive right; attribution "Contains data from Geodatastyrelsen, Danmarks Dybdemodel, 50 m resolution"; "may not be used for navigation" (search snippet of the GST vilkar PDF, whose URL returned 404; **verbatim not verified**) | 50 m grid, GeoTIFF and WMS, updated August 2024 ([Dataforsyningen 4817](https://dataforsyningen.dk/data/4817), page is JavaScript-rendered and did not fetch) | not applicable | Best modern source | Attribution-only, so it ranks with CC BY. Danish ENC/nautical charts remain paid products under "Kob af sokort og marine data" ([GST](https://gst.dk/data-og-kort/koeb-af-data-og-kort/koeb-af-matrikeldata-og-kort/vilkaar-for-brug-af-frie-geografiske-data-fra-geodatastyrelsen)). |
| Danish free geographic data (GeoDanmark, Kort10, coastline) | SDFI "Vilkar for brug af frie geografiske data", 1 Dec 2022 (PDF fetched): a "verdensomspaendende, gratis, ikke-eksklusiv og i ovrigt ubegraenset brugsret" to copy, distribute, alter and use commercially; must insert "Indeholder data fra Styrelsen for Dataforsyning og Infrastruktur" plus dataset name and date, and "stille en kopi af disse vilkar ... til radighed for tredjepart" ([PDF](https://dataforsyningen.dk/asset/PDF/rettigheder_vilkaar/Vilk%C3%A5r%20for%20brug%20af%20frie%20geografiske%20data.pdf)); newer Klimadatastyrelsen pages say CC BY 4.0 (search snippet, not fetched) | GeoDanmark is mapped from orthophotos at 1:10,000-class accuracy (not measured here) | not applicable | Not a depth source | An attribution-only national coastline for Copenhagen finer than the EEA's; not downloaded (interactive portal). |
| Natural Earth 10m bathymetry 4.1.0 | Public domain | Polygons at 0, -200, -1000 m and deeper, "Created from SRTM Plus" ([page](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-bathymetry/)) | No: nothing shallower than 200 m | No | Useless for a shoal. |
| OpenStreetMap / OpenSeaMap | ODbL | contributor-mapped | No `natural=shoal`/`reef` feature in the Aboukir extent except "Bittern Shoal" off Alexandria (node 769119438); the reef rocks are not mapped | No shoal feature; Kongedybet is a `place=locality` node (1422600732) and a buoy carries `seamark:name=Hollaenderdybet` (node 4224574722) | Overpass query listed in the appendix. Nothing to take. |
| Egypt national hydrography | None found open | | | | The Egyptian Navy Hydrographic Department publishes charts commercially; no open coastline or depth product was found. |
| Period plans (below) | Public domain | engraved soundings and a drawn shoal edge | Brydon 1798 has "water soundings throughout the bay"; Laurie & Whittle 1798 and Luffman 1798 draw the shoal and island; Pocock's chart is annotated | Brydon 1802 shows "Nelson's squadron positioning along Middle Ground Shoal" | Trace the shoal polygon from the georeferenced scan, as a new work under the project's licence. |

Verdict: for the shoal outlines as they were fought over, the period plans; for a modern depth layer, EMODnet DTM 2024 (CC BY 4.0) at both bays, with DDM 50 m as the Danish upgrade and GEBCO only if a public-domain-class raster is required and 400 m cells are acceptable.

## Aboukir Island and Trekroner as features

| Feature | Point source (licence) | Polygon source (licence) | 1798/1801 state |
|---|---|---|---|
| Nelson's Island (Aboukir Island, Geziret Nelson) | Wikidata Q2397328: 31.3585N 30.1062E, area 0.0267 km2 (CC0). OSM way 251440402 centroid 31.3581N 30.1068E (ODbL) | GSHHG `f` polygon (LGPL; 6-8 vertices); OSM closed way, 100 nodes (ODbL). Absent from Natural Earth, minor islands and GSHHG `h` and coarser | French battery on the island, destroyed by the British landing party after the battle; the island is 4 km off Abu Qir (search summary of [Wikipedia](https://en.wikipedia.org/wiki/Nelson%27s_Island), not verified against a primary) |
| Aboukir fort (Abu Qir castle, "Tabyet al Burg") | OSM node 768567357: 31.3246N 30.0643E, `historic=fort` (ODbL); a second fort node "Tabyet al Taufiqiya" 31.3145N 30.0501E; Abu Qir town Wikidata Q139773. No Wikidata item for the fort was found by label search | Mainland; no separate polygon needed | The "castle of Aboukir" the French held and the Turks attacked in 1799 (Willyams' plates) |
| Trekroner | Wikidata Q1126084: 55.70306N 12.61444E, instance artificial island / fort (CC0). OSM way 305473012 centroid 55.7028N 12.6134E (ODbL) | EEA polygon, 7 vertices raw, survives 250 m simplification (CC BY 4.0); OSM closed way, 37 nodes (ODbL). Absent from Natural Earth and every GSHHG level | Present island, begun 1787, unfinished but armed with 60-66 guns; the only fixed work in the Danish line (sources above) |
| Middelgrundsfortet, Flakfortet | Wikidata Q1860409 (55.7203N 12.6658E), Q3073253 (55.7036N 12.7314E) | EEA and OSM polygons | Did not exist in 1801; remove from any modern polygon set |
| Saltholm | Natural Earth minor islands (public domain) upward | every dataset except GSHHG `l` | Existed; Saltholm battery is a later OSM `historic=fort` node (9091111024) |

Kongedybet on Wikidata (Q84086272) is a modern residential quarter on Amager, not the channel; do not use it.

Implication for ticket #51: a fort in these two battles is a point with a name (Trekroner, Aboukir castle, the Nelson's Island battery) whose ground is either an existing land polygon or an islet too small to matter at extent scale; a polygon kind is only needed if the renderer is to draw the artificial island's outline. Nelson's Island is an island in the ordinary sense (a `land` polygon from GSHHG `f`, EEA-class data or a trace) plus a `place` point, and needs no new kind unless "island" is wanted for labelling.

## Period plans usable as position anchors

Licence tags are from the Commons API (`LicenseShortName`) unless stated; pixel sizes likewise.

### Battle of the Nile, 1 August 1798

| Item | Host and scan | Size | Licence | What it anchors |
|---|---|---|---|---|
| John Brydon (publ.), Thomas Vivares (engr.), *Plan of the ever memorable Engagement of Abukir at the Mouth of the Nile*, 25 Dec 1798 | Royal Collection RCIN 735068; Commons `File:Aboukir and River Nile, 1798 RCIN 735068.jpg` | 2,250 x 1,808 | Public domain (Commons); RCT's own page returned 403 | "water soundings throughout the bay", compass rose north-up, key A-F, both fleets' positions with gun and crew rosters. The best single anchor: soundings plus ships. |
| Laurie & Whittle, *A Exact Representation of the English and French Fleets ... off the Mouth of the Nile*, 1798 | BnF GE D-28769 (RES), Gallica btv1b532161746; Commons file of that name | 5,751 x 7,190 | Public domain (Commons: PD-France, PD-US-expired); Gallica's non-commercial reuse terms apply to the scan as in the Cadiz note | Ship placements and the bay outline at the largest pixel count after Luffman. |
| John Luffman, *Plan of the commencement of the action ... in the Bay of Bokkier*, 1798 | National Library of Israel, Eran Laor collection; Commons `File:John Luffman, Plan of the commencement of the action between the British & French fleets in the Bay of Bokkier (FL33134497 2702785).jpg` | 10,135 x 7,672 | Public domain | Opening positions; the largest scan available. |
| Nicholas Pocock, *The Battle of the Nile ... chart of Aboukir Bay and of the action, with key*, 1798 | RMG PAH0143 (page header says PY0143); Commons `...RMG PY0143.tiff` | 3,800 x 2,947 | Public domain on Commons; RMG's own free downloads are CC BY-NC-ND at 1,280 px, "a maximum of 15 lower-resolution files can be used in any single project" ([RMG image licensing](https://www.rmg.co.uk/commercial/image-licensing)) | Annotated positions for two moments (L'Orient's explosion; 2 August dispositions) with a key of guns and crews ([RMG object](https://www.rmg.co.uk/collections/objects/rmgc-object-140090)). |
| Captain James Weir RM, *The French line as they appear'd at an Anchor on the 1st of August 1798*, 1798 | Commons `...M28767.jpg` (Swann Galleries) | 1,600 x 934 | Public domain | Eyewitness sketch of the anchored line; a shape check, not a chart. |
| Cooper Willyams, *A Voyage up the Mediterranean in His Majesty's Ship the Swiftsure*, 1802, with "Plan of the Battle of the Nile" | Internet Archive `in.ernet.dli.2015.24198` and `dli.bengal.10689.5735` (Digital Library of India scans; no licence field in the API record) | book scan | Public domain work; scan rights unstated | Eyewitness plan by the Swiftsure's chaplain; plates of "Aboukir Castle from the Island". |
| William James, *Naval History of Great Britain* (1826, 1837 editions) and Clarke & M'Arthur, *Life of Nelson* (1809) | Internet Archive `bub_gb_Am7WCEX4KekC` (1826, "CC Public Domain Mark 1.0"), `bub_gb_PSwOAAAAQAAJ` (1837, PD Mark); `dli.ministry.03766`, `lifeofadmirallor00claruoft` (1809/1810) | book scans | Public domain | Secondary plans; James's is the standard 19th-century diagram. Not inspected page by page. |
| A. T. Mahan, *Life of Nelson* (1897) | Project Gutenberg 16914 and 16915 | text with plans | Public domain | Already the project's Trafalgar text source; its Nile and Copenhagen diagrams are usable the same way. |
| Jacotin, *Carte topographique de l'Egypte* (Description de l'Egypte, surveyed 1799-1800, published 1818-1828) | Commons category `Carte de l'Egypte (Description de l'Egypte)` (NYPL scans); Heidelberg `jomard1828bd6` (blocked by an anti-bot page in this pass) | sheet scans | Public domain | The only triangulated survey of the coast near the battle date; the Alexandria/Aboukir sheet was not identified by number in this pass. The right base for a traced 1798 shoreline if one is wanted beyond the battle plans. |

Modern Commons diagrams (`Map Battle of the Nile 1798-*.svg`, "vectorized from Keegan") are tagged public domain by their uploaders but derive from a copyrighted book illustration; treat them as the Cadiz note treats `Trafalgar 1200hr.svg` and do not list them as sources.

### Battle of Copenhagen, 2 April 1801

| Item | Host and scan | Size | Licence | What it anchors |
|---|---|---|---|---|
| John Brydon (publ.), *Plan of the Battle of Copenhagen* (with insets), 20 May 1802 | RMG PY7985; Commons `File:Plan of the Battle of Copenhagen (with inset, View of the Danish Line prior to the Engagement; portrait of Nelson; View of Both the Fleets in Action.) RMG PY7985.tiff` | 6,004 x 4,680 | Public domain (Commons); RMG terms as above | "Nelson's squadron positioning along Middle Ground Shoal", the Danish line, Trekroner; the best single anchor. Brydon also issued a 21 Apr 1801 *Naval Engagement Plan and Disposition of the Danish Force* (Royal Collection RCIN 735095; RCT page returned 403; not on Commons). |
| Francis Gibson / Walker, *Battle of Copenhagen, April 2nd 1801*, 1801 | RMG F3841; Commons `File:Battle of Copenhagen, April 2nd 1801 RMG F3841.tiff` | 6,400 x 5,603 | Public domain | Engraved chart-view with named ships and casualty tables. |
| Fairburn, *Plan of Parker and Nelson's Victory before Copenhagen*, 1801 | British Museum 1853,0212.239; Commons file of that name | 1,907 x 2,500 | Public domain | Broadside plan with Parker's and Nelson's letters; coarse. |
| A. K. Johnston, *Battle of Copenhagen, 2 April 1801* (Alison's Atlas, 1848) | Internet Archive / David Rumsey list 13200044; Commons `...(IA dr battle-of-copenhagen-2-april-1801-ak-johnston-frgs-william-blackwoo-13200044).jpg` | 6,276 x 4,800 | Public domain on Commons; Rumsey's own terms are CC BY-NC-SA 3.0 (Cadiz note) | Same series as the Trafalgar 1848 plan already in use; hand-coloured fleet positions. |
| G. A. Lehmann, attack plan in Charnock's *Nelson's Leben* (1807) | Commons `File:PlanAngriffsCopenhagen960.jpg` | 960 x 535 | CC0 | Too small to trace; a sequence check. |
| Danish plans: G. L. Lahde's 1801 plan of Kiobenhavns Rhed; J. F. Clemens after Lorentzen, *Bataillen d. 2. April 1801 paa Kiobenhavns Rhed* (1801) | Royal Danish Library digital collections (search-result snippets; item pages not fetched); Clemens prints also on Commons as `File:JF Clemens, Slaget paa Reden d 2 april 1801, KKS10793a-d, KKS10794` (Statens Museum for Kunst) | not measured | KB: "no known copyright restrictions" marking on expired works, but site content is offered "under Creative Commons licens BY-NC-ND ... med klar kildeangivelse" (search snippets; the KB policy page fetched does not state a licence). SMK files on Commons are public domain | The Danish side's own view of the line and of Trekroner. The Clemens print is a view, not a plan. |
| Lovenorn's Danish Admiralty chart of Copenhagen Roads, c.1800 | Not found in this pass; Lovenorn appears only in a wreck-position note on vragwiki.dk | | | Would be the triangulated survey equivalent of Jacotin for Copenhagen; **not located**. |

Library of Congress: every loc.gov request (search and JSON API) returned HTTP 403 in this session, so no LoC holdings are listed; the Cadiz note's Rumsey and BnF routes cover the same plans.

## For the map-format and licensing decisions

| Class | Aboukir Bay | Copenhagen | What travels with the map file |
|---|---|---|---|
| Public domain | Natural Earth land (no island); GEBCO grid (with an "acknowledge" request); Wikidata points; the period plans as traced geometry | Natural Earth land (sinks the city centre); GEBCO; Wikidata points; traced plans | Nothing, or a courtesy credit |
| Attribution-only (CC BY 4.0 or equivalent) | EMODnet DTM 2024 | EEA coastline (only attribution-only vector with Trekroner); EMODnet DTM 2024; Danmarks Dybdemodel 50 m; GeoDanmark / Kort10 (SDFI terms: credit line plus a copy or link of the terms) | Credit line and licence link; Danish terms also want the terms text reachable |
| LGPL | GSHHG `f` (the only vector with Nelson's Island and the reef rocks short of OSM) | GSHHG `f`/`h` (no Trekroner) | As the Cadiz note |
| ODbL | OSM coastline and fort/island nodes | OSM coastline, Trekroner, and the later forts to be removed | Map file itself ODbL |
| Excluded or unresolved | Egyptian hydrographic charts (commercial); RMG and Gallica scan terms if the scans themselves were redistributed (they are not) | Danish ENC/paper charts (paid); KB and Rumsey scan terms likewise | |

Mixed-file rule from the Cadiz note holds: a GSHHG `f` mainland with a traced 1798 shoal is LGPL; an EEA polygon with a traced Middle Ground and Wikidata points is CC BY 4.0. If v2 lets a map carry a historical coastline alongside a modern one, the traced layer's licence is the project's own and the modern layer sets the file's class.

## Not verified in this pass

- Verbatim text of Geodatastyrelsen's marine-data terms for Danmarks Dybdemodel (PDF URL 404; only a search snippet) and whether Klimadatastyrelsen has since moved free data to CC BY 4.0 proper.
- EMODnet DTM 2024 survey coverage at Aboukir Bay versus GEBCO fill (not checked in the viewer).
- Dates of the Copenhagen reclamations (Refshaleoen, Nordhavn, Provestenen, Amager Strandpark) and of Flakfortet.
- Which Description de l'Egypte sheet covers Aboukir, and Heidelberg's scan terms (anti-bot page).
- Royal Collection Trust page text and licence (403), Library of Congress holdings (403), Royal Danish Library item pages and Lovenorn's chart.
- The GeoDanmark coastline was not downloaded or measured.

## Sources consulted

- Datasets: `naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip`, `ne_10m_minor_islands.zip`; `www.soest.hawaii.edu/pwessel/gshhg/gshhg-shp-2.3.7.zip`; `sdi.eea.europa.eu/datashare/s/gcJSme8gWebRHBa/download`; Overpass API `overpass-api.de/api/interpreter` (coastline and feature queries, 2026-09-06). Licence texts for these: see cadiz-coastline.md.
- https://www.gebco.net/data-products/gridded-bathymetry-data ; https://www.gebco.net/data-products/gridded-bathymetry/terms-of-use
- https://emodnet.ec.europa.eu/en/bathymetry ; https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products ; https://emodnet.ec.europa.eu/geonetwork/srv/api/records/cf51df64-56f9-4a99-b1aa-36b8d7b743a1
- https://dataforsyningen.dk/data/4817 (JS page) ; https://dataforsyningen.dk/asset/PDF/rettigheder_vilkaar/Vilk%C3%A5r%20for%20brug%20af%20frie%20geografiske%20data.pdf (fetched, text extracted) ; https://gst.dk/data-og-kort/koeb-af-data-og-kort/koeb-af-matrikeldata-og-kort/vilkaar-for-brug-af-frie-geografiske-data-fra-geodatastyrelsen ; https://gst.dk/Media/638029838975394110/VIlk%C3%A5r_50m-modellen_DA.pdf (404)
- https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-bathymetry/
- Wikidata API: Q2397328, Q1779743, Q1126084, Q1860409, Q3073253, Q84086272 ; https://da.wikipedia.org/wiki/Trekroner_(%C3%B8) ; https://da.wikipedia.org/wiki/Middelgrunden_(%C3%98resund) ; https://slks.dk/omraader/slotte-og-ejendomme/slotte-og-haver/soefortet-trekroner
- Commons: `Category:Battle of the Nile`, `Category:Maps of the Battle of the Nile` (API imageinfo for every file), `Category:Battle of Copenhagen (1801)`, `Category:Carte de l'Egypte (Description de l'Egypte)`, file pages and API records for the Brydon, Laurie & Whittle, Luffman, Pocock, Weir, Gibson, Fairburn, Johnston and Lehmann items
- https://www.rmg.co.uk/collections/objects/rmgc-object-140090 ; https://www.rmg.co.uk/commercial/image-licensing ; https://www.kb.dk/en/policies-and-strategies/policy-access-digital-collections ; Internet Archive advancedsearch API (Willyams; James; Clarke & M'Arthur) ; https://www.gutenberg.org/ebooks/search/?query=mahan+life+of+nelson
- Nile delta: abstracts at researchgate.net/publication/286110774, sciencedirect.com/science/article/abs/pii/S0169555X14004292, sciencedirect.com/science/article/abs/pii/0025322794900310
- Blocked: loc.gov (403), militarymaps.rct.uk (403), digi.ub.uni-heidelberg.de (anti-bot), datavejviser.dk and dataforsyningen.dk (JS-only)
