## trafalgar.json

```json
{
  "id": "trafalgar",
  "title": "Battle of Trafalgar",
  "date": "21 October 1805",
  "extent": {
    "north": 36.6,
    "south": 36.1,
    "east": -5.95,
    "west": -6.95
  },
  "scale_unit": "nmi",
  "end": "17:30",
  "sources": {
    "memorandum": {
      "label": "Nelson's memorandum",
      "work": "Nelson, Memorandum (Secret), Victory off Cadiz, 9 October 1805, as reprinted in Mahan, The Life of Nelson, vol. II, ch. XXII (1897)"
    },
    "mahan": {
      "label": "Mahan",
      "work": "A. T. Mahan, The Life of Nelson, vol. II, ch. XXIII (London: Sampson Low, 1897)"
    }
  },
  "units": [
    {
      "id": "weather-column",
      "label": "Weather column (Nelson)",
      "side": "british"
    },
    {
      "id": "lee-column",
      "label": "Lee column (Collingwood)",
      "side": "british"
    },
    {
      "id": "combined-fleet",
      "label": "Combined Franco-Spanish Fleet",
      "side": "franco-spanish"
    }
  ],
  "phases": [
    {
      "id": "daybreak",
      "label": "Daybreak: the fleets in sight",
      "t": "06:00",
      "playback_rate": 600,
      "wind": { "from": 292.5 },
      "caption": "Daybreak west of Cape Trafalgar, which is just visible in the far distance against the eastern sky. The British fleet, standing to the northward in the two lines of Nelson's order of sailing, sees the combined fleet ten or twelve miles to the eastward, steering south in a single long column better than five miles from end to end. At twenty minutes before seven Nelson signals the fleet to form the order of sailing, which by his own instructions is the order of battle, and to prepare for battle.",
      "notes": "Mahan gives no clock time for daybreak. 06:00 is chosen because Nelson summoned Blackwood 'at about six o'clock' and had already been on deck 'soon after daylight'. Blackwood's own log gives eight o'clock for that summons (note 137), which Mahan argues against.",
      "references": [
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'In a general sense, then, it may be said'; a few lines above note 134",
          "quote": "In a general sense, then, it may be said that, when daylight showed the enemies to each other, the British fleet was heading to the northward, and that of the allies to the southward; the latter being ten or twelve miles east of their opponents."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'the place and hour of his writing are fixed by the words'; just after note 137",
          "quote": "In sight of the Combined Fleets of France and Spain, distant about ten miles.",
          "note": "From the Codicil written on the morning of the battle; Mahan calls ten miles 'the common estimate of the relative positions, made by the British fleet at large at daybreak'."
        },
        {
          "source": "memorandum",
          "locator": "para. 1",
          "quote": "the Order of Sailing is to be the Order of Battle, placing the Fleet in two Lines of sixteen Ships each"
        }
      ],
      "units": [
        {
          "unit": "weather-column",
          "position": { "lat": 36.308, "lon": -6.819 },
          "heading": 45,
          "formation": "column",
          "state": "intact"
        },
        {
          "unit": "lee-column",
          "position": { "lat": 36.291, "lon": -6.819 },
          "heading": 45,
          "formation": "column",
          "state": "intact"
        },
        {
          "unit": "combined-fleet",
          "position": { "lat": 36.3, "lon": -6.59 },
          "heading": 180,
          "formation": "line",
          "state": "intact",
          "strength": 1
        }
      ]
    },
    {
      "id": "bear-up-and-wear",
      "label": "The British bear up; the allies wear together",
      "t": "07:00",
      "playback_rate": 900,
      "wind": { "from": 292.5 },
      "caption": "Ten minutes after the signal to prepare for battle comes the command to bear up, the Victory setting the example by altering course for the enemy at once. The two British divisions turn east about a mile apart, Nelson's to the northward and so to windward. Seeing the attack develop, and wanting Cadiz twenty miles off under his lee, Villeneuve orders the combined fleets to wear together. The manoeuvre begins at seven, ship after ship from rear to van, and will reverse the allied order from end to end: the van becomes the rear, and Gravina, who had been leading, will be the rearmost ship.",
      "references": [
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'Ten minutes later followed the command'; same paragraph as note 134",
          "quote": "Ten minutes later followed the command to \"Bear up,\" the \"Victory\" setting the example by at once altering her course for the enemy."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'The two columns steered east, about a mile apart'; sentence ending at note 134",
          "quote": "The two columns steered east, about a mile apart, that of Nelson being to the northward; from which circumstance, the wind being west-northwest, it has been called commonly the weather line."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'When the development of the British movement was recognized'; at note 135",
          "quote": "he saw that fighting was inevitable; and, wishing to keep Cadiz, then twenty miles to the northward and eastward, under his lee, he ordered the combined fleets to wear together."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, last entry of occurrences in Nelson's private journal; cf. note 135",
          "quote": "At seven the combined fleets wearing in succession"
        }
      ],
      "units": [
        {
          "unit": "weather-column",
          "position": { "lat": 36.31, "lon": -6.812 },
          "heading": 90,
          "formation": "column",
          "state": "intact"
        },
        {
          "unit": "lee-column",
          "position": { "lat": 36.293, "lon": -6.812 },
          "heading": 90,
          "formation": "column",
          "state": "intact"
        },
        {
          "unit": "combined-fleet",
          "position": { "lat": 36.292, "lon": -6.588 },
          "heading": 150,
          "formation": "line",
          "state": "intact",
          "strength": 1,
          "moves": [
            {
              "kind": "intent",
              "to": { "lat": 36.533, "lon": -6.3 }
            }
          ]
        }
      ]
    },
    {
      "id": "crescent-and-approach",
      "label": "The allied crescent; the columns close",
      "t": "10:00",
      "playback_rate": 600,
      "wind": { "from": 292.5 },
      "caption": "Near ten the wear is at last complete. Lacking wind and lacking practice, the allies have made not a straight line but a curved one, concave towards the British, its horns to windward and five miles apart, the ships lying irregularly and sometimes two and three abreast. Carrying sail to hold their places, they are drifting all the while nearer Cadiz. Seeing that, Nelson signals Collingwood that he means to pass through the enemy's van to stop them, and hauls the Victory's course a little to the northward. At half past nine the Victory was still six miles off; in this air she gains barely a mile and a half in the hour.",
      "references": [
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'The scanty wind which embarrassed the British'; at note 135",
          "quote": "The scanty wind which embarrassed the British impeded this manoeuvre also, so that it was not completed till near ten o'clock."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'Instead of this, embarrassed by both lack of wind and lack of skill'",
          "quote": "their manoeuvres resulted in a curved line, concave to the enemy's approach; the horns of the crescent thus formed being nearer to the latter"
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'From horn to horn was about five miles.'",
          "quote": "From horn to horn was about five miles."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'Seeing this, Nelson signalled to Collingwood'",
          "quote": "I intend to pass through the van of the enemy's line, to prevent him from getting into Cadiz"
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, Blackwood urging that ships precede the Victory; a few paragraphs before note 139",
          "quote": "at about half-past nine, when still six miles from the enemy"
        }
      ],
      "units": [
        {
          "unit": "weather-column",
          "position": { "lat": 36.318, "lon": -6.711 },
          "heading": 80,
          "formation": "column",
          "state": "intact",
          "moves": [
            {
              "kind": "intent",
              "to": { "lat": 36.35, "lon": -6.58 }
            }
          ]
        },
        {
          "unit": "lee-column",
          "position": { "lat": 36.296, "lon": -6.708 },
          "heading": 90,
          "formation": "column",
          "state": "intact",
          "moves": [
            {
              "kind": "intent",
              "to": { "lat": 36.287, "lon": -6.571 }
            }
          ]
        },
        {
          "unit": "combined-fleet",
          "position": { "lat": 36.31, "lon": -6.575 },
          "heading": 0,
          "formation": "crescent",
          "state": "intact",
          "strength": 1,
          "moves": [
            {
              "kind": "intent",
              "to": { "lat": 36.533, "lon": -6.3 }
            }
          ]
        }
      ]
    },
    {
      "id": "lee-line-breaks-through",
      "label": "The Royal Sovereign breaks the line",
      "t": "12:10",
      "playback_rate": 200,
      "wind": { "from": 292.5 },
      "caption": "Just at noon the Fougueux fires the first gun of the battle at the Royal Sovereign, and for ten minutes Collingwood's ship stands on alone, the one centre of the hostile fire. At ten minutes past twelve she breaks through the allied order astern of the Santa Ana, the head of the lee line going in close to where the memorandum had marked, about the twelfth ship from the enemy's rear. The Victory is two miles off to the northward with a mile and a half still to run, and is not yet under fire.",
      "references": [
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'A few moments later, just at noon'; shortly after note 141",
          "quote": "A few moments later, just at noon, the French ship \"Fougueux,\" the second astern of the \"Santa Ana,\" for which the \"Royal Sovereign\" was steering, fired at the latter the first gun of the battle."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'The \"Victory\" was about two miles from the \"Royal Sovereign\"'",
          "quote": "The \"Victory\" was about two miles from the \"Royal Sovereign\" when the latter, at ten minutes past twelve, broke through the allied order, and she had still a mile and a half to go before she herself could reach it."
        },
        {
          "source": "memorandum",
          "locator": "para. 10",
          "quote": "The signal will most probably then be made for the Lee Line to bear up together, to set all their sails, even steering sails, in order to get as quickly as possible to the Enemy's Line, and to cut through, beginning from the 12 Ship from the Enemy's Rear."
        }
      ],
      "units": [
        {
          "unit": "weather-column",
          "position": { "lat": 36.324, "lon": -6.619 },
          "heading": 75,
          "formation": "column",
          "state": "intact"
        },
        {
          "unit": "lee-column",
          "position": { "lat": 36.284, "lon": -6.592 },
          "heading": 85,
          "formation": "column",
          "state": "engaged"
        },
        {
          "unit": "combined-fleet",
          "position": { "lat": 36.315, "lon": -6.565 },
          "heading": 0,
          "formation": "crescent",
          "state": "engaged",
          "strength": 1
        }
      ]
    },
    {
      "id": "victory-cuts-the-line",
      "label": "The Victory cuts the line; Nelson falls",
      "t": "13:00",
      "playback_rate": 300,
      "wind": { "from": 292.5 },
      "caption": "At one o'clock the Victory crosses the Bucentaure's wake within thirty feet, raking the French flagship from end to end; twenty guns are dismounted at that single discharge. She then puts her helm up and runs on board the Redoutable, lying along her port side at ten minutes past, the two ships heading east and moving slowly before the wind to the east-southeast. Fifteen minutes after they come together Nelson is shot down from the Redoutable's mizzen-top. Behind both leaders the ships of the two British divisions are breaking successively into the enemy's order; the ten ships of the allied van, to the northward, are still unengaged.",
      "notes": "Mahan times the wound as fifteen minutes after 1.10, i.e. 1.25, but also says Nelson died at half-past four 'just three hours after the fatal wound was received', which gives 1.30. The phase is authored at 13:00 for the raking of the Bucentaure and does not try to settle the minute.",
      "references": [
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'At one o'clock the bows of the \"Victory\" crossed the wake'",
          "quote": "At one o'clock the bows of the \"Victory\" crossed the wake of the \"Bucentaure,\" by whose stern she passed within thirty feet, the projecting yard arms grazing the enemy's rigging."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'At 1.10 she lay along the port side of the \"Redoutable\"'",
          "quote": "At 1.10 she lay along the port side of the \"Redoutable,\" the two ships falling off with their heads to the eastward, and moving slowly before the wind to the east-southeast."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'The northern flank of the allies'; the paragraph before note 135",
          "quote": "The northern flank of the allies--ten or a dozen ships--was consequently left unengaged, unless by their own initiative they came promptly into action; which, it may be added, they did not do until after the battle was decided."
        },
        {
          "source": "memorandum",
          "locator": "para. 5",
          "quote": "The whole impression of the British Fleet must be to overpower from two or three Ships a-head of their Commander-in-Chief supposed to be in the Centre, to the Rear of their Fleet."
        }
      ],
      "units": [
        {
          "unit": "weather-column",
          "position": { "lat": 36.324, "lon": -6.586 },
          "heading": 90,
          "formation": "column",
          "state": "engaged"
        },
        {
          "unit": "lee-column",
          "position": { "lat": 36.29, "lon": -6.56 },
          "heading": 85,
          "formation": "column",
          "state": "engaged"
        },
        {
          "unit": "combined-fleet",
          "position": { "lat": 36.317, "lon": -6.563 },
          "heading": 0,
          "formation": "crescent",
          "state": "engaged",
          "strength": 1,
          "moves": [
            {
              "kind": "detachment",
              "to": { "lat": 36.38, "lon": -6.575 }
            }
          ]
        }
      ]
    },
    {
      "id": "melee-and-van",
      "label": "The line broken; the van comes about",
      "t": "14:30",
      "playback_rate": 600,
      "wind": { "from": 292.5 },
      "caption": "The Bucentaure surrenders at five minutes past two, Villeneuve signalling his idle van to get into action as he hauls down his flag. About quarter past two the Victory is shoved clear of the Redoutable and lies with her head to the northward, scarcely with steerage way. The coherence of the allied line is gone. By half past two the ten ships of the van have got their heads to the southward, five going to leeward of the line and five to windward, where the fresh Spartiate and Minotaur haul up to meet them. Hardy tells Nelson that twelve or fourteen of the enemy are in British possession, and that no British ship has struck.",
      "notes": "Strength 0.6 for the combined fleet is Hardy's 'twelve or fourteen of the enemy's ships in our possession' taken at thirteen of the thirty-three of the line. Formation is dropped for all three units: from here the sources describe a melee, not an order.",
      "references": [
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'About quarter past two, the \"Victory\" was shoved clear'",
          "quote": "About quarter past two, the \"Victory\" was shoved clear, and lay with her head to the northward, though scarcely with steerage way."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'Thus summoned, the ten vessels which constituted the van'",
          "quote": "Thus summoned, the ten vessels which constituted the van began to go about, as they should have done before; and, although retarded by the slack wind, they had got their heads to the southward by half-past two. Five stood to leeward of the line of battle, but five to windward."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, Hardy in the cockpit, 'How goes the day with us?'",
          "quote": "We have got twelve or fourteen of the enemy's ships in our possession, but five of their van have tacked, and show an intention of bearing down upon the Victory."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'The heads of the columns had dashed themselves to pieces'",
          "quote": "But they had forced their way through, and by the sacrifice of themselves had shattered and pulverized the local resistance, destroyed the coherence of the hostile line, and opened the road for the successful action of their followers."
        }
      ],
      "units": [
        {
          "unit": "weather-column",
          "position": { "lat": 36.328, "lon": -6.56 },
          "heading": 0,
          "state": "engaged"
        },
        {
          "unit": "lee-column",
          "position": { "lat": 36.288, "lon": -6.555 },
          "heading": 90,
          "state": "engaged"
        },
        {
          "unit": "combined-fleet",
          "position": { "lat": 36.318, "lon": -6.56 },
          "heading": 0,
          "state": "broken",
          "strength": 0.6,
          "moves": [
            {
              "kind": "detachment",
              "to": { "lat": 36.3, "lon": -6.6 }
            }
          ]
        }
      ]
    },
    {
      "id": "retreat-on-cadiz",
      "label": "Gravina retreats upon Cadiz",
      "t": "16:45",
      "playback_rate": 450,
      "wind": { "from": 292.5 },
      "caption": "At three o'clock the five van ships to windward opened a distant and ineffectual fire on the British and their prizes; one of them is cut off and taken by the Minotaur and Spartiate, and the other four hold on to the southwest and escape to sea. Nelson dies at half past four. At quarter before five Gravina, left in chief command by Villeneuve's surrender, retreats upon Cadiz, signalling the ships that have not struck to rally round his flag; ten more of the line get into the port with him. The Victory and the Royal Sovereign lie in two clusters of ships and prizes with the setting sun behind them. An hour after Nelson's death the last of the eighteen prizes strikes, and firing ceases altogether.",
      "notes": "Two end times are on offer. The Victory's log says 'Partial firing continued until 4.30'; Mahan says the last prize did not strike, and firing did not cease altogether, until an hour after Nelson died at 4.30. Battle.end is set to 17:30 on Mahan's reading. Strength 0.45 is the final tally: eighteen of the thirty-three of the line taken, eleven into Cadiz and four escaped to sea.",
      "references": [
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'By the surrender of Villeneuve the chief command'; just after note 142",
          "quote": "The latter, at quarter before five, fifteen minutes after Nelson breathed his last, retreated upon Cadiz, making signal for the vessels which had not struck to rally round his flag."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'Ten other ships, five French and five Spanish'",
          "quote": "Ten other ships, five French and five Spanish,--in all eleven sail-of-the-line,--made good their escape into the port."
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, 'It was half-past four o'clock'; the Victory's log",
          "quote": "Not till an hour later did the last of the eighteen prizes strike, and firing cease altogether"
        },
        {
          "source": "mahan",
          "locator": "ch. XXIII, the eye-witness on board the 'Belleisle', 'Before sunset'",
          "quote": "on one hand lay the Victory with part of our fleet and prizes, and on the left hand the Royal Sovereign and a similar cluster of ships. To the northward, the remnant of the combined fleets was making for Cadiz."
        }
      ],
      "units": [
        {
          "unit": "weather-column",
          "position": { "lat": 36.325, "lon": -6.545 },
          "heading": 0,
          "formation": "cluster",
          "state": "engaged"
        },
        {
          "unit": "lee-column",
          "position": { "lat": 36.275, "lon": -6.545 },
          "heading": 90,
          "formation": "cluster",
          "state": "engaged"
        },
        {
          "unit": "combined-fleet",
          "position": { "lat": 36.38, "lon": -6.52 },
          "heading": 50,
          "state": "broken",
          "strength": 0.45,
          "moves": [
            {
              "kind": "intent",
              "to": { "lat": 36.533, "lon": -6.3 }
            },
            {
              "kind": "detachment",
              "to": { "lat": 36.2, "lon": -6.75 }
            }
          ]
        }
      ]
    }
  ]
}
```

