// The v2 map features drawn in the engraved system: relief (contours, hachures, tint), shoals, rivers and
// works, on a Cannae scene in all three views and a Copenhagen scene on the chart plate, plus a features
// sheet that sets the candidates side by side. Imports build.mjs, so `node build-v2.mjs` regenerates the
// whole canvas. Terrain is synthetic (a heightfield shaped like the Ofanto valley: floodplain at 20 m, the
// Cannae hill at ~60 m, the terrace and the Murge rising south and west), contoured at 10 m like the real
// file would be (ADR-0012: 10 m interval, 64 lines). Nothing here is geo-registered; it is a scene.
import { writeFileSync } from "node:fs";
import { canvas as v1, stipple } from "./build.mjs";
import {
  PLATE, NIGHT, ATLAS, seeded, f, ticks, smokeFor, arrow, TRACK, INTENT, DETACH, label, block,
  compass, scaleBar, legend, HATCH, captionBandFor, page, card,
} from "./lib.mjs";

const f1 = (n) => Number(n.toFixed(1));

// ---------------------------------------------------------------------------------------------------
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

// Relief treatments. `r` is the view's relief tuning (weights and alphas), see RELIEF below.
function contoursSvg(v, r, opts = {}) {
  let s = "";
  for (const L of LEVELS) {
    const index = L % 50 === 0;
    if (opts.indexOnly && !index) continue;
    s += `<path d="${levelPath(L)}" fill="none" stroke="${v.ink}" stroke-width="${index ? r.indexW : r.lineW}" stroke-opacity="${index ? r.indexA : r.lineA}" stroke-linejoin="round"/>`;
  }
  // numerals on the index contours, in a column below the field so they stay out of the labels
  if (!opts.noNumerals) for (const L of LEVELS) {
    if (L % 50 !== 0) continue;
    let best = null;
    for (const ring of CONTOURS.get(L)) for (const p of ring) {
      if (p[1] < 400 || p[1] > 520 || p[0] < 60 || p[0] > 1060) continue;
      const d = Math.abs(p[0] - 560);
      if (!best || d < best.d) best = { p, d };
    }
    if (best) s += `<text x="${f1(best.p[0])}" y="${f1(best.p[1])}" font-size="10" font-style="italic" fill="${v.ink}" fill-opacity="${r.numA}" stroke="${v.paper}" stroke-width="3" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">${L}</text>`;
  }
  return s;
}
function hachuresSvg(v, r, hfn = heightCannae) {
  const rnd = seeded(31);
  let s = `<g stroke="${v.ink}" stroke-opacity="${r.hachA}" stroke-linecap="round">`;
  for (let y = 34; y < 536; y += 11) for (let x = 34; x < 1096; x += 11) {
    const px = x + (rnd() - 0.5) * 7, py = y + (rnd() - 0.5) * 7;
    const h = hfn(px, py);
    if (h < 9) continue;
    // slope from the smoothed field: the plain's speckle is not relief
    const gx = (hfn(px + 5, py) - hfn(px - 5, py)) / 10, gy = (hfn(px, py + 5) - hfn(px, py - 5)) / 10;
    const slope = Math.hypot(gx, gy);
    if (slope < 0.2) continue;
    const len = 3.5 + Math.min(9, slope * 9), w = 0.45 + Math.min(0.45, slope * 0.4);
    const ux = -gx / slope, uy = -gy / slope; // downslope
    s += `<line x1="${f1(px - ux * len * 0.5)}" y1="${f1(py - uy * len * 0.5)}" x2="${f1(px + ux * len * 0.5)}" y2="${f1(py + uy * len * 0.5)}" stroke-width="${f(w)}"/>`;
  }
  return s + `</g>`;
}
function tintSvg(v, r) {
  let s = "";
  for (const L of [30, 50, 100, 150, 200]) s += `<path d="${levelPath(L)}" fill="${v.ink}" fill-opacity="${r.bandA}" stroke="none"/>`;
  return s;
}
function reliefSvg(kind, v, r) {
  if (kind === "contours") return contoursSvg(v, r);
  if (kind === "hachures") return hachuresSvg(v, r);
  if (kind === "tint") return tintSvg(v, r) + contoursSvg(v, { ...r, indexW: r.indexW * 0.7, indexA: r.indexA * 0.7 }, { indexOnly: true });
  return "";
}
// what each view re-tunes: the ramp's proportions are fixed, the weights and alphas are the view's
const RELIEF = {
  plate: { lineW: 0.5, lineA: 0.32, indexW: 0.9, indexA: 0.62, numA: 0.75, hachA: 0.5, bandA: 0.065 },
  night: { lineW: 0.5, lineA: 0.22, indexW: 0.9, indexA: 0.5, numA: 0.65, hachA: 0.4, bandA: 0.055 },
  atlas: { lineW: 0.5, lineA: 0.22, indexW: 0.8, indexA: 0.45, numA: 0.65, hachA: 0.4, bandA: 0.075 },
};

