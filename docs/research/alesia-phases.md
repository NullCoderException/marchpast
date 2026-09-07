# Alesia phase list at sector granularity

*Research note for GitHub issue #122 (part of the wayfinder map, #121). Written 2026-09-07.*

## Question

What is the phase list for the siege of Alesia (52 BC) at the level a plate can
draw: how the six-week investment gets its place without forty days of empty
clock, where the day offsets (ADR-0013) land and what precision Caesar's time
words allow; which units stay under sixteen at one level (ADR-0017) and where a
coarser level is the honest one; positions, headings, formation, state,
strength and moves per phase; what the two lines, the camps and the redoubts
need from a `work` that is a point (ADR-0012), and what the excavated traces
give as geometry; the terrain, rivers and a plan to trace against; the
public-domain sources with locators and licences; and everything schema v2 and
the map format cannot express.

## Short answer

**Twelve phases over six days, nine units at one level, and a battle clock
honest to the watch.** The battle file should open on the day the relief army
arrives (Caesar VII.79), with the investment finished and narrated in the first
caption, not on the day Caesar sat down before the town six weeks earlier: the
sources give no number of days between the two, so an authored `day: 41` would
assert a count nobody has, and `dates` would need forty invented strings.
Within the six days Caesar gives ten time words and a firm sequence, three of
them clock-pinned ("from noon almost to sunset", "at midnight", "when noon now
seemed to draw nigh"); everything else below is sequence plus an author's
estimate. The nine units are the four Roman sectors of the ring (the plain,
the north camp under Mont Réa, the Montagne de Bussy, the Montagne de
Flavigny), the Roman and Germanic cavalry, Vercingetorix's besieged army, the
relief army's foot, its horse, and Vercassivellaunus's sixty thousand, which is
the one detachment large enough and decisive enough to be a marker of its own.
A finer level would be mostly invention and is not recommended.

| # | id | Label | day / t | Plain lines | North camp | Bussy (Labienus) | Flavigny camps | Roman cavalry | Besieged (Vercingetorix) | Relief foot | Relief horse | Vercassivellaunus |
|---|----|-------|---------|-------------|------------|------------------|----------------|---------------|--------------------------|-------------|--------------|-------------------|
| 1 | `relief-army-arrives` | The relief army camps on the outer hill | 0 / ~16:00 est. | intact, in the lines, heading W | intact, under Réa | intact, on Bussy | intact, on Flavigny | intact, in the plain camps | intact, in the camp under the east wall | intact, column arriving on the Mussy-la-Fosse hill | intact, with the foot | intact, stacked with the foot |
| 2 | `relief-fills-the-plain` | The relief horse fills the plain; the besieged come out before the town | 1 / ~09:00 est. | intact, manned | intact | intact | intact | intact, in camp | intact, line on the west slope, filling the nearest ditch | intact, line on the lower heights | intact, line across the plain, heading E | intact, stacked |
| 3 | `cavalry-battle-noon` | The cavalry battle in the plain opens | 1 / 12:00 | intact, drawn up on the works | intact | intact | intact | **engaged**, in the plain, heading W | intact, watching | intact | **engaged** | intact |
| 4 | `germans-break-the-gallic-horse` | The Germans charge; the Gallic horse flees to camp | 1 / ~17:30 est. | intact | intact | intact | intact | engaged, pursuing to the Gallic camp | intact, back in the town "dejected" | intact | **broken**, ~0.8, fleeing SW | intact |
| 5 | `midnight-assault-on-the-plain` | Midnight: the relief storms the plain works and Vercingetorix sallies | 3 / 00:00 | **engaged**, both faces | intact | intact (detachment to the plain) | intact (detachment to the plain) | engaged, in camp | intact, out of the town, filling the trenches (intent at the inner line) | **engaged**, at the outer works, heading E | engaged, in camp | intact |
| 6 | `dawn-repulse` | Day comes; the Gauls draw off, the besieged too late | 3 / ~05:30 est. | engaged | intact | intact | intact | engaged | intact, back in the town | engaged, ~0.9, back on the hill | engaged | intact |
| 7 | `sixty-thousand-behind-rea` | Before dawn: Vercassivellaunus hides behind Mont Réa | 4 / ~05:30 est. | engaged | intact | intact | intact | engaged | intact | engaged, in camp | engaged, in camp | intact, mass north of Réa, heading SE |
| 8 | `noon-triple-assault` | Noon: the north camp, the plain and the town attacked at once | 4 / 12:00 | engaged | **engaged**, heading NW | engaged | engaged | engaged, in camp | **engaged**, out at every point | engaged, demonstrating before the camp | engaged, at the plain works | **engaged**, on the north camp |
| 9 | `crisis-at-the-north-camp` | Labienus goes to the north camp; Vercingetorix turns to the steep ground | 4 / ~14:00 est. | engaged | engaged, "no longer arms or strength" | engaged, moving W along the lines to Réa | engaged, heading N (detachments: Brutus, Fabius) | engaged | engaged, at the foot of Flavigny, heading S | engaged | engaged | engaged |
| 10 | `caesar-rides-to-rea` | Caesar's cloak: four cohorts and the horse strike the rear | 4 / ~16:00 est. | engaged | engaged | engaged, at Réa with forty cohorts | engaged (detachment: Caesar's four cohorts) | engaged, moving N, detachment round the outer line to the Gallic rear | engaged, repulsed | engaged | engaged | **broken**, ~0.4, heading SE, turning |
| 11 | `rout-and-withdrawal` | Sunset: the relief flies; the besieged go back into the town | 4 / ~18:00 est. | engaged | engaged | engaged | engaged | engaged, at Réa (detachment SW: the midnight pursuit) | engaged, in the town | **broken**, ~0.5, leaving the hill SW | broken, ~0.5 | **destroyed**, ~0.1 |
| 12 | `surrender` | Vercingetorix is delivered up before the camp | 5 / ~12:00 est. (end ~15:00) | engaged | engaged | engaged | engaged | engaged | **destroyed**, 0, arms laid down | destroyed, dispersed | destroyed | destroyed |

Day 2 has no phase: Caesar's "after the interval of a day" is one day of
hurdle-making that the caption of phase 4 can carry. If fewer phases are
wanted, merge 2 into 3 and 6 into 7; phases 5, 8, 9 and 10 must stay separate,
since each is a moment where Caesar describes different units doing different
things at once, and 9 and 10 are the state changes ADR-0018 says to split on. An
optional thirteenth phase at day 5 00:00, "immediately after midnight, the
cavalry are sent out", is source-pinned but changes only an arrow; it is folded
into 11 here.

## The model-extraction test

As the ticket's standing practice suggests, a first draft of the phase list
was extracted by a model given nothing but the McDevitte text of VII.68-90 and
told to count from the relief army's arrival. It produced twelve phases on the
same six-day frame as the hand reading (arrival day 0; cavalry battle day 1;
quiet day 2; midnight assault opening day 3; the sixty thousand's night march
day 3 to 4; noon assault day 4; surrender day 5) and flagged the same four
ambiguities recorded under "Battle clock" below. Its per-unit cells were
right in substance and wrong in two details: it had the besieged "sally" during
the cavalry battle (Caesar has them come out before the town and cheer, VII.79
to 80), and it folded Vercingetorix's move to the steep ground (VII.86) into the
general crisis rather than treating it as its own picture. It also noted, of
its own accord, that the sixty thousand "does not yet exist" before day 3,
which is the schema gap recorded at the end. Verdict: the extraction is a sound
skeleton; the corrections were in emphasis and in what the schema needs, not
in sequence.

## Sources consulted

All free and public domain unless noted. Caesar was read in full in the
Gutenberg McDevitte text and in the Latin; the Perseus pages, the Loeb scan and
Napoleon III's chapter were used to check quotations, chapter breaks and the
siting.

