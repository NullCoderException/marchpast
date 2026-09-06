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
import { parseBattleTime } from "../schema/time.ts";
import { endClock, phaseIndexAt, startClock } from "./intervals.ts";
import type { ClockSeconds, Picture, UnitPicture } from "./picture.ts";
import { lerpHeading, lerpPosition } from "./tween.ts";

/** The phase's snapshots by unit id. The validator guarantees exactly one per roster unit. */
function snapshotsById(phase: Phase): Map<string, UnitSnapshot> {
  return new Map(phase.units.map((snapshot) => [snapshot.id, snapshot]));
}

/** The snapshot for `id`, or a loud failure: a battle that reaches here has passed the validator. */
function snapshotFor(snapshots: Map<string, UnitSnapshot>, phase: Phase, id: string): UnitSnapshot {
  const snapshot = snapshots.get(id);
  if (snapshot === undefined) throw new RangeError(`Phase ${JSON.stringify(phase.id)} has no snapshot for unit ${JSON.stringify(id)}`);
  return snapshot;
}

/** One unit's picture: geometry tweened toward `to` if there is one, everything else read off `from`. */
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
  const clock = Math.min(Math.max(clockSeconds, startClock(battle)), endClock(battle));
  const phaseIndex = phaseIndexAt(battle, clock / 60);
  const phase = battle.phases[phaseIndex]!;
  const next = battle.phases[phaseIndex + 1];

  const startSeconds = parseBattleTime(phase.t) * 60;
  const endSeconds = next === undefined ? endClock(battle) : parseBattleTime(next.t) * 60;
  // The last phase holds: with nothing to tween toward, the fraction is moot.
  const f = next === undefined ? 0 : Math.min(Math.max((clock - startSeconds) / (endSeconds - startSeconds), 0), 1);

  const from = snapshotsById(phase);
  const to = next === undefined ? undefined : snapshotsById(next);

  return {
    phaseIndex,
    phase,
    clock,
    units: battle.units.map((unit) =>
      unitPicture(
        unit.id,
        snapshotFor(from, phase, unit.id),
        to === undefined || next === undefined ? undefined : snapshotFor(to, next, unit.id),
        f,
      ),
    ),
    wind: phase.wind,
    caption: phase.caption,
    label: phase.label,
    references: phase.references,
    notes: phase.notes,
  };
}
