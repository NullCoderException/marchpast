# Copenhagen phase list at squadron granularity

*Research note for GitHub issue #43 (part of the wayfinder map, #36). Written 2026-09-06. Every locator below was fetched and read for this note; nothing is from memory.*

## Question

What is the phase list for the Battle of Copenhagen (2 April 1801) at
**squadron granularity** — Nelson's division, Parker's division, the Danish
line of blockships and floating batteries, and the Trekroner battery — from
Nelson's division weighing at dawn, through the groundings on the Middle
Ground, the action from about 10:00 and Parker's signal No. 39, to the truce;
which public-domain sources support it; and what schema v1 cannot express (a
fort, a shoal, a truce)?

## Short answer

Eight candidate phases on the battle clock. Times are as the British sources
give them; the two firm anchors are Nelson's "five minutes past ten" for the
first gun and Stewart's "half-past two" for the fire ceasing astern of the
*Elephant*. The clock of the recall signal is the one real dispute (13:00 to
13:30).

| # | id | Label | t | Nelson's division | Parker's division | Danish line | Trekroner |
|---|----|-------|---|-------------------|-------------------|-------------|-----------|
| 1 | `fair-wind-at-dawn` | Dawn: the wind comes fair | 06:00 | intact, at anchor off Draco at the south end of the Middle Ground, 12 sail | intact, at anchor NE of the Middle Ground, 8 sail, ~4 nm off | intact, moored NNW–SSE along the Amager flat, 18 vessels | intact |
| 2 | `weigh-in-succession` | Nelson weighs in succession; Agamemnon fails the shoal | 09:30 | intact, in column heading NNW up the King's Deep; *Agamemnon* aground (strength 0.92) | intact, weighing, beating up from the NE | intact | intact |
| 3 | `bellona-and-russell-ground` | Bellona and Russell ground; the action begins | 10:05 | engaged; *Bellona*, *Russell* fast on the east side of the Middle Ground (strength 0.75) | intact | engaged; *Prøvesteenen* firing on *Edgar* | intact |
| 4 | `battle-general` | The battle becomes general | 11:30 | engaged; nine ships anchored by the stern in a line ~1 cable from the Danes; Riou's frigates detached to the Trekroner; bombs abreast *Elephant* | intact, ~4 nm off, wind and current against it | engaged; *Dannebrog* on fire, *Rendsborg* adrift (strength ~0.9) | engaged with Riou's frigates |
| 5 | `signal-39` | Parker makes No. 39; Nelson keeps No. 16 flying | 13:00 (Southey, Mahan) / 13:30 (WP) | engaged; frigates haul off, Riou killed | intact; signal 39 flying | engaged, fire slackening (strength ~0.6) | engaged |
| 6 | `southern-wing-silenced` | The line astern of Elephant falls silent; Nelson writes to the Crown Prince | 14:30 | engaged; boats repulsed from the prizes; flag of truce sent ashore | intact; *Ramillies*, *Defence* working up within range | broken; ships struck, *Dannebrog* adrift in flames (strength ~0.2) | engaged, firing over the surrendered ships |
| 7 | `truce` | Lindholm returns; the Trekroner ceases fire | 15:15 | engaged; *Glatton*, *Elephant*, *Ganges*, *Defiance*, *Monarch* weigh in succession | intact | destroyed (17 of 18 sunk, burnt or taken) | engaged, silent |
| 8 | `withdrawal` | Withdrawal; Defiance and Elephant ground; Dannebrog blows up | 16:00 | engaged; *Monarch* pushed over the shoal, *Defiance* and *Elephant* aground a mile from the Trekroner | intact; Lindholm and then Nelson on board *London* | destroyed | engaged, silent |

`end`: 17:00 (Dannebrog's explosion is 15:30 by Stewart, 16:30 by Wikipedia;
either falls inside phase 8).

**Where fewer units would do.** Three units carry the story: Nelson's
division, Parker's division and the Danish line. Parker's division never
engages, so it could be dropped and its approach described in captions, but
it is what makes signal 39 legible. The Trekroner is the unit that strains
v1 hardest (see "What v1 cannot express"); it can be folded into the Danish
line's caption and drawn as a `place`. Riou's frigates, the bomb vessels and
the grounded ships are detachment moves, not units. Steen Bille's inner
squadron and the two northern blockships (*Mars*, *Elephanten*) never engage
(Mahan: "as a factor in the battle, may be disregarded") and are omitted.

## Sources consulted

All free and public domain unless noted. Locators below refer to these keys.

