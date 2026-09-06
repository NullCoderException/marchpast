/**
 * Which battle the page plays: `?battle=<name>` on the URL, `trafalgar` when
 * the parameter is missing or blank. The name is a bare file name, resolved
 * to a URL by `src/data/paths.ts`.
 */

/** The battle that plays when the URL names none. */
export const DEFAULT_BATTLE = "trafalgar";

/** The battle name in a query string such as `?battle=cannae`, or the default. */
export function battleNameFrom(search: string): string {
  const name = new URLSearchParams(search).get("battle")?.trim() ?? "";
  return name === "" ? DEFAULT_BATTLE : name;
}
