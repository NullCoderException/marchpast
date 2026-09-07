/**
 * The timeline's one answer to the renderer: given a valid battle and a
 * battle-clock instant, the Picture at that instant.
 *
 * Geometry tweens, everything else steps (ADR-0002, schema.md 2.10). Position
 * and heading are interpolated across the current phase's interval; every
 * other field is the current phase's value, held whole. The last phase has no
 * next snapshot to tween toward, so it holds its own picture, and its units
 * carry no track.
 *
 * A unit exists only inside its run (ADR-0024, schema.md 2.9, 2.11). The
 * picture holds a unit only when the interval's **both ends** have a snapshot
 * of it, so it appears at the instant of its first phase and is gone once its
 * last is reached, with no fade. Everything downstream — the plate, the
 * labels, the muster, the card — reads the picture, so absence needs no second
 * rule anywhere else.
 */
import type { Battle, Phase, UnitSnapshot } from "../schema/types.ts";
import { clampClock, intervalAt } from "./intervals.ts";
import type { ClockSeconds, Picture, UnitPicture } from "./picture.ts";
import { lerpHeading, lerpPosition } from "./tween.ts";

/**
 * A lookup of the phase's snapshot for a roster unit id. Only ever asked about
 * a unit the interval draws, so a miss is a battle that never passed the
 * validator and fails loudly rather than drawing half a picture.
 */
function snapshotLookup(phase: Phase): (id: string) => UnitSnapshot {
  const byId = new Map(phase.units.map((snapshot) => [snapshot.id, snapshot]));
  return (id) => {
    const snapshot = byId.get(id);
    if (snapshot === undefined) {
      throw new RangeError(`Phase ${JSON.stringify(phase.id)} has no snapshot for unit ${JSON.stringify(id)}`);
    }
    return snapshot;
  };
}

/** The ids the interval at `index` draws: those with a snapshot at both of its ends. The last phase has no far end, so it draws whatever it holds. */
function presentInInterval(battle: Battle, index: number): Set<string> {
  const phase = battle.phases[index];
  if (phase === undefined) return new Set();
  const here = phase.units.map((snapshot) => snapshot.id);
  const next = battle.phases[index + 1];
  if (next === undefined) return new Set(here);
  const far = new Set(next.units.map((snapshot) => snapshot.id));
  return new Set(here.filter((id) => far.has(id)));
}

/**
 * The roster ids drawn at `clockSeconds`, which is clamped into the battle
 * first, exactly as `pictureAt` clamps it. Exported for the one caller that
 * needs the answer without a picture: the player's `setLevel`, which closes a
 * card that has no glyph to hang on.
 */
export function presentAt(battle: Battle, clockSeconds: ClockSeconds): Set<string> {
  return presentInInterval(battle, intervalAt(battle, clockSeconds).index);
}

/** One unit's picture: geometry tweened toward `to` when there is one, everything else read off `from`. */
function unitPicture(id: string, from: UnitSnapshot, to: UnitSnapshot | undefined, f: number): UnitPicture {
  const picture: UnitPicture = {
    id,
    position: to === undefined ? { ...from.position } : lerpPosition(from.position, to.position, f),
    heading: to === undefined ? from.heading : lerpHeading(from.heading, to.heading, f),
    formation: from.formation,
    state: from.state,
    strength: from.strength ?? 1,
    moves: from.moves ?? [],
  };
  if (to !== undefined) picture.track = { from: { ...from.position }, to: { ...to.position } };
  return picture;
}

/**
 * The Picture at `clockSeconds`. An instant before the first phase's `t` or
 * after `end` is clamped into the battle, so the caller never has to.
 */
export function pictureAt(battle: Battle, clockSeconds: ClockSeconds): Picture {
  const clock = clampClock(battle, clockSeconds);
  const interval = intervalAt(battle, clock);
  const phase = battle.phases[interval.index]!;
  const next = battle.phases[interval.index + 1];

  // The last phase holds: with nothing to tween toward, the fraction is moot.
  const elapsed = (clock - interval.startSeconds) / (interval.endSeconds - interval.startSeconds);
  const f = next === undefined ? 0 : Math.min(Math.max(elapsed, 0), 1);

  const from = snapshotLookup(phase);
  const to = next === undefined ? undefined : snapshotLookup(next);
  const present = presentInInterval(battle, interval.index);

  return {
    phaseIndex: interval.index,
    phase,
    clock,
    // Roster order, so the numeral that keys a label in the legend is still
    // the whole-roster index of the units that are there (schema.md 2.11).
    units: battle.units
      .filter((unit) => present.has(unit.id))
      .map((unit) => unitPicture(unit.id, from(unit.id), to?.(unit.id), f)),
    wind: phase.wind,
    caption: phase.caption,
    label: phase.label,
    references: phase.references,
    notes: phase.notes,
  };
}
