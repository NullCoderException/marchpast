// The terrain treatments (#138): what a view's `ground` module draws, now that ADR-0021 has made ground
// the view's rather than one shared pass.
//
// THE RULE EVERY TREATMENT HERE OBEYS: it is derived from the contour polylines and their levels, and
// from nothing else. The map file carries no slope, no aspect and no raster, and by ADR-0012 it never
// will. #62 rejected hachures because "they need slope and aspect, which means the raster foreign
// member" — the treatments below test whether that is true, because a contour ring already carries its
// own uphill direction: the marching-squares pass orients every ring with the high side on its left, and
// the real renderer can recover the same fact from any closed ring by its winding.
//
// `r` is a view's relief tuning; `v` its materials. Both are the view's, as ADR-0021 has it.
import { seeded, f } from "./lib.mjs";
import { f1, LEVELS, CONTOURS, levelPath, polyPath } from "./ground.mjs";

const INTERVAL = 10; // metres between levels, as ADR-0012 has the file cut
const INDEX_EVERY = 50; // every fifth level, derived in the renderer by relief.ts

// ---------------------------------------------------------------------------------------------------
// Contour arithmetic: uphill, station points, band width. All of it from the rings.
// ---------------------------------------------------------------------------------------------------

// The uphill normal at a ring segment. Screen coordinates, y down; the rings are wound with the high
// ground on the left of travel, so the left normal points up the slope. In the renderer this is one
// signed-area test per ring rather than a convention inherited from the contourer.
function uphillAt(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  return { x: dy / len, y: -dx / len, len };
}

// Stations along a ring at a fixed arc step, each carrying its uphill normal.
function stations(ring, step) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    const n = uphillAt(a, b);
    if (n.len < 1e-6) continue;
    let t = carry;
    while (t < n.len) {
      const u = t / n.len;
      out.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, nx: n.x, ny: n.y });
      t += step;
    }
    carry = t - n.len;
  }
  return out;
}

// Every point of every ring at a level, flat, for the nearest-point search.
const pointsAt = new Map();
function levelPoints(L) {
  if (!pointsAt.has(L)) pointsAt.set(L, (CONTOURS.get(L) ?? []).flat());
  return pointsAt.get(L);
}

