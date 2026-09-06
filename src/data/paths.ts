/**
 * The one place that knows where data lives.
 *
 * Battle and map files are referenced by bare name everywhere else (ADR-0005);
 * these functions turn a name into the URL the app fetches, in dev and in the
 * production build alike. The URLs hang off the app's base URL (Vite's `base`),
 * so the same code resolves `/data/…` on the dev server and
 * `/sandtable/data/…` on GitHub Pages. The dev server and build step that make
 * these URLs real live in `vite/serve-data.ts`.
 */

/** Directory the data files are served under, beneath the app's base URL. Mirrors the repo's `data/`, which `vite/serve-data.ts` mounts at the dev server's root (where the dev base leaves it) and copies into `dist/data/` for the build. */
const DATA_DIR = "data";

/** The data prefix for this deployment, e.g. `/data` in dev and `/sandtable/data` on GitHub Pages. `BASE_URL` always ends in a slash. */
function dataPrefix(): string {
  return `${import.meta.env.BASE_URL}${DATA_DIR}`;
}

/** URL of the battle file `data/battles/<name>.json`. */
export function battleUrl(name: string): string {
  return `${dataPrefix()}/battles/${name}.json`;
}

/** URL of the map file `data/maps/<name>.geojson`. */
export function mapUrl(name: string): string {
  return `${dataPrefix()}/maps/${name}.geojson`;
}
