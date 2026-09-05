# Extraction test: findings (run 2)

*Wayfinder ticket #11. Written 2026-09-05. This is the second of two independent runs made the same afternoon by two parallel sessions; the first lives on `prototype/extraction-test`. Where this note says "both runs" it compares `run1.output.txt` here with that session's `trafalgar.draft.json` (copied as `other-session.draft.json`). The two prompts differ in wording and the draft types differ in small ways, so agreement between them is a stronger signal than either alone.*

## Proposed answer

**Yes, a model can fill schema v1 from a source text, well enough that the pipeline idea has legs.** Given Nelson's memorandum, Mahan's chapter XXIII and the draft types, one turn produced a battle file that parsed, passed every shape check, cited every phase with verbatim quotes, and reasoned about disputed readings in the `notes` field exactly as ADR-0006 intended. Nothing was hallucinated in the sense of invented facts: every value not read from the text was flagged as an estimate, in the file itself.

The weak field is **position**. Neither run could know where the battle was; both dead-reckoned the whole geometry from one Mahan sentence and landed the fight 8 to 17 nautical miles west of the accepted site. Positions from an extraction run must be treated as constructed and hand-corrected, or the prompt must supply an anchor.

**No field needs restructuring.** Two definitions need tighter wording, because the two runs read them differently (see "Where the runs disagree").

## The run

| | This run (run 2) | Other session (run 1) |
|---|---|---|
| Model | claude-opus-5 (CLI default, no tools) | claude-opus-5 [1m] |
| Wall time | 820 s | 468 s |
| Output tokens | 39,991 (28,349 thinking) | 38,738 (26,674 thinking) |
| Cost | $1.52 | $1.32 |
| Phases | 8 | 7 |
| Shape problems against the draft types | 0 | 0 against its own types |
| Quotes verbatim | 28/30 (the 2 misses differ only by a stripped footnote marker) | 27/27 |

Full check output: `run1.check.txt`.

## Field by field

