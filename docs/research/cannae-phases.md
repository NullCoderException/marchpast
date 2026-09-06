# Cannae phase list at wing granularity

*Research note for GitHub issue #41 (part of the wayfinder map, #36). Written 2026-09-06.*

## Question

What is the phase list for the Battle of Cannae (2 August 216 BC) at **wing
granularity**, from the Roman deployment at dawn to the end of the envelopment,
with positions relative to the Aufidus and the Roman camps, headings, formation
shape, state and strength per phase; which public-domain translations of
Polybius III.107-117 and Livy XXII.44-49 support it, with locators; what
precision the battle clock can honestly carry; and what the v1 schema cannot
express?

## Short answer

**Eight phases, seven units, and a battle clock that is honest only to the
hour.** The two primary sources give a single time fix (Varro moved out "as soon
as the sun was above the horizon", Polybius III.113; Hannibal crossed "at break
of day", Livy XXII.46) and a firm *sequence*; every other `t` below is an
author's estimate from that fix and the distances involved. Both armies fought
on the right (south-east) bank of the Aufidus on the modern consensus reading
(Kromayer 1912); the left-bank readings are recorded below.

| # | id | Label | t (est.) | Roman cav (right) | Roman infantry | Allied cav (left) | Hasdrubal's cav | Libyans L / R | Spanish-Gallic centre | Numidians |
|---|----|-------|----------|-------------------|----------------|-------------------|-----------------|---------------|-----------------------|-----------|
| 1 | `first-light-crossing` | First light: Varro leads the army over the river | ~05:00 | intact, column, crossing at the ford | intact, column, crossing | intact, column | intact, in camp | intact, in camp | intact, in camp | intact, in camp |
| 2 | `both-armies-formed` | Both armies formed, Romans facing south | ~07:30 | intact, line, on the river | intact, line (deep), facing S | intact, line, far from river | intact, line, on the river, facing N | intact, line, either flank of centre | intact, line, bowed forward (crescent) | intact, line, far from river |
| 3 | `light-troops-and-cavalry-clash` | Skirmishers open; the cavalry close on the river | ~08:30 | engaged, static, hemmed by river | intact, line, light troops out front | engaged (loosely), pinned by Numidians | engaged, head-on | intact | intact | engaged, harassing |
| 4 | `roman-cavalry-destroyed` | Hasdrubal breaks the Roman horse; the lines of foot meet | ~09:00 | **broken**, driven along the river, strength ~0.2 | engaged, advancing S | engaged | engaged, pursuing along river | intact | engaged, holding | engaged |
| 5 | `centre-gives-ground` | The centre gives ground; the crescent turns concave | ~09:45 | destroyed | engaged, pressing S into the bow | engaged | engaged, reforming, riding E behind the Roman rear (move) | intact, wheeling inward (headings E / W) | engaged, retiring N to S, still a body | engaged |
| 6 | `allied-cavalry-flees` | Hasdrubal appears behind the allied horse; it flees | ~10:15 | destroyed | engaged, flanks struck by the Libyans | **broken**, fleeing, strength ~0.1 (Numidian pursuit as move) | engaged, turning back W to the Roman rear | engaged, on both Roman flanks | engaged, rallied | engaged, pursuing (move off-map) |
| 7 | `encirclement` | The circle closes; Paullus falls | ~11:00 | destroyed | engaged then **broken**, surrounded, strength falling 0.9 -> 0.3 | destroyed as a body (survivors to Venusia) | engaged, on the Roman rear | engaged | engaged | engaged, off pursuing |
| 8 | `annihilation-and-the-camps` | The Roman army dies where it stands; Hannibal takes the camps | ~14:00 (end ~17:00) | destroyed | **destroyed**, strength 0.05 | destroyed | engaged | engaged | engaged | engaged, bringing in fugitives |

If fewer phases are wanted, merge 3+4 (the cavalry fight is short in both
sources: "more violent than lasting", Livy XXII.47) and 7+8. Phases 4, 5 and 6
should stay separate: they are the three moments where the sources describe
different units doing different things at once, and they are the whole point of
Cannae.

## Sources consulted

All free and public domain unless noted. The two primary sources were read in
full in the Gutenberg texts; the Perseus pages were used to confirm locators
and the alternative translations.

| Key | Source | Where | Licence |
|-----|--------|-------|---------|
| **Pol** | Polybius, *Histories* III.107-117, trans. Evelyn S. Shuckburgh (Macmillan, 1889) | Gutenberg #44125 (vol. I), plain text https://www.gutenberg.org/cache/epub/44125/pg44125.txt ; the same translation chapter by chapter on Perseus, e.g. https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0234:book=3:chapter=113 (Perseus lists the chapters as 107 "Hannibal Occupies Cannae" ... 117 "Superiority in Cavalry Wins Battles") | Public domain (Shuckburgh d. 1906; Gutenberg header: "almost no restrictions whatsoever") |
| **Pol-Loeb** | Polybius, *Histories* III, trans. W. R. Paton, Loeb vol. II (1922) | LacusCurtius https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/3*.html ; the page states "The text is in the public domain". Automated fetches returned only chapters 1-52 of the page, so the Cannae chapters were **not** checked in this translation. | Public domain (US, pre-1929) |
| **Liv** | Livy, *History of Rome* XXII.43-50, trans. D. Spillan and Cyrus Edmonds (Bohn, 1849-50) | Gutenberg #10907 (Books 9-26), plain text https://www.gutenberg.org/cache/epub/10907/pg10907.txt | Public domain |
| **Liv-Rob** | Livy XXII.44-49, trans. Rev. Canon W. M. Roberts (Everyman, 1912) | Perseus, chapter by chapter: https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0144:book=22:chapter=46 (chapters 46, 47, 48 fetched and read; the doc id `1999.02.0146` in the ticket's spirit is *not* the English text and redirects to an error page) | Public domain (US, pre-1929) |
| **App** | Appian, *Hannibalic War* 17-26, trans. Horace White (Macmillan, 1899) | Perseus https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0230:text=Hann. and livius.org | Public domain. Not read for this note; listed as a third narrative for captions. |
| **USMA-1** | "Battle of Cannae, 216 BC - Initial Roman attack", Dept. of History, US Military Academy (Frank Martini, cartographer); SVG by Hogweard | https://commons.wikimedia.org/wiki/File:Battle_of_Cannae,_215_BC_-_Initial_Roman_attack.svg (the filename says 215, the description says 216) | Public domain (US federal work, 17 USC 105; PD Mark 1.0). USMA asks for the credit "The Department of History, United States Military Academy". |
| **USMA-2** | "Battle cannae destruction" (encirclement), same origin | https://commons.wikimedia.org/wiki/File:Battle_cannae_destruction.svg | Same as above |
| **KV** | Kromayer and Veith, *Schlachten-Atlas zur antiken Kriegsgeschichte*, Römische Abteilung (Leipzig, 1922), Cannae plate | Internet Archive https://archive.org/details/kromayerveithschlachtenatlas ; Heidelberg digitisation blocked automated access | Public domain (published 1922; Kromayer d. 1934, Veith d. 1925). **Plate not viewed**; see open follow-ups. |
| **WP** | Wikipedia "Battle of Cannae", "Cannae", "Ofanto" (CC BY-SA) | https://en.wikipedia.org/wiki/Battle_of_Cannae | Consulted for coordinates and modern unit numbers only; not a source in the schema sense. |
| **Gold** | A. Goldsworthy, *Cannae* (Cassell, 2001), ch. "Locating the battlefield" | In copyright; read through an online extract, so treat its figures below as unverified against the book. | Not usable as a shipped source. |
| **Blog** | "Armageddon on the Aufidus: locating the Battle of Cannae", *The Thirsty Gargoyle*, July 2013 | http://thethirstygargoyle.blogspot.com/2013/07/armageddon-on-aufidus-locating-battle.html | Secondary, unlicensed; used only for the survey of scholars' positions. |

Polybius is the backbone: he is the earliest, gives the fullest order of battle,
and is explicit about the sides of the river and the aspect of the lines. Livy
adds the wind, the Numidian false-deserter stratagem, Paullus's death scene and
the fate of the camps, and names Maharbal where Polybius names Hanno. Where
they differ Polybius is preferred; the differences are tabled below.

## Fixed reference points

- **Cannae hill** (Monte di Canne, the citadel Hannibal seized, Pol III.107):
  41.2964 N, 16.1517 E, on the right (south) bank of the Ofanto, 9.6 km from
  its mouth (WP "Cannae").
- **Mouth of the Ofanto** (ancient Aufidus): 41.3592 N, 16.1975 E (WP
  "Ofanto"). The river runs roughly south-west to north-east past Canosa
  (Canusium), Cannae and Barletta into the Gulf of Manfredonia.
- **WP infobox battle point**: 41.3064 N, 16.1325 E. This sits north-west of
  the hill, i.e. on or near the left bank; it does not match the Kromayer
  site and should not be used blindly.
- **Distances in the sources.** Pol III.110: the consuls' first camp "at about
  fifty stades' distance" (~9 km) from Hannibal; Paullus's smaller camp
  "across the river, to the east of the ford, about ten stades" (~1.8 km)
  "from his own lines, and a little more from those of the enemy". Livy
  XXII.44 has the two camps "with nearly the same interval as before, at
  Geronium". A stade is taken as ~185 m.
- **Which bank.** Pol III.110-111: the larger Roman camp was on the Aufidus;
  the smaller across the river east of the ford; Hannibal then camped "on the
  same bank of the river as that on which was the larger camp of the Romans".
  Pol III.113: Varro drew up the larger camp's troops "as soon as he had got
  them across the river", and Hannibal crossed "at two spots" to face them.
  So the battle was fought on the bank of the *smaller* camp, and the
  question is which bank that was. Readings:
  - **Right (south-east) bank, downstream of the hill towards the sea**:
    Kromayer 1912 and the Kromayer-Veith atlas; the Romans facing roughly
    south to south-west with the river on their right, the Carthaginians
    roughly north to north-east, on a front of 4 km or more. This became the
    consensus (Blog; Gold). The USMA maps draw this.
  - **Right bank, but north of the hill on a narrow 2 km plain**: Connolly
    1981 (with the river running further north in 216 BC than today) and
    Goldsworthy 2001 (the Roman army squeezed between the river and the hill,
    Blog; Gold). Connolly also puts Hannibal's camp at San Ferdinando, which
    the Blog argues conflicts with Pol III.112.
  - **Left (north-west) bank**: Delbrück and Lehmann (19th c.), De Sanctis
    (who has Polybius mistaking the geography). Lehmann has the Romans facing
    north, against both sources; few modern scholars follow (Blog; Gold).
  - Nobody knows the ancient course of the river: "there's no evidence at all
    for what path it took in Hannibal's day" (Blog). Positions below are
    therefore sketched to the Kromayer reading and labelled as estimates.
- **Aspect.** Pol III.114: "the Roman line faced the south ... and the
  Carthaginian the north, the rays of the rising sun did not inconvenience
  either of them." Liv XXII.46: "the Romans facing the south, and the
  Carthaginians the north". Both agree; this fixes Roman heading ~180-200 and
  Carthaginian ~0-20 for the whole battle.
- **Wind.** Liv XXII.43 and 46 only: Hannibal camped "with his back to the wind
  Vulturnus"; in the battle "the wind ... Vulturnus, blowing violently in front
  of the Romans, prevented their seeing far by rolling clouds of dust into
  their faces". The Volturnus is the south-east wind. Polybius has no wind.
- **Numbers (sources).** Pol III.113: Romans "eighty thousand infantry and a
  little more than six thousand horse" (III.117: ten thousand of the foot were
  left in the camp). Pol III.114 and Liv XXII.46: Carthaginian cavalry ten
  thousand, infantry forty thousand "including the Celts". Neither source
  splits the Carthaginian infantry into Libyan / Spanish / Gallic totals, nor
  the cavalry into Hasdrubal's and the Numidians; the modern splits (WP:
  8,000 Libyans, 3,000 Spaniards, 21,000 Gauls; 6,000-7,000 Spanish-Gallic
  horse, 3,000-4,000 Numidians; 2,400 Roman and 3,600-4,000 allied horse) are
  reconstructions and belong in `notes`, not captions.
