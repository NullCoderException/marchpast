# Trafalgar phase list at three-unit granularity

*Research note for GitHub issue #9 (part of the wayfinder map, #1). Written 2026-09-05.*

## Question

What is a candidate phase list for the Battle of Trafalgar (21 October 1805) at
**three-unit granularity** — Nelson's weather column, Collingwood's lee column,
and the Combined Fleet's line — covering dawn sighting to the end of the action,
with times, positions, headings, wind, unit states, and caption-ready source
quotes?

## Short answer

Eight candidate phases, all on the "battle clock" (ship's time, roughly local
apparent time; individual logs disagree by 30–60 minutes):

| # | id | Label | Start | End | Weather column | Lee column | Combined Fleet |
|---|----|-------|-------|-----|----------------|------------|----------------|
| 1 | `dawn-sighting` | Dawn: fleets sight each other | ~05:40–06:00 | 06:40 | intact, heading NE, to windward | intact, heading NE, to leeward/east | intact, single line heading S |
| 2 | `bear-up-and-wear` | British bear up; Combined Fleet wears | 06:40 | ~10:00 | intact, turning E/ENE | intact, turning E | intact, wearing together, now heading N |
| 3 | `slow-approach` | The slow approach; the crescent forms | ~10:00 | 12:00 | intact, ENE under all sail, ~1.5 kn | intact, E under all sail | intact, ragged crescent heading N, drifting toward Cadiz |
| 4 | `lee-column-breaks` | Royal Sovereign breaks the rear | 12:00 | ~12:30 | under fire, not yet replying | **engaged** (head of column through the line) | rear/centre engaged; van (10 ships) unengaged, heading N |
| 5 | `weather-column-breaks` | Victory breaks the centre; Nelson falls | ~12:30 | ~13:30 | **engaged**; flagship locked with Redoutable | engaged | centre broken; van still standing N |
| 6 | `melee` | The melee; the line gives way | ~13:30 | ~15:00 | engaged; rear ships arriving fresh | engaged | centre/rear breaking, flagships strike; van going about |
| 7 | `van-counterattack-and-retreat` | Dumanoir's van passes to windward; Gravina retreats | ~15:00 | ~16:45 | engaged at long range to windward; Victory shattered | engaged; Royal Sovereign dismasted, towed | 5 van ships countermarch S (1 taken, 4 escape SW); Gravina + 10 haul off NNE for Cadiz |
| 8 | `last-shots` | Last shots; Achille explodes | ~16:45 | ~17:30 (sunset) | victorious, crippled, off the shoals | victorious, crippled, off the shoals | 17–19 struck; 11 escaping to Cadiz; 4 escaped to sea |

