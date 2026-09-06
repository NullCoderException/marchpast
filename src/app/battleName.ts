/**
 * What the URL asks for: `?battle=<name>` plays that battle, and no `battle`
 * parameter at all is the Library, the site's front door. There is no default
 * battle and nothing is remembered, so a bare link shows the choice rather
 * than one battle chosen for the viewer (ADR-0011).
 *
 * The name is a bare file name, resolved to a data URL by `src/data/paths.ts`.
 */

/** The battle named in a query string such as `?battle=cannae`, or `null` when the URL names none. */
export function battleNameFrom(search: string): string | null {
  const name = new URLSearchParams(search).get("battle")?.trim() ?? "";
  return name === "" ? null : name;
}

/**
 * Where a battle is played: a query on the page the viewer is already on, so
 * following it is a fresh visit and no player state survives it. This is what
 * the Library's entries link to and what the Picker navigates to.
 */
export function battleQuery(name: string): string {
  return `?battle=${encodeURIComponent(name)}`;
}

/** Where the Library is: the app's own page with no battle named. */
export function libraryHref(): string {
  return import.meta.env.BASE_URL;
}
