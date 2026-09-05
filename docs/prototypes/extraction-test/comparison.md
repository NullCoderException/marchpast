# Extraction test: can a model fill schema v1 from the sources?

*Prototype for GitHub issue #11 (part of the wayfinder map, #1). Run 2026-09-05. Throwaway: this branch is never merged; the decision it informs is recorded on the ticket.*

The prototype skill's two shapes (a logic demo or UI variants) do not fit this question, so the artifact is the experiment itself: the prompt, the isolated model run, its raw output, and this comparison against the researched phase list.

## What was run

| Item | Value |
|---|---|
| Inputs | Nelson's memorandum (Mahan vol. II ch. XXII reprint, sidenotes stripped) and Mahan vol. II ch. XXIII, both cut from Project Gutenberg #16915 (`inputs/`) |
| Schema given to the model | `schema-v1-draft.ts`, derived from ADR-0001 to ADR-0006; undecided fields marked DRAFT (`wind`, `units[]` declarations, `side`, `license`) |
| Prompt | `prompt.md` (placeholders substituted with the three files above; 82,789 characters) |
| Model | `claude-opus-5[1m]` via `claude -p` with all tools disabled, no session, run from a directory outside the repo so it could not read the phase-list research |
| Cost and time | US$1.32, 7 min 48 s, 38,738 output tokens of which 26,674 thinking (`run-metadata.json`) |
| Output | `raw-output.md` (verbatim); the JSON block re-serialised as `trafalgar.draft.json` |

