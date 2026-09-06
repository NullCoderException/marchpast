/**
 * The timeline's one answer to the renderer: given a valid battle and a
 * battle-clock instant, the Picture at that instant.
 *
 * Geometry tweens, everything else steps (ADR-0002, schema.md 2.10). Position
 * and heading are interpolated across the current phase's interval; every
 * other field is the current phase's value, held whole. The last phase has no
 * next snapshot to tween toward, so it holds its own picture, and its units
 * carry no track.
 */
import type { Battle, Phase, UnitSnapshot } from "../schema/types.ts";
import { clampClock, intervalAt } from "./intervals.ts";
import type { ClockSeconds, Picture, UnitPicture } from "./picture.ts";
import { lerpHeading, lerpPosition } from "./tween.ts";

/**
 * A lookup of the phase's snapshot for a roster unit id. The validator
 * guarantees exactly one per unit, so a miss is a battle that never passed it
 * and fails loudly rather than drawing half a picture.
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

  return {
    phaseIndex: interval.index,
    phase,
    clock,
    units: battle.units.map((unit) => unitPicture(unit.id, from(unit.id), to?.(unit.id), f)),
    wind: phase.wind,
    caption: phase.caption,
    label: phase.label,
    references: phase.references,
    notes: phase.notes,
  };
}
