/**
 * Rule 19 (schema.md 2.10, ADR-0028): the names a battle file may not have.
 *
 * The build emits a page per battle at `/<name>/`, so battle names and the
 * site's own top-level routes share one namespace. `data`, `assets`, `404` and
 * `index` are the build's, and a battle that took one of them would be a live
 * collision rather than a build failure.
 *
 * It lives beside the validator rather than inside it because the validator
 * sees a document and never a filename. The two places that do walk file stems
 * — `scripts/validate.ts` and `vite/library.ts` — apply this one function, so
 * `npm run validate`, the dev server and the build agree about which names are
 * the site's.
 */
import type { ValidationError } from "./validation.ts";

/** The paths the build emits at the site's root, and therefore not battle names. */
export const RESERVED_BATTLE_NAMES = ["data", "assets", "404", "index"] as const;

/**
 * The error a reserved battle name earns, or `undefined` when the name is
 * free. Reported at the document root, because no field of the file carries
 * the name that is wrong.
 */
export function reservedNameError(name: string): ValidationError | undefined {
  if (!(RESERVED_BATTLE_NAMES as readonly string[]).includes(name)) return undefined;
  return {
    path: "",
    message: `${JSON.stringify(name)} is a path the build emits at the site's root, so it is not a battle name; the reserved names are ${RESERVED_BATTLE_NAMES.join(", ")}`,
  };
}