| Field | Reliability | What happened |
|---|---|---|
| Shape (all required fields, `t` strictly increasing, every unit in every phase, references resolve) | **Reliable** | Zero problems in both runs. The schema is fillable as specified. |
| `t` | **Reliable** | Every time traceable to a Mahan clock time; all within the spread the research note records. Both runs put dawn at 06:00 because Mahan gives no daybreak time (research: 05:40 from Wikipedia). Phase boundaries differ between runs (mine adds an 11:00 "through the van" phase and ends at 17:30; the other ends at 16:45 with `end` 17:30). |
| `heading` | **Reliable where stated, flagged where not** | 045 at dawn, 090 after the bear-up, 180 then 000 for the allies, in both runs. Small unsourced tweaks (085, 080 for the weather column edging north) are flagged as guesses in both. Mid-wear heading is the one real problem: see below. |
| `state` | **Mostly reliable** | Lee column `engaged` at 12:10 while the weather column holds `intact` until 13:00-13:10, in both runs, matching the research. Allies `broken` at 14:30 in both (research: 15:00). One divergence at the end of the battle, see below. |
| `strength` | **Reliable arithmetic, ambiguous rule** | Identical in both runs: 0.61/0.6 at 14:30 (13 of 33 from Hardy's "twelve or fourteen") and 0.45 at the end (18 struck, 15 left). The research note had 0.33 (11 with Gravina), counting Dumanoir's 4 escapees as gone. Which is right depends on a rule the ADR does not state, see below. |
| `position` | **Constructed, not read; consistently too far west** | Both runs anchored on Mahan's "Cadiz, then twenty miles to the northward and eastward" and worked outward. Mine read the bearing as 020 and put the allied centre at 36.22N 6.43W (about 19 nm from the Cape at bearing 280); the other read it as 045 and got 36.30N 6.59W (27 nm at 285). The accepted site is about 36.25N 6.20W, 10 nm WNW of the Cape. Internal geometry is faithful: one mile between the columns, 6 then 3 then 1.5 miles to run, five miles horn to horn. Both runs also flagged that Mahan's distances are flagship distances while `position` is the unit's centre, and placed each centre a mile or so astern of its leader. |
| `wind` | **Reliable** | 292 / 292.5 (WNW) in every phase of both runs, from Mahan's text; mine filled the draft `strength: "light"`. Held constant all day, which matches the research. |
| `formation` | **Reliable** | `column`, `line`, `crescent` in both runs at the same phases; both dropped the label once the sources describe a melee (mine used `melee` for one phase, the other omitted). |
| `moves` | **Reliable in kind, invented in head** | Both runs used `intent` for the allies toward Cadiz and for each British column's cut point, and `detachment` for the van standing south and the four escapees to seaward, which is exactly the usage the map planned. Arrowheads are estimates, necessarily. Mine also gave the weather column a `detachment` arrow for Africa at dawn. |
| `caption` | **Reliable** | Quote-woven, one to three sentences, every fact I spot-checked (Cape Trafalgar "just visible", Gravina leading then rearmost, Achille burning, eleven sail into Cadiz, Africa separated) is in Mahan. |
| `references` and `quote` | **Reliable** | 30 and 27 references, locators as paragraph openings or footnote numbers (findable), quotes verbatim. |
| `notes` | **Did exactly its job** | Both runs put every estimate, disagreement and rule interpretation here (or in an out-of-band notes section in the other prompt). Long, but that is what the field is for. |
| `playback_rate` | Invented, correctly | No source bears on it; both runs picked slow rates for the fighting and fast for the approach. This is the author's dial and the model treated it as such. |
| `extent`, `end`, `scale_unit` | Sensible | Both widened the extent to hold Cadiz so the intent arrows land in frame, and both noted the fighting then occupies a small part of the box. Both read Mahan's "miles" as nautical and flagged it. |
| `license`, `attribution` | Not tested | ADR-0007 closed after both prompts were built. The prompt's draft types had `licence?` on sources only; both runs left it out as instructed. |

## Where the runs disagree, and what it says about the schema

1. **State of a victorious unit after firing stops.** My run set both British columns to `intact` at 17:30, reasoning from the glossary text "intact (not in action)": they had stopped fighting. The other run kept `engaged`, which is what ADR-0003 intends ("the British columns never leave `engaged`"). The definition is ambiguous between *not yet* in action and *no longer* in action. Fix: word `intact` as "not yet in action" (or "has not fought") in `CONTEXT.md` and the type's doc comment.
2. **Does a detachment count toward `strength`?** My run gave the weather column 0.92 all day because Africa "had separated" and fought alone, and drew her as a `detachment`; the other run left her out and kept 1. At the other end, both runs kept Dumanoir's four escapees inside the Combined Fleet's strength (15/33 = 0.45) while also drawing them as a `detachment`; the research note excluded them (11/33 = 0.33). ADR-0003 says "an escaping detachment is a move arrow" but not whether it still counts. Either rule works; the definition must pick one. Excluding detachments makes Africa 0.92 and the allies 0.33, which is what the research note assumed.
3. **Heading in mid-manoeuvre.** During the allied wear (07:00 to 10:00) my run authored 350 as "an average of ships already round and ships still coming about"; the other run authored 150 as "how far a fleet wearing has got in its first minutes". Both flagged it. ADR-0002 already answers this (add an intermediate phase, because heading tweens shortest-arc), and an extraction prompt should say so explicitly: "when a unit turns through more than 90 degrees between phases, add a phase".

## What both runs said the schema could not hold

Both models listed the same things, unprompted: ship counts and composition, commanders and the change of command at 14:05, the physical length of a five-mile line, wind speed and swell, the prize count. The map has already ruled on all of these (no length fields and formation as a label in ADR-0001; no per-unit text or counters in ADR-0003; wind strength is open in ticket #14). These are confirmations that the schema deliberately omits detail, not gaps: in every case the model put the fact into the caption, which is where the ADRs send it.

## What this means for the pipeline (v0.3, out of scope here, recorded for later)

- A pipeline prompt should supply what a human author would already know: the map file's places, the accepted site of the battle as an anchor, the licence fields, and the "add a phase for a turn" rule.
- Budget for hand correction: every position (shift the whole field, then re-fit), phase boundaries (merge or split), and the strength denominator rule.
- Positions might be better extracted as bearing and distance from a named place and converted afterwards, since that is the form the sources use. That is a pipeline design question, not a schema v1 question.
- Cost of a run at this size is about $1.50 and 8 to 14 minutes of wall time.
