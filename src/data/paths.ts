/**
 * The one place that knows where data lives.
 *
 * Battle and map files are referenced by bare name everywhere else (ADR-0005);
 * these functions turn a name into the URL the app fetches, in dev and in the
 * production build alike. The URLs hang off the app's base URL (Vite's `base`),
 * which is a bare slash now the site serves from the root of its own domain,
 * so `/data/…` resolves on the dev server and on the live site alike, and a
 * deployment under a path would follow its base with no change here. The dev
 * server and build step that make these URLs real live in `vite/serve-data.ts`.
 */

/** Directory the data files are served under, beneath the app's base URL. Mirrors the repo's `data/`, which `vite/serve-data.ts` mounts at the server's root (where the base leaves it) and copies into `dist/data/` for the build. */
const DATA_DIR = "data";

/** The data prefix for this deployment: `/data` while the app serves from a domain root, `<base>data` if it ever serves under a path. `BASE_URL` always ends in a slash. */
function dataPrefix(): string {
  return `${import.meta.env.BASE_URL}${DATA_DIR}`;
}

/** URL of the battle file `data/battles/<name>.json`. */
export function battleUrl(name: string): string {
  return `${dataPrefix()}/battles/${name}.json`;
}

/** URL of the Library's index, `data/index.json`: the one file on the data route the build generates rather than stores (ADR-0011). */
export function indexUrl(): string {
  return `${dataPrefix()}/index.json`;
}

/** URL of the map file `data/maps/<name>.geojson`. */
export function mapUrl(name: string): string {
  return `${dataPrefix()}/maps/${name}.geojson`;
}