// ---------------------------------------------------------------------------------------------------
// Feature glyphs: river, shoal, work, place
// ---------------------------------------------------------------------------------------------------
function riverSvg(d, v, kind = "banks", scale = 1) {
  if (kind === "single") return `<path d="${d}" fill="none" stroke="${v.ink}" stroke-width="${1.2 * scale}" stroke-linecap="round"/>`;
  if (kind === "strip") return `<path d="${d}" fill="none" stroke="${v.paper}" stroke-width="${4 * scale}" stroke-linecap="round"/>`;
  // two banks: an ink stroke with the paper laid back over its middle, so the water is the sea's material
  return `<path d="${d}" fill="none" stroke="${v.ink}" stroke-width="${3.4 * scale}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${v.paper}" stroke-width="${2 * scale}" stroke-linecap="round"/>`;
}
// A shoal: a dotted edge, and a fill that reads as sand against the sea's loose stipple.
function shoalSvg(d, v, kind, id, bbox) {
  const [x0, y0, x1, y1] = bbox;
  let fill = "";
  const rnd = seeded(17);
  if (kind === "dots") {
    for (let y = y0; y < y1; y += 7) for (let x = x0; x < x1; x += 7) fill += `<circle cx="${f1(x + (rnd() - 0.5) * 3)}" cy="${f1(y + (rnd() - 0.5) * 3)}" r="0.8" fill="${v.ink}" fill-opacity="0.45"/>`;
  } else if (kind === "ripples") {
    let row = 0;
    for (let y = y0; y < y1; y += 9, row++) for (let x = x0 + (row % 2) * 7; x < x1; x += 14) fill += `<path d="M${f1(x)} ${f1(y)} q2 -1.5 4 0 t4 0" fill="none" stroke="${v.ink}" stroke-width="0.7" stroke-opacity="0.55"/>`;
  } else if (kind === "hatch") {
    for (let k = x0 - (y1 - y0); k < x1; k += 6) fill += `<line x1="${f1(k)}" y1="${f1(y1)}" x2="${f1(k + (y1 - y0))}" y2="${f1(y0)}" stroke="${v.ink}" stroke-width="0.5" stroke-opacity="0.35"/>`;
  }
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${fill}</g>` +
    `<path d="${d}" fill="none" stroke="${v.ink}" stroke-width="1" stroke-dasharray="1 3" stroke-linecap="round"/>`;
}
// A work: the fixed thing on the map, drawn as a glyph with its name. Three candidates.
function workSvg(x, y, name, v, kind = "bastion", align = "start") {
  const ink = v.ink;
  const tx = align === "start" ? x + 11 : x - 11;
  if (kind === "flag") {
    return `<g transform="translate(${x} ${y})" stroke="${ink}" fill="${ink}"><line x1="0" y1="2" x2="0" y2="-12" stroke-width="1"/><path d="M0 -12 L8 -9.5 L0 -7 Z" stroke="none"/><circle r="1.6" stroke="none"/></g>` +
      `<text x="${tx}" y="${y}" font-size="13" font-style="italic" fill="${ink}" text-anchor="${align}" dominant-baseline="middle">${name}</text>`;
  }
  if (kind === "square") {
    return `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${ink}"/>` +
      `<text x="${tx}" y="${y}" font-size="13" font-style="italic" fill="${ink}" text-anchor="${align}" dominant-baseline="middle">${name}</text>`;
  }
  // bastioned square: the plan sign for a fort or a camp, with the name upright in small capitals
  return `<g transform="translate(${x} ${y})" stroke="${ink}" fill="none" stroke-width="1"><rect x="-4" y="-4" width="8" height="8"/>` +
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `<path d="M${sx * 4} ${sy * 1.5} L${sx * 6.5} ${sy * 6.5} L${sx * 1.5} ${sy * 4}" fill="${v.paper}"/>`).join("") + `</g>` +
    `<text x="${tx}" y="${y}" font-size="11" fill="${ink}" text-anchor="${align}" dominant-baseline="middle" letter-spacing="0.5">${name.toUpperCase()}</text>`;
}
function placeSvg(x, y, name, v, align = "start") {
  const tx = align === "start" ? x + 8 : x - 8;
  return `<circle cx="${x}" cy="${y}" r="2.5" fill="${v.ink}"/><text x="${tx}" y="${y}" font-size="13" font-style="italic" fill="${v.ink}" text-anchor="${align}" dominant-baseline="middle">${name}</text>`;
}

// ---------------------------------------------------------------------------------------------------
// The Cannae scene, phase 6 (~10:15): the allied cavalry flees
// ---------------------------------------------------------------------------------------------------
const CANNAE_SIDES = { plate: { Roman: "#8f2f24", Carthaginian: "#24406b" }, night: { Roman: "#e2685a", Carthaginian: "#86a9e8" } };
const WIND_CANNAE = 315; // Livy's Volturnus, from the south-east, fresh