// How far it is from a station to the next contour up, measured along the slope: the band's width, and
// so the steepness (the interval over it). `undefined` when the next line is further than `max`, which
// is ground flat enough that this treatment says nothing about it — a plain stays blank paper.
function bandWidth(st, L, max) {
  const up = levelPoints(L + INTERVAL);
  if (up.length === 0) return undefined;
  let best = Infinity;
  for (const [px, py] of up) {
    const dx = px - st.x, dy = py - st.y;
    // only what lies up the slope: a ring passing behind is a different hillside
    if (dx * st.nx + dy * st.ny <= 0) continue;
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  best = Math.sqrt(best);
  return best > max ? undefined : best;
}

// ---------------------------------------------------------------------------------------------------
// A · Contours weighted by level — the treatment #62 chose, unchanged.
// ---------------------------------------------------------------------------------------------------
export function contoursSvg(v, r, opts = {}) {
  let s = "";
  for (const L of LEVELS) {
    const index = L % INDEX_EVERY === 0;
    if (opts.indexOnly && !index) continue;
    s += `<path d="${levelPath(L)}" fill="none" stroke="${opts.stroke ?? v.ink}" stroke-width="${index ? r.indexW : r.lineW}" stroke-opacity="${index ? r.indexA : r.lineA}" stroke-linejoin="round"/>`;
  }
  if (!opts.noNumerals) s += numeralsSvg(v, r, opts);
  return s;
}

// Each index level's numeral, once, where its line comes nearest the numeral column: a band across the
// foot of the plate, so the numbers stay below the field and out of the unit labels.
export function numeralsSvg(v, r, opts = {}) {
  let s = "";
  for (const L of LEVELS) {
    if (L % INDEX_EVERY !== 0) continue;
    let best = null;
    for (const ring of CONTOURS.get(L)) for (const p of ring) {
      if (p[1] < 400 || p[1] > 520 || p[0] < 60 || p[0] > 1060) continue;
      const d = Math.abs(p[0] - 560);
      if (!best || d < best.d) best = { p, d };
    }
    if (!best) continue;
    const face = opts.numeralFace ?? `font-style="italic"`;
    s += `<text x="${f1(best.p[0])}" y="${f1(best.p[1])}" font-size="${opts.numeralSize ?? 10}" ${face} fill="${opts.numeralInk ?? v.ink}" fill-opacity="${r.numA}" stroke="${opts.knockout ?? v.paper}" stroke-width="3" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">${L}</text>`;
  }
  return s;
}

// ---------------------------------------------------------------------------------------------------
// B · Hachures, cut from the contours alone — the treatment #62 rejected for want of a raster.
// ---------------------------------------------------------------------------------------------------
// Lehmann's rule, drawn the way an engraver drew it before there was a heightfield to ask: a stroke from
// each contour up the slope to the next, its weight rising as the ground steepens, so steep ground goes
// dark and level ground stays blank. Everything it needs is the ring it stands on (which way is up) and
// the ring above it (how far away). No slope field, no aspect, no raster: ADR-0007 and ADR-0012 stand.
export function hachuresSvg(v, r, opts = {}) {
  const step = opts.step ?? 7.5;
  const maxBand = opts.maxBand ?? 46; // beyond this the ground is flat enough to say nothing about
  // The contourer pads its grid so every line closes, which leaves a ring running just outside the
  // plate with the next level hard against it: a false cliff all round the edge. The renderer clips its
  // lines to the extent instead of closing them, so a station outside the extent is an artefact of the
  // scene, not of the treatment, and is dropped here. A band under `minBand` is the same collapse.
  const ex = opts.extent ?? { x: 20, y: 20, w: 1080, h: 520 };
  const minBand = opts.minBand ?? 3.5;
  const inside = (x, y) => x >= ex.x && x <= ex.x + ex.w && y >= ex.y && y <= ex.y + ex.h;
  const rnd = seeded(31);
  let s = `<g stroke="${opts.stroke ?? v.ink}" stroke-linecap="butt">`;
  for (const L of LEVELS) {
    for (const ring of CONTOURS.get(L) ?? []) {
      for (const st of stations(ring, step)) {
        if (!inside(st.x, st.y)) continue;
        const w = bandWidth(st, L, maxBand);
        if (w === undefined || w < minBand) continue;
        // Lehmann: the ratio of the interval to the band is the slope. Weight rises with it; the stroke
        // spans the band, stopping just short of both lines so the hachure never merges into them.
        const slope = INTERVAL / w;
        const width = Math.min(r.hachMax ?? 1.5, 0.3 + slope * (r.hachGain ?? 5.2));
        const len = w * 0.78;
        const jitter = (rnd() - 0.5) * step * 0.35;
        const px = st.x + -st.ny * jitter, py = st.y + st.nx * jitter;
        const x2 = px + st.nx * len, y2 = py + st.ny * len;
        s += `<line x1="${f1(px)}" y1="${f1(py)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke-width="${f(width)}" stroke-opacity="${r.hachA}"/>`;
      }
    }
  }
  return s + `</g>`;
}

// The hybrid an engraved plate actually used: hachures for the shape of the ground, index contours over
// them so a height can still be read off. Both from the same rings.
export function hachureIndexSvg(v, r) {
  return hachuresSvg(v, { ...r, hachA: r.hachA * 0.8 }) +
    contoursSvg(v, { ...r, indexA: r.indexA * 0.9 }, { indexOnly: true });
}

// ---------------------------------------------------------------------------------------------------
// C · Illuminated contours (Tanaka) — the night plate's own reading of the same rings.
// ---------------------------------------------------------------------------------------------------
// One light, low in the north-west. Each contour is drawn segment by segment: where its uphill normal
// faces the light the line is the paper's ink, wide and bright; where it faces away it thins into the
// ground and all but goes out. The hill is modelled by the lines themselves, so nothing is washed over
// the paper and the side inks keep the ground they sit on. Pure ring geometry, like the hachures.
export function tanakaSvg(v, r, opts = {}) {
  const az = ((opts.azimuth ?? 315) * Math.PI) / 180; // from the north-west
  const lx = Math.sin(az), ly = -Math.cos(az);
  const lit = opts.lit ?? v.ink;
  const shade = opts.shade ?? v.letterbox;
  let s = `<g stroke-linecap="round">`;
  for (const L of LEVELS) {
    const index = L % INDEX_EVERY === 0;
    for (const ring of CONTOURS.get(L) ?? []) {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i], b = ring[i + 1];
        const n = uphillAt(a, b);
        if (n.len < 0.4) continue;
        // -1 fully shaded, +1 fully lit
        const cos = n.x * lx + n.y * ly;
        const t = (cos + 1) / 2;
        const base = index ? r.indexW : r.lineW;
        const width = base * (0.5 + t * (r.tanakaGain ?? 2.2));
        const alpha = (index ? r.indexA : r.lineA) * (0.35 + t * 1.5);
        s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${cos >= 0 ? lit : shade}" stroke-width="${f(width)}" stroke-opacity="${f(Math.min(1, alpha))}"/>`;
      }
    }
  }
  return s + `</g>` + numeralsSvg(v, r, opts);
}