| Key | Source | Where | Licence |
|-----|--------|-------|---------|
| **Gaz** | *London Gazette Extraordinary* no. 15354, Wednesday 15 April 1801, pp. 401–404: Parker to Nepean, "London, in Copenhagen-Roads, the 6th Instant"; Nelson to Parker, "Elephant, off Copenhagen, 3d April, 1801"; the Kronborg correspondence Nos. I–III; killed and wounded returns | https://www.thegazette.co.uk/London/issue/15354/page/401 ; whole-issue PDF https://www.thegazette.co.uk/London/issue/15354/data.pdf (fetched with a browser User-Agent; text extracted with `pdftotext -layout`, two columns interleave) | 1801 text public domain; Gazette scans OGL v3.0. **No Wikisource transcription exists** (`The London Gazette/Number 15354` and its Index page are both missing). |
| **Nic** | Nicolas (ed.), *The Dispatches and Letters of Vice Admiral Lord Viscount Nelson*, vol. IV (Sept 1799 – Dec 1801), London: Henry Colburn, 1845 | Internet Archive `dispatchesletter04nels`, "NOT_IN_COPYRIGHT"; full text `dispatchesletter04nels_djvu.txt` (OCR doubles spaces; squeeze before grepping). https://archive.org/details/dispatchesletter04nels | Public domain |
| **Stew** | Colonel William Stewart's narrative of 30 March – 3 April 1801, printed in full in Nicolas's footnotes | Nic vol. IV pp. 302–303 (the 31 March reconnaissance and the Danish line as surveyed), pp. 306–313 (1–2 April), pp. 325–326 (3 April) | Public domain |
| **Southey** | R. Southey, *The Life of Nelson* (1813), ch. VII | Gutenberg #947, plain text https://www.gutenberg.org/cache/epub/947/pg947.txt | Public domain |
| **Mahan** | A. T. Mahan, *The Life of Nelson* (1897), vol. II, ch. XVI "The Expedition to the Baltic and Battle of Copenhagen" (Feb–June 1801) | Gutenberg #16915, plain text https://www.gutenberg.org/cache/epub/16915/pg16915.txt | Public domain |
| **WP** | Wikipedia, "Battle of Copenhagen (1801)", page id 150915, revision 1371088544 (2 Sept 2026) | https://en.wikipedia.org/w/index.php?title=Battle_of_Copenhagen_(1801)&oldid=1371088544 | CC BY-SA 4.0, **not PD**; cross-check only |
| **Clowes** | Sketch "Attack on Copenhagen, April 2nd 1801" from W. L. Clowes, *The Royal Navy: A History*, vol. IV (1899) | Commons `File:Battle of Copenhagen (1801).jpg`, template `{{PD-old}}`, author d. 1905 | Public domain |

