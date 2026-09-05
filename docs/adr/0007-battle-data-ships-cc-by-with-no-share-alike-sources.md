# Battle data ships CC BY 4.0 and may not draw on share-alike sources; map files carry their own licence

The Trafalgar source survey found that two of the six planned sources are CC BY-SA, not public domain: the Wikipedia order of battle (CC BY-SA 4.0) and the usual Commons position diagram `Trafalgar 1200hr.svg` (CC BY-SA 3.0, with a copyrighted magazine illustration in its ancestry). The concept doc promised "public-domain sources" and the sources table from ADR-0006 reserved a licence field without saying what it holds. We chose to keep battle files free of share-alike inputs and ship them **CC BY 4.0**, to let **map files carry any licence per file** because they are independent databases, and to make the licence rule a **validator check** rather than a note.

## Considered options

- **Accept CC BY-SA inputs and ship battle files CC BY-SA.** Cheapest authoring; rejected because share-alike would attach to every downstream remix of a battle file, which cuts against battle files being reusable data.
- **Ship battle files CC0.** Rejected as slightly too generous: authored positions and captions are real editorial work and a credit line is cheap to require.
- **Same rule for map files as for battle files (no share-alike).** Rejected because it would rule out the best coastline datasets (OpenStreetMap under ODbL, GSHHG under LGPL) for no gain: under ODbL a battle file plus a map file is a collective database, so share-alike stops at the map file's boundary.
- **Licence recorded only in a repo-level file, data files silent.** Rejected because files get copied out of the repo and must be self-describing.
- **CC BY 4.0 battle files, no share-alike sources, per-file map licences, validator-enforced** (chosen).

## Consequences

- **Code is MIT**, in a root `LICENSE`. **Battle files under `data/battles/` are CC BY 4.0.** Research notes on `research/*` branches are CC BY 4.0 too. `data/LICENSE` says so for humans; the files say so for machines.
- **Every battle file and every map file carries a top-level `license` field** holding an SPDX identifier (`CC-BY-4.0`, `ODbL-1.0`, `CC0-1.0`) or the literal `public-domain`, because SPDX has no generic public-domain identifier. In a map file it is a foreign member on the FeatureCollection, alongside `attribution`; the strict validator from ADR-0005 allows exactly these two.
- **`attribution` is a free-text credit line, required when the file's licence class demands attribution** (CC BY, CC BY-SA, ODbL, OGL) and optional otherwise, validator-enforced. Its wording is authoring, not schema.
- **Each source entry's `license` field holds the same vocabulary**, plus an optional `license_note` for the evidence (a Commons template string, a Gutenberg header, the reason a transcription is treated as public domain). Unknown identifiers are a validation error; the allowlist lives in code as a table mapping identifier to class.
- **Licence classes rank `public-domain` < attribution-only < share-alike, and no source may rank above its file.** A share-alike source in a CC BY battle file is a validation error, with no "consulted only" waiver: a work consulted for uncopyrightable facts alone is not a source and belongs in the research note. A future CC BY-SA battle file may cite CC BY-SA sources, and then the entry's `label`, `work`, `url` and `license` are the attribution.
- **Transcription layers over public-domain text are not sources.** Collingwood's dispatch is the 1805 Gazette issue, `public-domain`, with Wikisource's transcription recorded as the entry's `url`; Gutenberg's Southey and Mahan are likewise `public-domain`. Open Government Licence attribution is owed only if the Gazette's scans are redistributed, which they are not.
- **For Trafalgar this means:** ship counts come from Collingwood's dispatch and the fleet lists in Nicolas; positions are authored from the primary texts and the public-domain 1805 and 1848 plans; the Wikipedia order of battle and `Trafalgar 1200hr.svg` are not listed as sources and nothing in the file is copied from them.
- **The map file's `attribution` is furniture**: the renderer always draws it as a small credit line in the frame, because ODbL and CC BY oblige a visible credit wherever the produced work is displayed. Whether and how the player shows the battle file's attribution and sources table on demand is a player-controls decision.
- **Map files carry no provenance beyond `license` and `attribution`.** Dataset version, clip box and simplification tolerance are reproducibility notes for the research note and the commit that adds the file. Provenance fields would be additive.
- **No image assets ship in v1.** Diagrams appear only as sources-table entries with a `url`, audited but not redistributed.
- **Field spelling is `license`** in data, matching SPDX and JSON convention; prose and ADRs keep "licence".