## Extraction notes

**Positions — the whole geometry is inferred.** Neither source gives a coordinate. I anchored the field on two statements and worked outward, so every `position` in the file should be treated as constructed, not read:

- **Anchor 1, combined fleet at 07:00.** Mahan: Cadiz "then twenty miles to the northward and eastward" of the allies. I read that bearing as NE (045) and Mahan's "miles" as nautical, putting the allied centre about 36.30, −6.59. Medium confidence on the position, low on the exact bearing — "northward and eastward" admits anything from NNE to ENE, and swinging it moves the whole battle several miles.
- **Anchor 2, British at daybreak.** "ten or twelve miles east of their opponents" plus the Codicil's "distant about ten miles"; I used 11 nmi due west, giving −6.819. Medium-high confidence in the distance, low in the bearing being due west (Mahan says only that the allies were east).
- **Cross-check.** From the anchor the allied centre lies about 27 nmi WNW of Cape Trafalgar, consistent with the cape being "just visible" in the far distance to the east. That is a check, not a source.
- **Unit position = notional centre of each group**, per the `Position` doc comment. Mahan's distances (six miles at 09:30, two miles between the Victory and Royal Sovereign at 12:10, a mile and a half still to run) are all *leader* distances, so I placed each British column's centre about a mile astern of its flagship. The 12:10 Victory–Royal Sovereign separation comes out at about 2.6 nmi rather than Mahan's two, because the two cut-in points that the sources fix (a few ships north of the allied centre, and the twelfth ship from the rear) are further apart than that. Low confidence; a human should re-fit these four points together.
- **Allied line drift.** I moved the allied centre roughly 2 nmi north-northeast across the day, from Mahan's "bringing them continually, though very gradually, nearer to Cadiz". Direction is sourced, rate is invented.
- **Closing rate.** The British advance is drawn at about 1.6–2 knots, from the 09:30 six miles / 12:10 mile-and-a-half pair and footnote 140's "one and a half knot breeze". Medium confidence.