Southey copies Stewart almost verbatim for the battle (times, the pilots,
Riou, the letter to the Crown Prince), so Stewart-in-Nicolas is the primary
narrative and Southey is the quotable echo. Nelson's report is the only
same-day (next-day) primary account and is terse: one clock time, the three
groundings, the bombs, the gun-brigs, *Désirée*. Parker's letter adds the
wind, the plan for his own division and the Danish force as reconnoitred.
Mahan supplies the clock for the end of the action and the Danish side
(Fischer's shifts of flag). Wikipedia is used for the modern consensus clock
(13:30 for the recall, 16:00 ceasefire, 16:30 explosion) and is not cited in
data.

## Fixed reference points

- **Trekroner battery**: the present Trekroner Søfort, 55°42′11″N 12°36′52″E
  (WP "Trekroner Fort": "Construction of the current fort began in 1787. The
  fort was an important part of the Danish line of defense during the Battle
  of Copenhagen in 1801"). Guns: Stew "nearly seventy"; Nelson's report
  "Crown Islands mounting Eighty-eight Cannon"; Southey "by the Danish
  account, 66 guns; but, as Nelson believed, 88"; WP 68. WP's battle
  coordinates 55°42′10″N 12°36′48″E are the fort.
- **Draco** = Dragør, 55°35′N 12°40′E, the SE point of Amager. Nelson's
  division "anchored off Draco the Evening of the First" (Nelson, Gaz p. 402;
  Nic p. 313), which every narrative places at the south end of the Middle
  Ground: Southey "doubled its further extremity, and anchored there off Draco
  Point, just as the darkness closed — the headmost of the enemy's line not
  being more than two miles distant"; Mahan "anchored, south of the Middle
  Ground, not over two miles from that end of the Danish line".
- **Middle Ground**: the shoal between the King's Deep (Kongedyb, inshore)
  and the Outer Deep / Hollænderdyb (offshore, toward Saltholm), running
  roughly N–S; today's Middelgrundsfortet (55°43′14″N 12°39′57″E) sits on its
  northern part. Southey: "a shoal lying exactly before the town, at about
  three quarters of a mile distance, and extending along its whole
  sea-front". Mahan: "there are before Copenhagen two channels by which the
  city can be passed. Between the two lies a shoal, called the Middle
  Ground. The inner, known as the King's Channel, lay under the guns of the
  defences". Nelson buoyed "the Channel of the Outer Deep, and the position
  of the Middle Ground".
- **The Danish line** (Fischer's southern wing): Stew p. 302 "formed in a
  direct line eastward from the Trekroner Battery, and extended at least two
  miles along the Coast of Amak: ... the hulls of seven Line-of-Battle Ships
  with jury masts, two only being fully rigged, ten Pontoons or Floating
  Batteries, one Bomb-ship rigged, and two or three Smaller craft". Mahan:
  "the distance from the Trekroner to the southernmost ship being about a mile
  and a half"; "north of it ... two blockships. South of it were seven
  blockships, with a number of miscellaneous floating batteries, which raised
  that wing of the defence to eighteen — the grand total being therefore
  twenty. This was also Nelson's count, except that he put one small vessel on
  the north wing, reducing the southern to seventeen". Nelson's report: "Six
  Sail of the Line, Eleven Floating Batteries ... and one Bomb-Ship, besides
  Schooner Gun-Vessels" (Letter-Book copy: "Seven Sail of the Line, and ten
  Floating Batteries", Nic p. 314 n.). The Clowes sketch draws it NNW–SSE from
  *Indfødsretten* just SE of the Trekroner to *Prøvesteenen* in the south,
  moored broadside-on facing ENE across the King's Deep.
- **Wind on 2 April**: southerly. Parker: "The Day after, the Wind being
  Southerly ... came to the Resolution of attacking them from the Southward";
  "wait for the Wind to the Southward" (Gaz p. 401). Stew p. 306: "With the
  returning light, the wind had been announced as becoming perfectly fair";
  p. 307: each ship "let her anchor go by the stern, the wind nearly aft"
  (ships heading NNW, so wind from SSE). Mahan: Parker's division was
  "beating up against Nelson's fair wind". The Clowes sketch draws the arrow
  from SSE. Force is not graded by any source; Stew (1 April) "The wind was
  light, but favourable", Southey (night of the 1st) "it was calm". Use
  `from: 157.5, force: light` throughout; the sources give no shift.
- **Unit sizes**: Nelson 12 of the line (*Elephant*, *Defiance*, *Monarch*,
  *Bellona*, *Edgar*, *Russell*, *Ganges*, *Glatton*, *Isis*, *Agamemnon*,
  *Polyphemus*, *Ardent*), 4 frigates (*Amazon*, *Désirée*, *Blanche*,
  *Alcmene*), 4 sloops, 2 fire-ships, 7 bombs (Gaz p. 402 margin; Nic
  p. 313 n.). Parker 8 of the line (*London*, *St George*, *Warrior*,
  *Defence*, *Saturn*, *Ramillies*, *Raisonnable*, *Veteran* — WP; Gaz and
  Nic do not list them). Danish southern wing 18 (Mahan, WP; 17 by Nelson).
- **Order of attack** (Mahan n. 31): 1 *Edgar*, 2 *Ardent*, 3 *Glatton*,
  4 *Isis*, 5 *Agamemnon*, 6 *Bellona*, 7 *Elephant*, 8 *Ganges*, 9 *Monarch*,
  10 *Defiance*, 11 *Russell*, 12 *Polyphemus*. Each ship passed outside the
  ships already anchored and took station ahead, "so that the twelfth would
  be abreast the twentieth Dane" (Mahan). The line as fought, south to north:
  *Polyphemus*, *Isis*, *Edgar*, *Ardent*, *Glatton*, *Elephant*, *Ganges*,
  *Monarch*, *Defiance*, then Riou's frigates (Stew p. 308; Clowes).

## The phases

### 1. `fair-wind-at-dawn` — Dawn: the wind comes fair (06:00 → 09:30)

- **Time.** Stew p. 306: orders "completed about one o'clock" in the night,
  clerks finished "about six"; "With the returning light, the wind had been
  announced as becoming perfectly fair". Mahan: "signalled at seven for all
  captains, and by eight these had their instructions". Nelson (Mahan): "At
  eight in the morning of the 2d of April, not one pilot would take charge of
  a ship."
- **Nelson's division.** At anchor off Draco, crowded at the south end of the
  Middle Ground, heading into the wind (S). State intact, strength 1,
  formation column. Intent move: north up the King's Deep to the Danish line.
- **Parker's division.** At anchor NE of the Middle Ground, "at least four
  miles off" the *Elephant*'s later station (Stew p. 312). Had moved on the
  morning of the 1st "to an anchorage within two leagues of the town, and off
  the N.W. end of the Middle Ground" (Southey; "N.W." is Southey's; the
  sketch and Parker's own "reconnoitered ... from the eastward" put him NE).
  State intact. Intent move: toward the Trekroner.
- **Danish line.** Moored, manned "indiscriminately by soldiers, sailors, and
  citizens" (Southey). State intact, formation line, heading ENE (broadsides
  facing the channel).
- **Trekroner.** Intact.
- **Captions.**
  - Parker, Gaz p. 401: "It was agreed between us, that the remaining Ships
    with me should weigh at the same Moment his Lordship did, and menace the
    Crown Batteries, and the Four Ships of the Line that lay at the Entrance
    of the Arsenal; as also to cover our disabled Ships as they came out of
    Action."
  - Southey ch. VII / Stew p. 306: "as his own anchor dropt, Nelson called
    out, 'I will fight them the moment I have a fair wind!'"

### 2. `weigh-in-succession` — Nelson weighs in succession; Agamemnon fails the shoal (09:30 → 10:05)

- **Time.** Stew p. 306, Southey: "at half-past nine, the signal was given
  to weigh in succession". Nelson: "Yesterday Morning I made the Signal for
  the Squadron to weigh".
- **Nelson's division.** *Edgar* leads NNW up the King's Deep along the west
  edge of the Middle Ground. *Agamemnon* "could not weather the shoal of the
  middle, and was obliged to anchor" (Nelson) — "she consequently did not get
  into action at all" (Mahan). *Polyphemus* ordered up in her place. State
  intact (no shot yet), strength 11/12 ≈ 0.92, heading ~340. Detachment
  move: *Agamemnon* left at the south tip of the shoal.
- **Parker's division.** Weighed "as agreed", "beating up against Nelson's
  fair wind" (Mahan), heading roughly SW. State intact.
- **Danish line / Trekroner.** Intact, waiting. *Edgar* "when within range of
  the Provestein, she was fired at, but returned not a shot until she was
  nearly opposite to the number which was destined for her" (Stew p. 307).
- **Captions.**
  - Stew p. 306 / Southey: "Lord Nelson urged them to be steady, to be
    resolute, and to decide. At length Mr. Brierley, the Master of the
    Bellona, declared himself prepared to lead the Fleet".
  - Nelson, Gaz p. 403: "The Agamemnon could not weather the Shoal of the
    Middle, and was obliged to anchor; but not the smallest Blame can be
    attached to Captain Fancourt; it was an Event to which all the Ships were
    liable."

### 3. `bellona-and-russell-ground` — Bellona and Russell ground; the action begins (10:05 → 11:30)

- **Time.** Nelson: "The Action began at Five Minutes past Ten." Stew,
  Southey: "In about half an hour afterwards, the first half of our Fleet was
  engaged". The groundings fall between the weigh and the first gun; no
  source clocks them.
- **Nelson's division.** *Bellona* and *Russell* "kept too close on the
  starboard shoal, and ran aground" (Stew p. 307) "on the east side of the
  Middle Ground" (Mahan) — the *east* side of the King's Deep, i.e. the
  shoal's western edge — "abreast of the outer ship of the enemy" (Southey),
  within range and firing. *Elephant* drops into *Bellona*'s berth ahead of
  *Glatton*; *Ganges*, *Monarch*, *Defiance* close up ahead. State engaged,
  strength 9/12 = 0.75 (Mahan: "The valid British force was thus reduced by
  one-fourth,—to nine vessels"). Detachment move: the two grounded ships at
  the SW corner of the shoal. Heading ~340, formation column.
- **Parker's division.** Intact, still beating up.
- **Danish line.** Engaged from the south end northward. Strength 1.
- **Trekroner.** Intact (not yet under attack).
- **Captions.**
  - Nelson, Gaz p. 403: "From the very intricate Navigation, the Bellona and
    Russel unfortunately grounded, but although not in the Situation
    assigned them, yet so placed as to be of great Service."
  - Mahan: "'His agitation during these moments was extreme,' says an
    eye-witness ... 'It was not, however, the agitation of indecision, but of
    ardent, animated patriotism panting for glory'."
  - Nelson, Gaz p. 403: "The Action began at Five Minutes past Ten. The Van,
    led by Captain George Murray of the Edgar, who set a noble Example of
    Intrepidity".

### 4. `battle-general` — The battle becomes general (11:30 → 13:00)

- **Time.** Stew p. 307: "before half past eleven, the Battle became
  general". Mahan: "The flagship 'Dannebroge' had been on fire as early as
  half-past eleven". Nic p. 325 (Danish remarks): "half an hour after the
  Action began, ... the Rendsborg Pram's cable shot off ... The second
  misfortune, which happened almost immediately, was the Dannebrog's catching
  fire."
- **Nelson's division.** Nine of the line anchored by the stern in a line
  parallel to the Danes, *Elephant* in the centre "opposite to the Danish
  Commodore ... in the Dannebrog"; "Our distance was nearly a cable's length,
  and this was the average distance at which the Action was fought" (Stew
  p. 307–308; the *Elephant* "engaged in little more than four fathom").
  Riou's frigates "proceeded down the Line with his Squadron of Frigates, and
  attempted, but in vain, to fulfil the duty of the absent Ships of the Line"
  against the Trekroner (Stew p. 308) — detachment move to the north end.
  "The Bombs were directed and took their Stations abreast of the Elephant,
  and threw some Shells into the Arsenal" (Nelson); only two reached station
  (Stew). Gun-brigs held back by the current. *Désirée* raking
  *Prøvesteenen* from the south. State engaged, strength 0.75.
- **Parker's division.** "some four miles off, beating up against Nelson's
  fair wind. It had not yet come into action" (Mahan). Intact.
- **Danish line.** Engaged; *Dannebrog* burning, Fischer shifts his broad
  pendant to *Holsteen*; *Rendsborg* adrift. Strength ~0.9.
- **Trekroner.** Engaged with Riou's frigates; "Half the shot from the
  Trekroner ..." comes later. State engaged.
- **Captions.**
  - Stew p. 307: "In succession, as each Ship arrived nearly opposite to her
    number in the Danish line, she let her anchor go by the stern, the wind
    nearly aft, and presented her broadside to the Enemy."
  - Nelson (Mahan): "Here was no manoeuvring: it was downright fighting."
  - Southey: "Riou took the vacant station against the Crown Battery, with
    his frigates: attempting, with that unequal force, a service in which
    three sail of the line had been directed to assist."

### 5. `signal-39` — Parker makes No. 39; Nelson keeps No. 16 flying (13:00 → 14:30)

- **Time.** Southey: "at one o'clock, perceiving that, after three hours'
  endurance, the enemy's fire was unslackened, he began to despair of
  success." Mahan: "At two o'clock, an hour after the signal was made"
  (= 13:00). Stew p. 308: "the general signal of recall, which was made about
  mid-action"; p. 308 "About one p.m., few if any of the Enemy's heavy Ships
  and Praams had ceased to fire." WP: 13:30. Use 13:00 with WP's 13:30 in
  `notes`.
- **Nelson's division.** Engaged; Nelson acknowledges but does not repeat;
  Graves repeats but keeps No. 16 up and does not move; "not a
  ship-of-the-line budged" (Mahan). Riou's frigates obey and haul off; Riou
  killed "when the Amazon showed her stern to the Trekroner" (Stew). Strength
  0.75. The frigate detachment arrow now points back south.
- **Parker's division.** Intact, No. 39 flying; Otway sent by boat to the
  *Elephant*. Intent move toward the Trekroner still shown.
- **Danish line.** Engaged, "the relaxed state of the enemy's fire" (Stew);
  *Monarch* "suffering severely under the united fire of the Holstein and
  Zealand". Strength ~0.6.
- **Trekroner.** Engaged.
- **Captions.**
  - Stew p. 308 (Mahan, Southey): "'Do you know what's shown on board of the
    Commander-in-Chief, No. 39?' On asking him what that meant, he answered,
    'Why, to leave off action.' 'Leave off action!' he repeated, and then
    added, with a shrug, 'Now damn me if I do.'"
  - Stew: "'You know, Foley, I have only one eye—I have a right to be blind
    sometimes;' and then ... putting the glass to his blind eye, he exclaimed,
    'I really do not see the signal.'"
  - Stew: "'What will Nelson think of us?' ... 'Come then, my boys, let us all
    die together!'"

### 6. `southern-wing-silenced` — The line astern of Elephant falls silent; Nelson writes to the Crown Prince (14:30 → 15:15)

- **Time.** Stew p. 310: "The time of half-past two, brings me to a most
  important part of Lord Nelson's conduct on this day ... his sending a Flag
  of Truce on shore." Southey: "By half-past two the action had ceased along
  that part of the line which was astern of the ELEPHANT, but not with the
  ships ahead and the Crown Batteries." Mahan: "At two o'clock ... the
  resistance of the Danes had perceptibly slackened; the greater part of
  their line, Stewart says, had ceased to reply."
- **Nelson's division.** Engaged; boats sent to the prizes "repulsed from
  the Ships themselves, or fired at from Amak Island" (Stew). Thesiger goes
  ashore under a flag of truce: intent move from *Elephant* to the Citadel
  landing. "The three Ships ahead of us were, however, engaged" (Stew).
  Strength 0.75.
- **Parker's division.** "the approach of two of the Commander-in-Chief's
  division, the Ramillies and Defence, caused the remainder of the Enemy's
  Line to the eastward of the Trekroner to strike" (Stew p. 311); Southey
  "which had now worked near enough to alarm the enemy, though not to injure
  them". The Clowes sketch places *Defence*, *Ramillies*, *Veteran* at the
  north end of the King's Deep "having worked up at the close of the action".
  State intact (never fired); position moved south-west to ~2 nm NE of the
  Trekroner.
- **Danish line.** Broken: "some vessels were helpless, some had their flags
  down"; "a group of four Danes, unresisting and unmanageable, across and
  through which the battery was firing" (Mahan); *Dannebrog* "drifting in
  flames before the wind" (Stew); *Sjælland* driven out of the line, cables
  cut; *Holsteen* and *Indfødsretten* shattered, Fischer shifts his flag to
  the Trekroner. Strength ~0.2.
- **Trekroner.** Engaged: "Half the shot from the Trekroner, and from the
  batteries at Amak, at this time, struck the surrendered ships" (Southey).
- **Captions.**
  - Nelson to the Crown Prince, "To the Brothers of Englishmen, the Danes"
    (Nic p. 315; Mahan): "Lord Nelson has directions to spare Denmark, when
    no longer resisting; but if the firing is continued on the part of
    Denmark, Lord Nelson will be obliged to set on fire all the floating
    batteries he has taken, without having the power of saving the brave
    Danes who have defended them."
  - Southey: "A wafer was given him, but he ordered a candle to be brought
    from the cockpit, and sealed the letter with wax ... 'This,' said he, 'is
    no time to appear hurried and informal.'"

### 7. `truce` — Lindholm returns; the Trekroner ceases fire (15:15 → 16:00)

- **Time.** Stew p. 311: "The firing from the Crown Battery and from our
  leading Ships did not cease until past three o'clock, when the Danish
  Adjutant-General, Lindholm, returning with a Flag of Truce, directed the
  fire of the battery to be suspended. The signal for doing the same, on our
  part, was then made ... The Action closed after five hours' duration, four
  of which were warmly contested." Southey: "In somewhat more than half an
  hour after Thesiger had been despatched ... the action closed, after four
  hours' continuance." Nelson: "after a Battle of Four Hours."
- **Nelson's division.** Engaged (cohesion held, firing stopped). Lindholm
  referred to Parker and rows to the *London*; "the signal was made for the
  Glatton, Elephant, Ganges, Defiance, and Monarch, to weigh in succession"
  (Stew p. 312) — the leading ships begin to come out northward under the
  Trekroner. Intent move: N then E round the Middle Ground toward Parker.
- **Parker's division.** Intact, at anchor ~4 nm off.
- **Danish line.** Destroyed as a fighting body: "the other Seventeen Sail
  are sunk, burnt, or taken, being the Whole of the Danish Line to the
  Southward of the Crown Islands" (Nelson, Gaz p. 403). Strength 0 (the
  bomb-ship and gun-vessels escaped; *Hielperen* withdrew — WP).
- **Trekroner.** Engaged, silent; "manned at the close of the Action with
  nearly 1500 men", storming "deemed impracticable" (Stew).
- **Captions.**
  - Nelson's second note (Nic p. 311–312; Southey): "Lord Nelson's object in
    sending the Flag of Truce was humanity; he therefore consents that
    hostilities shall cease, and that the wounded Danes may be taken on
    shore ... Lord Nelson ... will consider this the greatest victory he has
    ever gained, if it may be the cause of a happy reconciliation and union
    between his own most gracious Sovereign, and his Majesty the King of
    Denmark."
  - Nelson, Gaz p. 403: "the other Seventeen Sail are sunk, burnt, or taken,
    being the Whole of the Danish Line to the Southward of the Crown Islands,
    after a Battle of Four Hours."

### 8. `withdrawal` — Withdrawal; Defiance and Elephant ground; Dannebrog blows up (16:00 → 17:00, `end`)

- **Time.** Stew p. 312: Nelson "followed the Adjutant-General, about four
  o'clock, to the London"; *Defiance* aground "until ten o'clock that night",
  *Elephant* "until eight". Dannebrog: Stew p. 310 "about half-past three
  blew up"; WP 16:30. WP: "By 4:00 pm, a twenty-four-hour ceasefire was
  agreed."
- **Nelson's division.** "the Monarch, as first Ship, immediately hit on a
  shoal, but was pushed over it by the Ganges taking her amidships. The
  Glatton went clear, but the Defiance and Elephant ran aground, leaving the
  Crown Battery at a mile distance" (Stew); *Désirée* fast on the shoal at
  the south end (Southey). State engaged, strength 0.75; position moved to
  the north end of the King's Deep; heading N.
- **Parker's division.** Intact; negotiation aboard *London*.
- **Danish line.** Destroyed; *Dannebrog* explodes near the Trekroner.
- **Trekroner.** Engaged, silent.
- **Captions.**
  - Stew p. 312: "'Well!' he exclaimed, 'I have fought contrary to orders,
    and I shall perhaps be hanged: never mind, let them.'"
  - Southey: "The sky had suddenly become overcast; white flags were waving
    from the mast-heads of so many shattered ships; the slaughter had ceased,
    but the grief was to come".

## Candidate positions

Estimated from the Clowes sketch and Brydon's 1802 plan laid against the
modern coordinates above; nobody georeferenced a chart. Good to perhaps
0.3 nm, which is finer than a squadron marker.

| Unit / feature | Phase | lat | lon | heading | Notes |
|---|---|---|---|---|---|
| Trekroner | all | 55.703 | 12.614 | — | modern fort |
| Danish line centre (*Dannebrog*) | all | 55.686 | 12.627 | 70 | line runs ~55.700/12.622 (*Indfødsretten*) to ~55.672/12.632 (*Prøvesteenen*), ~1.5–2 nm |
| Nelson's division at anchor off Draco | 1 | 55.655 | 12.665 | 180 | south tip of the Middle Ground, ≤2 nm from *Prøvesteenen* |
| Nelson's division, column forming | 2 | 55.665 | 12.648 | 340 | *Edgar* leading NNW into the King's Deep |
| Nelson's line as fought (*Elephant*) | 3–7 | 55.686 | 12.638 | 340 | ~1 cable east of the Danes by Stewart; the sketch shows ~0.3 nm |
| *Agamemnon* (detachment head) | 2–8 | 55.652 | 12.668 | — | |
| *Bellona*, *Russell* (detachment head) | 3–8 | 55.674 | 12.645 | — | SW corner of the shoal, in range of the southern Danes |
| Riou's frigates (detachment head) | 4 | 55.708 | 12.632 | — | off the Trekroner; hauls off in 5 |
| Bombs (detachment head) | 4–7 | 55.688 | 12.648 | — | abreast *Elephant*, on the shoal side |
| Thesiger's flag of truce (intent head) | 6 | 55.692 | 12.600 | — | the Citadel landing |
| Nelson's leading ships withdrawing | 8 | 55.712 | 12.640 | 0 | *Defiance*/*Elephant* aground "a mile" from the Trekroner |
| Parker's division at anchor | 1, 7–8 | 55.745 | 12.700 | 225 | ~4 nm NE of *Elephant*; heading SW while working up in 2–5 |
| *Ramillies*, *Defence*, *Veteran* (detachment head) | 6 | 55.725 | 12.645 | — | north end of the King's Deep |

Extent suggestion: north 55.78, south 55.56 (Dragør), west 12.45, east 12.85
(Saltholm's west shore is ~12.72). That is nearly square; widen west/east to
12.40/12.90 for a landscape frame. Map `land` polygons needed: Amager (with
Copenhagen and the harbour mouth), Zealand's shore north of the Citadel, and
Saltholm; `place` points: Copenhagen, Trekroner, Draco (Dragør), Saltholm,
Amager.

## Where the sources disagree (summary)

| Item | Values | Notes |
|------|--------|-------|
| Parker's recall signal | 13:00 (Southey "at one o'clock"; Mahan "two o'clock, an hour after the signal"); "about mid-action" (Stew); 13:30 (WP) | Use 13:00; WP's 13:30 in `notes`. |
| Danish southern wing count | 17 (Nelson's report; Letter-Book "Seven Sail of the Line, and ten Floating Batteries"); 18 (Mahan, WP); 19 "ships and floating batteries" (Southey); "seven Line-of-Battle Ships ... ten Pontoons ... one Bomb-ship ... two or three Smaller craft" (Stew, 31 March survey) | 18 for strength arithmetic; caption may say seventeen struck. |
| Trekroner guns | 66 (Danish account via Southey); ~70 (Stew); 68 (WP); 88 (Nelson's report, Southey "as Nelson believed") | Caption matter. |
| Length of the Danish line | 1.5 mi Trekroner to southernmost ship (Mahan); "at least two miles" (Stew) | Position table uses ~1.7 nm. |
| Length of the action | "Four Hours" (Nelson); "four hours' continuance" (Southey); "five hours' duration, four of which were warmly contested" (Stew) | 10:05 → 14:30 warm; → ~15:15 close. |
| Dannebrog's explosion | ~15:30 (Stew); 16:30 (WP) | Inside phase 8 either way. |
| Where the Bellona and Russell grounded | "east side of the Middle Ground" (Mahan); "starboard shoal" while going north (Stew); "abreast of the outer ship of the enemy" (Southey) | All the same place: the King's Deep side of the shoal, opposite the southern Danes. Mahan's "east side" reads as the east side of the channel. |
| Parker's anchorage on the 1st | "off the N.W. end of the Middle Ground" (Southey) | The sketch, Parker's "from the eastward", and Mahan's "beating up" from four miles off all say NE. Treat Southey's N.W. as a slip. |
| Wind force | "light, but favourable" (Stew, 1 April); "calm" (Southey, night of 1st); "perfectly fair" (Stew, 2 April); ungraded elsewhere | Use `light`. |

## What schema v1 cannot express

- **A fort.** The Trekroner is a side's fighting force that never moves and
  has no heading or formation, yet it fires, is "engaged", and ends the
  battle by ceasing fire. As a **unit** it needs a `position`, a `heading`
  and a `formation` that are fictions (a fixed point, any angle, `line`), and
  its tick-glyph would draw as ships. As a **map feature** it can only be a
  `place` point (label) or a `land` polygon (an artificial island — that is
  literally what it is, so a small `land` polygon at 55.703/12.614 plus a
  `place` label "Trekroner" is legal today), but then it has no state, no
  strength and cannot be shown ceasing fire. Recommendation for the first
  cut: draw it as `land` + `place`, keep it out of the roster, and let the
  Danish line's caption carry it. A `battery` feature kind or a `fixed` unit
  formation is the v2 change.
- **A shoal.** The map file has only `land` and `place`; everything else is
  sea. The Middle Ground — the reason three ships never reached their
  stations and the reason Nelson's line lay where it lay — cannot be drawn.
  A `place` point "Middle Ground" labels it; a `land` polygon would draw it
  as an island. The groundings are expressible only as `detachment` moves
  plus `strength` decay on Nelson's division and captions.
- **A truce.** There is no state for "ceased fire under a flag of truce".
  `engaged` holds ("a unit that has fought stays engaged when the firing
  stops"), so phases 7–8 show both fleets `engaged` while nothing fires.
  The flag-of-truce boat is an `intent` move; the cessation is caption
  matter. The Danish line's `destroyed` at phase 7 is right by the
  definition (ceased to exist as a fighting unit) even though the hulks are
  still afloat and the Trekroner is still manned.
- **Ships striking.** Fits: `strength` steps down per phase (0.9, 0.6, 0.2,
  0) and the caption names the ships. The wrinkle is the four surrendered
  ships being fired over — a `broken` state on the Danish line at phase 6
  says "cohesion lost" honestly.
- **A unit that never engages.** Parker's division is `intact` for the
  whole battle and its only motion is a tween; its intent arrow is the only
  thing that shows it mattered. Fine.
- **Anchored ships with a heading.** The engaged British line is a `column`
  of ships heading NNW that are stationary and firing to port. The heading
  field says where the bows point, not where the fire goes; the renderer's
  ticks will read correctly.

## Implications for `copenhagen.json`

- Roster: `nelson-division` (British, Nelson), `parker-division` (British,
  Parker), `danish-line` (Danish, Fischer). Add `trekroner` (Danish) only if
  the fort-as-unit hack is accepted. Sides: "British", "Danish".
- Wind: every phase `{ "from": 157.5, "force": "light" }`; no shift is
  recorded. Consider `180` if SSE reads as over-precise; Parker says only
  "Southerly".
- `t` values: 06:00, 09:30, 10:05, 11:30, 13:00, 14:30, 15:15, 16:00; `end`
  17:00. Phase 3 is the one whose `t` is a real reading (Nelson's "five
  minutes past ten"); the schema's quarter-hour caution is not violated but
  the value is exact.
- Playback: phases 1–2 compress hours; 3–6 are the decisive core and should
  play slowly; the tween of Nelson's division from Draco to its station (2→3)
  is the only real movement on the map, and the withdrawal (7→8) the second.
- Captions: Nelson's report gives phases 2, 3 and 7; Stewart (via Nicolas,
  Southey, Mahan) gives 1, 4, 5, 6, 8; the letter to the Crown Prince gives
  6. All public domain.
- Sources table: `nelson-report` (Gazette 15354 pp. 402–403 / Nic vol. IV
  pp. 313–315, public-domain), `parker-dispatch` (Gazette 15354 pp. 401–402),
  `stewart-narrative` (Nic vol. IV pp. 302–313, public-domain),
  `southey` (gutenberg:947 ch. VII), `mahan` (gutenberg:16915 vol. II
  ch. XVI). No share-alike source is needed for any phase.

## Public-domain plans (Wikimedia Commons)

Licence strings taken from each file page's wikitext via the Commons API.

| Commons file | Licence template | Author / date | Notes |
|---|---|---|---|
| `File:Battle of Copenhagen (1801).jpg` | `{{PD-old}}`; "Author died more than 100 years ago" | W. L. Clowes, *The Royal Navy* vol. IV, 1899 | Clean line sketch: shoal outlines, 5-fathom lines, every ship named, wind arrow, Nelson's anchorage of 1 April, Parker's ships worked up at the close. **Best reference for positions.** Source given as a historyofwar.org re-scan. |
| `File:Plan of the Battle of Copenhagen (with inset, View of the Danish Line prior to the Engagement; portrait of Nelson; View of Both the Fleets in Action.) RMG PY7985.tiff` | `{{Royal Museums Greenwich}}` permission; API "Public domain" | John Brydon, published 20 May 1802 | RMG object 147932. Shows the run down the east side of the Middle Ground on the 1st and up the west side on the 2nd. |
| `File:Battle of Copenhagen, April 2nd 1801 RMG F3841.tiff` | `{{PD-Art|PD-old-100-expired}}` | Francis Gibson; Walker, 1801 | RMG object 541798, chart with ships in profile and named, casualty box. |
| `File:Fairburn's Plan of Parker and Nelson's Victory before Copenhagen... (BM 1853,0212.239).jpg` | API "Public domain" (British Museum) | John Fairburn, London 1801 | Broadside: map of the Sound and the approach, view of the action, and letterpress reprinting Parker's and Nelson's letters. |
| `File:PlanAngriffsCopenhagen960.jpg` | `{{cc-zero}}` | G. A. Lehmann, in Charnock, *Nelson's Leben*, Bremen 1807 | German plan of attack. |
| `File:Bataillen d. 2 April 1801, paa Kiøbenhavns Reed.jpg` and `File:Johan Frederik Clemens - Bataillen d. 2. April 1801, paa Kiøbenhavns Reed.png` | API "Public domain" | J. F. Clemens after C. A. Lorentzen, 1802–05 | Danish view from the Vor Frue tower "at around 13:00", Dannebrog burning; a view, not a plan. |
| `File:Alison's history of Europe atlas 1850 (92102278).jpg` | `{{PD-old-auto-expired|deathyear=1871}}` | A. K. Johnston, Blackwood 1850 | The Johnston atlas that also supplied the Trafalgar plates; this page is the Copenhagen plate. |

Category: https://commons.wikimedia.org/wiki/Category:Battle_of_Copenhagen
(the `(1801)`-suffixed category is a near-empty redirect stub). RMG-sourced
files carry the same PD-Art caveat as in the Trafalgar sources note. No
CC BY-SA modern SVG diagram exists for this battle, so there is nothing to
avoid.

## Open follow-ups

- No transcription of Gazette 15354 exists on Wikisource; the Gazette's own
  OCR is long-s-mangled and column-interleaved. A hand-cleaned copy of
  Nelson's report (Nic vol. IV pp. 313–315 is the clean printed text) could
  live in `docs/sources/` if the project wants to ship it.
- Parker's letter names only Nelson's twelve; the eight ships of Parker's
  division are from Wikipedia. Nicolas vol. IV likely prints the full fleet
  list (not grepped for this note); confirm before putting the list in a
  caption.
- Positions are eyeballed from the Clowes sketch against modern coordinates.
  Georeferencing Brydon's 1802 plan or the Clowes sketch would tighten them
  and is the natural follow-up for the data ticket (#53).
- Danish-language sources (Fischer's report, printed in translation in Nic
  vol. IV pp. 321–325) were read only for the line's composition and the
  order of Danish misfortunes; the Danish clock was not extracted.
