# Moves are authored arrows for what positions cannot show, never a unit's own motion

The concept sketch gave each phase both `units[].position` and `moves[]` arrows, which invites the two to disagree. Since phases are snapshots the player tweens (ADR-0002), a unit's own motion between phases is already fully determined by its positions, so a move arrow for it would be redundant data. We chose to keep **move** only for authored arrows that positions cannot express: what part of a unit did that the unit's position does not follow, and what a unit was ordered to do whether or not it happened. Anything drawn about a unit's own motion (the **track**) is renderer styling with no schema field.

## Considered options

- **Moves derived, no field** (rejected): cannot draw Dumanoir's van escaping from a Combined Fleet whose position follows Gravina toward Cadiz (ADR-0003), and would force a fourth unit to show it.
- **Moves authored, positions derived** (rejected): contradicts ADR-0002, where the phase _is_ the positions.
- **Moves authored alongside positions, including the unit's own advance** (rejected): stores the same motion twice and lets them disagree.
- **Moves only for what positions cannot show** (chosen).

## Consequences

- **A move has a `kind`, required, one of `detachment` or `intent`.** `detachment` is part of the unit going where the unit does not; `intent` is what the unit was ordered to do. The renderer styles each kind, as it styles each state; there is no style field and no per-battle vocabulary. Further kinds wait for a battle that needs them.
- **A move is nested under its unit in the phase**, `units[].moves[]`, optional and empty by default. The tail is structural: it follows the unit's tweened position through the interval. A move never has a free-floating tail; off-map arrivals stay deferred with unit appearance.
- **The head is a position and may lie outside the extent.** The renderer clips the arrow at the edge. There is no off-map schema concept.
- **A move steps; it has no identity.** It appears at its phase's instant, holds, and is gone at the next phase unless re-listed. The head does not tween. "Geometry tweens, everything else steps" keeps its single strength exception (ADR-0003).
- **No free text on a move.** The caption says what the arrow means, as ADR-0003 already rules for units.
- **Any number of moves per unit, no cross-check against state.** Validation is shape only: `kind` in the enum, `to` a valid position.
- **The renderer draws a track for the current interval** (an arrow ahead along the tween) with no schema flag to enable or suppress it. How it looks belongs to the static-frame prototype.
