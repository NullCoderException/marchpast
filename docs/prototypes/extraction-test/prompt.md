# Extraction test prompt

You are drafting a data file for a web app that plays back historical battles as animated 2D map sequences. The app knows nothing about any particular battle; everything comes from a JSON battle file whose shape is fixed by the TypeScript types below.

## Task

Produce a draft `trafalgar.json` for the Battle of Trafalgar (21 October 1805) at **three-unit granularity**: exactly three units for the whole battle, Nelson's weather column, Collingwood's lee column, and the Combined Franco-Spanish Fleet. Use **between five and eight phases**, from the fleets sighting each other at dawn to the end of firing.

Work **only** from the two source texts supplied below (Nelson's memorandum of 9 October 1805 and chapter XXIII of Mahan's *Life of Nelson*, 1897). Do not use anything you know about the battle from elsewhere. Where the sources do not say, either leave an optional field out or make your best inference and list it under "Extraction notes" so a human can check it.

## Fixed facts you may rely on

These would come from the app's map file, not from the sources:

- Cape Trafalgar: lat 36.183, lon -6.033
- Cadiz (city): lat 36.533, lon -6.300
- Coordinates are WGS84 decimal degrees; west longitudes are negative.
- One nautical mile of latitude is 1/60 of a degree; at this latitude one nautical mile of longitude is about 1/48 of a degree.

## Rules

- Follow the types exactly. No extra fields; if you feel a field is missing, say so in the notes instead of inventing one.
- Every phase must list all three units.
- `t` is battle-clock time of day, `"HH:MM"`, strictly increasing across phases.
- `quote` fields must be **verbatim** from the supplied text. Do not paraphrase inside a quote.
- The `sources` table must contain exactly two entries, keyed `memorandum` and `mahan`, with these values:
  - `memorandum`: label "Nelson's memorandum", work "Nelson, Memorandum (Secret), Victory off Cadiz, 9 October 1805, as reprinted in Mahan, The Life of Nelson, vol. II, ch. XXII (1897)"
  - `mahan`: label "Mahan", work "A. T. Mahan, The Life of Nelson, vol. II, ch. XXIII (London: Sampson Low, 1897)"
  Leave `url` and `license` out.
- Use `locator` values a human can find: for Mahan, a short phrase near the passage plus the footnote number if one is nearby; for the memorandum, "para. N" counting from "Thinking it almost impossible" as paragraph 1.

## Output format

Respond with exactly two sections:

1. A heading `## trafalgar.json` followed by one fenced ```json block containing the whole battle file and nothing else.
2. A heading `## Extraction notes` followed by a bulleted list. One bullet per field or value you inferred rather than read, saying which phase and unit it belongs to and how confident you are. Also list any place the types stopped you from recording something the sources clearly state.

## Types

```ts
{{SCHEMA}}
```

## Source 1: Nelson's memorandum, 9 October 1805

```
{{MEMORANDUM}}
```

## Source 2: Mahan, The Life of Nelson (1897), vol. II, chapter XXIII

```
{{MAHAN}}
```
