/**
 * The roster's tree (ADR-0017, schema.md 2.9): how deep each unit sits, how
 * deep the tree goes, and which units a level draws.
 *
 * A unit with no `parent` is a root at depth `0`; a unit's depth is its
 * parent's plus one. Roster order puts every parent before its children, so
 * one forward pass settles every depth.
 *
 * **Showing a level draws every unit at that depth plus every shallower unit
 * that has no children**, so a unit the author chose not to split stands for
 * itself at every finer level and nothing vanishes from the plate. The
 * validator counts a level against the sixteen rule with this function, and
 * the renderer's level slice draws exactly what it returns; one rule, one
 * implementation.
 *
 * Every function here reads whatever roster it is given, valid or not, so the
 * validator can call it while it is still deciding. A `parent` that names no
 * roster entry leaves its unit a root; the validator reports that separately
 * (rule 16).
 */
import type { Unit } from "./types.ts";

/** Each unit's depth by id: `0` for a root, the parent's plus one otherwise. */
export function unitDepths(units: readonly Unit[]): Map<string, number> {
  const depths = new Map<string, number>();
  for (const unit of units) {
    const parentDepth = unit.parent === undefined ? undefined : depths.get(unit.parent);
    depths.set(unit.id, parentDepth === undefined ? 0 : parentDepth + 1);
  }
  return depths;
}

/** The number of levels the roster has: the deepest unit's depth plus one, so a flat roster is `1`. */
export function treeDepth(units: readonly Unit[]): number {
  let deepest = 0;
  for (const depth of unitDepths(units).values()) deepest = Math.max(deepest, depth);
  return deepest + 1;
}

/** Whether any unit names `id` as its parent. */
function parentIds(units: readonly Unit[]): Set<string> {
  return new Set(units.map((unit) => unit.parent).filter((id) => id !== undefined));
}

/** The units drawn at `level`, in roster order: those at that depth, plus the shallower ones with no children. */
export function unitsAtLevel(units: readonly Unit[], level: number): Unit[] {
  const depths = unitDepths(units);
  const parents = parentIds(units);
  return units.filter((unit) => {
    const depth = depths.get(unit.id) ?? 0;
    if (depth === level) return true;
    return depth < level && !parents.has(unit.id);
  });
}
