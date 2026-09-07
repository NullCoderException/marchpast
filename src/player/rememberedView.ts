/**
 * The one thing a visit remembers: which view the picture was left in
 * (ADR-0023).
 *
 * The level, the speed, the clock and the open card are not remembered, and
 * for different reasons: a level is a reading depth *of one battle* whose
 * names differ per battle, and ADR-0017's "every visit opens on the coarsest"
 * is an honesty rule rather than a convenience; the rest is transport state.
 *
 * Both calls are wrapped in `try`/`catch` because storage throws outright in
 * some private modes, and a themeless player beats a crashed one. Neither
 * warns: a browser that refuses storage refuses it on every load, and the
 * console line would be noise on the visit it cannot help.
 *
 * `setView` stays pure and `initialState` takes the opening view as an
 * argument, so the rules in `state.ts` are still a function of the battle and
 * the state before them: `main.ts` reads this and `player.ts` writes it.
 */
import { DEFAULT_VIEW, viewById, type View, type ViewId } from "../render/index.ts";

/**
 * The two keys, exported because `index.html` names the second of them
 * literally — a module cannot reach the `<head>`, so the only thing holding
 * the two spellings together is `rememberedView.test.ts`, which reads the page
 * and checks.
 */
export const VIEW_KEY = "marchpast.view";

/**
 * The resolved letterbox colour of that view, so `index.html`'s head can set
 * `--st-edge` before first paint without copying a palette or knowing a single
 * view id. A stale ground after a palette edit is wrong for one paint and
 * heals on the next switch.
 */
export const GROUND_KEY = "marchpast.ground";

/** The view this visit opens in: the one the last visit left, or the default. An id no view carries is a default too, which `viewById` already answers. */
export function openingView(): View {
  try {
    return viewById(localStorage.getItem(VIEW_KEY));
  } catch {
    return DEFAULT_VIEW;
  }
}

/** Remembers the view just switched to, and the ground the next visit paints before its script runs. */
export function rememberView(id: ViewId): void {
  try {
    const view = viewById(id);
    localStorage.setItem(VIEW_KEY, view.id);
    localStorage.setItem(GROUND_KEY, view.palette.letterbox);
  } catch {
    // Storage refused. The view still switches; only the memory of it is lost.
  }
}