| Key | Source | Where | Licence |
|-----|--------|-------|---------|
| **Caes** | Caesar, *De Bello Gallico* VII.68-90, trans. W. A. McDevitte and W. S. Bohn (Harper, 1869) | Gutenberg #10657, plain text https://www.gutenberg.org/cache/epub/10657/pg10657.txt (Book VII chapters LXVIII-XC). **The Gutenberg text has no heading for chapter LXXXIX**: everything from "Immediately after midnight, the cavalry are sent out" to the distribution of captives sits under LXXXVIII. The same translation chapter by chapter on Perseus, https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0001:book=7:chapter=68 (fetched: 68, 69, 72, 73, 74, 83, 88); Perseus has no chapter 89 either (the URL is an "invalid query"), and its 88 runs to the end. Locators below cite the standard chapter, with "(in 88 on Gutenberg and Perseus)" where it matters. Perseus marks its digitisation CC BY-SA 3.0 US; the 1869 translation is public domain and schema 2.2 says the source's licence is the work's, not the transcription's. | Public domain |
| **Caes-Lat** | Caesar, *De Bello Gallico* VII, Latin, ed. T. Rice Holmes | Perseus https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.02.0002:book=7:chapter=89 (chapter 89 fetched and confirmed to open "Postero die Vercingetorix concilio convocato"); the same text on the Latin Library, https://www.thelatinlibrary.com/caesar/gall7.shtml, where 88.7 is "De media nocte missus equitatus" and 89 begins "Postero die". Used for the time words. | Public domain (text); the Latin Library states no licence, used for uncopyrightable text only |
| **Caes-Loeb** | Caesar, *The Gallic War*, trans. H. J. Edwards, Loeb 72 (Heinemann, 1917) | Internet Archive https://archive.org/details/gallicwar00caes , OCR text at https://archive.org/download/gallicwar00caes/gallicwar00caes_djvu.txt (VII.80 is p. 498). The OCR is readable for VII.68-90 once whitespace is collapsed; quotations below were checked in it. Edwards keeps the "forty cohorts" of VII.87 that McDevitte drops. | Public domain (US, 1917; Edwards d. 1923) |
| **Plut** | Plutarch, *Caesar* 27, trans. Bernadotte Perrin, Loeb (1919) | Perseus https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0244:chapter=27 (fetched; not `2008.01.0130`, which is the Greek). Dryden's translation at http://classics.mit.edu/Plutarch/caesar.html is an alternative. | Public domain (US, 1919); Perseus digitisation CC BY-SA 3.0 US |
| **Dio** | Cassius Dio, *Roman History* XL.39-41, trans. Earnest Cary, Loeb vol. III (1914) | LacusCurtius https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cassius_Dio/40*.html#39 (fetched; the page states "The text is in the public domain") | Public domain |
| **Nap** | Napoléon III, *Histoire de Jules César*, tome 2 (Plon, 1865), livre III ch. 10, sections XI-XIII (the siege and the 1862-65 excavations) | Wikisource https://fr.wikisource.org/wiki/Histoire_de_Jules_C%C3%A9sar/Livre_III/Chapitre_10 (fetched in full through the parse API); tome 2 on the Internet Archive https://archive.org/details/histoiredejulesc02napo | Public domain (author d. 1873) |
| **Nap-25** | *Histoire de Jules César*, atlas du tome 2 (Plon, 1866), planche 25 "Plan d'Alesia" (Stoffel's survey, engraved by Erhard Schièble), planches 27-28 "Détails des travaux romains à Alesia" | Whole atlas as a DjVu on Commons, tagged PD-old-70 / PD-scan: https://commons.wikimedia.org/wiki/File:Louis_Napol%C3%A9on_Bonaparte_-_Histoire_de_Jules_C%C3%A9sar,_atlas_du_tome_2,_Plon_1866.djvu ; scanned from Internet Archive https://archive.org/details/bub_gb_aal5nGZv0lIC (Public Domain Mark). Single-plate JPEGs exist (…Planche_25.jpg, 1,304 x 1,867 px) but their uploader mis-tagged an 1866 engraving CC BY-SA "own work"; cite the DjVu. Gallica arks (bpt6k243365) were unreachable (403). | Public domain |
| **Reddé** | Michel Reddé, *Autour d'Alésia* (UNA éditions, open access), esp. "Alésia, du texte de César aux vestiges archéologiques", "L'avenir d'Alésia", "Alésia et la guerre des Gaules", "Titulum et clavicula" | https://una-editions.fr/29-alesia-du-texte-de-cesar-aux-vestiges-archeologiques , https://una-editions.fr/32-l-avenir-d-alesia/ , https://una-editions.fr/33-alesia-et-la-guerre-des-gaules/ , https://una-editions.fr/31-titulum-et-clavicula/ | In copyright, open access; **research only**, not a shipped source. Facts, not text, are taken from it. |
| **R-vS** | M. Reddé and S. von Schnurbein (eds), *Alésia. Fouilles et recherches franco-allemandes sur les travaux militaires romains autour du Mont-Auxois (1991-1997)*, Mém. AIBL XXII (2001); the interim report in *Ber. RGK* 76 (1995) 73-158; the CRAI 1993 note | AIBL page https://aibl.fr/collections/tome-22-... ; Persée CRAI 1993 https://www.persee.fr/doc/crai_0065-0536_1993_num_137_2_15213 (first page only; the PDF returned 403); BSNAF 1997 https://www.persee.fr/doc/bsnaf_0081-1181_2001_num_1997_1_11241 (first page). **The monograph itself was not read.** | In copyright; research only |
| **LeGall** | J. Le Gall, soundings at Venarey-les-Laumes, BSNAF 1966 | https://www.persee.fr/doc/bsnaf_0081-1181_1967_num_1966_1_7490 | In copyright; research only (ditch profiles) |
| **MuséoParc** | MuséoParc Alésia, "Discovery trail" | https://alesia.com/en/discovery-trail/ | Site text, unlicensed; research only (camp A, B, castellum 11 figures; the 15 km / 21 km lengths) |
| **RR** | J. T. Ramsey and K. A. Raaflaub, "Reconstructing the Chronology of Caesar's Gallic Wars", *Histos* 11 (2017), and "Chronological Tables for Caesar's Wars", *Histos* 12 (2018) | https://histos.org/index.php/histos/article/download/363/357/366 , https://histos.org/index.php/histos/article/download/369/363 | Authors' rights reserved; research only (the calendar) |
| **Liv** | Livius.org, "Alesia (52 BCE)" (Jona Lendering) | https://www.livius.org/articles/battle/alesia-52-bce/ | Copyright Livius.org; research only (a second modern day sequence) |
| **USMA** | "Siege of Alesia, 52 BC", Dept. of History, US Military Academy, animated GIF | https://commons.wikimedia.org/wiki/File:Siege_of_Alesia,_52_BC.gif (710 x 380) | Public domain (US federal work, 17 USC 105). Its key swaps the words circumvallation and contravallation. Too coarse to trace; usable as a source with a `url` for the general layout. |
| **Cr64** | "Siège Alésia -52", Cristiano64 (a relabelled "Battaglia di Alesia fortificazioni") | https://commons.wikimedia.org/wiki/File:Si%C3%A8ge_Al%C3%A9sia_-52.png (2,684 x 1,884) | GFDL 1.2+ and CC BY-SA 3.0: **share-alike, cannot be a battle-file source** (2.10 rule 12). Consulted for the numbered castella and the spot heights only. |
| **WD** | Wikidata items Q273573, Q31394264, Q835966, Q3555769, Q3330857, Q193421, Q333734, Q226760, Q224460, Q3359205, Q3359211, Q909082 | https://www.wikidata.org/wiki/Special:EntityData/Q273573.json etc. | CC0 (coordinates) |
| **WP** | Wikipedia "Battle of Alesia" (en), "Alise-Sainte-Reine", "Mont Auxois", "Oze", "Ozerain", "Brenne", "Vercassivellaunos" (fr) | https://en.wikipedia.org/wiki/Battle_of_Alesia | CC BY-SA; research only (the infobox date is uncited) |
| **OT** | OpenTopography SRTM GL1 public bucket | https://opentopography.s3.sdsc.edu/raster/SRTM_GL1/SRTM_GL1_srtm/N47E004.tif (verified, 11.6 MB GeoTIFF); dataset page https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1 ; NASA statement https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003 ("openly shared, without restriction") | Public domain (NASA); OpenTopography asks for an acknowledgement |

Caesar is the only narrative that matters: Plutarch adds two numbers and the
surrender tableau, Dio adds the fate of the Mandubii and the lilia, and neither
adds a time of day. Napoleon III's chapter is the first siting of every event
on the ground and is still, per Reddé, "dans leur ensemble, valides"; the
1991-97 excavations are the correction to it.

## Fixed reference points

- **Mont Auxois** (the oppidum): plateau centre 47.5362 N, 4.5011 E (WD
  Q31394264), summit 407 m (WP fr); the plateau is "une ellipse longue de 2 100
  mètres, et large de 800 mètres" rising "de 160 à 170 mètres au-dessus des
  vallées environnantes" (Nap XIII). West tip, the Vercingetorix monument:
  47.5386 N, 4.4906 E (WD Q3555769). Alise-Sainte-Reine village on the west
  slope: 47.5367 N, 4.49 E, commune 237-407 m (WD Q273573).
- **The plain of Les Laumes**, west of the hill between the Oze and the
  Ozerain, bounded on the west by the Brenne: Caesar's "plain of about three
  miles in length" (VII.69; Nap: "3 000 pas ou 4 400 mètres"). Floor about
  230-245 m (commune minima, WD). MuséoParc, on the line of the works in the
  plain: 47.5358 N, 4.4689 E (WD Q3330857). Venarey-les-Laumes 47.5419 N,
  4.4453 E.
- **The rivers.** Caesar: "Two rivers, on two different sides, washed the foot
  of the hill" (VII.69). The **Oze** (the ticket's Ose) runs west along the
  north foot to the Brenne at Venarey-les-Laumes; the **Ozerain** (Oserain)
  runs west along the south foot to the Brenne "au pied du Mont Auxois", the
  confluence at Mussy-la-Fosse 47.5317 N, 4.4578 E, 236 m (WP fr, WD
  Q3359211). The **Brenne** flows north along the west edge of the plain. None
  of the three is in Natural Earth (see Map data).
- **The ring of hills**, Caesar's "hills at a moderate distance, and of an
  equal degree of height" (VII.69), Napoleon's "de 1 100 à 1 600 mètres" from
  the oppidum (Nap XIII): **Mont Réa** to the north-west (Ménétreux-le-Pitois
  "au sommet du mont Réa", 47.5594 N, 4.4719 E; about 375-397 m); the **Montagne
  de Bussy** to the north-east (below Bussy-le-Grand, 47.575 N, 4.518 E, commune
  to 431 m); **Mont Pennevelle** to the east between the two rivers (47.5329 N,
  4.5228 E); the **Montagne de Flavigny** to the south across the Ozerain
  (Flavigny-sur-Ozerain 47.5122 N, 4.5311 E, commune to 482 m); the
  **Mussy-la-Fosse** hill to the south-west across the Brenne (village 47.5211
  N, 4.4378 E, commune to 427 m). Hill heights beyond the commune extremes rest
  on one amateur page and should be read off the SRTM tile.
- **Caesar's northern hill** is Mont Réa: "There was, on the north side, a hill,
  which our men could not include in their works, on account of the extent of
  the circuit" (VII.83), which Reddé notes is "en réalité au nord-ouest pour qui
  regarde depuis l'oppidum". Napoleon III measured it "à plus de 2 000 mètres"
  from the oppidum (Nap XIII).
- **Caesar's numbers for the works.** VII.69: circuit "eleven miles",
  "twenty-three redoubts"; VII.72: a trench "twenty feet deep, with
  perpendicular sides", the rest of the works "four hundred feet from that
  ditch", "two trenches fifteen feet broad", "a rampart and wall twelve feet
  high", "turrets, which were eighty feet distant from one another"; VII.73:
  the cippi, lilia and stimuli; VII.74: the outer line "having enclosed an area
  of fourteen miles". Eleven Roman miles is 16.3 km, fourteen is 20.7 km; the
  MuséoParc's figures for the reconstructed traces are 15 km and 21 km.
- **Caesar's numbers for the men.** Besieged: "eighty thousand chosen men"
  and "barely corn for thirty days" (VII.71, repeated in VII.77). Relief:
  "eight thousand cavalry, and about two hundred and forty thousand infantry"
  (VII.76); the storming force "sixty thousand men" (VII.83). Plutarch: "three
  hundred thousand strong" outside and "not less than a hundred and seventy
  thousand" inside (Plut 27.2). Caesar never totals his own army; Napoleon III
  counts eleven legions from the winter-quarters list of VII.90 and Book VIII
  (Nap, note to XII), Wikipedia says "10-11 legions" and Livius twelve. These
  belong in `notes`.
- **Commanders.** Caesar names only two sector commands: "Marcus Antonius, and
  Caius Trebonius, the lieutenants, to whom the defence of these parts had been
  allotted" for the plain (VII.81), and "Caius Antistius Reginus, and Caius
  Caninius Rebilus, two of the lieutenants, with two legions" in the north camp
  (VII.83). Labienus is sent "with six cohorts" (VII.86), Brutus with six and
  Fabius with seven (VII.87); Labienus's camp on the Montagne de Bussy is
  archaeology (sling bullets stamped T LABI, camp C; WP fr) and Napoleon III's
  siting ("Labienus, campé sur la montagne de Bussy", Nap XII). Gallic: the
  relief "supreme command is entrusted to Commius the Atrebatian, Viridomarus
  and Eporedorix the Aeduans, and Vergasillaunus the Arvernian" (VII.76;
  McDevitte's "Vergasillaunus" is the Latin text's Vercassivellaunus).
