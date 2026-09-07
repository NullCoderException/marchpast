# A rampart is the seventh map feature, and Alesia needs nothing else of its own

Alesia is the first siege the project has taken on and the first battle fought nowhere near the sea, and the research note on it ([#122](https://github.com/NullCoderException/marchpast/issues/122)) closed with a list of ten things schema v2 cannot express. [#132](https://github.com/NullCoderException/marchpast/issues/132) went through that list and decided which of them the schema answers.

**One of them. The map file gains a seventh feature kind, `rampart`: a built line on the ground, `LineString` or `MultiLineString`, carrying `kind` and nothing else, drawn with its ditch and the teeth on the side it faces. Everything else Alesia needs — the six weeks of investment, the thirty-hour intervals, two Gallic armies under one ink, a unit shut inside the works, and a map with no sea on it — is authoring, caption, or a cost taken with open eyes.** One further item on the research's list does take a schema change, and a sibling ticket decided it the same day: [ADR-0024](0024-aircraft-are-an-arm-and-a-unit-may-be-absent-from-a-phase.md) made a unit **absent** from a phase, and says in its own words that "#132 inherits it and does not re-decide it". Alesia does exactly that, and this ADR records what it inherits rather than deciding it twice.

The addition is forced and the refusals are not grudging. `work` is a `Point` (ADR-0012) and the circumvallation and contravallation are 21 and 16 km of ditch, rampart and tower drawn round a hill: they are the entire subject of the battle and there is no way to put them on the plate. Nothing else on the list is like that. Each of the others has a way through that costs no field, and taking it keeps the format the size it is while the library goes from four battles to seven.

## Considered options

### Works as lines

- **Widen `work` to `Point | LineString | MultiLineString` and keep `name` required.** Buys a line-labelling pass in the renderer — text along a path, or a leader off a midpoint — which is the second label-placement problem ADR-0012 refused outright when it made `place` the one naming mechanism and left `river` and `shoal` nameless.
- **Widen `work`, with `name` required for a `Point` and forbidden for a line.** `validateMap.ts` says in its own header what a kind costs: "A seventh kind is one row in the first two [tables]; a property no kind carries yet is one more reader." Its `KIND_PROPERTIES` is a `Record<MapKind, PropertyName[]>`, keyed by kind alone. This option rekeys it by kind *and geometry*, so the cheapest-looking change is the one that breaks the table the validator is built out of.
- **A seventh kind, lines only, no name** (chosen). One row in `KIND_GEOMETRIES`, one row in `KIND_PROPERTIES`, no new property reader, no conditional rule, no new renderer label work. Exactly parallel to `river`: nameless, and named by a `place` on it when a caption needs to refer to it.

The picture agrees with the tables. A bastioned square with its name in small capitals and 21 km of ditch-and-teeth are two things a reader learns to read separately, not one thing in two geometries.

### What to call it

`land`, `river`, `shoal`, `contour`, `place`, `work`: six plain, drawable nouns of four to seven letters. **`entrenchment`** names bank and ditch together and covers a trench line, which is the honest general word, but it is twelve letters and clinical and an outlier in that list. **`lines`** is the historical English term — "the lines of circumvallation", "the lines of Torres Vedras" — but it is plural and it collides head-on with `formation: "line"` in the battle file.

**`rampart`** was chosen for the register. Its one weakness is that the teeth [#138](https://github.com/NullCoderException/marchpast/issues/138) drew are the *ditch*, so the word names the bank while the drawing draws the trench beside it; the glossary answers that rather than the name does, by saying a rampart is drawn **with** its ditch, because that is how a siege plan cuts one. The kind names the drawn line and not what it was made of, so a trench line, a stone wall, a palisade and a berm are all `rampart` and the caption says which.

### Which side the teeth fall on

The contravallation faces inward at the town and the circumvallation faces outward at the relief: two lines round the same hill, opposite teeth. #138 established that a line's winding can carry a fact the renderer reads, but its contour case *derives* uphill from a closed ring's signed area, and here there is nothing to derive from.

A research fact killed the obvious property. **Neither Alesia line is a closed ring.** The contravallation "cessait vers les escarpements" on the Flavigny plateau, where the cliffs made it pointless; the circumvallation's course between the Montagne de Bussy and Mont Réa "reste tout aussi incertain"; the valley stretches of the Oze and the Ozerain are "extrêmement mal connue". With no ring there is no inside, and `inward` / `outward` has nothing to mean.

- **A `faces` property of `"left"` / `"right"`.** A field whose only content is a restatement of the geometry the author already drew.
- **No distinction: teeth both sides everywhere**, as #138's staff-map idiom already draws them. Cheapest, and it throws away the one thing the teeth say.
- **The direction the line is drawn in is the convention** (chosen): teeth on the **right** of the direction of travel, so the author draws a rampart keeping the side it faces on their right. The hand is arbitrary and fixed once. This is how hash and hachure symbology has always worked — hanging off digitising direction — and it is a fact about a built thing rather than styling, the way a contour's `elevation` is a fact: a rampart has a front.

### The six weeks on the clock

Caesar sat down before Alesia something over a month before the relief army came, and no source counts the days.

- **Open the file on the investment.** `day` is an integer and rule 5 wants one `dates` string per day, so this asserts a count nobody has and invents about forty date strings for a battle whose *month* is disputed.
- **A phase may be a `cut`**, its position and heading stepping rather than tweening from the phase before. On a plate a step is a unit teleporting, which reads as a rendering fault rather than as elapsed time, and it would be the first amendment to the tween rule ADR-0002 fixed.
- **Open on the day the relief army arrives** (chosen), with the investment narrated in the first caption and the finished works drawn under it by the map file. Twelve phases over six days.

### A middle term between side and unit

Vercingetorix's army and the relief army share the Gallic ink and are told apart only by label and position; a viewer scanning the legend sees "Roman, Gallic" and not "a siege relieved". The shape recurs — the Little Bighorn's camp circles, Midway's carrier force against Yamamoto's main body — so a `group` between side and unit was weighed and rejected. **The middle term already exists and it is `parent`.** It applies exactly when the group is drawable as one body, which is why Midway will take it and Alesia cannot: "the Roman army" at Alesia is a ring 21 km round, and one glyph on Mont Auxois would be a lie about the one thing the battle is.

### Units that do not yet exist — inherited, not decided

Vercassivellaunus's sixty thousand is picked out of the relief army on day 3 (VII.83) and would need a snapshot in phases 1 to 6, stacked on the relief foot at Mussy-la-Fosse. ADR-0003 deferred "units appearing mid-battle" and #132 was ready to defer it again — stack the glyphs, offset them so three read, and caption it — on the grounds that a fifth state costs an ADR-0021 supersession for one battle's bookkeeping.

That was the wrong call and the sibling ticket had already made the right one. ADR-0024 found the sharper case in Midway: under ADR-0017 a carrier whose strike is airborne *drops off the plate*, so Hiryu vanishes at 10:58 and again at 13:31, exactly when she is the last carrier afloat. **Absence** is what that needs, it is not a fifth state (it is not a condition at all), and it costs no field. Alesia takes it.

Only one Alesia option is worth recording, because it is the one absence does not cover: **making the sixty thousand a `detachment` arrow from the relief foot**, the zero-schema answer. It fails on the facts — the sixty thousand is the unit that breaks, is destroyed, and whose commander is taken alive in the flight, and an arrow carries no state.

### The inland map

Alesia is the genuinely inland battle ADR-0012 had in mind when it withdrew ADR-0005's promised `ground` field. `drawMap.ts` still says it plainly: "A map with no land at all is all sea." A third collection-level foreign member is forbidden by ADR-0007's "exactly two" and by ADR-0012's own list, so the choice was between bringing `ground` back at that cost and **one covering `land` polygon of five vertices**, which is chosen and which is simply true: the whole extent is land.

## Consequences

- **A seventh feature kind, and one row in each of two tables.**

  | `properties.kind` | Geometry | Properties |
  |---|---|---|
  | `rampart` | `LineString`, `MultiLineString` | `kind` |

  No new property reader, no conditional rule, no change to any existing kind. Every map file already written stays valid, as does every battle file.

- **A rampart carries no name, and `place` stays the one naming mechanism.** A rampart a caption must name gets a `place` on it, exactly as the Aufidus and the Middle Ground do.

- **The teeth fall on the right of the direction the line is drawn in.** Winding is meaning for this kind and for no other. **The cost, recorded so it is not mistaken for an oversight:** schema.md 3.3 already lists ring winding among the things the validator does not check, and it stays unchecked, so a rampart drawn the wrong way round gets its teeth on the wrong side and only the plate will say so. This sits beside "nothing checks `sort_date` agrees with `dates[0]`" as a thing the format knows it cannot verify.

- **A closed ring is neither required nor expected, and `MultiLineString` earns its place here as it does on a contour.** Alesia's contravallation is genuinely three or four disjoint runs with the escarpments between them. Drawing a ring where the excavators say nobody knows would put a line into the data that the sources do not have.

- **Nothing marks a stretch of rampart as conjectural.** Napoleon III's planche 25 draws excavated trace and inferred trace as solid and dashed; the map draws one line, and the caption and `notes` say which stretches are dug and which are guessed. This is ADR-0012's rule about the Aufidus applied to a built thing, and it leans the same way: on the caption actually carrying the caveat.

- **`work` stays a `Point`, and the two kinds read against each other.** Alesia's camps, the Gallic camp under the east wall, and as many of the twenty-three castella as the plan places are `work` points; the two lines are ramparts. ADR-0012 is amended, not superseded — nothing it decided becomes false, and its own `road` clause anticipated exactly this: a kind "arrives additively when a battle needs one".

- **Alesia opens on the relief army's arrival.** Twelve phases over six days, day 0 the day Commius and the rest come up. The cavalry action of VII.70 and Vercingetorix's horse riding out before the lines closed are lost as pictures and become two paragraphs of caption. **v2 still cannot hold a gap of unknown length between two phases; Alesia declines to need one.**

- **No `cut`, and no change to the scrubber.** Phases 1, 4, 6 and 11 each hold 18 to 30 hours and are carried by a `playback_rate` of the order of 3,000 to 6,000 — thirty hours at 6,000 is eighteen seconds — and the scrubber's segments are already sized by playback duration, so the gap is collapsed by the rate the author chose. That is the mechanism working, not a hole in it, and the Little Bighorn research reached for the same lever independently for its night gap.

- **Alesia is the first battle where the honest track and the honest phase count pull apart.** Vercassivellaunus marched round by Grignon and Fain, west of the Brenne, and the tween draws him straight across the Roman lines. ADR-0018's remedy is an intermediate phase, and that phase would have almost nothing to caption, so Alesia accepts the straight track and says so in the caption of the phase it lands in.

- **Two firsts under ADR-0013, neither of them a change to it.** **Day 2 has no phase** — Caesar's "after the interval of a day" is one day of hurdle-making that phase 4's caption carries — so `dates[2]` is authored and never shown. Rule 5 forbids a `day` past the end and a *trailing* entry going unused; a hole in the middle it has always permitted, and no file has had one. And **`dates` carries no date**: no source dates the siege, so Alesia's six strings run "September 52 BC (the relief army's first day)" through "(sixth day)", with `sort_date` `{ -52, 9, 20 }` a sorting convention the `notes` disown. **No validator rule that every day has at least one phase**, because armies do spend days making hurdles and such a rule would forbid the honest file in order to force an invented picture.

- **Nine units on the roster, one level, no `levels`, two sides.** The legend says "Roman, Gallic", which is the truth: it was one people's war fought from two sides of a wall, and a third side would fix the legend by falsifying it. The cost is accepted and recorded. **The middle term is `parent`, and it applies where the group is drawable as one body** — which is why Midway takes it and Alesia cannot, and why the same question at the Little Bighorn's camp circles gets the same answer.

- **A unit inside the works needs nothing.** The drawn contravallation and the contours say that the besieged are shut in; the state stays `intact` while they are, because `intact` means not yet in action and that is what they are.

- **Vercassivellaunus's sixty thousand is absent from phases 1 to 6 and appears at phase 7**, hidden in the folds of ground north of Mont Réa before dawn on day 4 — one contiguous run of presence, which is all ADR-0024 allows and all Alesia wants. The relief foot and horse are not absent from anything: phase 1 *is* their arrival. This deletes the Mussy-la-Fosse stack outright, so the author no longer offsets three Gallic glyphs on one hill to make them read, and the roster is nine units of which phases 1 to 6 list eight. **One ticket, not two:** #131 owned the mechanism, #132 takes it as given, and two sessions superseding one ADR is the mistake #67 and #68 made.

- **The map file opens with one `land` polygon and `ground` never arrives.** ADR-0005's deferral stays withdrawn. One authoring rule falls out of `drawLand`, which shades its coastline inward: **the covering polygon must overhang the extent**, or the shading draws a hairline coastline round the inside of the frame and an inland plate grows a phantom shore. 3.3 already permits the overhang — "a map may extend beyond the extent and the renderer clips". The Oze, the Ozerain and the Brenne still read: two banks with the sea's material between them, which on an all-land map is the only sea on the plate.

- **The extent holds the siege at the fixed glyph size.** 47.50 to 47.58 N, 4.41 to 4.57 E: 8.9 by 12.0 km, landscape at 1.35:1. `GLYPH_PX` is 72, so on a plate about 1,000 px wide one glyph is roughly 870 m of ground; the four Roman sectors sit 1.7 to 5 km apart, two to six glyph lengths, and read clear. The one remaining overlap is phase 8's attacker on defender at the Réa foot, about 500 m apart, which is what an assault looks like and which Cannae already draws; the Mussy-la-Fosse stack that would have been the other goes with absence.

- **The drawing was decided before the schema was.** #138 drew a line work in three idioms and adopted them: engraved, a 1.3 px line with 4.5 px ditch teeth at 9 px, as a siege plan cuts it; atlas, one 2.6 px line with heavier teeth at 13 px; staff, a 2.2 px line with cross ticks both sides at 16 px, the operations-map obstacle. This ADR is the schema those drawings were waiting on, and under ADR-0021 the kind is **ground** — it is drawn in map space through the projection — so it goes in the `ground` module every view supplies its own hand for.

- **The code is handoff work, not part of this decision**, as ADR-0012 said of its own four kinds: `src/schema/types.ts`, `validateMap.ts` and their tests gain the row, and `drawMap.ts` gains the pass. The Alesia map file's contour interval, its river extraction from the SRTM tile and the georegistration of planche 25 are authoring, and they are the research note's open follow-ups, not this ADR's.