function cannaeScene(v, mode /* plate | night | atlas */, relief) {
  const ink = v.ink, ro = v.sides.Roman, ca = v.sides.Carthaginian, r = RELIEF[mode];
  const atlas = mode === "atlas";
  const glyph = (u) => {
    if (atlas) return block({ ...u, ink });
    const s = u.state === "engaged" || u.state === "broken" ? smokeFor("billow", u, v, 1, WIND_CANNAE) : "";
    return s + ticks(u);
  };
  const legendGlyph = (o) => {
    const u = { heading: 270, formation: "column", length: o.length, ...o };
    const s = o.state === "engaged" || o.state === "broken" ? smokeFor("billow", u, v, o.scale ?? 1, WIND_CANNAE) : "";
    return s + ticks(o);
  };
  // land units drawn with the v0.1 tick glyph: what a legion or a cavalry wing looks like is #48's
  const units = [
    { id: "roman-cavalry", x: 575, y: 225, heading: 200, formation: "line", state: "destroyed", strength: 0, colour: ro, seed: 21 },
    { id: "roman-infantry", x: 690, y: 258, heading: 200, formation: "line", state: "engaged", strength: 0.9, colour: ro, seed: 22 },
    { id: "allied-cavalry", x: 862, y: 338, heading: 110, formation: "line", state: "broken", strength: 0.1, colour: ro, seed: 23 },
    { id: "hasdrubal", x: 790, y: 203, heading: 250, formation: "column", state: "engaged", strength: 1, colour: ca, seed: 24 },
    { id: "libyans-left", x: 620, y: 302, heading: 110, formation: "line", state: "engaged", strength: 1, colour: ca, seed: 25 },
    { id: "libyans-right", x: 768, y: 306, heading: 290, formation: "line", state: "engaged", strength: 1, colour: ca, seed: 26 },
    { id: "centre", x: 698, y: 338, heading: 20, formation: "line", state: "engaged", strength: 0.8, colour: ca, seed: 27 },
    { id: "numidians", x: 890, y: 246, heading: 110, formation: "column", state: "engaged", strength: 1, colour: ca, seed: 28 },
  ];
  const T = atlas ? { ...TRACK(ink), width: 1.6 } : TRACK(ink);
  const I = atlas ? { ...INTENT(ink), width: 2.4 } : INTENT(ink);
  const D = (c) => (atlas ? { ...DETACH(c), width: 3.2, headSize: 14 } : DETACH(c));
  let s = "";
  s += `<rect width="1120" height="560" fill="${v.letterbox}"/><rect x="20" y="20" width="1080" height="520" fill="${v.paper}"/>`;
  s += `<clipPath id="ext"><rect x="20" y="20" width="1080" height="520"/></clipPath><clipPath id="landclip"><path d="${LAND_CANNAE}"/></clipPath><g clip-path="url(#ext)">`;
  s += stipple(v);
  s += `<path d="${LAND_CANNAE}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>`;
  // relief, under everything drawn on the land
  s += `<g clip-path="url(#landclip)">${reliefSvg(relief, v, r)}</g>`;
  // the river, the sea's material between two banks, over the relief
  s += `<g clip-path="url(#landclip)">${riverSvg(RIVER.d, v, "banks")}</g>`;
  // places and works: the natural features are named by a place point on them
  s += placeSvg(440, 372, "Cannae", v);
  s += placeSvg(318, 336, "Aufidus", v, "end");
  s += workSvg(372, 292, "Roman camp", v);
  s += workSvg(236, 312, "Hannibal’s camp", v);
  s += workSvg(500, 250, "Lesser camp", v, "bastion", "end");
  // motion, under the glyphs
  s += arrow({ x: 862, y: 338 }, { x: 968, y: 392 }, T);
  s += arrow({ x: 790, y: 203 }, { x: 712, y: 206 }, I);
  s += arrow({ x: 890, y: 246 }, { x: 1050, y: 330 }, D(ca));
  for (const u of units) s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading})">${glyph(u)}</g>`;
  // labels: seven units on a field the size of Trafalgar's centre
  s += label(552, 214, "Roman cavalry", "destroyed", ro, ink, "end");
  s += label(616, 148, "Roman infantry", "engaged · 90%", ro, ink, "end", { x1: 690, y1: 258, x2: 622, y2: 156 });
  s += label(884, 376, "Allied cavalry", "broken · 10%", ro, ink, "start");
  s += label(808, 168, "Hasdrubal’s horse", "engaged", ca, ink, "start");
  s += label(596, 302, "Libyans, river flank", "engaged", ca, ink, "end");
  s += label(958, 286, "Libyans, open flank", "engaged", ca, ink, "start", { x1: 768, y1: 306, x2: 954, y2: 290 });
  s += label(698, 392, "Spanish and Gallic foot", "engaged · 80%", ca, ink, "middle");
  s += label(912, 222, "Numidians", "engaged", ca, ink, "start");
  s += `</g>`;
  // plate rule, furniture on panels: relief runs under the corners, so the rose, title and credit sit on paper
  s += `<g fill="none" stroke="${ink}" stroke-width="1"><rect x="20.5" y="20.5" width="1079" height="519"/><rect x="25.5" y="25.5" width="1069" height="509"/></g>`;
  s += `<rect x="34" y="34" width="236" height="128" fill="${v.panel}"/>`;
  s += compass(94, 98, ink, 135, 2, true, "Wind SE, fresh");
  s += `<rect x="868" y="32" width="222" height="34" fill="${v.panel}"/>`;
  s += `<text x="1078" y="38" font-size="22" fill="${ink}" text-anchor="end" dominant-baseline="hanging">The Battle of Cannae</text>`;
  s += `<rect x="34" y="330" width="200" height="200" fill="${v.panel}"/>`;
  s += scaleBar(46, 514, ink, 100, "2 km · contours at 10 m");
  s += legend(46, 514 - 8 - 14 - 14, v, atlas ? block : legendGlyph);
  s += `<rect x="700" y="516" width="392" height="16" fill="${v.panel}"/>`;
  s += `<text x="1086" y="528" font-size="11" font-style="italic" fill="${ink}" text-anchor="end">Contours: SRTM 1 arc-second · river: Natural Earth (both public domain)</text>`;
  return s;
}
const CANNAE_CAPTION = {
  clock: "10:15", date: "2 August 216 BC", phase: "THE ALLIED CAVALRY FLEES",
  lines: [
    "Hasdrubal, having all but annihilated the Roman horse by the river, rides across the rear of the Roman army to the support of the Numidians;",
    "the allied cavalry, seeing his charge approaching, breaks and flees, and he leaves the pursuit to the Numidians.",
  ],
  sources: "— Polybius III.116 (Shuckburgh), Livy XXII.48. The river drawn is the modern Ofanto; the channel of 216 BC is unknown.",
};
const RELIEFS = ["contours", "hachures", "tint", "none"];
function cannaeBoard(v, mode) {
  const board = (relief) => `<svg width="1120" height="650" viewBox="0 0 1120 650" xmlns="http://www.w3.org/2000/svg" style="display: block;">
${HATCH(v.ink)}
${cannaeScene(v, mode, relief)}
${captionBandFor(v, CANNAE_CAPTION)}
</svg>`;
  const branches = RELIEFS.map((k) => `<sc-if value="{{ is_${k} }}" hint-placeholder-val="{{ ${k === "contours"} }}">${board(k)}</sc-if>`).join("\n");
  const script = `<script data-dc-script data-props='{"relief":{"editor":"enum","options":["contours","hachures","tint","none"],"default":"contours","section":"Relief"}}'>
class Component extends DCLogic {
  renderVals() {
    const k = this.props.relief ?? "contours";
    return { is_contours: k === "contours", is_hachures: k === "hachures", is_tint: k === "tint", is_none: k === "none" };
  }
}
</script>`;
  return page(v.name, `<div style="width: 1120px; height: 650px; background: ${v.letterbox}; overflow: hidden;">${branches}</div>`).replace("</x-dc>", `</x-dc>\n${script}`);
}
const CANNAE_PLATE = { ...PLATE, sides: CANNAE_SIDES.plate };
const CANNAE_NIGHT = { ...NIGHT, sides: CANNAE_SIDES.night };
const CANNAE_ATLAS = { ...ATLAS, sides: CANNAE_SIDES.plate };
writeFileSync("CannaePlate.dc.html", cannaeBoard(CANNAE_PLATE, "plate"));
writeFileSync("CannaeNight.dc.html", cannaeBoard(CANNAE_NIGHT, "night"));
writeFileSync("CannaeAtlas.dc.html", cannaeBoard(CANNAE_ATLAS, "atlas"));