- **Commanders (sources).** Pol III.114: Paullus on the Roman right, Varro on
  the left, Atilius and Servilius (the previous year's consuls) in the centre;
  Hasdrubal on the Carthaginian left, Hanno on the right, Hannibal with Mago in
  the centre. Liv XXII.45-46 agrees except that Servilius alone holds the Roman
  centre and **Maharbal**, not Hanno, has the Carthaginian right. Livy's
  Roman centre commander "Cneius Servilius Germinus" is Polybius's Gnaeus
  Servilius.
- **Date and sunrise.** 2 August 216 BC is the Roman civil-calendar date. The
  calendar was running ahead of the sun in these years; the solar date is
  usually put in early July (WP). Sunrise at 41.3 N is about 04:40 local solar
  time in early July and about 05:05 on a solar 2 August; the note uses
  **05:00** as the anchor (author's computation, not a source figure).

## Unit list

Seven units carry the battle; the ticket's list is the right one. Ids as they
might appear in `data/battles/cannae.json`.

| id | side | label | commander | Source basis | Could it be smaller? |
|----|------|-------|-----------|--------------|----------------------|
| `roman-cavalry` | Roman | Roman cavalry | Paullus | Pol III.113 "The Roman horse he stationed on the right wing along the river" | No: it is destroyed first and alone (Pol III.115). |
| `roman-infantry` | Roman | Roman and allied infantry | Servilius | Pol III.113 the foot "next them in the same line ... the depth of each maniple several times greater than its front"; Liv XXII.45 allied foot on the left of the legions | Could be split into legions and allied wings (Liv XXII.45) but no source has them act differently. Keep one. |
| `allied-cavalry` | Roman | Allied cavalry | Varro | Pol III.113 "The cavalry of the allies he stationed on the left wing" | No: it flees separately and later (Pol III.116). |
| `hasdrubal-cavalry` | Carthaginian | Spanish and Gallic cavalry | Hasdrubal | Pol III.113 "On his left wing, close to the river, he stationed the Iberian and Celtic horse" | No: it is the unit whose ride round the rear decides the battle. |
| `libyans-left` | Carthaginian | Libyan foot (river flank) | Hannibal (no separate commander named) | Pol III.113 "next to them half the Libyan heavy-armed foot" | The two Libyan halves could become one unit only if the envelopment is shown by moves alone; then the unit's single position would sit in the middle of the Roman mass. Keep two. |
| `spanish-gallic-centre` | Carthaginian | Spanish and Gallic foot | Hannibal, with Mago | Pol III.113 "next to them the Iberian and Celtic foot"; the crescent's bow | No. |
| `libyans-right` | Carthaginian | Libyan foot (open flank) | Hannibal | Pol III.113 "next, the other half of the Libyans" | See `libyans-left`. |
| `numidians` | Carthaginian | Numidian horse | Hanno (Pol) / Maharbal (Liv) | Pol III.113 "and, on the right wing, the Numidian horse" | No. |

Optional units, only if the aftermath is played: `roman-camp-guard` (Pol
III.117: ten thousand foot left in the camps, who attacked Hannibal's camp, were
driven back and captured) and Hannibal's camp guard. The velites and the
Balearic slingers are not units: both sources fold them into the opening
skirmish and never mention them again.

The Roman side comes first in `units[]` so the renderer's red ink falls on Rome
and blue on Carthage, matching the USMA plans.

## The phases

Times are the author's estimates on the battle clock; the only source fix is
sunrise. Positions are lat/lon sketches on the Kromayer site (right bank,
downstream of the hill, front running west-north-west to east-south-east about
1-3 km from the river mouth) and need checking against the Kromayer-Veith
plate before they go in a battle file. Headings: Roman ~200 (facing SSW with
the river on the right hand), Carthaginian ~20.

### 1. `first-light-crossing` - First light: Varro leads the army over the river (~05:00)

- **Time.** Pol III.113: "as soon as the sun was above the horizon, Gaius
  Terentius got the army in motion from both the camps". Liv XXII.45: Varro
  "without consulting his colleague, displayed the signal for battle, and
  forming his troops, led them across the river. Paulus followed". This is the
  one source-pinned instant of the day.
- **Roman units.** Larger camp's troops crossing the ford from the left bank
  and forming on the right bank; the smaller camp's troops joining "in the same
  line" (Pol III.113). All three intact, formation `column` while crossing.
  Position: at the ford by the larger camp, ~1.8 km upstream of the smaller.
- **Carthaginian units.** Still in camp on the left bank, upstream of the larger
  Roman camp. Intact.
- **Captions.**
  - Pol III.113: "When he took over the command on the following day, as soon
    as the sun was above the horizon, Gaius Terentius got the army in motion
    from both the camps."
  - Liv XXII.45: "Paulus followed, because he could better disapprove of the
    proceeding, than withhold his assistance."

### 2. `both-armies-formed` - Both armies formed, the Romans facing south (~07:30)

- **Time.** No figure. Two to three hours to pass some 76,000 men over a ford
  and dress a line is a guess; Livy has the sun "obliquely" on both lines
  (XXII.46), so still morning.
- **Roman units.** Pol III.113: citizen cavalry "on the right wing along the
  river"; the foot "next them in the same line, placing the maniples, however,
  closer together than usual, and making the depth of each maniple several
  times greater than its front"; allied cavalry "on the left wing"; light-armed
  "slightly in advance of the whole army". Facing south. All intact,
  `line`. The infantry mass is the one place `column` might be argued
  (depth several times the front), but it is a line of maniples; write `line`
  and put the depth in the caption.
- **Carthaginian units.** Pol III.113: Balearic slingers and spearmen across
  first and in front; the main body crossed "at two spots" and drawn up
  opposite. From the river outward: Spanish-Gallic cavalry (Hasdrubal), half
  the Libyans, the Spanish-Gallic centre, the other Libyans, the Numidians.
  Hannibal "advanced with the central companies of the Iberians and Celts; and
  so arranged the other companies next these in regular gradations, that the
  whole line became crescent-shaped, diminishing in depth towards its
  extremities" (Pol III.113); Liv XXII.47 calls the projecting centre "that
  part of the enemy's line in the form of a wedge". The convex bow faces the
  Romans; the Libyans are held back as a reserve. All intact; the centre is
  `line` with the crescent in the caption (as at Trafalgar); the Libyans
  `line`, heading 20.
- **Wind (Livy only).** From the south-east, "blowing violently" into the Roman
  faces: `{ "from": 135, "force": "fresh" }`.
- **Captions.**
  - Pol III.113: "his object being to have his Libyans as a reserve in the
    battle, and to commence the action with his Iberians and Celts."
  - Pol III.114: "And as the Roman line faced the south, as I said before, and
    the Carthaginian the north, the rays of the rising sun did not
    inconvenience either of them."
  - Liv XXII.46: "The wind, which the inhabitants of the district call the
    Vulturnus, blowing violently in front of the Romans, prevented their
    seeing far by rolling clouds of dust into their faces."

### 3. `light-troops-and-cavalry-clash` - Skirmishers open; the cavalry close on the river (~08:30)

- **Time.** No figure. Sequence only: Pol III.115 "The battle was begun by an
  engagement between the advanced guard of the two armies"; Liv XXII.47 "the
  battle commenced in the first place with the light-armed troops: then the
  left wing, consisting of the Gallic and Spanish cavalry, engages with the
  Roman right wing".
- **Roman cavalry.** Engaged head-on against Hasdrubal, unable to manoeuvre:
  "as on one side the river, on the other the line of infantry hemmed them in,
  there was no space left at their flanks for evolution" (Liv XXII.47). Men
  dismount and fight on foot (both sources). Strength 1, state engaged.
- **Roman infantry.** Intact; the velites in front are skirmishing but the
  legions have not closed.
- **Allied cavalry.** Pinned by the Numidians "charging them first on one side
  and then on another" (Pol III.116); Livy has the fight "at first languid"
  (XXII.48) while 500 Numidian false deserters are led to the Roman rear. State
  engaged.
- **Hasdrubal's cavalry.** Engaged. **Numidians.** Engaged, harassing. The
  three infantry units intact.
- **Captions.**
  - Pol III.115: "as soon as the Iberian and Celtic cavalry got at the Romans,
    the battle began in earnest, and in the true barbaric fashion: for there
    was none of the usual formal advance and retreat; but when they once got to
    close quarters, they grappled man to man, and, dismounting from their
    horses, fought on foot."
  - Liv XXII.47: "for they were obliged to engage front to front; for as on
    one side the river, on the other the line of infantry hemmed them in, there
    was no space left at their flanks for evolution."

### 4. `roman-cavalry-destroyed` - Hasdrubal breaks the Roman horse; the lines of foot meet (~09:00)

- **Time.** No figure. Liv XXII.47: the cavalry fight "was more violent than
  lasting"; "About the conclusion of the contest between the cavalry, the
  battle between the infantry commenced."
- **Roman cavalry.** Broken, "chasing the remainder along the river, slaying
  as they went and giving no quarter" (Pol III.115). State broken, strength
  ~0.2, position drifting north-west along the river bank. Paullus, wounded by
  a sling stone early (Liv XXII.49), leaves this unit for the centre (Pol
  III.116); caption matter.
- **Roman infantry.** Engaged: "the legionaries took the place of the
  light-armed and closed with the enemy" (Pol III.115). Advancing south into
  the bow of the crescent.
- **Spanish-Gallic centre.** Engaged, holding for now: "For a short time the
  Iberian and Celtic lines stood their ground and fought gallantly" (Pol
  III.115). The Libyans on both flanks still intact, not yet in contact
  because "the two wings did not come into action at the same time as the
  centre" (Pol III.115).
- **Hasdrubal's cavalry.** Engaged, pursuing along the river.
- **Captions.**
  - Liv XXII.47 (Roberts): "It had become mainly a struggle of infantry,
    fierce but short, and the Roman cavalry was repulsed and fled."
  - Pol III.115: "then the legionaries took the place of the light-armed and
    closed with the enemy."

### 5. `centre-gives-ground` - The centre gives ground; the crescent turns concave (~09:45)

- **Time.** No figure; Livy's "after long and repeated efforts" (XXII.47)
  suggests the longest interval of the day.
- **Roman infantry.** Engaged, pressing forward into the retiring centre and
  bunching toward it: "the Romans had closed up from the wings towards the
  centre and the point of danger ... advanced so far, that the Libyan
  heavy-armed troops on either wing got on their flanks" (Pol III.115).
  Position moving south; formation still `line` in name, a dense mass in
  fact. Strength ~0.95.
- **Spanish-Gallic centre.** Engaged, retiring: "overpowered by the weight of
  the heavy-armed lines, they gave way and retired to the rear, thus breaking
  up the crescent" (Pol III.115). Position moves south past the line of the
  Libyans, so that the bow becomes a hollow: "at first rendered the line
  level, but afterwards, by the pressure, made a curvature in the centre"
  (Liv XXII.47). **This is the feigned withdrawal**: the unit's own motion
  shows a retreat and only the caption can say it was planned ("as Hannibal
  had planned", Pol III.115). Strength ~0.8 (Pol III.117: 4,000 Celts and
  1,500 Iberians and Libyans fell in the whole battle).
- **Libyans, both.** Intact until this phase, now wheeling inward: "Those on
  the right, facing to the left, charged from the right upon the Roman flank;
  while those who were on the left wing faced to the right, and, dressing by
  the left, charged their right flank" (Pol III.115). Headings tween from ~20
  to ~110 (river-side unit faces east) and ~290 (open-flank unit faces west),
  a quarter turn each, which the tween can carry without an intermediate
  phase. Intent moves pointing at the Roman flanks make the pincer legible
  before the positions arrive.
- **Hasdrubal's cavalry.** Engaged; having "all but annihilat[ed] the cavalry
  by the river" he "came from the left to the support of the Numidians" (Pol
  III.116). Position tweens east behind the Roman rear; author an
  intermediate position north of the Roman infantry so the track does not cut
  through it. A `detachment` move is wrong here (the whole unit goes); an
  `intent` move to the allied cavalry's position says where he is riding.