// ---------------------------------------------------------------------------------------------------
// D · Tint bands — the atlas's, as #62 decided: one ink alpha per band, stacking.
// ---------------------------------------------------------------------------------------------------
export function tintSvg(v, r) {
  let s = "";
  for (const L of [30, 50, 100, 150, 200]) s += `<path d="${levelPath(L)}" fill="${v.ink}" fill-opacity="${r.bandA}" stroke="none"/>`;
  return s + contoursSvg(v, { ...r, indexW: r.indexW * 0.7, indexA: r.indexA * 0.7 }, { indexOnly: true });
}

// E · Hypsometric tints: the same bands, but each one a colour off a ramp rather than another coat of
// ink. The high ground is a hue, not a density, so the ramp can be kept lighter than five stacked
// alphas and the side inks read over all of it. The ramp is the view's, which is the whole of the
// difference from D.
export function hypsoSvg(v, r, ramp) {
  const bands = [30, 50, 100, 150, 200];
  let s = "";
  bands.forEach((L, i) => {
    s += `<path d="${levelPath(L)}" fill="${ramp[i]}" stroke="none"/>`;
  });
  return s + contoursSvg(v, { ...r, indexW: r.indexW * 0.7, indexA: r.indexA * 0.7 }, { indexOnly: true, stroke: r.hypsoLine ?? v.ink });
}

// ---------------------------------------------------------------------------------------------------
// The grid: ground, not furniture (ADR-0021) — map space, through the projection, under the units.
// ---------------------------------------------------------------------------------------------------
// A staff map's kilometre squares, drawn as a graticule with its edge numerals riding with it. The pitch
// here is plate pixels standing in for a projected kilometre; in the renderer it is chosen in map units
// and projected, so the lines are not parallel to the plate on a wide extent.
export function gridSvg({ x, y, w, h }, colour, opts = {}) {
  const pitch = opts.pitch ?? 86;
  const originE = opts.originE ?? 42, originN = opts.originN ?? 71; // the squares' own numbering
  let s = `<g stroke="${colour}" stroke-width="${opts.width ?? 0.6}" stroke-opacity="${opts.alpha ?? 0.55}">`;
  const cols = [], rows = [];
  for (let gx = x + pitch / 2; gx < x + w; gx += pitch) { cols.push(gx); s += `<line x1="${f1(gx)}" y1="${y}" x2="${f1(gx)}" y2="${y + h}"/>`; }
  for (let gy = y + pitch / 2; gy < y + h; gy += pitch) { rows.push(gy); s += `<line x1="${x}" y1="${f1(gy)}" x2="${x + w}" y2="${f1(gy)}"/>`; }
  s += `</g>`;
  // The numerals ride with the lines, at both edges, so a square can be named from either side.
  const face = opts.face ?? "";
  s += `<g font-size="10" fill="${opts.numeralInk ?? colour}" ${face} letter-spacing="0.4">`;
  cols.forEach((gx, i) => {
    const n = String(originE + i).padStart(2, "0");
    s += `<text x="${f1(gx + 3)}" y="${y + 12}" dominant-baseline="middle">${n}</text>`;
    s += `<text x="${f1(gx + 3)}" y="${y + h - 9}" dominant-baseline="middle">${n}</text>`;
  });
  rows.forEach((gy, i) => {
    const n = String(originN - i).padStart(2, "0");
    s += `<text x="${x + 6}" y="${f1(gy - 6)}" dominant-baseline="middle">${n}</text>`;
    s += `<text x="${x + w - 18}" y="${f1(gy - 6)}" dominant-baseline="middle">${n}</text>`;
  });
  return s + `</g>`;
}

