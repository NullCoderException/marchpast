/**
 * The one place that knows where data lives.
 *
 * Battle and map files are referenced by bare name everywhere else (ADR-0005);
 * these functions turn a name into the URL the app fetches, in dev and in the
 * production build alike. The dev server and build step that make these URLs
 * real live in `vite/serve-data.ts`.
 */

/** URL prefix the data directory is served under. Mirrors the repo's `data/`; `vite/serve-data.ts` mounts the same prefix. */
const DATA_URL_PREFIX = "/data";

/** URL of the battle file `data/battles/<name>.json`. */
export function battleUrl(name: string): string {
  return `${DATA_URL_PREFIX}/battles/${name}.json`;
}

/** URL of the map file `data/maps/<name>.geojson`. */
export function mapUrl(name: string): string {
  return `${DATA_URL_PREFIX}/maps/${name}.geojson`;
}
