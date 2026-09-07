/**
 * What the URL asks for: `/<name>/` plays that battle, and the bare root is
 * the Library, the site's front door. There is no default battle and nothing
 * is remembered, so a bare link shows the choice rather than one battle chosen
 * for the viewer (ADR-0011, as amended by ADR-0028).
 *
 * The path is read first and `?battle=<name>` second: the query form is the
 * shape ADR-0011 shipped, and it is still *read* so that a link shared under
 * v0.2 still lands on its battle, but nothing emits it any more — `main.ts`
 * `replaceState`s to the path, so the old URL stops propagating rather than
 * merely being tolerated.
 *
 * The name is a bare file name, resolved to a data URL by `src/data/paths.ts`
 * and to a page by the build (`vite/pages.ts`).
 */
import { battleSegment } from "../data/library.ts";

/** The battle named in a query string such as `?battle=cannae`, or `null` when the URL names none. */
export function battleNameFrom(search: string): string | null {
  const name = new URLSearchParams(search).get("battle")?.trim() ?? "";
  return name === "" ? null : name;
}

/**
 * The battle named by a path such as `/cannae/`, or `null` when the path names
 * none — the site's root, or anything that is not one bare segment under it.
 *
 * A segment ending in `.html` names a **document the host served by its own
 * file name** (`/index.html`, `/404.html`) and never a battle, so those keep
 * showing the page they are. Rule 19 keeps the rest of the site's own paths
 * out of the battle namespace (`src/schema/reservedNames.ts`).
 */
export function battleNameFromPath(pathname: string): string | null {
  const base = import.meta.env.BASE_URL;
  if (!pathname.startsWith(base)) return null;

  const segment = pathname.slice(base.length).replace(/\/+$/, "");
  if (segment === "" || segment.includes("/") || segment.endsWith(".html")) return null;

  let name: string;
  try {
    name = decodeURIComponent(segment).trim();
  } catch {
    return null;
  }
  return name === "" ? null : name;
}

/**
 * Where a battle is played: a page of its own at `/<name>/`, so following it
 * is a fresh visit and no player state survives it. The Library's entries link
 * to it and the Picker navigates to it; the build writes the document it names
 * off the same `battleSegment` (ADR-0028). It hangs off the app's base URL
 * exactly as `libraryHref` does, which on this domain is a bare `/`.
 */
export function battlePath(name: string): string {
  return `${import.meta.env.BASE_URL}${battleSegment(name)}`;
}

/**
 * Where a battle *was* played, before ADR-0028: the same page with the battle
 * on the query. Kept beside `battlePath` as the legacy form, read by
 * `battleNameFrom` and never emitted.
 */
export function battleQuery(name: string): string {
  return `?battle=${encodeURIComponent(name)}`;
}

/** Where the Library is: the app's own page with no battle named. */
export function libraryHref(): string {
  return import.meta.env.BASE_URL;
}
