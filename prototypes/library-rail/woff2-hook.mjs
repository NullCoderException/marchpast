/** Answers the renderer's one Vite-only import — `./IMFellEnglish-Regular.woff2` — with a string, so the renderer imports into Node (#126). */
export async function load(url, context, nextLoad) {
  if (url.endsWith(".woff2")) return { format: "module", shortCircuit: true, source: 'export default "font.woff2";' };
  return nextLoad(url, context);
}
