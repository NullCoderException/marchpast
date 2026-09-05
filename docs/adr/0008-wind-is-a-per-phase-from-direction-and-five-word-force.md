# Wind is a per-phase "from" direction plus a five-word force, all or nothing per battle

ADR-0005 made wind a phase property drawn as furniture, and ADR-0001 fixed angles as degrees true. What remained was how to write strength, which way the angle points, and whether every phase must carry it. We chose `wind: { from, force }` on the phase: `from` is degrees true the wind blows **from** (the meteorological convention every source uses, so "wind WNW" is copied as `292.5` with no conversion); `force` is a fixed battle-neutral enum `calm` / `light` / `moderate` / `fresh` / `gale`, the words the sources themselves use; and wind is optional per battle but **all or nothing across phases**, so absence means "this battle does not track wind" and never means calm.

## Considered options

- **Direction blowing toward**: matches how the arrow is drawn, but nobody writes wind that way and every source reading would need converting. The renderer flips the angle instead.
- **Compass-point strings** (`"WNW"`): read like the sources but add a second angle vocabulary beside heading and a lookup table in the renderer.
- **Beaufort force** (0 to 12): the sailor's standard, but the sources never give it (Beaufort's scale postdates 1805 usage), so the author would invent a number. Five words carry exactly the precision the sources have.
- **0-to-1 fraction** like unit strength: meaningless to a reader and to the sources.
- **Direction only, no strength**: defensible for v1 since Trafalgar is light all day; rejected because the enum is cheap and gives the indicator something to vary when a wind rises.
- **Required on every phase**: would force land battles to invent a wind. **Optional per phase**: lets the indicator flicker if an author omits one phase.

## Consequences

- **Shape.** `wind` is one object, so the all-or-nothing check tests one key and the two values travel together like `lat` and `lon`.
- **`from` obeys heading's rule**: a number, 0 inclusive to 360 exclusive, decimals allowed so the 16 compass points round-trip exactly (WNW is 292.5). The validator shares one check with heading.
- **Calm has no direction.** `from` must be absent when `force` is `calm` and present otherwise; no made-up number in the file. The renderer draws the indicator without an arrow at calm.
- **All or nothing is validator-enforced.** Either every phase has `wind` or none does, the same rule shape as "every phase lists every unit" (ADR-0002).
- **Wind steps at the phase instant** and holds until the next phase (ADR-0002); a shift is expressed by the next phase's value, never tweened.
- **Indicator styling is the renderer's.** How force becomes arrow weight or feather count is furniture (ADR-0005), not data.
