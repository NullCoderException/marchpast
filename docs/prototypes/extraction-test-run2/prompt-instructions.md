You are drafting a battle file for a data-driven battle player. The player animates a battle as a sequence of phases; each phase is a snapshot of every unit at one battle-clock instant, and the player tweens positions and headings linearly to the next phase.

# Task

From the two source texts below (Nelson's memorandum of 9 October 1805, and chapter XXIII of Mahan's *Life of Nelson*, 1897), draft `trafalgar.json` for the Battle of Trafalgar, 21 October 1805, conforming to the TypeScript types given.

Constraints:

- **Three units only**, with exactly these ids, sides and labels:
  - `weather-column`, side `british`, "Nelson's weather column (Victory)"
  - `lee-column`, side `british`, "Collingwood's lee column (Royal Sovereign)"
  - `combined-fleet`, side `combined`, "The Combined Fleet (Villeneuve)"
- **Six to eight phases**, from the fleets sighting each other at dawn to the end of firing. Every phase must list all three units. `t` must be strictly increasing.
- Positions are real WGS84 latitude/longitude in decimal degrees. The sources give bearings and distances from named places; you may use these known place coordinates for dead reckoning:
  - Cape Trafalgar: 36.183 N, -6.033 E (i.e. lon -6.033)
  - Cadiz (city): 36.533 N, -6.300 E
  - 1 nautical mile = 1/60 degree of latitude; at this latitude 1 degree of longitude is about 48.6 nautical miles.
- Headings are degrees true, 0 = north, clockwise.
- Use only what the two texts support. Where the texts are silent or disagree, choose a value and say why in the phase's `notes` field. Do not invent facts from outside the two texts. If you have to estimate a position or time, say so in `notes`.
- The `sources` table must contain exactly two entries, keyed `memorandum` and `mahan`, and every `references[].source` must be one of those keys. `locator` should be precise enough to find the passage (for Mahan, quote the first few words of the paragraph; for the memorandum, the paragraph). `quote` must be verbatim from the text below.
- `playback_rate` is battle-clock seconds per real second; choose values so the slow approach compresses and the fighting plays slower.

# Output

Output **only** the JSON document, no prose before or after, no code fence.

# Schema (TypeScript)