// ---------------------------------------------------------------------------------------------------
// The Copenhagen scene, phase 3 (10:05): Bellona and Russell ground; the action begins
// ---------------------------------------------------------------------------------------------------
const ZEALAND = catmull([[300, -20], [305, 90], [292, 150], [326, 200], [342, 232], [300, 246], [292, 262], [332, 276], [362, 330], [402, 400], [442, 470], [472, 560]]);
const LAND_CPH = `${ZEALAND.d} L20 560 L20 -20 Z`;
const SALTHOLM = catmull([[930, 165], [990, 150], [1050, 190], [1066, 300], [1036, 420], [966, 476], [900, 448], [878, 336], [892, 230], [930, 165]]);
const MIDDLE_GROUND = catmull([[502, 40], [542, 62], [562, 140], [572, 262], [562, 382], [540, 470], [510, 522], [478, 500], [468, 400], [463, 262], [470, 120], [482, 58], [502, 40]]);
const WIND_CPH = 0; // southerly, light

function copenhagenScene(v, shoalKind) {
  const ink = v.ink, br = v.sides.British, dk = v.sides.Danish;
  const glyph = (u) => (u.state === "engaged" || u.state === "broken" ? smokeFor("billow", u, v, 1, WIND_CPH) : "") + ticks(u);
  const legendGlyph = (o) => {
    const u = { heading: 270, formation: "column", length: o.length, ...o };
    return (o.state === "engaged" || o.state === "broken" ? smokeFor("billow", u, v, o.scale ?? 1, WIND_CPH) : "") + ticks(o);
  };
  const units = [
    { id: "danish-line", x: 378, y: 288, heading: 337, formation: "column", state: "engaged", strength: 1, colour: dk, seed: 41 },
    { id: "nelson", x: 446, y: 404, heading: 337, formation: "column", state: "engaged", strength: 0.75, colour: br, seed: 42 },
    { id: "parker", x: 770, y: 130, heading: 225, formation: "column", state: "intact", strength: 1, colour: br, seed: 43 },
  ];
  let s = "";
  s += `<rect width="1120" height="560" fill="${v.letterbox}"/><rect x="20" y="20" width="1080" height="520" fill="${v.paper}"/>`;
  s += `<clipPath id="ext"><rect x="20" y="20" width="1080" height="520"/></clipPath><g clip-path="url(#ext)">`;
  s += stipple(v);
  s += shoalSvg(MIDDLE_GROUND.d, v, shoalKind, "shoal", [460, 36, 576, 526]);
  s += `<path d="${LAND_CPH}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>`;
  s += `<path d="${SALTHOLM.d}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>`;
  s += placeSvg(200, 130, "Copenhagen", v);
  s += placeSvg(250, 420, "Amager", v);
  s += placeSvg(968, 318, "Saltholm", v);
  s += placeSvg(516, 200, "Middle Ground", v, "end");
  s += placeSvg(428, 96, "King’s Deep", v, "end");
  s += workSvg(352, 170, "Trekroner", v);
  // moves: the grounded ships as a detachment head on the shoal edge; Parker working up from the north-east
  s += arrow({ x: 770, y: 130 }, { x: 560, y: 118 }, INTENT(ink));
  s += arrow({ x: 446, y: 404 }, { x: 480, y: 452 }, DETACH(br));
  for (const u of units) s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading})">${glyph(u)}</g>`;
  s += label(350, 288, "Danish line", "engaged", dk, ink, "end");
  s += label(320, 476, "Nelson’s division", "engaged · 75%", br, ink, "end", { x1: 446, y1: 404, x2: 326, y2: 476 });
  s += label(800, 130, "Parker’s division", "intact", br, ink, "start");
  s += `</g>`;
  s += `<g fill="none" stroke="${ink}" stroke-width="1"><rect x="20.5" y="20.5" width="1079" height="519"/><rect x="25.5" y="25.5" width="1069" height="509"/></g>`;
  s += compass(94, 98, ink, 180, 1, true, "Wind S, light");
  s += `<text x="1078" y="38" font-size="22" fill="${ink}" text-anchor="end" dominant-baseline="hanging">The Battle of Copenhagen</text>`;
  s += scaleBar(46, 514, ink, 120, "1 nautical mile");
  s += legend(46, 514 - 8 - 14 - 14, v, legendGlyph);
  s += `<text x="1086" y="528" font-size="11" font-style="italic" fill="${ink}" text-anchor="end">Shore and shoal traced from Brydon’s plan (1802), public domain · outer coast: EEA (CC BY 4.0)</text>`;
  return s;
}
const CPH_CAPTION = {
  clock: "10:05", date: "2 April 1801", phase: "BELLONA AND RUSSELL GROUND",
  lines: [
    "Weighing in succession up the King’s Deep, the Bellona and Russell keep too close on the starboard shoal and run fast on the edge of the",
    "Middle Ground, within range of the southern Danes; the Edgar anchors abreast the Provesteen and the action begins.",
  ],
  sources: "— Nelson’s dispatch (Gazette 15354), Stewart’s narrative (Nicolas IV), Southey, Brydon’s plan (1802)",
};
const SHOALS = ["dots", "ripples", "hatch"];
const CPH = { ...PLATE, sides: { British: "#8f2f24", Danish: "#24406b" } };
function copenhagenBoard() {
  const v = CPH;
  const board = (k) => `<svg width="1120" height="650" viewBox="0 0 1120 650" xmlns="http://www.w3.org/2000/svg" style="display: block;">
${HATCH(v.ink)}
${copenhagenScene(v, k)}
${captionBandFor(v, CPH_CAPTION)}
</svg>`;
  const branches = SHOALS.map((k) => `<sc-if value="{{ is_${k} }}" hint-placeholder-val="{{ ${k === "dots"} }}">${board(k)}</sc-if>`).join("\n");
  const script = `<script data-dc-script data-props='{"shoal":{"editor":"enum","options":["dots","ripples","hatch"],"default":"dots","section":"Shoal"}}'>
class Component extends DCLogic {
  renderVals() {
    const k = this.props.shoal ?? "dots";
    return { is_dots: k === "dots", is_ripples: k === "ripples", is_hatch: k === "hatch" };
  }
}
</script>`;
  return page("Copenhagen", `<div style="width: 1120px; height: 650px; background: ${v.letterbox}; overflow: hidden;">${branches}</div>`).replace("</x-dc>", `</x-dc>\n${script}`);
}
writeFileSync("Copenhagen.dc.html", copenhagenBoard());

