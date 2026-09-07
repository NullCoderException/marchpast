/**
 * Which phase a battle's still is drawn from (ADR-0025), as one pure rule, so
 * that the still renderer (#174) and the tests below cannot come to different
 * answers. Nothing but the tests calls it yet; it lands here rather than
 * inside #174 because it is schema matter, and because the four shipped files'
 * marked phases are worth pinning the moment they are marked.
 *
 * A battle marks the phase whose picture stands for it with `still: true`, and
 * the validator allows at most one (rule 18). When no phase carries it the
 * rule falls back to the metric — the earliest phase whose count of `engaged`
 * units is the battle's maximum — silently, because that is a defined answer
 * and not a failure.
 *
 * The count is over the **whole roster**, never a drawn level: the still is
 * rendered at the coarsest level, but which phase it shows is a fact about the
 * battle rather than about what happens to be on the plate. A tie goes to the
 * earliest phase, which is harmless: a battle that has not marked a phase has
 * expressed no preference for the tie to violate.
 */
import type { Battle, Phase } from "./types.ts";

/** How many of the phase's units are in the action or its aftermath. */
function engagedCount(phase: Phase): number {
  return phase.units.filter((snapshot) => snapshot.state === "engaged").length;
}

/** The phase the battle's still is drawn from: the phase it marks, or the metric fallback. */
export function stillPhase(battle: Battle): Phase {
  const marked = battle.phases.find((phase) => phase.still === true);
  if (marked !== undefined) return marked;

  let best = battle.phases[0];
  if (best === undefined) throw new RangeError("A battle has at least one phase");
  // Strictly greater, so the earliest phase at the maximum is the one kept.
  for (const phase of battle.phases) if (engagedCount(phase) > engagedCount(best)) best = phase;
  return best;
}