**Headings.**
- 45 for both British columns at 06:00: from "was standing northeast when the day broke". High confidence.
- 90 for both at 07:00: "The two columns steered east". High confidence.
- 80 for the weather column from 10:00 and 75 at 12:10: Mahan says only that the Victory's course "was changed a little to the northward". The specific numbers are mine; low confidence.
- 85–90 for the lee column throughout: Mahan never gives Collingwood a course after the bear-up. Carried forward from "steered east". Low-medium.
- 150 for the combined fleet at 07:00: mid-wear. Direction of turn (stern through the wind, so heading swinging from 180 through east to 000) is inferred from the WNW wind; the value 150 is a guess at how far a fleet wearing in succession has got in its first minutes. Low confidence. Note the wear was "not completed till near ten o'clock", so the tween from 150 at 07:00 to 000 at 10:00 is doing real work here and should be checked.
- 0 for the combined fleet from 10:00: "Their ships, which had been steering south, now all headed north." High confidence.
- 0 for the weather column at 14:30 and 16:45: taken from the Victory alone, which "lay with her head to the northward". The column as a whole was a melee with no single heading. Low confidence.
- 50 for the combined fleet at 16:45: computed as the bearing from the drawn position to Cadiz, from "retreated upon Cadiz". Direction sourced, number computed off an inferred position.

