/**
 * The level filter: which of the picture's units this frame draws.
 *
 * The timeline computes every roster unit's picture whatever level is shown,
 * and **the renderer is what narrows it** (schema.md 2.11). That is why
 * switching level is one number changing and never a re-run of the timeline:
 * the clock, the phases and the scrubber cannot tell the levels apart.
 *
 * The rule itself — a level is a depth, and showing it draws every unit at
 * that depth plus every shallower unit that was never subdivided — lives once
 * in `src/schema/hierarchy.ts`, where the validator's sixteen-unit count reads
 * it too (ADR-0017). This file only applies it to a picture.
 *
 * What does **not** narrow is `picture.units`: it stays the whole roster, in
 * roster order, so the label priority and the numeral that keys a label in the
 * legend are the whole-roster index at every level.
 */
import { unitsAtLevel } from "../schema/hierarchy.ts";
import type { Unit } from "../schema/types.ts";
import type { UnitPicture } from "../timeline/picture.ts";

/**
 * The picture's units that `level` draws, in the picture's own order and as
 * the picture's own snapshots. A flat roster draws everything at every level,
 * which is what a battle with no `levels` gets.
 */
export function unitsDrawn(roster: readonly Unit[], units: readonly UnitPicture[], level: number): UnitPicture[] {
  const drawn = new Set(unitsAtLevel(roster, level).map((unit) => unit.id));
  return units.filter((unit) => drawn.has(unit.id));
}