- **Allied cavalry / Numidians.** As phase 3; the 500 false deserters fall on
  the Roman rear about now (Liv XXII.48), caption matter.
- **Captions.**
  - Pol III.115: "The Roman maniples followed with spirit, and easily cut
    their way through the enemy's line; since the Celts had been drawn up in a
    thin line, while the Romans had closed up from the wings towards the centre
    and the point of danger."
  - Liv XXII.47: "the Africans, who had now formed wings on each side of
    them, surrounded the Romans on both sides, who incautiously rushed into the
    intermediate space; and presently extending their wings, enclosed the
    enemy on the rear also."

### 6. `allied-cavalry-flees` - Hasdrubal appears behind the allied horse; it flees (~10:15)

- **Time.** No figure. Sequence: after the Roman cavalry is destroyed and the
  infantry is already inside the pincer (Pol III.116 opens with the Numidians
  "meanwhile" engaging the allied horse).
- **Allied cavalry.** Broken: "the Roman allied cavalry, seeing his charge
  approaching, broke and fled" (Pol III.116). Strength ~0.1 (Pol III.117:
  "about three hundred of the allied cavalry" escaped to nearby towns). Varro
  goes with them (Pol III.116, Liv XXII.49: "with about seventy horse").
- **Numidians.** Engaged; "he left the pursuit to them" (Pol III.116); Livy
  XXII.48 has Hasdrubal "withdrawing the Numidians ... sends them in pursuit of
  the scattered fugitives". A `detachment` move toward Venusia / off the
  eastern edge of the extent shows the pursuit while the unit's marker stays
  on the field.
