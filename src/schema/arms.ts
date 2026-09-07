/**
 * The arm allowlist (ADR-0015, schema.md 2.3): what a unit is made of.
 *
 * Kept as a code-level table the way `licenses.ts` is. Adding an arm is a code
 * change here, and it is also a sign in every view: `Glyph.signs` is keyed by
 * `Arm`, so the compiler refuses a view that has not drawn the new one. An arm
 * not in the list is a validation error, never a data-side extension.
 *
 * No qualifier: heavy and light, a ship of the line and a frigate, a dive
 * bomber and a torpedo plane, are label and caption matter. A parent carries
 * the arm of its main body; there is no `mixed`. A carrier strike is
 * `aircraft`, and its parent is its force, never its ship (ADR-0024).
 */

/** The arms a unit may be made of, in the order the spec lists them. */
export const ARMS = ["infantry", "cavalry", "ship", "aircraft"] as const;

/** What a unit is made of. Identity, never per-phase state. */
export type Arm = (typeof ARMS)[number];
