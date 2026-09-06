/**
 * What the legend says about arms (ADR-0015): one row per arm present when the
 * roster has two or more, and none at all when it has one — Trafalgar's legend
 * is already the tallest piece of furniture and would gain a row saying "ship"
 * under three units that are visibly ships.
 *
 * Pure, and reading nothing but the roster's `arm` fields, so the row count is
 * a decision the furniture pass looks up rather than one it makes in ink.
 */
import { ARMS, type Arm } from "../../schema/arms.ts";
import type { Unit } from "../../schema/types.ts";

/**
 * The arms the legend keys, in the order the spec lists them: every arm the
 * roster holds when it holds two or more, and nothing when it holds one.
 */
export function legendArms(units: readonly Unit[]): Arm[] {
  const present = ARMS.filter((arm) => units.some((unit) => unit.arm === arm));
  return present.length < 2 ? [] : present;
}

/**
 * The arm the legend's other rows are drawn in: the one most of the battle is
 * made of, ties going to the order the spec lists them. The side and state
 * rows have to be *some* arm, and drawing Cannae's states as ship-ticks would
 * teach a reading the plate never uses.
 */
export function legendArm(units: readonly Unit[]): Arm {
  const count = (arm: Arm): number => units.filter((unit) => unit.arm === arm).length;
  let commonest: Arm = ARMS[0];
  for (const arm of ARMS) if (count(arm) > count(commonest)) commonest = arm;
  return commonest;
}
