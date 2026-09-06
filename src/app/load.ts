/**
 * What loading a data file means for the app: the one call it makes to the
 * network, the three ways that call can fail (unreachable, an error status,
 * not JSON), and how a failure reads.
 *
 * Nothing here throws. Every failure comes back as a `LoadError` carrying the
 * file it was found in, so the page can write the same file / path / message
 * lines `npm run validate` prints, whether it was loading a battle, its map or
 * the Library's index. The fetch is a parameter so the loaders test without a
 * server.
 */
import type { ValidationError } from "../schema/validation.ts";

/** A validation error with the file it belongs to; `path` is `""` for a whole-file failure. */
export interface LoadError extends ValidationError {
  file: string;
}

/** The one call a loader makes to the network: `fetch` by default, a table in tests. */
export type FetchLike = (url: string) => Promise<Response>;

/** One file as parsed JSON, or the reason it could not be: unreachable, not found, not JSON. */
export async function fetchJson(url: string, fetchLike: FetchLike): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  let response: Response;
  try {
    response = await fetchLike(url);
  } catch (error) {
    return { ok: false, message: `cannot fetch: ${errorMessage(error)}` };
  }
  if (!response.ok) {
    return { ok: false, message: `HTTP ${response.status}${response.statusText === "" ? "" : ` ${response.statusText}`}` };
  }
  try {
    return { ok: true, value: await response.json() };
  } catch (error) {
    return { ok: false, message: `not valid JSON: ${errorMessage(error)}` };
  }
}

/** Errors as the validator reports them, each stamped with the file they came from. */
export function withFile(file: string, errors: ValidationError[]): LoadError[] {
  return errors.map((error) => ({ file, ...error }));
}

/** What a thrown value says, whether or not it is an `Error`. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The errors as lines for a person: each file once, then one indented line per
 * error with its JSON-pointer path (`(root)` for the whole file) and message.
 * The same shape `scripts/validate.ts` prints on the command line.
 */
export function formatLoadErrors(errors: readonly LoadError[]): string[] {
  const lines: string[] = [];
  let currentFile: string | undefined;
  for (const error of errors) {
    if (error.file !== currentFile) {
      currentFile = error.file;
      lines.push(error.file);
    }
    lines.push(`  ${error.path || "(root)"}: ${error.message}`);
  }
  return lines;
}