// ---------------------------------------------------------------------------------------------------
// F · The staff map's ground: flat steps, a graticule, and contours as a modern sheet draws them.
// ---------------------------------------------------------------------------------------------------
// The same anatomy as the plate — the same rings, the same levels, the same index every fifth — drawn in
// a wholly different hand. Two things are worth naming as differences the RULE allows and a shared pass
// could not have given: the tints are flat steps of colour rather than stacked ink, and the numerals are
// set INTO the contour, broken into the line and turned to lie along it, where the engraved plate gathers
// them in a column at the foot of the plate (#62's answer to the labels). "The numerals say the height"
// is the anatomy; where and how they are set is the view's.
export function staffTintSvg(ramp) {
  let s = "";
  [30, 50, 100, 150, 200].forEach((L, i) => {
    s += `<path d="${levelPath(L)}" fill="${ramp[i]}" stroke="none"/>`;
  });
  return s;
}

export function staffContoursSvg(r, colour, opts = {}) {
  let s = "";
  for (const L of LEVELS) {
    const index = L % INDEX_EVERY === 0;
    s += `<path d="${levelPath(L)}" fill="none" stroke="${colour}" stroke-width="${index ? r.indexW : r.lineW}" stroke-opacity="${index ? r.indexA : r.lineA}" stroke-linejoin="round"/>`;
  }
  return s + inlineNumeralsSvg(r, colour, opts);
}

// The numeral set into the line: a knockout along the contour's own direction, and the figure turned to
// lie along it, upright-ish (never upside down). Placed where the line runs clear of the foot of the
// plate, and at most twice on a level, as a sheet repeats a number round a long contour.
export function inlineNumeralsSvg(r, colour, opts = {}) {
  const ex = opts.extent ?? { x: 20, y: 20, w: 1080, h: 520 };
  const knock = opts.knockout ?? "#e8e2d0";
  const face = opts.face ?? "";
  let s = `<g font-size="${opts.size ?? 10}" ${face} fill="${colour}" fill-opacity="${r.numA}">`;
  for (const L of LEVELS) {
    if (L % INDEX_EVERY !== 0) continue;
    let placed = 0;
    for (const ring of CONTOURS.get(L) ?? []) {
      if (placed >= 2) break;
      // step well along the ring so two numerals on one line are not neighbours
      for (let i = 6; i < ring.length - 6 && placed < 2; i += Math.max(8, Math.floor(ring.length / 3))) {
        const a = ring[i - 3], b = ring[i + 3];
        const cx = ring[i][0], cy = ring[i][1];
        if (cx < ex.x + 40 || cx > ex.x + ex.w - 40 || cy < ex.y + 30 || cy > ex.y + ex.h - 30) continue;
        let deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        if (deg > 90) deg -= 180;
        if (deg < -90) deg += 180;
        const half = String(L).length * 3.4 + 3;
        s += `<g transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f(deg)})">` +
          `<rect x="${f(-half)}" y="-6" width="${f(half * 2)}" height="12" fill="${knock}"/>` +
          `<text x="0" y="0.5" text-anchor="middle" dominant-baseline="middle">${L}</text></g>`;
        placed++;
      }
    }
  }
  return s + `</g>`;
}