// ---------------------------------------------------------------------------------------------------
// The features sheet: each kind's candidates side by side
// ---------------------------------------------------------------------------------------------------
const v = PLATE;
// a window on the Cannae ground around the hill, 300 x 170, for the relief cards
function reliefSample(kind) {
  const r = RELIEF.plate;
  const inner = kind === "contours" ? contoursSvg(v, r, { noNumerals: true })
    : kind === "hachures" ? hachuresSvg(v, r)
    : tintSvg(v, r) + contoursSvg(v, r, { indexOnly: true, noNumerals: true });
  return `<clipPath id="win-${kind}"><rect x="330" y="290" width="300" height="170"/></clipPath>` +
    `<g transform="translate(-330 -290)"><g clip-path="url(#win-${kind})"><rect x="330" y="290" width="300" height="170" fill="${v.land}"/>${inner}${riverSvg(RIVER.d, v, "banks")}${placeSvg(440, 372, "Cannae", v)}</g>` +
    `<rect x="330.5" y="290.5" width="299" height="169" fill="none" stroke="${v.ink}" stroke-width="1"/></g>`;
}
function shoalSample(kind) {
  const blob = catmull([[40, 20], [110, 8], [190, 30], [230, 80], [200, 130], [120, 146], [50, 120], [20, 70], [40, 20]]);
  return `<clipPath id="ss-${kind}"><rect x="0" y="0" width="300" height="160"/></clipPath><g clip-path="url(#ss-${kind})"><rect width="300" height="160" fill="${v.paper}"/>${stipple(v, 5, 60).replaceAll(/cx="(\d+\.?\d*)"/g, (m, x) => `cx="${f1((x - 30) * 0.28)}"`).replaceAll(/cy="(\d+\.?\d*)"/g, (m, y) => `cy="${f1((y - 30) * 0.32)}"`)}` +
    `<path d="M240 160 L300 90 L300 160 Z" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>` +
    shoalSvg(blob.d, v, kind, `sh-${kind}`, [10, 0, 240, 150]) +
    `${placeSvg(130, 78, "Middle Ground", v)}</g><rect x="0.5" y="0.5" width="299" height="159" fill="none" stroke="${v.ink}" stroke-width="1"/>`;
}
function riverSample(kind) {
  const rv = catmull([[-10, 130], [60, 110], [120, 118], [180, 80], [230, 40], [290, 10]]);
  const coast = catmull([[170, 170], [200, 130], [260, 100], [310, 60]]);
  return `<clipPath id="rs-${kind}"><rect width="300" height="160"/></clipPath><g clip-path="url(#rs-${kind})"><rect width="300" height="160" fill="${v.paper}"/><path d="${coast.d} L310 -10 L-10 -10 L-10 170 Z" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>` +
    `<clipPath id="rl-${kind}"><path d="${coast.d} L310 -10 L-10 -10 L-10 170 Z"/></clipPath><g clip-path="url(#rl-${kind})">${riverSvg(rv.d, v, kind)}</g>` +
    `${placeSvg(96, 104, "Aufidus", v)}</g><rect x="0.5" y="0.5" width="299" height="159" fill="none" stroke="${v.ink}" stroke-width="1"/>`;
}
function workSample(kind) {
  return `<rect width="300" height="160" fill="${v.land}"/>` + workSvg(60, 50, "Trekroner", v, kind) + workSvg(60, 90, "Roman camp", v, kind) + placeSvg(60, 130, "Cannae", v) +
    `<text x="200" y="50" font-size="11" font-style="italic" fill="${v.ink}" dominant-baseline="middle">work</text><text x="200" y="130" font-size="11" font-style="italic" fill="${v.ink}" dominant-baseline="middle">place, for comparison</text>` +
    `<rect x="0.5" y="0.5" width="299" height="159" fill="none" stroke="${v.ink}" stroke-width="1"/>`;
}
const section = (title, note) => `<div style="display: flex; flex-direction: column; gap: 4px;"><div style="font-size: 22px;">${title}</div><div style="font-size: 14px; font-style: italic;">${note}</div></div>`;
const row = (cards) => `<svg width="1056" height="296" viewBox="0 0 1056 296" xmlns="http://www.w3.org/2000/svg" style="display: block;">${cards.map(([t, body, inner], i) => card(i * 360, 0, 336, 296, t, body, inner, 18)).join("")}</svg>`;
const FEATURES = page("Map features",
  `<div style="width: 1120px; padding: 28px 32px; box-sizing: border-box; background: #efe3c6; display: flex; flex-direction: column; gap: 22px;">
  <div style="display: flex; flex-direction: column; gap: 6px;">
    <div style="font-size: 30px;">The v2 map features, inked</div>
    <div style="font-size: 15px; font-style: italic;">ADR-0012 gives the renderer four new kinds: contour, river, shoal and work. Each is drawn below in the candidates the ticket named, cut with the pen in the plate’s materials; the Cannae and Copenhagen boards put the leading candidate in a whole scene, with a chip to switch it. Relief here is a synthetic Ofanto valley contoured at 10 m as the real file would be (64 lines); nothing is geo-registered.</div>
  </div>
  ${section("Relief", "Cannae is fought on a floodplain at 25 m under a 59 m hill, with the terrace and the Murge rising south and west. The map file carries contour polylines with their level and nothing else (no index flag, no slope). The plate must carry all of it under seven units and their labels.")}
  ${row([
    ["A · Contours, weighted by level", ["Every line 0.5px at .32; every fifth (50 m) 0.9px at .62,", "numbered. Reads: the survey plate, the data as it is;", "Kromayer-Veith drew Cannae so. Costs: relief only where", "the lines crowd; the plain is blank paper."], reliefSample("contours")],
    ["B · Hachures", ["Lehmann strokes down the slope, longer and heavier as", "the ground steepens. Reads: the 1800s battle plan; relief", "at a glance, the plain honestly flat. Costs: needs slope and", "aspect: a raster in the map file (amends ADR-0007, 0012)."], reliefSample("hachures")],
    ["C · Tint bands", ["Ink at .065 per band (30, 50, 100, 150, 200 m), index", "contours faint over it. Reads: the atlas; height as tone,", "quiet under the units. Costs: a wash, which the glyphs have", "ruled out; darkens the land the side inks sit on."], reliefSample("tint")],
  ])}
  ${section("Shoal", "A polygon of shallow water with no depth and no name (a place point names it). It must read against the sea’s loose stipple on one side and the land on the other, without a tonal wash. All three share a 1px dotted edge.")}
  ${row([
    ["A · Fine stipple", ["Dots 0.8px on a jittered 7px grid at .45: denser and more", "even than the sea’s. Reads: the chart’s sand; a track across", "it stays legible. Costs: at a wide extent the two stipples", "can blur together."], shoalSample("dots")],
    ["B · Ripples", ["Rows of short wavy dashes, staggered, 0.7px at .55.", "Reads: the old sand-bank sign; unmistakable at any size.", "Costs: busy; under a track it can read as current."], shoalSample("ripples")],
    ["C · Hatch", ["45° lines 0.5px at 6px spacing, .35.", "Reads: crisp and cheap to draw.", "Costs: hatch is the Atlas view’s engaged zone; a grounded", "ship would sit in two hatches."], shoalSample("hatch")],
  ])}
  ${section("River", "A polyline with no name and no width. The coastline is 1px ink with the land sunk behind it; the river has to sit beside that without becoming a road.")}
  ${row([
    ["A · Single line", ["1.2px ink, round caps. Reads: a stream; the cheapest mark.", "Costs: at 1.2 it is heavier than the coast and reads as", "a boundary, not water."], riverSample("single")],
    ["B · Two banks", ["A 3.4px ink stroke with the paper laid back over its middle:", "two 0.7px banks with water between. Reads: the engraved", "river; the water is the sea’s material, so the mouth merges", "into the sea. Costs: at a wide extent it closes to one line."], riverSample("banks")],
    ["C · Water strip", ["A 4px stroke of paper, no ink. Reads: water as a gap in", "the land, the v1 hack made deliberate. Costs: faint; vanishes", "where the land colour is close to paper (Night plate)."], riverSample("strip")],
  ])}
  ${section("Work", "A named point for a fort, a battery or a camp. A place is a 2.5px dot with the name in 13px italic; a work must be told apart from it at a glance and stay small: Trekroner is a glyph, not an outline (ADR-0012).")}
  ${row([
    ["A · Bastioned square, small capitals", ["The plan sign for a fortification, 13px across; the name", "upright, 11px, tracked, in capitals. Reads: a built thing,", "not a place; capitals mark a fact, not a name. Costs: a camp", "gets a fort’s sign; a fourth type style joins the plate."], workSample("bastion")],
    ["B · Flag on a staff", ["A 12px staff with a filled pennant; the name in place italic.", "Reads: the garrisoned point of the old plans.", "Costs: a flag says a side; the map file has no side to give it."], workSample("flag")],
    ["C · Filled square", ["A 6px filled square; the name in place italic.", "Reads: a building; quiet.", "Costs: too close to the place dot to be told apart in a crowd."], workSample("square")],
  ])}
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid #2b2418;">
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Fixed across views</div>
      <div style="font-size: 13px; line-height: 1.4;">Relief is drawn from the contour levels alone, index every fifth line, numbered on the index lines. The river is the sea’s material between two banks. A shoal has a dotted edge and a fill that is not a wash. A work is one glyph for forts and camps, with its name; a place is a dot with its name in italic. None of it carries a colour: ink on the ground, whatever the ground is.</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid #2b2418;">
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">A view re-tunes</div>
      <div style="font-size: 13px; line-height: 1.4;">The contour weights and alphas within the ramp (plate .32/.62, Night plate .22/.50 in parchment, Atlas .22/.45), whether a tint is laid under the lines (proposed for Atlas only), the hachure ink, the shoal fill’s density. On a land plate the rose, title, legend and credit sit on paper panels because relief runs under every corner; the letterbox and caption band do not change.</div>
    </div>
  </div>
</div>`);
writeFileSync("Features.dc.html", FEATURES);

