# Prototype: proving the label rule in a melee (#39)

**Throwaway. This branch is never merged.** It exists so the label rule the design
language decided ([#58](https://github.com/NullCoderException/sandtable/issues/58))
can be judged against real phase data instead of a drawing.

The rule is not up for re-decision here: name 14px italic in the side ink over the
state word 12px upright in ink (percentage below full strength), on the glyph's
flank 30px clear of the ticks, never ahead of the unit, a 0.8px leader to a dot at
the glyph's centre when displaced, and the collapse order

```
0 full · 1 displaced · 2 no percentage · 3 no state · 4 short name · 5 numeral keyed in the legend
```

with priority engaged → has a move → roster order. What the prototype answers is
everything the rule leaves open: **what is tested against what, in what order,
how displacement is chosen, and what keeps a label still between frames.**

## Running it

```
npm run dev          # from this worktree
```

Then `http://localhost:5173/?battle=cannae-mock&labels=D`. A floating bar switches
everything; the panel on the right lists what every label did this frame.

| Knob | What it does |
| --- | --- |
| `?labels=A\|B\|C\|D` | the placement algorithm (`[` and `]` cycle) |
| `?short=commander\|derived` | where a step-4 short name comes from |
| `?boxes=1` | draws every label's collision box and its collapse step (`b`) |
| `?floor=4` | starts the collapse at a step, as the phone rule does |
| `?furniture=0` | stops treating the rose, title, legend, scale bar and credit as obstacles |
| `?stress=12` | splits the roster until the battle carries 12 units |
| `?panel=0`, `?chrome=0` | hide the panel / the whole scaffold, for screenshots |

In the console, `__sweep()` walks the whole battle at 60fps under every algorithm and
returns the table below; `__probe('D')` says what each label of the current frame is
touching.

Two battles: **Trafalgar** as authored (three units, and `?stress=9` for the
squadron level [#50](https://github.com/NullCoderException/sandtable/issues/50) asks
about), and **`cannae-mock`**, eight wing-level units from the Cannae research note
with hand-sketched positions ending in the encirclement — the most crowded frame
v0.2 has to carry.

## The four algorithms

| | What it does | Judgement |
| --- | --- | --- |
| **A** Flank-first greedy | The rule read literally: each label takes the first free slot in the collapse order, with no memory of the last frame. | Never overlaps, but jitters: labels change flank about once a second at 16 units. |
| **B** Scored slots with hysteresis | 50 candidate slots per label, scored on overlap, distance from the flank and how far it moved since last frame. | Holds still, but *tolerates* overlap (a scored overlap is just an expensive slot) and drops words far too readily. |
| **C** Relaxed springs | Labels repel each other and slide, collapse only when relaxation cannot clear the overlap. | Unusable. Local minima leave it stuck, so it degenerates to numerals and its words flicker 20 times a second. |
| **D** Sticky search | A's search with B's memory: keep last frame's slot while it is still free, otherwise search from the nearest angle outward; a collapse step is given back only after 30 clear frames. | The answer. Zero overlap to 16 units with the least movement — but it strands labels (below). |

## Measured, 60fps over the whole battle

`steps` counts label-frames at each collapse step. `ovFr` is frames still holding an
overlap after the whole collapse order. `drift` is pixels a label moves relative to its
glyph per frame; `jump/s`, `stp/s`, `flp/s` are visible jumps, word changes and flank
crossings per second of playback. `stranded` is the share of labels whose attach point
is nearer *another* unit's glyph, with no leader to say whose they are.

| case | v | steps 0..5 | ovFr | drift | jump/s | stp/s | flp/s | lead | stranded |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| trafalgar (3) | A | 21357, 11766, 0, 0, 0, 0 | 0 | 0.084 | 0.35 | 0.10 | 0.11 | 0.03 | 0.04 |
| | B | 32055, 18, 18, 782, 131, 119 | 171 | 0.044 | 0.20 | 0.49 | 0.04 | 0.02 | 0.21 |
| | C | 12121, 145, 199, 311, 198, 20149 | 6277 | 0.042 | 0.11 | 0.35 | 0.00 | 0.63 | 0.21 |
| | **D** | **33123, 0, 0, 0, 0, 0** | **0** | **0.014** | 0.05 | 0.00 | 0.01 | 0.00 | 0.01 |
| trafalgar (9) | A | 15825, 82605, 0, 460, 479, 0 | 0 | 0.369 | 2.80 | 0.42 | 0.96 | 0.56 | 0.07 |
| | B | 84617, 81, 340, 5166, 3081, 6084 | 2247 | 0.117 | 1.63 | 2.37 | 0.25 | 0.07 | 0.45 |
| | C | 10683, 258, 416, 886, 999, 86127 | 11010 | 0.049 | 0.23 | 1.20 | 0.00 | 0.87 | 0.02 |
| | **D** | **99203, 166, 0, 0, 0, 0** | **0** | 0.057 | 0.55 | 0.02 | 0.14 | 0.00 | 0.54 |
| cannae (8) | A | 32235, 8401, 0, 0, 52, 0 | 0 | 0.210 | 1.06 | 0.22 | 0.59 | 0.20 | 0.01 |
| | B | 32467, 20, 20, 153, 2795, 5233 | 3999 | 0.073 | 0.83 | 1.33 | 0.11 | 0.11 | 0.04 |
| | C | 26056, 272, 305, 263, 1194, 12598 | 4048 | 0.162 | 1.51 | 3.40 | 0.00 | 0.26 | 0.16 |
| | **D** | **39519, 1, 1, 1, 1166, 0** | **0** | 0.108 | 1.04 | 0.06 | 0.20 | 0.02 | 0.08 |
| cannae (12) | A | 31233, 21732, 0, 4344, 1389, 2334 | 0 | 0.397 | 3.92 | 1.17 | 1.49 | 0.45 | 0.01 |
| | **D** | **59289, 66, 4, 392, 1043, 238** | **0** | 0.114 | 1.53 | 0.29 | 0.27 | 0.03 | 0.18 |
| cannae (16) | A | 28160, 47130, 0, 2326, 1426, 2334 | 0 | 0.500 | 6.67 | 1.91 | 2.35 | 0.51 | 0.02 |
| | **D** | **78998, 99, 6, 497, 1538, 238** | **0** | 0.158 | 2.41 | 0.42 | 0.71 | 0.03 | 0.29 |
| cannae (20) | A | 22677, 64856, 0, 5765, 2784, 5638 | 2304 | 1.054 | 14.58 | 4.55 | 5.93 | 0.66 | 0.01 |
| | **D** | 91828, 171, 16, 2024, 5829, 1852 | 34 | 0.204 | 3.66 | 1.04 | 0.94 | 0.09 | 0.42 |

B and C are dropped after the 8- and 9-unit runs; the rows above are enough to condemn
them. Screenshots of every case are in `shots/`.

## What the prototype found

1. **The collision model is most of the rule, and #58 does not state it.** Working
   answer: hard obstacles are the ticks of every glyph *including the label's own*,
   every label already placed, the furniture, and the plate edge; the smoke is a soft
   cost that buys a displacement but never a dropped word; the label's own smoke is
   handled by choosing the windward flank, not by a box. Every one of those was a bug
   the first time round.
2. **"30px clear of the ticks" has to mean the label's near edge, not its anchor.**
   Measured from the anchor, a wide label lies straight across its own unit.
3. **The furniture has to be in the model.** Without it the Roman cavalry's label sits
   on the compass rose in the very first Cannae frame (`shots/cannae-furniture-off.png`
   against `-on.png`). Nothing in #58 mentions it.
4. **Displacement must be exhausted before words are dropped.** With a short ring the
   variants collapsed when they should have moved; with the ring out to 104px, A and D
   reach 16 units without dropping a word from most labels.
5. **Steps 2 is never used and step 5 is barely used.** Dropping the percentage buys
   almost nothing (the state word sets the width), and only one label in the 16-unit
   frame ever needs a numeral.
6. **The leader rule is wrong as written.** It fires on displacement, but the thing
   that makes a label unreadable is *ambiguity*: at 16 and 20 units, 29% and 42% of
   D's labels sit nearer another unit's glyph than their own with no leader
   (`shots/cannae-20-D.png`). Leaders should be driven by "is my glyph the nearest
   one?", not by "did I leave the flank?".
7. **The phone floor and the collapse order contradict each other.** Starting at step 4
   means starting *after* step 3 dropped the state word, so a phone shows commanders and
   no states at all (`shots/cannae-phone-floor4-D.png`).
8. **Neither short-name rule survives.** By commander, both Libyan halves are
   "Hannibal"; by a derived rule, "Spanish and Gallic cavalry" and "Spanish and Gallic
   foot" both shorten toward "Spanish …" and the parenthetical that distinguishes the
   Libyans is exactly what a rule throws away. The panel marks both clashes live.
9. **A naval constant leaks into land.** `NOMINAL_GLYPH_NMI` (1.6 nmi) draws a 560px
   unit on Cannae's 6km extent; the prototype caps a glyph at a twelfth of the plate to
   get a readable frame at all. That belongs to [#49](https://github.com/NullCoderException/sandtable/issues/49).

## Caveats

- The plate still draws v0.1's alpha-wash smoke, not #58's Billow; the placer models
  the billow's lee drift, so judge clearance from `?boxes=1`, not from the grey.
- `cannae-mock` positions are invented. The unit list, order of battle and sequence
  follow the research note; the coordinates do not come from a source.
- C is tuneable and its verdict is directional, not a proof that relaxation cannot work.