- **Hasdrubal's cavalry.** Engaged, turning back west: "he himself hastened to
  the part of the field where the infantry were engaged, and brought his men up
  to support the Libyans" (Pol III.116). Heading tweens through the north
  (from ~90 to ~200 via ~0 needs an intermediate phase or the tween resolves
  the wrong way; phase 7 supplies it).
- **Roman infantry.** Engaged, both flanks struck by the Libyans. Strength
  ~0.9. Libyans and centre engaged.
- **Captions.**
  - Pol III.116: "But when Hasdrubal, after all but annihilating the cavalry
    by the river, came from the left to the support of the Numidians, the
    Roman allied cavalry, seeing his charge approaching, broke and fled."
  - Pol III.116: "Seeing the Numidians to be strong in numbers, and more
    effective and formidable to troops that had once been forced from their
    ground, he left the pursuit to them; while he himself hastened to the part
    of the field where the infantry were engaged."

### 7. `encirclement` - The circle closes; Paullus falls (~11:00)

- **Time.** No figure.
- **Roman infantry.** Broken: "Still they fought, though no longer in line,
  yet singly, or in maniples, which faced about to meet those who charged them
  on the flanks" (Pol III.115); "the outer files of the circle continually
  falling, and the circle becoming more and more contracted" (Pol III.116).
  State broken; strength stepping down (0.6 here, lower in phase 8). Paullus,
  Servilius and Atilius die in this phase (Pol III.116); Livy's Lentulus scene
  and the dismounted Roman cavalry fighting to the last around Paullus (Liv
  XXII.49) are caption matter.
