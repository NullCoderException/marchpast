/**
 * The faces the app can draw in, and when each is fetched (ADR-0021,
 * ADR-0023).
 *
 * Canvas text falls back silently to whatever font is available if the face is
 * not ready, so ADR-0009's absolute — never draw in a fallback face — has to be
 * kept by *waiting* rather than by loading everything up front. The rule:
 *
 *   - the **opening view's** face blocks the first frame, so first paint costs
 *     one face however many views there are;
 *   - every other face is fetched **at idle after first paint**, so a viewer
 *     who never switches pays for nothing;
 *   - a switch to a view whose face has not resolved **waits** for it. After
 *     the idle prefetch that is always already true; if it somehow is not, the
 *     failure is late instead of wrong.
 *
 * Today every view is engraved and there is one face, so this is the mechanism
 * with one entry. The staff map adds the second (#139), and the build-time
 * still renderer adds a second hook entry beside it (#126).
 */
import { PLATE_FONT_FAMILY } from "./plate.ts";
import plateFontUrl from "./IMFellEnglish-Regular.woff2";

/** How a view names its face: `Type.face` carries one of these. */
export type FaceId = "plate";

/** One bundled face: the family a font shorthand names, and the file it is loaded from. */
interface Face {
  family: string;
  url: string;
}

const FACES: Readonly<Record<FaceId, Face>> = {
  plate: { family: PLATE_FONT_FAMILY, url: plateFontUrl },
};

/** Every face there is, so the prefetch needs no list of its own. */
export const FACE_IDS = Object.keys(FACES) as readonly FaceId[];

/** Faces already asked for, so a second ask joins the first fetch rather than starting another. */
const asked = new Map<FaceId, Promise<void>>();
/** Faces the document holds. `loadFace` resolves for these without a microtask's delay being observable. */
const held = new Set<FaceId>();

/** Loads a face and registers it with the document. Idempotent; the same promise for every caller. */
export function loadFace(id: FaceId): Promise<void> {
  const started = asked.get(id);
  if (started !== undefined) return started;
  const { family, url } = FACES[id];
  const loading = (async () => {
    const face = new FontFace(family, `url(${url}) format("woff2")`);
    await face.load();
    document.fonts.add(face);
    held.add(id);
  })();
  asked.set(id, loading);
  return loading;
}

/** Whether the document already holds this face, so a view switch may apply on the spot. */
export function faceReady(id: FaceId): boolean {
  return held.has(id);
}

/**
 * Fetches every face but the one already in hand, once the browser is idle.
 * Called after first paint, so it never competes with it. A browser without
 * `requestIdleCallback` gets a timeout, which is the same bargain a shade
 * less politely.
 */
export function prefetchFaces(except: FaceId): void {
  const rest = FACE_IDS.filter((id) => id !== except);
  if (rest.length === 0) return;
  const fetchThem = (): void => {
    for (const id of rest) void loadFace(id).catch((error: unknown) => console.warn(`Marchpast: the ${id} face did not load`, error));
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(fetchThem);
  else setTimeout(fetchThem, 1000);
}
