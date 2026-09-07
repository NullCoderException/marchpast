# Phases are snapshots linearly tweened by the player

*Amended 2026-09-07: "Every phase lists every unit" is superseded by [ADR-0024](0024-aircraft-are-an-arm-and-a-unit-may-be-absent-from-a-phase.md): a phase may omit a roster unit, absence meaning the unit does not exist on the plate at that instant, and a unit's phases form one contiguous run; a unit is tweened only between two phases that both hold it, so every tween still has an origin and a target. The deferral of "units appearing or disappearing mid-battle" closes with it (#131). The snapshot-tween model and the step rules stand.*

*Amended 2026-09-06: multi-day battles arrived in v2 as the per-phase `day` offset this ADR anticipated (ADR-0013); the ordering key is (`day`, `t`) and the engine's clock runs from midnight of the first day. The snapshot-tween model and the step rules stand.*

A battle file had three ways to describe motion between phases: a linear tween between one snapshot per phase, timed keyframes inside a phase, or static held pictures with only the move arrows animating. We chose the snapshot tween: a phase carries one position and heading per unit at one battle-clock instant, and the player interpolates linearly to the next phase. Keyframes would have split "phase" into a narration concept and a motion concept and doubled what an extraction pipeline must produce; static pictures were the slideshow the concept doc set as the floor. Curved or multi-leg movement, such as the Combined Fleet wearing from south to north at Trafalgar, is expressed by adding a phase, never by adding a schema concept.

## Considered options

- **Snapshot tween** (chosen): one snapshot per phase, linear interpolation to the next.
- **Keyframes within phases**: several timed snapshots per unit per phase. Most expressive; rejected for v1 because it makes a phase two things at once. Can be added later as an optional per-unit list without breaking the snapshot model.
- **Static phases**: units jump at phase boundaries. Rejected as below the visual bar.

## Consequences

- **Battle clock is the master timeline.** The player's time variable is battle-clock time; wall time is converted through the current phase's playback rate. Within a phase a unit therefore moves at a constant historical speed, and the displayed clock is truthful.
- **A phase carries one instant, `t`, not a start and end.** Its end is the next phase's `t`, so contiguity is structural. The battle carries a top-level end time so the last phase knows how long to hold its picture. The validator requires strictly increasing `t`.
- **`t` is a `"HH:MM"` 24-hour string on the battle day**, and the battle carries a human-readable `date` string. Multi-day battles are not v1; a later version may add a day offset. Ship's logs are quarter-hour precision at best, so nothing finer is needed.
- **The schema stores `playback_rate`, not an authored duration.** Rate makes speed jumps between adjacent phases visible, which is what an author tunes; the player derives each phase's playback duration.
- **Easing is linear.** Ships and marching columns do not visibly accelerate at map scale.
- **Heading tweens along the shortest arc; an exact 180-degree tie resolves clockwise.** No turn-direction hint in v1. Where the direction matters (a wear is stern through the wind), the author adds an intermediate phase.
- **Every non-geometric field steps at the phase's instant**: `state`, `formation`, `strength`, caption, wind all hold their phase's value for the whole interval. Strength is a step too, confirmed by ADR-0003.
- **Every phase lists every unit.** The validator rejects a phase that omits a unit another phase has, so a tween always has an origin and a target. Units appearing or disappearing mid-battle is deferred to squadron subdivision (ADR-0003); a unit that fragments stays one unit and goes `broken`.