- **Hasdrubal's cavalry.** Engaged on the Roman rear: "by charging the Roman
  legions on the rear, and harassing them by hurling squadron after squadron
  upon them at many points at once" (Pol III.116). Position north of the Roman
  mass, heading ~200.
- **Libyans, centre.** Engaged on the flanks and front; the centre "rallied"
  is an inference (Livy XXII.48 has the Africans "almost weary with slaying
  rather than fighting" and the Spanish-Gallic horse sent to help them).
- **Numidians.** Engaged, off pursuing (Pol III.116: "the Numidian horse were
  pursuing the fugitives, most of whom they cut down").
- **Captions.**
  - Pol III.116: "As long as the Romans could keep an unbroken front, to turn
    first in one direction and then in another to meet the assaults of the
    enemy, they held out; but the outer files of the circle continually
    falling, and the circle becoming more and more contracted, they at last
    were all killed on the field".
  - Liv XXII.49: "Go and tell the fathers publicly, to fortify the city of
    Rome, and garrison it strongly before the victorious enemy arrive: and tell
    Quintus Fabius individually, that Lucius Aemilius lived, and now dies,
    mindful of his injunctions."

### 8. `annihilation-and-the-camps` - The Roman army dies where it stands; Hannibal takes the camps (~14:00, end ~17:00)

- **Time.** No figure. Pol III.117 has Hannibal "by this time gaining a victory
  all along the line" when he turns to the camp guard, so the two are
  overlapping; the last Roman formations on the field and the storming of the
  larger camp both fall after midday on any reckoning. End of the last phase:
  late afternoon, when "the Numidian horse brought in all those who had taken
  refuge in the various strongholds about the district" (Pol III.117); Livy's
  survivors reach the two camps and the village of Cannae (XXII.49) and plan
  their night escape to Canusium (XXII.50).
- **Roman infantry.** Destroyed. Pol III.117: "of those who were actually
  engaged only about three thousand perhaps escaped ... all the rest died
  nobly, to the number of seventy thousand"; Livy XXII.49: "Forty thousand
  foot, two thousand seven hundred horse ... are said to have been slain".
  Strength 0.05.
- **Roman cavalry, allied cavalry.** Destroyed: of six thousand horse "only
  seventy escaped with Gaius Terentius to Venusia, and about three hundred of
  the allied cavalry to various towns" (Pol III.117).
- **Carthaginian units.** All engaged; Hasdrubal's cavalry and the Numidians
  bringing in the fugitives. If the camp-guard units are played, this is where
  Hannibal "routing the Romans, shut them up in their own camp; killed two
  thousand of them; and took all the rest prisoners" (Pol III.117).
- **Captions.**
  - Pol III.117: "out of six thousand horse, only seventy escaped with Gaius
    Terentius to Venusia".
  - Liv XXII.49: "Seven thousand escaped to the lesser camp, ten to the
    greater, about two thousand to the village itself of Cannae".

## Where the sources disagree (summary)

| Item | Polybius | Livy | Notes |
|------|----------|------|-------|
| Carthaginian right-wing commander | Hanno (III.114) | Maharbal (XXII.46) | Use Polybius in the roster; Livy in `notes`. |
| Roman centre | Atilius and Servilius (III.114) | Servilius (XXII.45); Livy later lists Minucius among the dead (XXII.49) | Caption matter. |
| Roman numbers | 80,000 foot, 6,000+ horse, 10,000 foot in camp (III.113, 117) | Not restated for the field; 40,000 foot and 2,700 horse slain, 3,000 foot and 300 horse captured (XXII.49) | Polybius's 70,000 dead against Livy's 40,000 is the famous gap; neither affects wing granularity. |
| Escape of Varro | to Venusia with 70 horse (III.117) | to Venusia "with about seventy horse" (XXII.49) | Agree. |
| Wind | none | Volturnus (SE) in the Roman faces, "violently" (XXII.43, 46) | If wind is tracked it must be tracked in every phase; from 135, fresh, unchanging. |
| Numidian false deserters | none | 500 feign desertion, then attack the Roman rear (XXII.48) | Caption matter for phase 5 or 6. |
| Shape of the centre | crescent, convex toward the enemy, thinning to the wings (III.113) | "in the form of a wedge, which projected beyond the rest" (XXII.47) | Both mean a forward bow; `line` plus caption either way. |
| Who orders the crossing | Varro on his day of command, Paullus opposed (III.110, 113) | Same, with the altercation (XXII.44-45) | Agree. |
| Times of day | sunrise for the move out (III.113) | daybreak (XXII.46); sun oblique at deployment | Nothing else in either source. |

## Battle clock: what precision is honest

- One fix: the Romans left camp at sunrise (~05:00 local solar). Everything
  after is sequence. The honest statement is "sunrise; then five to seven
  hours of fighting in a fixed order".
- `t` values should be authored to the hour or half-hour with `notes` on each
  phase saying they are estimates. Nothing finer than the schema's `HH:MM`
  minimum is claimed, and the file should not imply quarter-hour knowledge the
  way Trafalgar's logs allow.
- A `playback_rate` plan: phase 1 compressed hard (two hours of fording), 2
  moderately, 3-7 slow (the decisive ninety minutes), 8 fast.
- Alternative pinning if the hour estimates feel dishonest: keep `t` at even
  spacing and say so in `notes`. The schema has no uncertainty field by
  decision (ADR-0001), so the choice is caption and notes matter either way.

## Implications for `cannae.json`

- **Extent** (landscape, Kromayer site): north 41.38, south 41.25, west
  16.05, east 16.30; `scale_unit` `km`. This also holds the two camps, the
  hill and the river mouth; Venusia and Canusium lie outside and are move
  targets or captions.
- **Positions.** Sketch for the deployed lines on the Kromayer reading, to be
  corrected against the atlas plate: Roman line centred ~41.330 N, 16.185 E,
  with `roman-cavalry` at its north-west end on the river (~41.336 N,
  16.170 E) and `allied-cavalry` at the south-east end (~41.322 N, 16.205 E);
  Carthaginian line ~1 km to the south-south-west with `hasdrubal-cavalry` on
  the river opposite the Roman horse and `numidians` opposite the allied
  horse. Larger Roman camp and Hannibal's camp on the left bank upstream of the
  ford; smaller Roman camp on the right bank ~1.8 km downstream. **These
  coordinates are the author's geometry from the prose and have no source.**
- **Headings.** Romans 200, Carthaginians 20 throughout, except the Libyans'
  inward quarter-turns in phase 5 and Hasdrubal's cavalry, whose ride around
  the Roman rear needs its own intermediate positions in phases 5-7 so the
  track skirts the Roman mass rather than crossing it.
- **Formations.** Everything is `line`; the crescent, the deep maniples and
  the wedge are caption words. `column` appears only in phase 1 while
  crossing.
- **Moves.** Libyan intent arrows onto the Roman flanks (phase 5); Hasdrubal
  intent arrow toward the allied cavalry (phase 5); Numidian detachment arrow
  off toward Venusia (phases 6-8). The feigned withdrawal is not a move: it is
  the centre's own motion plus a caption.
- **Wind.** Optional. Livy alone supplies it; if used, `{ "from": 135,
  "force": "fresh" }` in every phase and a `notes` line saying Polybius is
  silent.
- **Sources table.** `polybius-shuckburgh` (Gutenberg #44125 or the Perseus
  chapter pages; `public-domain`), `livy-spillan` (Gutenberg #10907;
  `public-domain`) or `livy-roberts` (Perseus 1999.02.0144; `public-domain`),
  `usma-cannae-1` and `usma-cannae-2` (Commons SVGs; `public-domain` with a
  `license_note` carrying the USMA credit request). All four sit below the
  file's `CC-BY-4.0`.

## What v1 cannot express

1. **Land unit types.** No field says cavalry, heavy infantry, light infantry
   or elephants (none at Cannae). The renderer draws the same ticks for
   Hasdrubal's horse and the Libyan foot; only the `label` tells them apart.
   The battle is legible without it, but a legend that keyed arm would help.
2. **Formations beyond column and line.** The crescent, its inversion to a
   hollow, the Roman mass "several times deeper than its front", and Livy's
   wedge all become `line` plus prose, as the Trafalgar crescent did. Cannae
   is the battle where a formation *changing shape* is the story, and v1 can
   only narrate it.
3. **The river.** The map file admits only `land` polygons and `place` points;
   a `LineString` is a validation error, so the Aufidus cannot be drawn.
   Everything on the Cannae extent is land, so the map would be blank
   parchment with labels. A workable hack within v1: draw the river as a gap
   in the land polygon (the schema says everything not covered by land is
   sea), which renders a water strip without a new feature kind. A `river`
   kind is the honest fix and the schema note already reserves it for the
   land-battle generalisation.
4. **A unit at a camp.** A camp can be a `place` point, and a unit can be
   positioned on it, but nothing says "in camp" versus "in the field";
   `intact` covers the state. The two camp guards are optional units anyway.
5. **Encirclement.** The Roman mass being surrounded is shown by the six
   Carthaginian markers ringing one Roman marker; no field expresses "cut
   off". `state: broken` and a falling `strength` carry it.
6. **Envelopment moves.** Hasdrubal's ride is a unit's own motion (a track),
   not a move, so the schema handles it, but only if phases are dense enough
   that the linear tween does not pass through the Roman infantry. That is an
   authoring cost, not a schema gap.
7. **Two commanders per unit and a commander who changes units.** Paullus
   commands the cavalry, then dies in the infantry centre; Hannibal and Mago
   share the centre. `commander` is one string and stays put; caption matter,
   as ADR-0010 intends.
8. **Battle-clock honesty.** No uncertainty field, by decision, so eight
   estimated `t` values look exactly as authoritative as Trafalgar's logged
   ones. `notes` must say so on every phase.

## Open follow-ups

- **Kromayer-Veith plate not seen.** The Heidelberg digitisation refused
  automated access and the Internet Archive item was not opened; the positions
  above are prose geometry. Someone should read the Cannae plate (1922,
  Römische Abteilung) and correct the sketch coordinates, and confirm the
  scan's licence statement so it can be listed as a source with a `url`.
- **Loeb Polybius on LacusCurtius** could not be fetched past chapter 52;
  its chapter anchors for 107-117 are unverified.
- **Perseus Livy**: the Roberts text is at doc id `1999.02.0144`, not the
  `0146` one would guess from the Polybius pattern; chapters 46-48 were
  checked, 44, 45 and 49 were not.
- **Goldsworthy's figures** (2 km plain, 3 km Roman frontage, 4 km from the
  smaller camp to the sea) were read in an online extract, not the book, and
  should be treated as unverified.
- **Ancient river course**: unknown; every position is conditional on the
  Kromayer reading. A `notes` line on phase 2 should say which reading the
  file follows.
- **Canusium and Venusia coordinates** were not looked up; needed if they are
  move targets.
- **Appian** (Hann. 17-26) was not read; he adds a third narrative with
  further colour (the wind, an ambush in a ravine) that some authors distrust.