// ---------------------------------------------------------------------------------------------------
// The sea, per view.
// ---------------------------------------------------------------------------------------------------
// The plate's loose mottle, the night plate's fainter one, the atlas's blank paper and the staff map's
// flat body of water with a shore line. The stipple is seeded, so it is the same on every frame.
export function seaSvg(kind, v, box, opts = {}) {
  const { x, y, w, h } = box;
  if (kind === "flat") return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${opts.water ?? "#cbd8e0"}"/>`;
  if (kind === "none") return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${v.paper}"/>`;
  const rnd = seeded(5);
  const alpha = kind === "faint" ? 0.05 : 0.1;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${v.paper}"/><g fill="${v.ink}" fill-opacity="${alpha}">`;
  for (let i = 0; i < 2600; i++) {
    s += `<circle cx="${f1(x + rnd() * w)}" cy="${f1(y + rnd() * h)}" r="${f(0.5 + rnd() * 0.7)}"/>`;
  }
  return s + `</g>`;
}

// ---------------------------------------------------------------------------------------------------
// Works as lines: Alesia's two rings.
// ---------------------------------------------------------------------------------------------------
// `work` is a point today (ADR-0012), and Alesia's lines are the case that breaks it — what the schema
// does about that is #132's. What a line work LOOKS like is this ticket's, and the four idioms differ,
// which is the argument for putting the drawing in the view's hand rather than sharing one.
//
//  · engraved  — a fine line with the ditch's teeth on the outward side, as a siege plan cuts it
//  · atlas     — one heavy line, the teeth become a solid band: mass at a glance, like the atlas's pens
//  · staff     — the operations-map obstacle: a bold line with regular cross ticks
export function lineWorkSvg(pts, v, kind, opts = {}) {
  const outward = opts.outward ?? 1; // +1 teeth to the left of travel, -1 to the right
  const d = polyPath(pts, opts.close ?? true);
  const ink = opts.stroke ?? v.ink;
  const teeth = [];
  const step = kind === "staff" ? 16 : kind === "atlas" ? 13 : 9;
  const len = kind === "staff" ? 6 : kind === "atlas" ? 5 : 4.5;
  const ring = opts.close ?? true ? [...pts, pts[0]] : pts;
  for (const st of stations(ring, step)) {
    const nx = st.nx * outward, ny = st.ny * outward;
    if (kind === "staff") {
      // a cross tick, both sides, as an obstacle is drawn
      teeth.push(`<line x1="${f1(st.x - nx * len * 0.5)}" y1="${f1(st.y - ny * len * 0.5)}" x2="${f1(st.x + nx * len)}" y2="${f1(st.y + ny * len)}"/>`);
    } else {
      teeth.push(`<line x1="${f1(st.x)}" y1="${f1(st.y)}" x2="${f1(st.x + nx * len)}" y2="${f1(st.y + ny * len)}"/>`);
    }
  }
  const bodyW = kind === "atlas" ? 2.6 : kind === "staff" ? 2.2 : 1.3;
  const toothW = kind === "atlas" ? 1.6 : kind === "staff" ? 1.1 : 0.7;
  return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${bodyW}" stroke-linejoin="round"/>` +
    `<g stroke="${ink}" stroke-width="${toothW}" stroke-linecap="round">${teeth.join("")}</g>`;
}

// A rough ring of `n` points about a centre, wobbled so it reads as ground followed rather than compass
// drawn. Alesia's lines followed the contour of the hills; these stand in for the traced ones.
export function ring(cx, cy, rx, ry, n, seed, wobble = 0.07) {
  const rnd = seeded(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rnd() - 0.5) * 2 * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}
