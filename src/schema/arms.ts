/**
 * The arm allowlist (ADR-0015, schema.md 2.3): what a unit is made of.
 *
 * Kept as a code-level table the way `licenses.ts` is. Adding an arm is a code
 * change here, and it is also a sign in every view: a later slice keys the sign
 * table by `Arm`, so the compiler refuses a view that has not drawn the new one.
 * An arm not in the list is a validation error, never a data-side extension.
 *
 * No qualifier: heavy and light, a ship of the line and a frigate, are label
 * and caption matter. A parent carries the arm of its main body; there is no
 * `mixed`.
 */

/** The arms a unit may be made of, in the order the spec lists them. */
export const ARMS = ["infantry", "cavalry", "ship"] as const;

/** What a unit is made of. Identity, never per-phase state. */
export type Arm = (typeof ARMS)[number];

/** Whether `value` is on the arm allowlist. */
export function isArm(value: string): value is Arm {
  return (ARMS as readonly string[]).includes(value);
}
