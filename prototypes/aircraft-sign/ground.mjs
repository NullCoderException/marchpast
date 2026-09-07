// The ground the terrain treatments are drawn over (#138). Lifted VERBATIM from build-v2.mjs on
// prototype/design-language (commit 0d9ae0f), with the file-writing and the drawing stripped out, so
// these artboards stand on exactly the ground #62 decided against and #58's canvas stays frozen
// (ADR-0021: one design canvas per prototype ticket). Terrain is synthetic — a heightfield shaped like
// the Ofanto valley, contoured at 10 m as the real file would be. Nothing here is geo-registered.
//
// `heightCannae` is kept only to build the contours. Every treatment in terrain.mjs that claims to be
// derivable by the renderer takes CONTOURS and nothing else: the map file carries polylines and a level,
// and by ADR-0012 it never carries a raster.
import { seeded, f } from "./lib.mjs";

const f1 = (n) => Number(n.toFixed(1));

// Geometry helpers
// ---------------------------------------------------------------------------------------------------
// Catmull-Rom through points, as a cubic path; also sampled densely for lookups.
function catmull(pts, samples = 40) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
    for (let k = 1; k <= samples; k++) {
      const t = k / samples, mt = 1 - t;
      out.push([
        mt * mt * mt * p1[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * p2[0],
        mt * mt * mt * p1[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  return { d, samples: out };
}
// y on a sampled x-monotone curve
function yAt(samples, x) {
  if (x <= samples[0][0]) return samples[0][1];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i][0] >= x) {
      const [x0, y0] = samples[i - 1], [x1, y1] = samples[i];
      return y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0);
    }
  }
  return samples[samples.length - 1][1];
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (ix, iy) => { const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, y, cell) {
  const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy);
  const u = smooth(0, 1, gx - ix), v = smooth(0, 1, gy - iy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v - 0.5;
}
function polyPath(pts, close = true) {
  return pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0])} ${f1(p[1])}`).join(" ") + (close ? " Z" : "");
}
// Douglas-Peucker on an open polyline
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false); keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      // a closed ring starts and ends on the same point: split it at the point farthest from that point
      const d = len < 1e-6 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > bd) { bd = d; best = i; }
    }
    if (best > 0) { keep[best] = true; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// ---------------------------------------------------------------------------------------------------
// Cannae: the scene's ground
// ---------------------------------------------------------------------------------------------------
// The Aufidus runs from the south-west corner north-east to the sea; the coast of the Gulf of Manfredonia
// crosses the top-right corner; the field lies on the right (south-east) bank below the river mouth.
const RIVER = catmull([[-60, 430], [20, 405], [150, 365], [280, 342], [400, 330], [480, 300], [540, 250], [590, 190], [640, 140], [690, 100], [730, 70]]);
const COAST_PTS = [[380, 20], [440, 45], [520, 75], [600, 92], [690, 100], [760, 135], [860, 195], [980, 250], [1100, 300]];
const COAST = catmull(COAST_PTS);
const LAND_CANNAE = `${COAST.d} L1100 540 L20 540 L20 20 L380 20 Z`;
const coastYAt = (x) => (x < 380 ? 20 - (380 - x) * 0.4 : yAt(COAST.samples, x));

function heightCannae(x, y) {
  const dy = y - yAt(RIVER.samples, x); // + south of the river
  let h = 20;
  if (dy > 0) h += 0.0034 * Math.max(0, dy - 55) ** 2 + 24 * smooth(95, 150, dy); // terrace, then the escarpment
  else h += 0.0007 * Math.max(0, -dy - 45) ** 2; // the left bank rises more gently
  h += 0.24 * Math.max(0, 330 - x); // the Murge to the west
  h += 41 * Math.exp(-((x - 440) ** 2 + (y - 372) ** 2) / (2 * 27 ** 2)); // Monte di Canne, ~60 m
  h += 12 * Math.exp(-((x - 880) ** 2 + (y - 470) ** 2) / (2 * 70 ** 2)); // a low rise toward Barletta
  h += 5 * noise(x, y, 44) + 2.5 * noise(x + 300, y, 21);
  const inland = (y - coastYAt(x)) * 0.9;
  const t = smooth(0, 70, inland);
  return h * t + (-5) * (1 - t) + 0.013;
}

// Marching squares over a padded grid so every isoline is a closed ring (the padding closes lines that
// leave the plate, outside the clip). Segments are oriented with the high side on the left, so a level's
// rings filled together with the nonzero rule give the region at or above that level: the tint bands.
const STEP = 8, X0 = 20 - 3 * STEP, Y0 = 20 - 3 * STEP;
const NX = Math.round((1100 + 3 * STEP - X0) / STEP) + 1, NY = Math.round((540 + 3 * STEP - Y0) / STEP) + 1;
function makeGrid(hfn) {
  const P = [];
  for (let j = -1; j <= NY; j++) {
    const row = [];
    for (let i = -1; i <= NX; i++) row.push(i < 0 || j < 0 || i >= NX || j >= NY ? -1000 : hfn(X0 + i * STEP, Y0 + j * STEP));
    P.push(row);
  }
  return P;
}
function rings(P, L) {
  const X = (i) => X0 + (i - 1) * STEP, Y = (j) => Y0 + (j - 1) * STEP;
  const out = new Map();
  for (let j = 0; j < P.length - 1; j++) for (let i = 0; i < P[0].length - 1; i++) {
    const tl = P[j][i], tr = P[j][i + 1], br = P[j + 1][i + 1], bl = P[j + 1][i];
    const hi = [tl >= L, tr >= L, br >= L, bl >= L];
    const n = hi.filter(Boolean).length;
    if (n === 0 || n === 4) continue;
    const lerp = (a, b) => (L - a) / (b - a);
    const E = {
      T: { key: `h${i},${j}`, p: [X(i) + lerp(tl, tr) * STEP, Y(j)], on: hi[0] !== hi[1] },
      R: { key: `v${i + 1},${j}`, p: [X(i + 1), Y(j) + lerp(tr, br) * STEP], on: hi[1] !== hi[2] },
      B: { key: `h${i},${j + 1}`, p: [X(i) + lerp(bl, br) * STEP, Y(j + 1)], on: hi[3] !== hi[2] },
      L: { key: `v${i},${j}`, p: [X(i), Y(j) + lerp(tl, bl) * STEP], on: hi[0] !== hi[3] },
    };
    const bilin = (x, y) => {
      const u = (x - X(i)) / STEP, v = (y - Y(j)) / STEP;
      return (1 - u) * (1 - v) * tl + u * (1 - v) * tr + u * v * br + (1 - u) * v * bl;
    };
    const emit = (a, b) => {
      // orient so the high side is on the left of travel (screen coordinates, y down)
      const mx = (a.p[0] + b.p[0]) / 2, my = (a.p[1] + b.p[1]) / 2;
      const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], len = Math.hypot(dx, dy) || 1;
      const lx = dy / len, ly = -dx / len;
      const highLeft = bilin(mx + lx * 0.6, my + ly * 0.6) >= L;
      const [from, to] = highLeft ? [a, b] : [b, a];
      out.set(from.key, { to: to.key, p: from.p });
    };
    const crossed = ["T", "R", "B", "L"].filter((k) => E[k].on);
    if (crossed.length === 2) emit(E[crossed[0]], E[crossed[1]]);
    else {
      const centre = (tl + tr + br + bl) / 4 >= L;
      const corners = [["T", "L", hi[0]], ["T", "R", hi[1]], ["R", "B", hi[2]], ["B", "L", hi[3]]];
      for (const [e1, e2, h] of corners) if (h !== centre) emit(E[e1], E[e2]);
    }
  }
  const seen = new Set(), result = [];
  for (const start of out.keys()) {
    if (seen.has(start)) continue;
    const pts = []; let k = start, guard = 0;
    while (!seen.has(k) && out.has(k) && guard++ < 100000) { seen.add(k); const s = out.get(k); pts.push(s.p); k = s.to; }
    if (pts.length > 2) result.push(pts);
  }
  return result;
}
const GRID_CANNAE = makeGrid(heightCannae);
const LEVELS = Array.from({ length: 20 }, (_, i) => 10 + i * 10);
const CONTOURS = new Map(LEVELS.map((L) => [L, rings(GRID_CANNAE, L).map((r) => simplify([...r, r[0]], 0.5))]));
const levelPath = (L) => CONTOURS.get(L).map((r) => polyPath(r, true)).join(" ");
const nContours = [...CONTOURS.values()].reduce((n, rs) => n + rs.length, 0);
console.log(`cannae: ${nContours} contour rings across ${LEVELS.length} levels`);

// ---- Copenhagen: shore, shoal and island, for the shoal and point-work sheet ----
export const ZEALAND = catmull([[300, -20], [305, 90], [292, 150], [326, 200], [342, 232], [300, 246], [292, 262], [332, 276], [362, 330], [402, 400], [442, 470], [472, 560]]);
export const LAND_CPH = `${ZEALAND.d} L20 560 L20 -20 Z`;
export const SALTHOLM = catmull([[930, 165], [990, 150], [1050, 190], [1066, 300], [1036, 420], [966, 476], [900, 448], [878, 336], [892, 230], [930, 165]]);
export const MIDDLE_GROUND = catmull([[502, 40], [542, 62], [562, 140], [572, 262], [562, 382], [540, 470], [510, 522], [478, 500], [468, 400], [463, 262], [470, 120], [482, 58], [502, 40]]);

export { f1, catmull, yAt, smooth, noise, polyPath, simplify, heightCannae, RIVER, COAST, LAND_CANNAE, coastYAt, LEVELS, CONTOURS, levelPath };