**Wind.** `from: 292.5` (WNW) in every phase, from "with the wind at west-northwest" and "the wind being west-northwest". Mahan says the light westerly conditions of midnight "continued at dawn, and throughout the day of the 21st until after the battle", so I held it constant; he does not restate the exact quarter after about 10 a.m. Medium-high confidence.

**Formations.**
- "line" for the allies at 06:00 and 07:00 ("a long column stretching over five miles"), "crescent" from 10:00 ("the horns of the crescent thus formed"). High confidence.
- "column" for the British: Mahan calls them columns but also says they "advanced rather in two elongated groups". The label overstates their regularity. Medium.
- "cluster" at 16:45 is lifted from the Belleisle eye-witness ("a similar cluster of ships").
- Formation is deliberately omitted for all three units at 14:30 and for the allies at 16:45, because by then the sources describe no order at all.

**State.**
- The weather column stays "intact" at 12:10: the Victory "did not come under fire till 12.30". Deliberate, and the one place the two British columns differ in state. High confidence.
- Allies "broken" from 14:30, on "destroyed the coherence of the hostile line". High confidence in the fact, medium in pinning it to 14:30 rather than 13:30.
- No unit is ever "destroyed": the allies still had eleven of the line reaching Cadiz under Gravina's flag, so they had not ceased to exist as a fighting unit.