If 5–6 phases are preferred, merge 1+2 ("dawn to bear-up") and 7+8 ("collapse
and retreat"). The decisive core (phases 4–6) should keep three separate
entries — that is where the three units are all in different states at once.

## Sources consulted

All free and public domain unless noted. Locators below refer to these.

| Key | Source | Where |
|-----|--------|-------|
| **Memo** | Nelson, secret Memorandum, "Victory, off Cadiz, 9th October, 1805" | Reprinted in full in Mahan, *Life of Nelson*, vol. II, ch. XXII (Gutenberg #16915, https://www.gutenberg.org/ebooks/16915). Wikisource has no standalone page for it. |
| **Coll** | Collingwood to William Marsden, "Euryalus, off Cape Trafalgar, October 22, 1805", *London Gazette Extraordinary* no. 15858, 6 Nov 1805, pp. 1375–1376 | Wikisource transcription (OCR, two-column interleaved but legible): https://en.wikisource.org/wiki/The_London_Gazette/Number_15858 . The Gazette's own site (thegazette.co.uk issue 15858) returned 404 to automated fetches. |
| **Mahan** | A. T. Mahan, *The Life of Nelson* (1897), vol. II, ch. XXIII "Trafalgar — The Death of Nelson" | Gutenberg #16915; plain text https://www.gutenberg.org/cache/epub/16915/pg16915.txt |
| **Southey** | R. Southey, *The Life of Nelson* (1813), ch. IX | Gutenberg #947; plain text https://www.gutenberg.org/cache/epub/947/pg947.txt |
| **EB1911** | *Encyclopaedia Britannica* 1911, "Trafalgar, Battle of" (D. Hannay) | https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Trafalgar,_Battle_of |
| **WP** | Wikipedia, "Battle of Trafalgar" (CC BY-SA) | https://en.wikipedia.org/wiki/Battle_of_Trafalgar |
| **WP-OOB** | Wikipedia, "Order of battle at the Battle of Trafalgar" (CC BY-SA) | https://en.wikipedia.org/wiki/Order_of_battle_at_the_Battle_of_Trafalgar |

Mahan is the backbone for the timeline: he reconciles logs and gives explicit
clock times. Collingwood's dispatch is the only same-day primary account and is
the best caption source. Southey is quotable but his numbers are unreliable
(see disagreements). Wikipedia is used to cross-check and for the modern
consensus times where the old sources are silent.

## Fixed reference points

- **Cape Trafalgar**: 36°11′N 6°02′W. **Cadiz**: ~20 nm NNE of the battle
  (Mahan: "Cadiz, then twenty miles to the northward and eastward").
- **Battle location** (WP infobox): 36°15′N 6°12′W, i.e. roughly 10 nm WNW of
  the Cape. Collingwood fixes dawn: "Cape Trafalgar bore E. by S. about Seven
  Leagues" (~21 nm) from the British; WP: at 05:40 "the British were about 21
  miles (34 km) to the northwest of Cape Trafalgar". EB1911: "the allies were
  some twelve miles off Cape Trafalgar. The British fleet was some ten or
  twelve miles out at sea to the west of them."
- **Wind all day**: light westerly. Coll: "the Wind about West, and very
  light". Mahan/EB1911: WNW. WP-OOB diagram: "NNW (or NW)". Southey: "from the
  west, light breezes, with a long heavy swell" (later, inconsistently, "light
  winds from the south-west"). Speed of advance ≈ 1.5 knots (Mahan, fn. 140:
  "a one and a half knot breeze"). Heavy swell from the west all day, the
  precursor of the gale that followed.
- **Unit sizes**: 27 British sail of the line; 33 Combined (18 French, 15
  Spanish) — all sources agree. Column split disagrees (see below); use
  WP-OOB/Coll: weather 12 (Victory + 10, plus Africa detached to the north),
  lee 15 (Royal Sovereign + 14).
- **Combined Fleet order after wearing** (WP-OOB, Mahan): van = Dumanoir
  (formerly rear), centre = Villeneuve in *Bucentaure* with *Santísima
  Trinidad* just ahead, rear = Alava in *Santa Ana* then Gravina's former
  squadron of observation with *Príncipe de Asturias* last. Coll: "Admiral
  Villeneuve was in the Bucentaure in the Centre, and the Prince of Asturias
  bore Gravina's Flag in the Rear; but the French and Spanish Ships were mixed
  without any apparent Regard to Order of national Squadron."

## The phases

Times are battle clock. Where sources disagree the spread is given; the
headline figure is Mahan's unless noted.

### 1. `dawn-sighting` — Dawn: the fleets sight each other (~05:40/06:00 → 06:40)

- **Time.** WP: sighting at 05:40; Mahan: "when the day broke" after the
  British "at 4 A.M. ... again wore, and was standing northeast". Ends with
  Nelson's 06:40 signal.
- **Weather column / lee column.** Still one body in loose order of sailing,
  heading NE, ~21 nm WNW of Cape Trafalgar. EB1911: Nelson's division "to the
  westward and windward in the light breeze from W.N.W.; Collingwood's of 15
  sail being to leeward and east." State: intact.
- **Combined Fleet.** A single long line, ~5 miles end to end, on the
  starboard tack heading S toward the Straits, 6–12 miles east of the British
  and ~12 nm off the Cape. Gravina's twelve-ship squadron of observation had
  been folded into the line and was leading it. State: intact.
- **Disagreement.** Distance between fleets: Coll "Six or Seven Miles to the
  Eastward"; Mahan "ten or twelve miles east"; Southey "about twelve miles to
  leeward"; Nelson's codicil "distant about ten miles". Treat as 6–12 nm.
- **Captions.**
  - Coll: "On Monday the 21st Instant, at Daylight, when Cape Trafalgar bore
    E. by S. about Seven Leagues, the Enemy was discovered Six or Seven Miles
    to the Eastward, the Wind about West, and very light" (Gazette 15858, p. 1375).
  - Southey ch. IX: "At daybreak the combined fleets were distinctly seen from
    the VICTORY's deck, formed in a close line of battle ahead, on the
    starboard tack, about twelve miles to leeward, and standing to the south."

### 2. `bear-up-and-wear` — British bear up in two columns; Combined Fleet wears (06:40 → ~10:00)

- **Time.** 06:40 "form the order of sailing" + "prepare for battle"; 06:50
  (Mahan) / "a few minutes before 7" (EB1911) "bear up", signal No. 76.
  Combined Fleet's wear: begun 07:00 by Nelson's journal ("At seven the
  combined fleets wearing in succession"), **ordered 06:00 per EB1911, 08:00
  per WP**; completed "near ten o'clock" (Mahan, EB1911) or ~09:30 (WP:
  "nearly an hour and a half" from 08:00). Spread on the start: 2 hours.
- **Weather column.** Victory leads, turns E-by-N (EB1911: "heading to north
  of east"; Mahan: "steered east"), the northern of the two columns, about a
  mile from Collingwood's. Blackwood on board from ~06:00 (Euryalus's log says
  08:00 — Mahan fn. 137). State: intact, forming.
- **Lee column.** Royal Sovereign leads, turns E, ~1 mile south of Victory,
  slightly ahead. State: intact, forming.
- **Combined Fleet.** Wears together (ship by ship in station) to bring
  Cadiz under its lee; order inverts — van becomes rear, Gravina's flagship
  now the rearmost ship. Now heading N on the larboard (port) tack. Nelson
  answers with "prepare to anchor" for the coming gale. State: intact,
  reforming, slow and ragged.
- **Captions.**
  - Memo (via Mahan ch. XXII): "the Order of Sailing is to be the Order of
    Battle". And: "no Captain can do very wrong if he places his Ship
    alongside that of an Enemy."
  - Coll: "the Commander in Chief immediately made the Signal for the Fleet
    to bear up in Two Columns, as they are formed in order of sailing; a Mode
    of Attack his Lordship had previously directed, to avoid the
    Inconvenience and Delay in forming a Line of Battle in the usual Manner"
    (Gazette 15858, p. 1375).
  - Mahan ch. XXIII: "The result of the allied movement was to invert their
    order. Their ships, which had been steering south, now all headed north;
    the van became the rear".

### 3. `slow-approach` — The slow approach; the crescent forms (~10:00 → 12:00)

- **Time.** From completion of the wear to the first shot at noon. Sub-marks:
  ~09:30 Victory six miles from the enemy (Mahan); ~11:00 Nelson writes his
  prayer; 11:45 (WP) / "towards noon" (Mahan) "England expects"; then No. 16
  close action, kept flying.
- **Weather column.** Under all sail including studding-sails, ~1.5 kn,
  heading ENE — Southey: "Nelson's column was steered about two points more to
  the north than Collingwood's, in order to cut off the enemy's escape into
  Cadiz". Nelson signals Collingwood "I intend to pass through the van of the
  enemy's line, to prevent him from getting into Cadiz" and edges north (WP
  calls this a feint toward the van before turning on the centre). Column
  strung out by speed, nearer a line ahead than Collingwood's. State: intact.
- **Lee column.** Heading E for the enemy's centre/rear, aiming at *Santa Ana*
  (about the 12th–16th ship from the rear); more spread out, "two elongated
  groups" (Mahan). State: intact.
- **Combined Fleet.** Heading N/NNE, carrying sail to hold station and so
  drifting slowly toward Cadiz. Line has become a crescent concave toward the
  British, horns nearer the attackers, ~5 miles horn to horn, ships often two
  or three abreast; "every alternate Ship ... about a Cable's Length to
  Windward of her Second a-head and a-stern, forming a Kind of double Line"
  (Coll). State: intact, waiting.
- **Captions.**
  - Coll: "as the Mode of Attack was unusual, so the Structure of their Line
    was new;—it formed a Crescent convexing to Leeward" (Gazette 15858, p. 1375).
  - Southey ch. IX: "A long swell was setting into the bay of Cadiz: our ships,
    crowding all sail, moved majestically before it".
  - Nelson's prayer (Mahan, Southey): "May the Great God, whom I worship, grant
    to my Country, and for the benefit of Europe in general, a great and
    glorious victory".

### 4. `lee-column-breaks` — Royal Sovereign breaks the rear (12:00 → ~12:30)

- **Time.** First gun: *Fougueux* at Royal Sovereign, "just at noon" (Mahan,
  Coll, WP); Southey "Ten minutes before twelve". Royal Sovereign through the
  line at 12:10 (Mahan), "about midday" (EB1911), "Twelve o'Clock" (Coll).
  Victory comes under ranging fire 12:20, under effective fire 12:30 (Mahan).
- **Weather column.** ~2 miles NW of the breach, still 1.5 miles from the
  enemy, heading ENE toward *Bucentaure*, taking fire from seven or eight
  ships without replying. State: under fire, not engaged.
- **Lee column.** Royal Sovereign passes astern of *Santa Ana* "about the
  Twelfth from the Rear" (Coll) and engages her to leeward, alone for some
  minutes; *Belleisle*, *Mars*, *Tonnant* follow, steering to the right into
  the southern horn so that they engage nearly parallel to the enemy rear.
  State: engaged.
- **Combined Fleet.** Colours hoisted; rear and centre concentrate on the
  column heads; the ten-ship van under Dumanoir stands on north, unengaged.
  Gravina in the rear engaged. State: rear engaged, van intact.
- **Captions.**
  - Coll: "The Action began at Twelve o'Clock, by the leading Ships of the
    Columns breaking through the Enemy's Line, the Commander in Chief about the
    Tenth Ship from the Van, the Second in Command about the Twelfth from the
    Rear, leaving the Van of the Enemy unoccupied" (Gazette 15858, p. 1375).
  - Southey ch. IX (also Mahan): "'See how that noble fellow, Collingwood,
    carries his ship into action!'" ... "'Rotherham, what would Nelson give to
    be here?'"

### 5. `weather-column-breaks` — Victory breaks the centre; Nelson falls (~12:30 → ~13:30)

- **Time.** Victory crosses *Bucentaure*'s stern at 13:00 and rakes her;
  alongside *Redoutable* 13:10; Nelson hit ~13:15–13:25 (Mahan: "fifteen
  minutes after the vessels came together"; Southey: "about a quarter after
  one"; WP: "approximately 1:00 p.m."). **Big disagreement:** Southey has
  Victory open fire "At four minutes after twelve" and WP has her cut the line
  at 12:45; Mahan puts the rake at 13:00. Spread ≈ 1 hour, consistent with the
  known 30+ minute drift between ships' clocks; Mahan's reconciled times are
  preferred.
- **Weather column.** Victory through the line between *Bucentaure* and
  *Redoutable*, then fouls *Redoutable*, the pair "falling off with their heads
  to the eastward, and moving slowly before the wind to the east-southeast"
  (Mahan). *Téméraire*, *Neptune*, *Leviathan*, *Conqueror* follow into the
  gap; *Téméraire* fouls *Redoutable*'s other side and *Fougueux* fouls
  *Téméraire* — four ships locked, heads southward. Tail ships (*Minotaur*,
  *Spartiate*) still two miles astern. State: engaged; flagship crippled
  (mizzen topmast and wheel gone, steered from below).
- **Lee column.** All the leading ships in close action along the enemy rear;
  Royal Sovereign losing masts. State: engaged.
- **Combined Fleet.** Centre "closed like a forest" around *Bucentaure* then
  broken; *Bucentaure* raked end-to-end (Mahan: "Twenty guns were at once
  dismounted"). Van still sailing N, unengaged. State: centre and rear
  engaged, van intact.
- **Captions.**
  - Southey ch. IX: "'This is too warm work, Hardy, to last long.'"
  - Mahan ch. XXIII: "At one o'clock the bows of the 'Victory' crossed the
    wake of the 'Bucentaure,' by whose stern she passed within thirty feet".
  - Southey ch. IX: "'They have done for me at last, Hardy' ... 'Yes! my
    back-bone is shot through.'"

### 6. `melee` — The melee; the Combined line gives way (~13:30 → ~15:00)

- **Time.** *Redoutable* strikes 13:55 (WP; Southey "within twenty minutes"
  of Nelson's wound). *Bucentaure* strikes 14:05 (Mahan); Villeneuve's last
  signal orders the unengaged van into action. Van has its heads to the south
  by 14:30 (Mahan). Victory shoved clear ~14:15, head north. Hardy to Nelson
  ~14:25: "twelve or fourteen of the enemy's ships in our possession" (Mahan;
  Southey says "ten"). Coll: "about Three P.M. many of the Enemy's Ships having
  struck their Colours, their Line gave way".
- **Weather column.** Following ships break through "in all Parts, astern of
  their Leaders" (Coll) and take the *Santísima Trinidad*, *Bucentaure*, *San
  Agustín*, *Intrépide*. *Spartiate* and *Minotaur* arrive fresh and haul to
  the wind to cover Victory from the approaching van. *Africa* comes down alone
  from the north along the enemy line. State: engaged; leaders shattered.
- **Lee column.** Ships still arriving (*Dreadnought*, *Defiance*,
  *Thunderer*, *Defence*, *Prince* last) and breaking in along the rear.
  Royal Sovereign has lost all masts except the foremast. State: engaged.
- **Combined Fleet.** Centre and rear disintegrating into clusters; flag
  officers Villeneuve, Alava and Cisneros in ships that strike. Dumanoir's ten
  van ships going about: five to leeward of the line, five to windward of it.
  State: centre/rear broken, many struck; van countermarching S.
- **Captions.**
  - Coll: "the succeeding Ships breaking through, in all Parts, astern of
    their Leaders, and engaging the Enemy at the Muzzles of their Guns; the
    Conflict was severe" (Gazette 15858, p. 1375).
  - Southey ch. IX: "'Very well,' replied Hardy; 'ten ships have struck, but
    five of the van have tacked, and show an intention to bear down upon the
    VICTORY.'"

### 7. `van-counterattack-and-retreat` — Dumanoir's van passes to windward; Gravina retreats (~15:00 → ~16:45)

- **Time.** ~15:00 the five windward van ships, passing west of Victory
  within gunshot, open fire on the British and their prizes (Mahan). Nelson
  dies 16:30 (all sources). Gravina retreats at 16:45 (Mahan: "fifteen minutes
  after Nelson breathed his last"). Victory's log: "Partial firing continued
  until 4.30".
- **Weather column.** Victory, *Téméraire* and fresh *Minotaur*/*Spartiate*
  exchange long-range fire with the passing van; one van ship (*Neptuno*) cut
  off and taken. State: engaged, victorious, flagships crippled.
- **Lee column.** Royal Sovereign under tow by *Euryalus*, Collingwood
  signalling from her; the rest securing prizes along the former enemy rear.
  State: engaged, victorious, crippled.
- **Combined Fleet.** Now two remnants: (a) Dumanoir with four French ships
  standing SW on the wind, escaping to sea (firing into the captured Spanish
  ships as they pass — Southey); (b) Gravina in *Príncipe de Asturias* with ten
  others hauling off NNE for Cadiz with the frigates to leeward. The rest
  struck. State: broken.
- **Captions.**
  - Coll: "The Five headmost Ships in their Van tacked, and standing to the
    Southward, to Windward of the British Line, were engaged, and the
    Sternmost of them taken; the others went off" (Gazette 15858, p. 1376).
  - Coll: "Admiral Gravina, with Ten Ships joining their Frigates to Leeward,
    stood towards Cadiz" (Gazette 15858, p. 1376).
  - Mahan ch. XXIII, quoting Victory's log: "Partial firing continued until
    4.30, when a victory having been reported to the Right Honourable Lord
    Viscount Nelson, K.B., he died of his wound."

### 8. `last-shots` — Last shots; Achille explodes; fleet in thirteen fathoms off the shoals (~16:45 → ~17:30, sunset)

- **Time.** Mahan: "Not till an hour later [than 16:30] did the last of the
  eighteen prizes strike, and firing cease altogether" (~17:30). EB1911: the
  battle "was terminated about five". Mahan quoting a *Belleisle* eyewitness:
  "Before sunset ... all firing had ceased"; *Achille* "blew up with a
  tremendous explosion" about a mile from *Belleisle*. Sunset ≈ 17:20 local.
- **Weather / lee columns.** Both clusters lying to among the prizes,
  dismasted or crippled, in "Thirteen Fathom Water, off the Shoals of
  Trafalgar" (Coll); signal to prepare to anchor, but "few of the Ships had an
  Anchor to let go, their Cables being shot". Wind shifting a few points that
  night, then the SW gale. State: victorious, crippled.
- **Combined Fleet.** 17–19 struck (see disagreements) plus *Achille* burnt;
  11 sail reach Cadiz; Dumanoir's 4 escape to sea (taken by Strachan off Cape
  Ortegal, 4 Nov). State: destroyed as a fleet.
- **Captions.**
  - Coll: "The whole Fleet were now in a very perilous Situation, many
    dismasted; all shattered in Thirteen Fathom Water, off the Shoals of
    Trafalgar" (Gazette 15858, p. 1376).
  - Mahan ch. XXIII (Belleisle eyewitness): "Just under the setting rays were
    five or six dismantled prizes; on one hand lay the Victory with part of our
    fleet and prizes, and on the left hand the Royal Sovereign and a similar
    cluster of ships. To the northward, the remnant of the combined fleets was
    making for Cadiz."

## Where the sources disagree (summary)

| Item | Values | Notes |
|------|--------|-------|
| Distance between fleets at dawn | 6–7 mi (Coll); ~10 mi (Nelson codicil); 10–12 mi (Mahan, EB1911, Southey) | Coll is the outlier; he was in the lee column, nearer the enemy. |
| Start of Combined Fleet's wear | 06:00 ordered (EB1911); 07:00 observed (Nelson's journal via Mahan); 08:00 ordered (WP) | Completion agreed at ~09:30–10:00. 2-hour spread on the start. |
| Column sizes | Weather 12 + Africa / lee 15 (Coll's Gazette table, WP-OOB, EB1911); 12/14 (Mahan); **14 weather / 13 lee (Southey)** | Southey is wrong; use Gazette/WP-OOB. |
| First shot | 11:50 (Southey); 12:00 (Mahan, Coll, WP) | |
| Victory opens fire / cuts line | 12:04 (Southey); 12:45 (WP); 13:00 (Mahan) | ~1 hour spread; likely different ships' clocks. |
| Nelson hit | ~13:00 (WP); 13:15 (Southey); ~13:25 (Mahan) | Death at 16:30 agreed. |
| Ships taken by Hardy's first report | 10 (Southey); 12–14 (Mahan) | |
| End of firing | ~15:00 "Line gave way" (Coll); 16:30 partial firing (Victory's log); ~17:00 (EB1911); ~17:30 (Mahan) | Use ~17:30 as `t_end` of the last phase; Coll's 15:00 is the collapse, not the end. |
| Prizes | 17 captured + 1 destroyed (WP); 18 (Mahan, EB1911); 19 (Coll); 20 (Southey) | Collingwood counted on the evening of the 21st; WP's 17 excludes Achille. |
| Wind | W (Coll, Southey); WNW (Mahan, EB1911); NNW/NW (WP-OOB diagram) | All light. Southey also says SW at one point. Use WNW, ~1–2 kn of way. |

## Implications for `trafalgar.json`

- `t_start`/`t_end` for phases 1–3 are soft (30–120 min uncertainty); phases
  4–8 are good to ±15–30 min. Consider a per-phase `time_confidence` or just
  round to quarter-hours.
- Headings at three-unit granularity: weather column ENE (~065°), lee column E
  (~090°), Combined Fleet N (~000–010°) after ~10:00 and S (~180°) before
  07:00–08:00; during the wear give it a transitional heading or a
  `formation: "wearing"` state.
- Positions can be expressed as offsets from Cape Trafalgar: British start
  ~21 nm at bearing ~290° (W by N); Combined Fleet start ~12 nm at ~270–290°;
  collision point ~10 nm WNW (36°15′N 6°12′W).
- The Combined Fleet needs to split into at least two units (Dumanoir's van;
  Gravina's remnant) from phase 6 onward, or its `state` must be a mixed value.
  This is the first place three-unit granularity strains.
- Captions: Collingwood's dispatch gives one clean quote per phase from 1 to 8;
  the Memorandum supplies phase 2; Southey/Mahan supply the Nelson dialogue for
  phases 4–7.

## Open follow-ups

- No freely fetchable clean transcription of Collingwood's dispatch was found:
  Wikisource's is OCR of the two-column Gazette and interleaves columns; the
  Gazette's own site refused automated access. A hand-cleaned copy could live
  in `docs/sources/` if the project wants to ship it with the battle.
- Nelson's memorandum has no standalone Wikisource page; it is reprinted in
  Mahan vol. II ch. XXII (and in Nicolas, *Dispatches and Letters*, vol. VII,
  not consulted).
- Wikimedia Commons battle diagrams were not reviewed for this note.
