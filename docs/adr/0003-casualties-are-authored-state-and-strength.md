# Casualties are an authored state and strength fraction, not a simulation

A battle file needs to show a fleet or army wearing down without the player computing anything. We considered dropping strength and relying on state alone, an absolute count (ships or men) with an opening denominator, a coarse full/reduced/shattered band, and a 0-to-1 fraction. We chose two fields per unit per phase: a fixed four-value **state** enum (`intact`, `engaged`, `broken`, `destroyed`) and an optional **strength** fraction, 0 to 1, defaulting to 1. Both are authored facts the sources support and both step at the phase instant like every other non-geometric field; nothing is derived, and the detail that neither field can carry lives in the phase caption.

## Considered options

- **State only**: loses the one visible signal that the Combined Fleet at Trafalgar shrinks from 33 ships to 11 while the British columns stay full.
- **Absolute count**: readable in the data but forces a typed denominator (ships versus men) onto the renderer; counts belong in captions and source refs where they can be argued about.
- **Coarse band**: a second enum beside `state` that the two would drift into.
- **Fraction** (chosen): battle-agnostic, survives the land-battle generalisation unchanged, and the renderer needs no denominator.

## Consequences

- **The enum is fixed by the schema, not per battle.** The renderer styles each state; a per-battle vocabulary would push styling into the battle file. The terminal word is the battle-neutral `destroyed`, not the naval `struck`.
- **Strength is fighting strength, not damage.** A unit whose every ship is dismasted but none has struck is `engaged` at strength 1. Damage is caption matter. At Trafalgar the British columns never leave `engaged` and never drop below 1.
- **Strength steps at the phase instant; it does not tween.** "Geometry tweens, everything else steps" stays the whole rule (ADR-0002). A tweened strength would draw a decay curve nobody authored. An author who wants a gentler collapse adds a phase.
- **Renderer transitions are cosmetic.** A state or strength change may cross-fade over a short, bounded wall-time interval; the transition is never a schema field and never visible on the scrubber.
- **Three units stay three when a unit fragments.** When the Combined Fleet splits into Dumanoir's escaping van and Gravina's retreating remnant, the single unit goes `broken`, its strength falls, and its position follows the body that is still the unit (Gravina's, toward Cadiz). Struck ships have left the unit; an escaping detachment is a move arrow and a caption. Units appearing or disappearing mid-battle is deferred to squadron subdivision, where it earns its keep.
- **No per-unit free text and no per-side counters in v1.** A per-unit note is the thin end of per-ship detail; a tally of ships struck is a scoreboard, which is the simulation feel this decision exists to avoid. A crowded caption is a sign the phase should split.