**Strength.**
- Both British columns: omitted, i.e. defaulted to 1, in every phase. Hardy: "there is no fear of that" — no British ship struck. The four leading ships took a third of the fleet's casualties and the Belleisle was wrecked aloft, but the field's own rule says damage to ships still fighting does not reduce it. Medium-high confidence, and worth a human check since it makes the British look untouched.
- Combined fleet 0.6 at 14:30: thirteen (mid-point of Hardy's "twelve or fourteen") of thirty-three of the line. The denominator, thirty-three, is Mahan's. Medium.
- Combined fleet 0.45 at 16:45: eighteen prizes, eleven into Cadiz, four to sea = 15/33. This is the *final* figure; Mahan says the last prizes did not strike until about 17:30, so at 16:45 the true number was a little higher. Low-medium; deliberately smoothed.

**Moves.**
- Allies, intent → Cadiz at 07:00 and 10:00: from Villeneuve wearing to keep Cadiz under his lee, and the fleet drifting toward it. High confidence.
- Weather column, intent → 36.35, −6.58 at 10:00: "I intend to pass through the van of the enemy's line". The arrowhead is my guess at where the van lay on the drawn crescent.
- Lee column, intent → 36.287, −6.571 at 10:00: the memorandum's twelfth ship from the rear, which Collingwood roughly achieved. Medium.
- Allies, detachment → north at 13:00: the ten unengaged van ships. Sourced, arrowhead invented.
- Allies, detachment → southwest at 14:30: the van going about, the five that passed to windward (Mahan's footnote 142 glosses "to windward" as "to the westward"). Sourced, arrowhead invented.
- Allies, detachment → southwest at 16:45: the four that "continued on the wind to the southwest, and escaped to sea".

**Times.**
- 06:00 for the dawn phase is inferred; see the phase note. Mahan gives no daybreak time, and footnote 137 shows he and Blackwood's log disagree by two hours about the 6 a.m. summons.
- 16:45 for the last phase is Gravina's retreat; `end` 17:30 is Mahan's "an hour later" for the end of firing. The Victory's log in the same paragraph says "Partial firing continued until 4.30", which would give 16:30. I went with Mahan's narrative because the brief asks for the end of firing; flagged in the phase note.
- Nelson's wounding: 1.25 by one of Mahan's statements, 1.30 by the other. Recorded in the phase note, not in any field.

**Other file-level choices.**
- `extent` is chosen, not sourced: it is drawn wide enough to hold Cadiz and Cape Trafalgar as well as all unit positions, so the Cadiz arrows land inside the frame. The fighting then occupies a small part of the box — a narrower extent (about 36.20/36.45, −6.45/−6.90) would read better but would push Cadiz outside.
- `scale_unit: "nmi"` assumes Mahan's "miles" are sea miles. He uses leagues once, in Nelson's letter, and never qualifies "miles". Medium confidence; if they are statute miles every distance above shrinks by about 15%.
- `map` omitted — no GeoJSON file was supplied to point at.
- `playback_rate` is entirely invented. No source bears on it. The values give roughly 85 seconds of playback, slowest through 12:10–14:30.
- The memorandum paragraph numbering counts "Thinking it almost impossible" as 1, so the illustration paragraph ("Of the intended attack from to windward") is 9 and the lee-line bear-up paragraph is 10.

**Where the sources say something the types could not hold.**
- **Ship counts.** Thirty-three allied of the line (eighteen French, fifteen Spanish) against Nelson's twenty-seven; four allied three-deckers to seven British; the Santísima Trinidad the largest vessel then afloat. `UnitDeclaration` has no field for size or composition, and `strength` is a fraction, so all of this had to go into captions or vanish. This is the biggest single loss.
- **Commanders.** Villeneuve, Gravina, Collingwood, Nelson, Hardy are nameable only inside `label` and `caption`. There is no commander field, and no way to record that command of the allied fleet passed from Villeneuve to Gravina at 14:05 — a real, datable change of state.
- **Unit extent.** A unit is a point. The allied line was over five miles from end to end, and five miles horn to horn as a crescent; the British "elongated groups" were miles long. A single lat/lon cannot express that, and it is why the leader-versus-centre problem above exists at all. If one field were to be added, I would ask for a length or a polyline.
- **Wind speed and sea.** `Wind` carries direction only. Mahan gives roughly a knot and a half (footnote 140) and "a great swell from the westward, the precursor of a storm", which drove the whole shape of the day — the slow approach, the forty minutes under fire without reply, Nelson's order to prepare to anchor. None of it is recordable.
- **The Africa.** Footnote 134: one sixty-four separated to the northward overnight and fought alone along the enemy's line, but "belonged, therefore, to Nelson's column". At three-unit granularity she is either invisible or a detachment arrow; I left her out rather than give one ship the same visual weight as ten.
- **Prizes.** Eighteen taken, and the count rising through the afternoon. Prizes are neither a unit nor a strength, so the only record of them is caption text.
- **Discrepancy worth a human eye:** Mahan's chapter XXIII quotes Nelson's memorandum as "The whole impression of the British fleet must be to overpower from two or three ships ahead of their commander-in-chief, supposed to be in the Centre, to the Rear of their fleet", which differs in capitalisation, in "ahead" for "a-head", and in one comma from the memorandum text supplied. I quoted the memorandum's own wording under the `memorandum` key. Any verbatim check should be run against the right one of the two.