- **Date.** No source gives one. Wikipedia's "September 52 BC" is uncited;
  Livius puts the surrender on "our calendar, 30 August; on the Roman calendar
  ... the 23d of September"; Brunaux's 2012 title carries "27 septembre";
  Ramsey and Raaflaub argue the relief army "may have been around 7 November"
  and the capitulation "c. 13 Nov." in Julian terms, with the civil calendar
  running about 25 days ahead of the sun. The honest file says "September 52
  BC" as the conventional month and carries the range in `notes`.
- **Sun.** At 47.54 N, local solar sunrise and sunset are about 05:20 / 18:40
  on 1 September, 05:58 / 18:02 at the equinox and 06:13 / 17:46 on 1 October
  (author's computation, not a source figure). Caesar's "noon" is 12:00 solar
  on any of them. The Roman night ran four watches from sunset to sunrise, so
  in late September the first watch is about 18:00-21:00 and the second
  21:00-00:00.

## Battle clock: where the day offsets land

The six days are counted from the relief army's arrival (VII.79) as day 0.
Caesar's time words, in order, with the Latin:

| Event | Caesar (McDevitte) | Latin | Day / t |
|-------|--------------------|-------|---------|
| Relief arrives, camps a mile off | "came with all their forces to Alesia ... encamp not more than a mile from our fortifications" (VII.79) | *perveniunt ... considunt* | 0, no time |
| Relief horse fills the plain | "The following day" (VII.79) | *Postero die* | 1, morning |
| Cavalry battle | "After fighting from noon almost to sunset" (VII.80) | *a meridie prope ad solis occasum* | 1, 12:00 to ~18:00 |
| Hurdle-making | "after the interval of a day" (VII.81) | *Uno die intermisso* | 2, no phase |
| Night assault | "silently went forth from the camp at midnight" (VII.81) | *media nocte* | 3, 00:00 |
| Repulse | "when day drew nigh" (VII.82) | *cum lux appeteret* | 3, ~05:30 |
| Council, scouts, the sixty thousand chosen | no time word (VII.83) | | 3, daytime |
| The march | "having issued from the camp at the first watch, and having almost completed his march a little before the dawn, hid himself behind the mountain" (VII.83) | *prima vigilia ... sub lucem* | 3 evening to 4 dawn |
| Grand assault | "When noon now seemed to draw nigh" (VII.83) | *Cum iam meridies appropinquare videretur* | 4, 12:00 |
| The day's end | "the labour of the entire day" (VII.88) | *diurno labore* | 4, ~18:00 |
| Pursuit | "Immediately after midnight, the cavalry are sent out" (VII.89, in 88 on Gutenberg) | *De media nocte* | 5, 00:00 |
| Surrender | "having convened a council the following day" (VII.89) | *Postero die* | 5, no time |

Four ambiguities, all of which the blind extraction also found:

1. **Midnight straddles two days.** *Media nocte* is written `day: 3, t:
   "00:00"` rather than `day: 2, t: "23:59"` because the assault and its
   repulse both fall after it; the same choice puts the pursuit at day 5 00:00.
2. **"After the interval of a day"** is read as exactly one quiet day. It could
   be looser; nothing in Caesar makes it longer.
3. **The council of VII.83 has no day word.** It is placed on day 3, the day of
   the dawn repulse, because the narrative runs straight on ("having been twice
   repulsed ... consult what they should do") and the march leaves "at the
   first watch" that evening. Ramsey and Raaflaub allow "perhaps two days
   later" for the assault; Livius has an uneventful day 3 and the assault on
   day 4 afternoon; Napoleon III runs it as here. Day 4 is the earliest
   reading and the one the file should take, with a `notes` line.
4. **Two of the twelve phases have no time word at all** (the arrival, the
   surrender) and six more are estimates hung on sequence. Only three `t`
   values are copied from the source: 12:00 on day 1, 00:00 on day 3, 12:00 on
   day 4. Everything else must say "est." in `notes`; the schema has no
   uncertainty field by decision.

**Why the file opens on the arrival, not the investment.** Between Caesar's
arrival (VII.68, "encamped at Alesia on the next day") and the relief's there
are: an unspecified number of days of work before "a cavalry action ensues in
that plain" (VII.70); the same night or soon after, Vercingetorix "silently
dismisses the cavalry in the second watch" with thirty days' corn (VII.71);
the completion of both lines and thirty days' forage ordered (VII.72-74); the
levy in Gaul (VII.75-76); "the day being past on which they had expected
auxiliaries ... and all their corn being consumed" (VII.77); the expulsion of
the Mandubii (VII.78). That is more than thirty days and fewer than about
fifty, and no source counts them. ADR-0013 makes `day` an integer and rule 5
makes `dates` carry one string per day up to the last phase, so an
investment-first file would assert a count and invent forty date strings for a
month nobody can name. A single opening phase at the arrival, whose caption
says "six weeks earlier Caesar sat down before the town; the horse rode out
before the lines closed; the Mandubii were turned out and died between the
walls", gives the investment its place in the words that are actually the
sources', and the map file draws the finished works under it. The cavalry
action of VII.70 and the escape of the horse are lost as pictures; they are
the price, and they are two paragraphs.

`dates` is then six strings and none is a calendar date: something like
`"September 52 BC (the relief army's first day)"` through `"(sixth day)"`, with
`sort_date` `{ year: -52, month: 9, day: 20 }` as a sorting convention the
`notes` disown. Both are recorded as gaps below.

## Unit list

Nine units at one level, no `parent`, no `levels`. Ids as they might appear in
`data/battles/alesia.json`. The Roman side comes first so the red ink falls on
Rome and the blue on Gaul, matching the USMA plan. **Both Gallic armies are one
side, "Gallic"**: they were raised by one command for one cause (VII.71,
VII.75-76), the labels tell them apart, and the picture of a Roman ring
between two masses of the same ink is the siege. A three-side file would give
the legend a third belligerent that never existed.

| id | side | label | commander | arm | Source basis | Could it be coarser or finer? |
|----|------|-------|-----------|-----|--------------|-------------------------------|
| `plain-lines` | Roman | Legions on the lines in the plain | Antonius and Trebonius | infantry | VII.81 "the lieutenants, to whom the defence of these parts had been allotted"; the night attack and the day-4 cavalry demonstration both fall on "the fortifications in the plain" | No coarser: this is the sector attacked twice from outside. Finer would be the cavalry camps G-K of Napoleon's plan, which Reddé calls "très douteux". |
| `north-camp` | Roman | The north camp under Mont Réa | Reginus and Rebilus | infantry | VII.83 "two of the lieutenants, with two legions, were in possession of this camp" | No: it is the point of decision. Its site is disputed (see Works). |
| `bussy-legions` | Roman | Legions on the Montagne de Bussy | Labienus | infantry | Camp C by the sling bullets (WP fr, R-vS); Nap XII "Labienus, campé sur la montagne de Bussy, descend des hauteurs"; VII.86-87 the six cohorts, then "forty cohorts" (Caes-Loeb; Latin *XL*, some editions *undequadraginta*, which Napoleon III follows with "trente-neuf cohortes"; McDevitte omits the number) | This unit *is* the relieving column on day 4: its own motion carries Labienus to Réa. A finer level would split "Labienus's cohorts" from the camp, and would invent the camp's position after he left. |
| `flavigny-legions` | Roman | Legions on the Montagne de Flavigny | (none named; Caesar's station) | infantry | Camps A and B (Nap XIII, MuséoParc); Caesar "having selected a commanding situation" (VII.85) which Napoleon puts "sur les versants nord de la montagne de Flavigny (au point marqué J. C. planche 25)"; the dawn retreat of day 3 fears "a sally made from the higher camp on the exposed flank" (VII.82), Nap: "une sortie des camps établis sur la montagne de Flavigny" | Could be split into Flavigny (A, B) and Pennevelle sectors, but Caesar never has them act apart. Keep one. Brutus's six and Fabius's seven cohorts are `detachment` arrows from it, Caesar's four cohorts likewise. |
| `roman-cavalry` | Roman | Roman and Germanic cavalry | (none named) | cavalry | VII.70, 80 "orders the cavalry to issue forth from the camp"; VII.87 "part of the cavalry to follow him, and part to make the circuit of the external fortifications"; VII.89 the midnight pursuit | No coarser. Finer would be Germans versus Gauls in Roman pay, which Caesar distinguishes only in the moment of the charge. |
| `besieged` | Gallic | Vercingetorix's army in Alesia | Vercingetorix | infantry | VII.69 "The army of the Gauls had filled all the space under the wall, comprising the part of the hill which looked to the rising sun"; VII.71 eighty thousand; VII.79, 81-82, 84, 86, 88 the sorties | No coarser. Finer (the town garrison against the sortie force) is not in the sources; Critognatus and the council are caption matter. Its horse is gone before day 0 and is not a unit. |
| `relief-foot` | Gallic | The relief army | Commius (with Viridomarus, Eporedorix, Vercassivellaunus) | infantry | VII.76, 79 "having occupied the entire hill, encamp not more than a mile from our fortifications"; VII.81-82 the night assault; VII.83 "the rest of the forces to make a demonstration in front of the camp"; VII.88 "A flight of the Gauls from their camp immediately ensues" | Coarser would fold the horse and the sixty thousand in and lose two of the three attacks. Finer, by nation (the Aedui, the Arverni, Commius's Belgae), is a levy list (VII.75), not a deployment. |
| `relief-horse` | Gallic | The relief cavalry, with archers among them | (none named) | cavalry | VII.79 "they fill all that plain"; VII.80 "The Gauls had scattered archers and light-armed infantry here and there, among their cavalry"; VII.83 "the cavalry began to approach the fortifications in the plain" | No. |
| `vercassivellaunus` | Gallic | Vercassivellaunus's sixty thousand | Vercassivellaunus | infantry | VII.83 "select from the entire army sixty thousand men ... They appoint over their forces Vergasillaunus"; VII.85-88 | It could be a `detachment` arrow from `relief-foot`, but the attack on the north camp is the decisive action and the unit is the one that is broken and whose commander is "taken alive in the flight" (VII.88); an arrow has no state. It exists on the roster from phase 1, stacked with the foot and `intact`, which is the gap recorded below. |

Nine is under the twelve guideline with room to spare; sixteen is never
approached. **A finer level is not recommended**: Caesar places nothing below
the sector except the numbered cohort drafts of one afternoon, and Napoleon
III's eight camps are, after Reddé, three on the heights and a plain full of
doubt. The honest level is the coarse one.

Optional units, not recommended: the Mandubii (VII.78; a unit that is neither
side and takes no part) and Vercingetorix's cavalry (gone six weeks before
day 0).

## The phases

Times are on the battle clock; only three are source-pinned. Positions are the
author's lat/lon sketches on Napoleon III's siting as corrected by Reddé, and
**need checking against planche 25 and the SRTM contours before they go in a
battle file**; none has a source coordinate. Headings follow the glossary:
where a unit's force is directed, which for the ring means the outer face
while the relief attacks and the inner face while the besieged do; a sector
fought from both sides at once takes the side the phase's caption is about.

### 1. `relief-army-arrives` - The relief army camps on the outer hill (day 0, ~16:00 est.)

- **Time.** None. VII.79 "In the meantime, Commius and the rest of the leaders
  ... came with all their forces to Alesia, and having occupied the entire
  hill, encamp not more than a mile from our fortifications." An afternoon
  arrival is a guess that leaves the next morning for the deployment.
- **Roman units.** All `intact`, `line`, at their sectors: `plain-lines` in the
  plain between the two lines (~47.540 N, 4.466 E) heading 270; `north-camp`
  on the lower south-east slope of Réa above the little plain of Grésigny
  (~47.552 N, 4.480 E, Napoleon's camp D; see Works) heading 315;
  `bussy-legions` on the Montagne de Bussy (~47.556 N, 4.516 E, camp C)
  heading 0; `flavigny-legions` on the north edge of the Flavigny plateau
  (~47.520 N, 4.500 E, between camps A and B) heading 180; `roman-cavalry` in
  the plain camps by the water (~47.538 N, 4.455 E) heading 270.
- **Besieged.** `intact`, `mass`, in the fortified camp "under the wall ... the
  part of the hill which looked to the rising sun" (VII.69), ~47.534 N, 4.514
  E, heading 90 toward the inner line.
- **Relief.** `relief-foot` `intact`, `column`, on the Mussy-la-Fosse hill
  (~47.523 N, 4.443 E; Nap: "la colline de Mussy-la-Fosse"), heading 45 toward
  the plain; `relief-horse` and `vercassivellaunus` `intact` at the same
  place, offset a little so the three glyphs read.
- **Captions.**
  - VII.79: "In the meantime, Commius and the rest of the leaders, to whom the
    supreme command had been intrusted, came with all their forces to Alesia,
    and having occupied the entire hill, encamp not more than a mile from our
    fortifications."
  - The six weeks, from VII.71: "he silently dismisses the cavalry in the
    second watch, [on that side] where our works were not completed" and
    VII.78: "The Mandubii, who had admitted them into the town, are compelled
    to go forth with their wives and children." Dio 40.40.3-4 for their fate:
    "these perished most miserably between the city and the camp, because
    neither party would receive them."

### 2. `relief-fills-the-plain` - The relief horse fills the plain; the besieged come out before the town (day 1, ~09:00 est.)

- **Time.** "The following day" (VII.79); morning, since the battle is joined
  at noon.
- **Relief.** `relief-horse` `intact`, `line` across the plain (~47.540 N,
  4.458 E), heading 90: "having led forth their cavalry from the camp, they
  fill all that plain, which, we have related, extended three miles in
  length." `relief-foot` `intact`, `line`, "post them on the higher ground"
  a little back from the plain (~47.528 N, 4.448 E, the lower slopes of
  Mussy), heading 45. `vercassivellaunus` with the foot.
- **Besieged.** `intact`, `line`, out of the town on the west slope facing the
  plain (~47.538 N, 4.487 E), heading 270: "drawing out their troops, they
  encamp before the town, and cover the nearest trench with hurdles and fill
  it up with earth, and make ready for a sally and every casualty" (VII.79).
- **Roman units.** `intact`; VII.80 "Caesar, having stationed his army on both
  sides of the fortifications, in order that, if occasion should arise, each
  should hold and know his own post". `roman-cavalry` still in camp.
- **Captions.** VII.79: "The town Alesia commanded a view of the whole plain.
  The besieged run together when these auxiliaries were seen; mutual
  congratulations ensue, and the minds of all are elated with joy."

### 3. `cavalry-battle-noon` - The cavalry battle in the plain opens (day 1, 12:00)

- **Time.** Source-pinned: "After fighting from noon almost to sunset" (VII.80);
  Loeb "The fight lasted, and the victory was doubtful, from noon almost to
  sunset".
- **Roman cavalry.** `engaged`, `line`, out into the plain (~47.540 N, 4.464
  E), heading 270; "orders the cavalry to issue forth from the camp and
  commence action." **Relief horse** `engaged`, heading 90, the archers among
  them: "Several of our soldiers were unexpectedly wounded by these, and left
  the battle."
- **Legions.** `intact`, drawn up on the works and watching: "There was a
  commanding view from the entire camp, which occupied a ridge of hills; and
  the minds of all the soldiers anxiously awaited the issue of the battle."
  **Besieged** `intact`, on the slope, shouting: "both those who were hemmed in
  by the line of circumvallation and those who had come to aid them, supported
  the spirits of their men by shouts and yells from every quarter."
- **Captions.** VII.80: "As the action was carried on in sight of all, neither
  a brave nor cowardly act could be concealed; both the desire of praise and
  the fear of ignominy, urged on each party to valour."

### 4. `germans-break-the-gallic-horse` - The Germans charge; the Gallic horse flees to camp (day 1, ~17:30 est.)

- **Time.** "almost to sunset"; sunset about 18:00.
- **Relief horse.** `broken`, strength ~0.8 (a reading: "the archers were
  surrounded and cut to pieces", the horse "pursued to the camp ... and did not
  give them an opportunity of rallying"; no number), position back on the
  Mussy slope (~47.526 N, 4.447 E), heading 90. **Roman cavalry** `engaged`,
  pursuing to ~47.531 N, 4.452 E.
- **Besieged.** `intact`, back in the town (~47.536 N, 4.500 E): "those who had
  come forth from Alesia returned into the town dejected and almost despairing
  of success."
- **Interval.** This phase holds 30 hours, through day 2, "after the interval
  of a day, and after making, during that time, an immense number of hurdles,
  scaling ladders, and iron hooks" (VII.81). Compress hard.
- **Captions.** VII.80: "the Germans, on one side, made a charge against the
  enemy in a compact body, and drove them back; and, when they were put to
  flight, the archers were surrounded and cut to pieces."

### 5. `midnight-assault-on-the-plain` - Midnight: the relief storms the plain works and Vercingetorix sallies (day 3, 00:00)

- **Time.** Source-pinned: "silently went forth from the camp at midnight and
  approached the fortifications in the plain" (VII.81).
- **Relief foot.** `engaged`, `mass`, at the outer line in the plain (~47.539
  N, 4.455 E), heading 90: "they began to cast down hurdles and dislodge our
  men from the rampart by slings, arrows, and stones".
- **Plain lines.** `engaged`, heading 270: "Our troops, as each man's post had
  been assigned him some days before, man the fortifications". Antonius and
  Trebonius "draughted troops from the redoubts which were more remote":
  `detachment` arrows from `flavigny-legions` and `bussy-legions` toward the
  plain works.
- **Besieged.** `intact`, `mass`, out of the town at the inner line's foot
  (~47.538 N, 4.485 E), heading 270, an `intent` arrow at the plain works:
  "Vercingetorix having heard the shout, gives the signal to his troops by a
  trumpet, and leads them forth from the town." They never close (VII.82), so
  `intact` is the honest state; the arrow says what they meant.
- **Others.** `north-camp`, `bussy-legions`, `flavigny-legions` `intact`;
  `roman-cavalry` and `relief-horse` `engaged` in camp (aftermath);
  `vercassivellaunus` `intact` with the foot.
- **Captions.** VII.81: "All view being prevented by the darkness, many wounds
  are received on both sides; several missiles are thrown from the engines."
  Dio 40.40.5 for the lilia: "the Romans had dug secret pits in the places which
  were passable for horses and had fixed stakes in them".

### 6. `dawn-repulse` - Day comes; the Gauls draw off, the besieged too late (day 3, ~05:30 est.)

- **Time.** "when day drew nigh" (VII.82); sunrise about 06:00.
- **Relief foot.** `engaged`, strength ~0.9 ("After receiving many wounds on
  all sides, and having forced no part of the works"; VII.83 "twice repulsed
  with great loss"), back on the Mussy hill, heading 45: "fearing lest they
  should be surrounded by a sally made from the higher camp on the exposed
  flank, they retreated to their countrymen." Napoleon reads the higher camp
  as Flavigny, on the attackers' right.
- **Besieged.** `intact`, back in the town: "they learned the retreat of their
  countrymen before they drew nigh to the fortifications. Thus they returned to
  the town without accomplishing their object."
- **Interval.** Holds 24 hours through the council and the scouts of VII.83.
- **Captions.** VII.82: "after they came nearer, they either unawares empaled
  themselves on the spurs, or were pierced by the mural darts from the ramparts
  and towers, and thus perished."

### 7. `sixty-thousand-behind-rea` - Before dawn: Vercassivellaunus hides behind Mont Réa (day 4, ~05:30 est.)

- **Time.** "having issued from the camp at the first watch, and having almost
  completed his march a little before the dawn, hid himself behind the
  mountain, and ordered his soldiers to refresh themselves after their labour
  during the night" (VII.83).
- **Vercassivellaunus.** `intact`, `mass`, in the folds of ground north of Réa
  (~47.566 N, 4.470 E; Nap: "se cachent dans les plis de terrain, au nord de
  cette colline"), heading 135 toward the north camp. Napoleon III routes the
  march "par les hauteurs de Grignon et par Fain", a wide sweep west of the
  Brenne; the tween from Mussy runs straight across the plain and the Roman
  works, so **an intermediate position is needed**, or this phase's caption
  says the plate's straight track is not the road. Two phases (one at the
  first watch, west of the Brenne) would fix the track at the cost of a caption
  with little to say; the recommendation is to accept the straight track and
  caption it.
- **Relief foot and horse.** `engaged`, in camp on the Mussy hill.
- **Roman units.** As phase 6; the north camp still `intact`, which is the
  point.
- **Captions.** VII.83: "The leaders of the enemy, having reconnoitred the
  country by their scouts, select from the entire army sixty thousand men;
  belonging to those states which bear the highest character for courage".

### 8. `noon-triple-assault` - Noon: the north camp, the plain and the town attacked at once (day 4, 12:00)

- **Time.** Source-pinned: "When noon now seemed to draw nigh, he marched
  hastily against that camp which we have mentioned before; and, at the same
  time, the cavalry began to approach the fortifications in the plain, and the
  rest of the forces to make a demonstration in front of the camp" (VII.83).
- **Vercassivellaunus.** `engaged`, `mass`, on the slope above the north camp
  (~47.556 N, 4.477 E), heading 135. **North camp** `engaged`, heading 315.
- **Relief horse.** `engaged` at the plain's outer works (~47.540 N, 4.457 E),
  heading 90. **Relief foot** `engaged`, `line`, "in front of the camp"
  (~47.529 N, 4.450 E), heading 45.
- **Besieged.** `engaged`, `mass`, out of the town at every point (~47.537 N,
  4.490 E), heading 270: "Vercingetorix, having beheld his countrymen from the
  citadel of Alesia, issues forth from the town ... They engage on all sides at
  once, and every expedient is adopted" (VII.84).
- **All Roman sectors** `engaged`: "The army of the Romans is distributed along
  their extensive lines, and with difficulty meets the enemy in every quarter."
  `roman-cavalry` `engaged` in camp.
- **Captions.** VII.84: "The shouts which were raised by the combatants in
  their rear, had a great tendency to intimidate our men, because they
  perceived that their danger rested on the valour of others". VII.85: "The
  principal struggle is at the upper lines, to which, we have said,
  Vergasillaunus was sent. The least elevation of ground, added to a
  declivity, exercises a momentous influence."

### 9. `crisis-at-the-north-camp` - Labienus goes to the north camp; Vercingetorix turns to the steep ground (day 4, ~14:00 est.)

- **Time.** None; sequence from VII.85-86.
- **North camp.** `engaged`, strength 1 but at the edge: "The earth, heaped up
  by all against the fortifications, gives the means of ascent to the Gauls,
  and covers those works which the Romans had concealed in the ground. Our men
  have no longer arms or strength" (VII.85). Strength is the fraction fighting
  as part of the unit, not exhaustion; keep 1 and caption it.
- **Bussy legions.** `engaged`, moving west along the outer line toward Réa
  (~47.554 N, 4.496 E, between Bussy and the Grésigny plain), heading 300:
  "Caesar ... sends Labienus with six cohorts to relieve his distressed
  soldiers" (VII.86); Nap: "Labienus, campé sur la montagne de Bussy, descend
  des hauteurs pour se porter vers le lieu du combat."
- **Besieged.** `engaged`, `mass`, moved to the works at the foot of the
  Flavigny scarps south of the town (~47.529 N, 4.495 E), heading 180: "The
  Gauls within, despairing of forcing the fortifications in the plains on
  account of the greatness of the works, attempt the places precipitous in
  ascent" (VII.86); Nap: "contre les ouvrages situés au bas des hauteurs
  escarpées de la montagne de Flavigny". **Flavigny legions** `engaged`,
  heading 0 (the attack is on their inner face), with `detachment` arrows to
  the point of attack for "young Brutus, with six cohorts, and afterwards
  Caius Fabius, his lieutenant, with seven others" (VII.87).
- **Captions.** VII.86: "he shows them that the fruits of all former
  engagements depend on that day and hour." VII.86: "they fill the ditches with
  clay and hurdles, then clear the way; they tear down the rampart and
  breast-work with hooks."

### 10. `caesar-rides-to-rea` - Caesar's cloak: four cohorts and the horse strike the rear (day 4, ~16:00 est.)

- **Time.** None. VII.87-88 in sequence: the sortie repulsed, Caesar rides to
  Labienus, drafts "four cohorts from the nearest redoubt", the cavalry
  halved, Labienus's messengers, the charge.
- **Flavigny legions.** `engaged`, heading 0, a `detachment` arrow to the north
  camp for Caesar's four cohorts. Caesar himself is caption matter: "His
  arrival being known from the colour of his robe" (VII.88).
- **Roman cavalry.** `engaged`, moving north from the plain to the Réa foot
  (~47.550 N, 4.474 E) heading 0, with a `detachment` arrow round the outer
  line to the Gallic rear (~47.562 N, 4.482 E): "part of the cavalry to follow
  him, and part to make the circuit of the external fortifications and attack
  the enemy in the rear" (VII.87); Nap has the detour "en sortant du camp de
  Grésigny".
- **Bussy legions.** `engaged` at the north camp (~47.553 N, 4.484 E), heading
  315: Loeb VII.87 "Labienus, finding that neither ramps nor trenches could
  resist the rush of the enemy, collected together forty cohorts, which had
  been withdrawn from the nearest posts and by chance presented themselves".
- **Vercassivellaunus.** `broken`, strength ~0.4, heading 135 (the attack it is
  answering is still in front; the flight is the caption's), position drifting
  back up the slope: "The cavalry is suddenly seen in the rear of the Gauls:
  the other cohorts advance rapidly; the enemy turn their backs; the cavalry
  intercept them in their flight, and a great slaughter ensues" (VII.88).
- **Besieged.** `engaged`, repulsed: "After renewing the action, and repulsing
  the enemy" (VII.87).
- **Captions.** VII.88: "Our troops, laying aside their javelins, carry on the
  engagement with their swords." VII.88: "Sedulius the general and chief of the
  Lemovices is slain; Vergasillaunus, the Arvernian, is taken alive in the
  flight, seventy-four military standards are brought to Caesar".

### 11. `rout-and-withdrawal` - Sunset: the relief flies; the besieged go back into the town (day 4, ~18:00 est.)

- **Time.** "the labour of the entire day" (VII.88); sunset about 18:00.
- **Vercassivellaunus.** `destroyed`, strength ~0.1: "few out of so great a
  number return safe to their camp." Position on the Réa slope where it broke.
- **Besieged.** `engaged`, back in the town: "The besieged, beholding from the
  town the slaughter and flight of their countrymen, despairing of safety, lead
  back their troops from the fortifications."
- **Relief foot and horse.** `broken`, strength ~0.5 each (a reading: no
  number until the pursuit), leaving the Mussy hill south-west toward the edge
  of the extent (~47.512 N, 4.428 E), heading 45 kept: "A flight of the Gauls
  from their camp immediately ensues on hearing of this disaster".
- **Roman cavalry.** `engaged` at Réa, with a `detachment` arrow south-west off
  the extent for the pursuit, which the clock reaches inside this phase:
  "Immediately after midnight, the cavalry are sent out and overtake the rear,
  a great number are taken or cut to pieces, the rest by flight escape in
  different directions to their respective states" (VII.89, in 88 on
  Gutenberg). If the thirteenth phase is authored, it goes here at day 5 00:00.
- **Captions.** VII.88: "had not the soldiers been wearied by sending frequent
  reinforcements, and the labour of the entire day, all the enemy's forces
  could have been destroyed."

### 12. `surrender` - Vercingetorix is delivered up before the camp (day 5, ~12:00 est.; end ~15:00)

- **Time.** "the following day" (VII.89); a council, an embassy and the
  surrender fill a morning. `end` at 15:00 is a guess.
- **Besieged.** `destroyed`, strength 0, `mass`, at the works before the camp
  in the plain (~47.538 N, 4.480 E): "He seated himself at the head of the
  lines in front of the camp, the Gallic chieftains are brought before him.
  They surrender Vercingetorix, and lay down their arms" (VII.89). Napoleon
  III does not say which camp; the plain below the town is the natural
  reading and Plutarch's ride "through the gate" fits it.
- **Relief foot, horse, Vercassivellaunus.** `destroyed`: "the rest by flight
  escape in different directions to their respective states."
- **Roman units.** `engaged`.
- **Captions.**
  - VII.89: "he had undertaken that war, not on account of his own exigencies,
    but on account of the general freedom; and since he must yield to fortune,
    he offered himself to them for either purpose, whether they should wish to
    atone to the Romans by his death, or surrender him alive."
  - Plut 27.5: "He made a circuit round Caesar, who remained seated, and then
    leaped down from his horse, stripped off his suit of armour, and seating
    himself at Caesar's feet remained motionless, until he was delivered up to
    be kept in custody for the triumph." Dio 40.41.1 has him "seated on the
    tribunal" and Vercingetorix falling "upon his knees, with hands clasped in
    an attitude of supplication".

## Works: what the lines need and what the traces give

**What a `work` is today.** A `Point` with a `name`, drawn as a bastioned
square with small capitals (ADR-0012, #62). That fits the camps and the
redoubts and does not fit the lines, which are 16 and 21 km of ditch, rampart
and tower drawn round a hill.

**What the two lines need.** A closed ring each, so a `LineString` whose last
vertex repeats its first, or a `Polygon` ring; a width is not needed if the
renderer draws a line, and the two 15-ft ditches, the 400-ft interval and the
20-ft ditch of VII.72 are sub-pixel on a 12-km extent (at 1080 px across, one
pixel is about 11 m). The dashed-versus-solid distinction Napoleon III's plate
draws between excavated ditch and ditch presumed but not found is a
conjectural flag, which ADR-0012 forbids; the map draws one line and the caption and `notes` say
where the trace is excavated and where it is inferred. So the ask is: **a
`work` that may carry a `LineString` or a closed ring alongside its `Point`
form, or a new line kind for a built line**; and nothing else. Twenty-three
`work` points and eight camp points are already legal.

**What the traces give**, from Napoleon III's excavations (1861-65, Colonel
Stoffel's survey, Nap XIII and planche 25) as corrected by the 1991-97
Franco-German excavations (R-vS; Reddé):

- **The plain of Les Laumes.** Both lines confirmed "de façon absolument
  certaine" (Reddé); the contravallation's inner ditch "a parfois été mis en
  eau, comme l'indique César (7.72)"; the ditches "tantôt deux, tantôt trois,
  tantôt un seul, selon les secteurs"; tower spacing "entre 15 et 40 m", not
  Caesar's eighty feet; the trap systems present, but "la disposition respective des
  systèmes de pièges n'est pas, sur le terrain, conforme à celle du récit
  césarien". Le Gall's
  1965 soundings at Venarey give two ditches 1.5 m deep, 5.2 m and 3.5 m at
  the mouth, and a third 17.5 m inside.
- **The heights.** Camps A (2.3 ha, at elevation 408, MuséoParc), B (7.3 ha,
  "situated on Flavigny Hill ... at an average altitude of 425 metres",
  MuséoParc) and C (6.9 ha, Bussy, Labienus by the T LABI bullets) confirmed;
  castella 11, 15 and 18 verified, the rest of the twenty-three unverified.
  The contravallation on the plateau of Flavigny "cessait vers les
  escarpements ... où les défenses devenaient inutiles" (Nap XIII).
- **The Réa foot.** Napoleon III's camp D, "le quatrième camp d'infanterie ...
  sur les pentes inférieures du mont Réa ... celui qu'occupèrent les deux
  légions de Reginus et de Rebilus" (Nap XIII), is **rejected by the
  excavators**: the quotations reaching the open web ("L'existence du camp D
  ... ne peut plus être sérieusement soutenue", R-vS p. 468, via a hostile
  site) were not checked against the monograph, but Reddé's own open-access
  essay says of Réa and Pennevelle "nous sommes dans la plus complète
  incertitude" and that he expects "au moins deux [camps] sur le Réa" and one
  on Pennevelle. So Caesar's north camp is real, on the north-west hill, and
  unlocated; the note's ~47.552 N, 4.480 E is Napoleon's site standing in.
- **The valleys and the Bussy-Réa link.** "La contrevallation dans les vallées
  de l'Oze et de l'Ozerain est extrêmement mal connue"; "Le parcours de la
  circonvallation entre la montagne de Bussy et le Réa reste tout aussi
  incertain" (Reddé). Napoleon III's account of the course (contravallation
  along the Ozerain's left bank to the moulin Chantrier, across the west tip
  of Pennevelle, along the Oze under Bussy, across the Grésigny plain to camp
  D; circumvallation over the Flavigny plateau linking the camps, down to the
  Ozerain, over the Pennevelle point, up Bussy, down across Grésigny to D) is
  the only continuous trace and is what a map would follow.
- **The cavalry camps G, H, I, K in the plain.** "Très douteux" (Reddé); I "une
  méprise". Do not draw them as works.
- **The Gallic camp.** Caesar's "trench and a stone wall six feet high"
  (VII.69) under the east wall of the oppidum, "tous les versants de la partie
  orientale de la montagne" (Nap XII). A `work` named "Gallic camp" is legal
  and is where `besieged` stands in phase 1.

**Lengths.** Caesar's 11 and 14 miles are 16.3 and 20.7 km; the MuséoParc's
reconstructed traces measure 15 and 21 km. The excavators' own measured totals
were not found in any open text.

## Map data

- **Extent** (landscape): north 47.58, south 47.50, west 4.41, east 4.57,
  which is 8.9 km by 12.0 km at this latitude and holds Mussy-la-Fosse, Réa,
  Bussy-le-Grand, Pennevelle, Flavigny and the whole of both lines.
  `scale_unit` `km`.
- **Elevation.** SRTM GL1 tile N47E004 from OpenTopography's public bucket,
  verified login-free at
  https://opentopography.s3.sdsc.edu/raster/SRTM_GL1/SRTM_GL1_srtm/N47E004.tif
  (11.6 MB GeoTIFF; the memory note's URL pattern holds). NASA's catalogue
  says the dataset is "openly shared, without restriction"; OpenTopography's
  citation page says its holdings are "free of all copyright restrictions" and
  asks for an acknowledgement, which the `attribution` line can carry
  ("contours from SRTM 1 arc-second (NASA) via OpenTopography"). NASADEM is in
  the same bucket on the same terms; Copernicus GLO-30 is there too and stays
  excluded (fixed DLR/Airbus credit, ADR-0012); ASTER GDEM's prefix lists no
  keys. IGN's RGE ALTI and BD ALTI are Licence Ouverte 2.0, attribution class
  and off the allowlist.
- **Contour interval.** The box has about 250 m of relief (plain ~235 m, Mont
  Auxois 407 m, the ring of hills 375-430 m, Flavigny higher behind). Cannae
  (ADR-0012, schema 3.5) is cut at 10 m over 213 m of relief and ships 16
  levels; the same 10 m here gives about 20 levels over the box and draws the
  oppidum as a stack of some seventeen rings, which is what the plate needs to
  say "a town on a hill that could only be taken by siege". A 20 m cut would
  halve the file and still show every hill; 10 m is recommended because the
  three-mile plain and the Grésigny plain read as floors only when the lowest
  levels are dense. Simplify at 60 m and drop rings under eight vertices as at
  Cannae; expect a file of the order of 100 kB, larger than Cannae's 85 kB
  because the relief is everywhere.
- **Rivers.** Natural Earth's `ne_10m_rivers_europe` carries neither the
  Brenne, the Oze nor the Ozerain (checked in the v5.0.0 DBF). HydroRIVERS is
  CC BY at 15 arc-seconds, useless at this scale; MERIT Hydro is CC BY-NC /
  ODbL; OpenStreetMap is ODbL; BD TOPAGE and BD TOPO are Licence Ouverte 2.0,
  attribution class, off the allowlist. **The route that keeps the map
  `public-domain` is to derive the three drainage lines from the SRTM tile
  itself** (flow accumulation, or simply digitising the valley floors off the
  contours); the valleys are 150 m deep and will extract cleanly. Each is a
  `river` with no name; a `place` on each ("Oze", "Ozerain", "Brenne") lets
  captions refer to them.
- **A plan to trace against.** Napoleon III's planche 25 (Nap-25), public
  domain, drawn on Stoffel's survey with the villages, the rivers, spot heights
  and both lines, with kilometre and Roman-mile scale bars, is the only
  geo-registrable public-domain plan; it must be rotated (it is printed
  sideways) and registered on Alise, Grésigny, Mussy-la-Fosse and Flavigny. The
  USMA GIF is public domain but 710 px wide. Cristiano64's Commons plan is
  share-alike and can be looked at but not shipped or traced. d'Anville's 1755
  plan (Commons, CC0) predates the excavations. No plan from the 1991-97
  excavations is on Commons.
- **Places and works.** `place`: Alesia, Alise-Sainte-Reine, Mont Réa,
  Montagne de Bussy, Mont Pennevelle, Montagne de Flavigny, Mussy-la-Fosse,
  Grésigny, Les Laumes (the plain), Oze, Ozerain, Brenne. `work`: Camp A, Camp
  B, Camp C, the north camp (Napoleon's D, with a `notes` caveat in the battle
  file), the Gallic camp, and as many of the twenty-three castella as the plan
  places (11, 15 and 18 verified); the two lines only if the format grows a
  line form (above).
- **Licence.** Contours from SRTM, rivers derived from it, places and works
  sited by the project from a public-domain plan: `public-domain`, with an
  `attribution` line naming NASA, OpenTopography and Stoffel's plan, as
  Cannae's does.

## Where the sources disagree (summary)

| Item | Caesar | Others | Notes |
|------|--------|--------|-------|
| Numbers | 80,000 inside (VII.71); 8,000 horse and 240,000 foot outside (VII.76); 60,000 picked (VII.83) | Plutarch 27.2: 170,000 inside, 300,000 outside; Strabo 400,000 (WP) | Modern estimates run to a fifth of these. `notes`. |
| The northern hill | "on the north side" (VII.83) | Mont Réa is north-west (Reddé) | Caption matter. |
| The north camp's site | a slope, "ground almost disadvantageous, and pretty steep" (VII.83) | Napoleon's camp D at the Réa foot; rejected by R-vS; Reddé expects camps higher on Réa | Draw D as the standing-in point; `notes` say so. |
| Labienus's cohorts | "forty" (Latin *XL*; Loeb) or thirty-nine (*undequadraginta*; Napoleon III) | McDevitte omits the number | Use the Loeb wording if the number is quoted. |
| Where Vercingetorix attacked on day 4 | "the places precipitous in ascent" (VII.86) | Napoleon: the foot of the Flavigny scarps | Positions follow Napoleon; `notes`. |
| Where the Mandubii died | forbidden the works (VII.78) | Dio 40.40.4: "between the city and the camp" | Caption of phase 1. |
| The surrender scene | arms surrendered, chieftains delivered (VII.89) | Plutarch: the ride round the seated Caesar; Dio: on his knees before the tribunal | Caption of phase 12. |
| Day of the great assault | day 4 on the earliest reading | RR "perhaps two days later"; Livius day 4 afternoon; Napoleon as here | `notes` on phase 8. |
| The month | none | September (WP, uncited; Brunaux 27 Sept; Livius 30 Aug Julian), or mid-November Julian (RR) | `dates` say "September 52 BC" and `notes` give the range. |
| Times of day | noon, sunset, midnight, first watch, before dawn, noon, midnight, next day | Plutarch and Dio add none | The three pinned `t` values are all Caesar's. |

## Implications for `alesia.json` and `alesia.geojson`

- **Six days, twelve phases, `dates` of six strings and no calendar date**, as
  above. `end` `15:00`, `end_day` 5. `sort_date` `{ -52, 9, 20 }` with a
  `notes` line saying the day is a sorting convention.
- **Nine units, one level, no `levels`.** `short_label` on each ("Plain",
  "North camp", "Bussy", "Flavigny", "Roman horse", "Besieged", "Relief",
  "Relief horse", "Vercassivellaunus" is too long; "The 60,000").
- **Formations.** Legions in the works `line`; the besieged and the storming
  force `mass`; cavalry `line`; the relief on the march `column`. Ditches,
  hurdles, the testudo and the "earth, heaped up by all against the
  fortifications" are caption words.
- **Headings.** The ring's outer faces (270, 315, 0, 180) while the relief
  attacks; the inner faces where the besieged attack (Flavigny 0 in phase 9);
  the besieged 90 in camp, 270 before the town, 180 at the Flavigny foot;
  Vercassivellaunus 45 with the foot and 135 from behind Réa. No turn exceeds a
  quarter circle except the besieged's 90 to 270 between phases 1 and 2, an
  exact half-turn that resolves clockwise, which is through the north and
  harmless on a hill.
- **Moves.** `detachment` arrows for every cohort draft (Antonius and
  Trebonius's from the redoubts in phase 5; Brutus's and Fabius's in phase 9;
  Caesar's four in phase 10), for the cavalry's ride round the outer line
  (phase 10) and for the midnight pursuit (phase 11); an `intent` arrow for the
  besieged's aborted sally (phase 5). Labienus's relief and Vercassivellaunus's
  night march are units' own motion, tracks, not moves.
- **Strengths.** All Roman units 1 throughout. Relief horse 0.8 from phase 4;
  relief foot 0.9 from phase 6, 0.5 in phase 11; Vercassivellaunus 0.4 in
  phase 10, 0.1 in phase 11; the besieged 0 at the surrender. Every one is a
  reading; Caesar gives no count but the seventy-four standards.
- **Playback plan.** Phases 1, 4, 6 and 11 hold 18 to 30 hours and are
  compressed hard (a rate of the order of 3,000 to 6,000); 2, 3, 5 and 7
  moderately; 8, 9 and 10 slow (the decisive afternoon, of the order of 120);
  12 holds three hours.
- **Sources table.** `caesar-mcdevitte` (Gutenberg #10657, `public-domain`,
  with a `license_note` on the missing LXXXIX heading), `caesar-edwards`
  (Internet Archive `gallicwar00caes`, `public-domain`), `plutarch-perrin`
  (Perseus 1999.01.0244, `public-domain`, with a note that the digitisation is
  CC BY-SA), `dio-cary` (LacusCurtius, `public-domain`), `napoleon-iii`
  (Wikisource, `public-domain`), `stoffel-plan` (the Commons DjVu,
  `public-domain`), `usma-alesia` (Commons GIF, `public-domain`, with the USMA
  credit request). All below `CC-BY-4.0`. Cristiano64's plan and every modern
  book stay in this note.
- **Every quotation in this note must be re-checked against the edition before
  it becomes a `quote`**, per the project's standing rule; the McDevitte
  quotations were taken from the Gutenberg file, the Loeb ones from the OCR,
  Plutarch and Dio from the fetched pages, and all are believed verbatim, but
  the Gutenberg file's chapter fold means any locator into LXXXIX must say
  "in LXXXVIII" for that edition.

## What v2 cannot express

1. **A siege's gaps on the clock.** `day` is an integer and `dates` must carry
   one string per day up to the last phase (2.10 rule 5), so an interval of
   unknown length cannot sit between two phases: the six weeks of investment
   can only be caption. Even the six days the file does play need six date
   strings for a battle dated to the month at best, and a `sort_date` to the
   day. This is the cost ADR-0013 accepted; Alesia is the first battle to pay it
   in full.
2. **Works as lines.** `work` is a `Point` (ADR-0012), so the contravallation
   and the circumvallation, which are the whole subject, cannot be drawn. The
   camps and redoubts can. The ask is a line form for a built thing, or a new
   kind; a `river` used as a stand-in would be a lie to the renderer.
3. **A unit inside works.** Nothing says `besieged` is behind a wall and inside
   a ring: its glyph stands on the hill like any other. The map's contours and
   (if drawn) the lines carry it; the state stays `intact` while it is shut in.
4. **Two Gallic forces that are one side.** `side` is one string per unit and
   the legend keys one ink per side, so the besieged and the relief share an
   ink and are told apart only by label and position. That is the honest
   picture, but a viewer scanning the legend sees "Roman, Gallic" and not "a
   siege relieved". A three-side file would fix the legend and falsify the war.
5. **Units that do not yet exist.** The relief army has a snapshot on day 0
   before it is in sight, and Vercassivellaunus's sixty thousand has one from
   phase 1 although it is chosen on day 3: ADR-0003's deferred "units appearing
   mid-battle", arriving as two stacked glyphs on the Mussy hill. Positioning
   the storming force on top of the foot with `intact` is the workaround; the
   label pass will have to separate them.
6. **A camp that is also a unit's position.** `north-camp` is a unit and the
   map's "north camp" is a `work` at the same point, which ADR-0012 allows; but
   nothing ties them, so if the map moves the camp up Réa after a better
   reading, the battle file does not follow.
7. **A track that is not the road.** Vercassivellaunus's night march went round
   by Grignon and Fain; the tween draws a straight line across the Roman lines.
   ADR-0018 says add a phase; the phase would have nothing to caption. Alesia
   accepts the straight track with a caption, and this is the first battle
   where the honest track and the honest phase count pull apart.
8. **Exhaustion.** "Our men have no longer arms or strength" (VII.85) is not a
   strength below 1 and not a state; the north camp is `engaged` at 1 in its
   worst hour. Caption matter, and the one place a reader may feel the picture
   understates the text.
9. **A cohort count.** The six, six, seven, four and forty cohorts of VII.86-87
   are the battle's arithmetic and are arrows without numbers. Caption matter,
   as counts always are.
10. **Battle-clock honesty.** Three pinned times and nine estimates look alike
    on the scrubber, as at Cannae. `notes` on every phase.

## Open follow-ups

- **Planche 25 has not been registered.** Every position above is prose
  geometry on Napoleon III's siting; someone should georeference the plate (the
  Commons DjVu at full resolution, rotated north-up) on the villages and
  rivers and correct the nine positions and the camp points against it and the
  SRTM contours.
- **The excavators' monograph was not read.** Camp D's rejection and the Réa
  camps' expected positions are known through Reddé's open-access essays and
  hostile secondary sites; the AIBL volume (2001) or *Ber. RGK* 76 should be
  consulted for the measured lengths of the two lines, the confirmed castella
  and the Réa evidence before the map's works are placed.
- **Hill heights** for Réa, Bussy, Pennevelle and Flavigny rest on one amateur
  page (375, 418, 430, 430 m) and should be sampled from the tile.
- **The rivers** need cutting from the DEM; no public-domain vector exists.
- **The month.** Ramsey and Raaflaub's November against everyone's September
  deserves a decision before `dates` is written; it changes sunrise by an
  hour and the length of the fighting day by three.
- **Perseus's McDevitte chapter 89** does not exist as a URL and Gutenberg's
  heading is missing; a Loeb or Perseus-Latin locator is the safe one for the
  pursuit and the surrender.
- **The Loeb OCR** was clean enough to check the quotations used here but not
  proofread end to end; a battle file quoting Edwards should check each quote
  against the page image.
- **The surrender's place** (which camp Caesar sat before) is unstated in every
  source; the plain below the town is an inference.