// ---------------------------------------------------------------------------------------------------
// Canvas: the v1 page as it was, plus a second page for the v2 features
// ---------------------------------------------------------------------------------------------------
const P1 = "page-1", P2 = "page-2";
const canvas = {
  pages: [{ id: P1, name: "Design language" }, { id: P2, name: "v2 map features" }],
  artboards: [
    ...v1.artboards.map((a) => ({ ...a, page: P1 })),
    { file: "Features.dc.html", x: 0, y: 0, w: 1120, h: 1920, title: "Map features · relief, shoal, river, work", page: P2 },
    { file: "CannaePlate.dc.html", x: 1220, y: 0, w: 1120, h: 650, title: "Cannae · Chart plate (relief chip)", page: P2 },
    { file: "CannaeNight.dc.html", x: 1220, y: 790, w: 1120, h: 650, title: "Cannae · Night plate (relief chip)", page: P2 },
    { file: "CannaeAtlas.dc.html", x: 1220, y: 1580, w: 1120, h: 650, title: "Cannae · Atlas (relief chip)", page: P2 },
    { file: "Copenhagen.dc.html", x: 2440, y: 0, w: 1120, h: 650, title: "Copenhagen · Chart plate (shoal chip)", page: P2 },
  ],
  annotations: [
    ...v1.annotations.map((a) => ({ ...a, page: P1 })),
    { id: "v2-intro", x: 0, y: -170, w: 1120, page: P2, text: "V2 MAP FEATURES: how ADR-0012’s four kinds (contour, river, shoal, work) are inked in the system decided by #58. The sheet sets the candidates side by side; the Cannae boards put relief under seven units in all three views, the Copenhagen board puts a shoal and a work under three. Land units are drawn with the v0.1 tick glyph for now: what a legion or a cavalry wing looks like is the unit-types ticket (#48), not this one." },
    { id: "v2-decide", x: 2440, y: 790, w: 560, page: P2, text: "TO DECIDE: (1) relief on the chart plate: A contours weighted by level (data-native, nothing to amend), B hachures (reopens the map format for a raster: amends ADR-0007 and ADR-0012) or C tint; switch the relief chip on the three Cannae boards. (2) What Night and Atlas may re-tune, as drawn: alphas only, tint proposed for Atlas. (3) The shoal fill: dots, ripples or hatch (chip on Copenhagen). (4) The river: single line, two banks or water strip (sheet). (5) The work glyph: bastioned square with small capitals, flag, or filled square (sheet). (6) Paper panels under the furniture on a plate with relief." },
    { id: "v2-cannae", x: 1220, y: -170, w: 560, page: P2, text: "CANNAE, PHASE 6 (~10:15): the allied cavalry flees. Seven units and eight labels on a field the size of Trafalgar’s centre, over 64 contour lines at 10 m. The crowding is the point: judge whether the relief drowns the units, and whether the label rules from #58 (displacement, leaders) hold on land. The wind is Livy’s Volturnus from the south-east, so the billow reads as dust blown into the Roman faces." },
    { id: "v2-cph", x: 2440, y: -170, w: 560, page: P2, text: "COPENHAGEN, PHASE 3 (10:05): Bellona and Russell ground. The Middle Ground is a shoal polygon named by a place point; Trekroner is a work; the King’s Deep is a place. The detachment head on the shoal edge is the two grounded ships. Whether Trekroner is also a unit that fires belongs to unit types (#48)." },
  ],
  launch: { view: "canvas", page: P2 },
};
writeFileSync("canvas.json", JSON.stringify(canvas, null, 2));
console.log("wrote v2 artboards");