Ground truth for the comparison is the phase-list research on the `research/trafalgar-phases` branch (`docs/research/trafalgar-phases.md`) and the worked strength table on the casualties ticket (#4). The model saw neither. It also did not see Collingwood's dispatch, Southey, or Wikipedia; only the two texts the ticket named.

## Mechanical checks

Scripted against the output, not eyeballed.

| Check | Result |
|---|---|
| JSON parses, exactly one block | yes |
| Fields outside the types (battle, phase, unit, move, reference, source, wind) | none |
| `t` strictly increasing | yes, 7 phases |
| Every phase lists all three units exactly once | yes |
| Heading in 0 to 360, strength in 0 to 1 | yes |
| At least one reference per phase, every `source` key present in the table | yes (3 to 5 per phase) |
| Quotes verbatim against the supplied text (whitespace and curly quotes normalised) | **27 of 27** |
| Sources table exactly as instructed | yes |

The model held to the types absolutely. Where it wanted a field that did not exist it wrote a paragraph under "Extraction notes" instead of inventing one, which is exactly what the prompt asked.

## Phase list against the research

| Model phase | `t` | Research phase | `t` | Match |
|---|---|---|---|---|
| daybreak | 06:00 | dawn-sighting | 05:40 to 06:00 | same event; the model's note explains the 06:00 choice from Blackwood's summons |
| bear-up-and-wear | 07:00 | bear-up-and-wear | 06:40 | same event; the model pinned it to the allied wear (Nelson's journal, 07:00) rather than the British bear-up signal (06:50) |
| crescent-and-approach | 10:00 | slow-approach | 10:00 | identical |
| lee-line-breaks-through | 12:10 | lee-column-breaks | 12:00 | identical event; 12:10 is Mahan's time for Royal Sovereign through the line |
| victory-cuts-the-line | 13:00 | weather-column-breaks | 12:30 | same event; research starts the phase at Victory coming under fire, the model at the rake |
| melee-and-van | 14:30 | melee | 13:30 | same content; the model's instant is an hour later because it pinned to Bucentaure striking (14:05) and the van going about (14:30) |
| retreat-on-cadiz | 16:45 | van-counterattack-and-retreat + last-shots | 15:00, 16:45 | **merged**: the 15:00 van pass to windward has no phase of its own and is narrated in the 16:45 caption |
| `end` | 17:30 | last-shots end | 17:30 | identical |

Seven phases against the research's eight, and the research itself said phases 7 and 8 could merge. Every instant is a time Mahan states, and every one falls inside the spread the research recorded between sources. The one real segmentation fault is the last phase: its caption tells events from 15:00 to 17:30 while its picture is pinned at 16:45, so the van's pass to windward, one of the two things the Combined Fleet visibly does after the melee, would play as caption text over a static picture.

## Field by field

### Positions: internally consistent, absolutely wrong

Every position is constructed, and the model said so first. It anchored the whole field on one sentence, Mahan's "Cadiz, then twenty miles to the northward and eastward" of the allies, read the bearing as exactly northeast, and built outward. That put the Combined Fleet's centre at 07:00 at 36.30 N, 6.59 W, which the model itself computed as 27 nautical miles WNW of Cape Trafalgar.

The research, using Collingwood's dawn fix ("Cape Trafalgar bore E. by S. about Seven Leagues") and the standard battle location, puts the allies about 12 nautical miles off the Cape and the collision point at 36.25 N, 6.20 W.

| Point | Model | Research | Offset |
|---|---|---|---|
| Combined Fleet centre at the break, ~13:00 | 36.32 N, 6.56 W | 36.25 N, 6.20 W | about 17 nmi west, 4 nmi north |
| British at dawn | 36.31 N, 6.82 W | about 36.30 N, 6.44 W (21 nmi from the Cape at 290 degrees) | about 18 nmi west |
| Fleets' separation at dawn | 11 nmi | 6 to 12 nmi depending on source | inside the spread |

So the whole battle is translated roughly 18 nautical miles west-north-west, but the relative geometry (separation, closing rate at 1.5 to 2 knots, the two columns a mile apart, the allied line drifting toward Cadiz) is sound. The error is one bearing read as 045 where the truth is nearer 020, and the model rated exactly that reading "low confidence" and warned that swinging it "moves the whole battle several miles". It underestimated by how much.

Two things follow. First, absolute registration needs a source that gives a bearing and distance to a named place, and Mahan does not; Collingwood's dispatch does. The pipeline test was run on the ticket's two named texts, so the fix is an input problem, not a model problem. Second, the model's method (pick an anchor, work outward in bearings and distances) is the right one and is deterministic once the anchor is fixed, which argues for the pipeline asking the model for relative fixes and converting them itself. That is a v0.3 pipeline question, not a schema one: ADR-0001 keeps positions absolute in the file.

A smaller but real point the model raised: Mahan's distances are all flagship distances, and the schema's position is a unit centre. The model placed each column's centre a mile astern of its leader and could not then satisfy Mahan's "two miles between Victory and Royal Sovereign" at 12:10 (it got 2.6). Sources describe leaders; the file describes centres. A human author does this conversion by feel; an extraction pipeline has to be told the rule.

### Times: reliable

All seven instants and the end time are Mahan's, and match the research's Mahan spine to the minute where the events coincide. The disputed times (daybreak, the wound at 13:25 or 13:30, the end of firing at 16:30 or 17:30) went into `notes` rather than into `t`, which is the ADR-0006 division of labour. Nothing was invented.

### Headings: reliable where stated, honest where not

Northeast at dawn, east after the bear-up, north for the allies from 10:00: all high confidence and all match the research. The mid-wear heading of 150 at 07:00 is the interesting one. The model reasoned that a wear takes the stern through the wind, so from south the fleet turns through east to north, and chose 150 so that the shortest-arc tween of ADR-0002 (150 down through 090 to 000) draws the turn the right way round. That is correct seamanship and correct use of the tweening rule, and it does what the research suggested ("give it a transitional heading"). The 075 and 080 for the weather column's edge north are the model's numbers for Mahan's "a little to the northward" and are labelled low confidence; the research has ENE (065). Fine either way.

### State: reliable

| Phase | Weather | Lee | Combined |
|---|---|---|---|
| model, 12:10 | intact | engaged | engaged |
| table (#4), 12:00 | engaged | engaged | engaged |

Everything else matches the worked table exactly. The one difference is the model keeping the weather column `intact` at 12:10 because Victory "did not come under fire till 12.30", which is a defensible reading of the enum's own definition (not in action). The model never used `destroyed`, reasoning that eleven of the line reaching Cadiz means the fleet still existed, which matches ADR-0003's ruling (the unit goes `broken`, not `destroyed`).

### Strength: right method, one wrong denominator

| Phase | Model | Table (#4) |
|---|---|---|
| melee | 0.6 at 14:30 | 0.6 at 13:30 |
| retreat | 0.45 at 16:45 | 0.45 at 15:00, **0.33** at 16:45 |

The model derived 0.6 from Hardy's "twelve or fourteen" over 33, which is the table's method. Its final 0.45 counts 18 prizes out and keeps Dumanoir's four escaping ships in the fleet (15 of 33). ADR-0003 says an escaping detachment has left the unit, so the table has 11 of 33. The model did not know that rule (the schema comment says only "still fighting as part of the unit") and flagged the figure low-medium confidence. A one-line doc comment on `strength` fixes this. British strength held at 1 throughout, with the model noting this "makes the British look untouched" and citing the field's own damage rule; that is the ADR's intent.

### Moves: kinds used correctly, one arguable arrow

The model produced exactly the arrows the map's authoring note anticipated: an `intent` arrow from each British column to its cut point during the approach, and a `detachment` arrow from the Combined Fleet south-west for Dumanoir's escaping van. It added `intent` arrows from the allies toward Cadiz at 07:00 and 10:00 (Villeneuve wearing to keep Cadiz under his lee; defensible) and a `detachment` arrow north at 13:00 for the unengaged van (arguable: the van was standing on, not detaching). Arrowheads are invented positions, as they must be. The `kind` enum was never misused and no arrow describes a unit's own motion, so the ADR-0004 rule held without being stated in the prompt beyond the doc comments.

### Wind: constant, correct, and the model wants strength

`from: 292.5` (WNW) in every phase, from two explicit Mahan statements, matching the research. The "from" convention caused no confusion. Under "what the types could not hold" the model listed wind speed ("a one and a half knot breeze", footnote 140) and the heavy westerly swell, arguing they "drove the whole shape of the day". This is direct evidence for the open wind ticket (#14): Mahan supplies a speed, so a strength field would not go unfilled at Trafalgar.

### Formation: used as a label, dropped when the sources describe none

`line` then `crescent` for the allies, `column` for the British, `cluster` from the Belleisle eyewitness at the end, and deliberately omitted for all three units at 14:30 because "the sources describe a melee, not an order". Free-string formation worked; the model did not want an enum.

### Captions and notes: accurate, and long

Captions are 80 to 120 words each, faithful paraphrases of Mahan with no invention detected against the research. They are long for a caption bar; whether that is a prompt instruction or a renderer decision is for the static-frame prototype. `notes` was used exactly as ADR-0006 intends: the daybreak time choice, the wound-time discrepancy, the end-of-firing choice, and how the strength figures were derived.

### References: the strongest result

Three to five per phase, 27 of 27 quotes verbatim, locators of the form "ch. XXIII, 'phrase'; near footnote N" that a human can find in seconds. The model also caught that Mahan's chapter XXIII misquotes the memorandum ("ahead" for "a-head", capitalisation, a comma) and quoted the memorandum's own wording under the `memorandum` key. That is precisely the traceability the references exist for.

### Playback rate and extent: necessarily invented

No source bears on `playback_rate`; the model chose rates giving about 85 seconds of playback, slowest through the fighting, and said so. The extent was drawn to include Cadiz so the Cadiz arrows land inside the frame, and the model noted the fighting then occupies a small part of the box. Both are authoring choices the pipeline should leave to a human or a default.

## What the model said the types could not hold

Checked against the decisions already made.

| Model's request | Existing decision | Reading |
|---|---|---|
| Ship counts and composition (33 vs 27, three-deckers, Santísima Trinidad) | ADR-0003 rules counts to captions | No change; the `label` can carry "12 ships" if wanted |
| Commander per unit, and the command passing from Villeneuve to Gravina at 14:05 | none | Cheapest possible addition (`UnitDeclaration.commander`), but the command change is a per-phase fact and caption matter; not forced |
| Unit extent: a length or polyline, since the allied line was five miles long | ADR-0001: centre point plus formation label, shape is styling | No change; this is the leader-versus-centre problem above, a pipeline rule rather than a field |
| Wind speed and swell | open ticket #14 | Evidence for carrying strength; see Wind above |
| The *Africa*, one ship fighting alone | three-unit granularity | Correctly left out |
| Prizes as a rising count | ADR-0003: no scoreboard | No change |

Nothing here forces a restructuring before v1 locks. The one field whose doc comment demonstrably needs a sentence is `strength` (detached ships have left the unit).

## Proposed reading for the ticket

- **Reliable from the sources**: phase segmentation, `t`, `end`, headings where the text states a course, `state`, `strength` by the right method, `formation` labels, wind direction, `caption`, `notes`, `references` with verbatim quotes and findable locators, move kinds.
- **Constructed and must be checked by a human**: every `position` (right shape, wrong place by about 18 nautical miles, from one bearing read as northeast), the numeric value of any heading the text gives only in words, move arrowheads, `extent`, `playback_rate`.
- **Restructuring needed before v1**: none. Two doc-comment fixes (strength excludes detached ships; a unit's position is its centre, not its flagship) and one prompt rule (give the model a bearing-and-distance fix to a named place, or ask it for relative fixes and convert deterministically).
- **The pipeline idea has legs** on a two-text input at three-unit granularity, at about US$1.30 a run. The weak link is geo-registration, which the second primary source (Collingwood) fixes and which the ticket's two named inputs could not.

## Questions for the human

1. Does an 18-nautical-mile registration error, confessed and traceable to one bearing, count as "hallucinated positions" for the purposes of the decision, or as the expected cost of leaving Collingwood out of the inputs?
2. Should `UnitDeclaration` get a `commander` field, or is "Weather column (Nelson)" in the label enough for v1?
3. Does the model's evidence that Mahan gives a wind speed change the wind ticket's default of direction only?
4. Are 80 to 120 word captions acceptable input for the static-frame prototype, or should the schema (or the prompt) bound caption length?
