// Generates the design-canvas artboards for the Sandtable design language.
// One Trafalgar scene, drawn in each view, so the difference between artboards is treatment only.
import { writeFileSync } from "node:fs";

const FONT = `<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&amp;display=swap" rel="stylesheet">`;
const FACE = `"IM Fell English", Georgia, "Times New Roman", serif`;

// ---- the plate's materials, lifted from src/render/style.ts and player.css ----
const PLATE = {
  name: "Chart plate",
  ink: "#2b2418", paper: "#efe3c6", land: "#e3d3ac", letterbox: "#d9c8a2", panel: "rgba(239,227,198,0.92)",
  rule: "rgba(43,36,24,0.55)", smoke: "rgba(60,55,50,0.13)", stipple: "rgba(43,36,24,0.10)",
  sides: { British: "#8f2f24", "Combined Fleet": "#24406b" },
  coastStroke: "#2b2418",
};
const NIGHT = {
  name: "Night plate",
  ink: "#efe3c6", paper: "#1b2430", land: "#2a3340", letterbox: "#111820", panel: "rgba(27,36,48,0.92)",
  rule: "rgba(239,227,198,0.55)", smoke: "rgba(239,227,198,0.16)", stipple: "rgba(239,227,198,0.07)",
  sides: { British: "#e2685a", "Combined Fleet": "#86a9e8" },
  coastStroke: "#a9b6c6",
};
const ATLAS = {
  name: "Atlas",
  ink: "#2b2418", paper: "#efe3c6", land: "#e3d3ac", letterbox: "#d9c8a2", panel: "rgba(239,227,198,0.92)",
  rule: "rgba(43,36,24,0.55)", smoke: "rgba(60,55,50,0.13)", stipple: "rgba(43,36,24,0.0)",
  sides: { British: "#8f2f24", "Combined Fleet": "#24406b" },
  coastStroke: "#2b2418",
};

function seeded(seed) {
  let s = (Math.abs(Math.floor(seed)) * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const f = (n) => Number(n.toFixed(2));

// ---- glyph: eight chevron ticks, column along the heading, line abreast; drawn heading up, then rotated ----
function ticks({ length = 72, formation = "column", state = "intact", strength = 1, colour, seed = 1, scale = 1 }) {
  const w = 2.6 * scale, h = 3.25 * scale;
  const shown = state === "destroyed" ? 0 : Math.max(1, Math.round(8 * strength));
  const rnd = seeded(seed);
  let occupied;
  if (state !== "broken") { const start = Math.floor((8 - shown) / 2); occupied = Array.from({ length: shown }, (_, i) => start + i); }
  else {
    const set = new Set();
    for (let i = 0; i < shown; i++) {
      const ideal = ((i + 0.5) * 8) / shown; const nudge = Math.floor(rnd() * 2) - 1;
      let idx = Math.min(7, Math.max(0, Math.floor(ideal) + nudge));
      while (set.has(idx) && idx < 7) idx++;
      set.add(idx);
    }
    occupied = [...set];
  }
  let out = "";
  if (state === "destroyed") {
    const across = (2.6 + 2) * scale, along = length / 2;
    const rw = formation === "column" ? across : along, rh = formation === "column" ? along : across;
    return `<rect x="${-rw}" y="${-rh}" width="${2 * rw}" height="${2 * rh}" rx="${Math.min(rw, rh)}" fill="none" stroke="${colour}" stroke-width="${scale}"/>`;
  }
  for (const i of occupied) {
    const along = -length / 2 + ((i + 0.5) * length) / 8;
    const x = formation === "column" ? 0 : along, y = formation === "column" ? along : 0;
    const dis = state === "broken" ? (rnd() - 0.5) * 0.9 * 57.3 : 0;
    out += `<path d="M${f(-w)} ${f(h)} L0 ${f(-h)} L${f(w)} ${f(h)}" transform="translate(${f(x)} ${f(y)}) rotate(${f(dis)})" fill="none" stroke="${colour}" stroke-width="${1.4 * scale}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return out;
}

// Smoke in three engraved treatments. All drawn heading-up at the origin like the ticks.
function smokeDrift(length, state, seed, colour, scale = 1) {
  const rnd = seeded(seed);
  const puffs = Math.round((state === "broken" ? 10 : 22) * scale);
  const r0 = (state === "broken" ? 3 : 5) * scale, r1 = (state === "broken" ? 5 : 9) * scale;
  let out = "";
  for (let i = 0; i < puffs; i++) {
    const along = -length / 2 + rnd() * length, across = (rnd() - 0.5) * 22 * scale + 6 * scale;
    out += `<circle cx="${f(across)}" cy="${f(along)}" r="${f(r0 + rnd() * r1)}" fill="${colour}"/>`;
  }
  return out;
}
function smokeStipple(length, seed, colour, scale = 1) {
  const rnd = seeded(seed);
  let out = "";
  for (let i = 0; i < 140 * scale; i++) {
    const along = -length / 2 - 6 + rnd() * (length + 12);
    const g = (rnd() + rnd() + rnd()) / 3; // clustered toward the lee side
    const across = 4 + g * 26 * scale;
    out += `<circle cx="${f(across)}" cy="${f(along)}" r="${f(0.6 + rnd() * 0.7)}" fill="${colour}" fill-opacity="0.55"/>`;
  }
  return out;
}
function smokeBurst(length, seed, colour, scale = 1) {
  const rnd = seeded(seed);
  let out = "";
  for (let i = 0; i < 8; i++) {
    const y = -length / 2 + ((i + 0.5) * length) / 8;
    for (const side of [1, -1]) {
      const n = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const a = (rnd() - 0.5) * 0.9, r0 = 4 + rnd() * 2, r1 = 9 + rnd() * 6;
        out += `<line x1="${f(side * Math.cos(a) * r0)}" y1="${f(y + Math.sin(a) * r0)}" x2="${f(side * Math.cos(a) * r1)}" y2="${f(y + Math.sin(a) * r1)}" stroke="${colour}" stroke-width="${0.8 * scale}" stroke-opacity="0.7" stroke-linecap="round"/>`;
      }
    }
  }
  return out;
}

// ---- engraved smoke: three treatments cut with the pen, all blown to leeward. `lee` is the wind's
// heading-to in the glyph's local frame (0 = up the glyph's heading), so the drift follows the plate's wind.
const leeVec = (leeDeg) => { const r = (leeDeg * Math.PI) / 180; return { x: Math.sin(r), y: -Math.cos(r) }; };
const perp = (v) => ({ x: -v.y, y: v.x });

// D · Billow: outlined puffs whose overlaps merge into one cloud (each puff filled paper over the last),
// shaded with three chords of hatching on the lee side of every puff, as an engraver shades a cloud.
function smokeBillow(length, seed, ink, paper, leeDeg, scale = 1, thin = false) {
  const rnd = seeded(seed), L = leeVec(leeDeg), U = perp(L);
  const puffs = [];
  const n = thin ? 4 : 9;
  for (let i = 0; i < n; i++) {
    const along = -length / 2 + ((i + 0.5) * length) / n + (rnd() - 0.5) * 3;
    const r = (4 + rnd() * 2.5) * scale, d = r + (1.5 + rnd() * 3) * scale;
    puffs.push({ x: L.x * d, y: along + L.y * d, r });
    if (!thin && rnd() > 0.3) {
      const d2 = d + r * 0.9 + rnd() * 5 * scale, r2 = r * (0.9 + rnd() * 0.6), a2 = along + (rnd() - 0.5) * 6;
      puffs.push({ x: L.x * d2, y: a2 + L.y * d2, r: r2 });
    }
    if (!thin && rnd() > 0.6) {
      const d3 = (16 + rnd() * 8) * scale, r3 = (2.5 + rnd() * 2) * scale, a3 = along + (rnd() - 0.5) * 8;
      puffs.push({ x: L.x * d3, y: a3 + L.y * d3, r: r3 });
    }
  }
  // far puffs first so the near ones lie over them
  puffs.sort((a, b) => (b.x * L.x + b.y * L.y) - (a.x * L.x + a.y * L.y));
  let out = "";
  for (const p of puffs) out += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="${paper}" stroke="${ink}" stroke-width="${0.7 * scale}" stroke-opacity="0.85"/>`;
  // hatching: chords across the lee side of each puff, perpendicular to the wind
  for (const p of puffs) {
    for (const t of [0.3, 0.55, 0.8]) {
      const half = Math.sqrt(Math.max(0, p.r * p.r - (t * p.r) ** 2)) * 0.85;
      const cx = p.x + L.x * t * p.r, cy = p.y + L.y * t * p.r;
      out += `<line x1="${f(cx - U.x * half)}" y1="${f(cy - U.y * half)}" x2="${f(cx + U.x * half)}" y2="${f(cy + U.y * half)}" stroke="${ink}" stroke-width="${0.55 * scale}" stroke-opacity="0.7"/>`;
    }
  }
  return out;
}
// E · Flow: fine pen lines streaming to leeward from the unit, wavering as they go, an engraver's flat tint
// laid as flowing strokes. Density is the ship's fire; length is the drift.
function smokeFlow(length, seed, ink, leeDeg, scale = 1, thin = false) {
  const rnd = seeded(seed), L = leeVec(leeDeg), U = perp(L);
  const n = thin ? 6 : 11;
  let out = "";
  for (let i = 0; i < n; i++) {
    const along = -length / 2 + ((i + 0.5) * length) / n + (rnd() - 0.5) * 4;
    const start = (4 + rnd() * 2) * scale, len = (9 + rnd() * 10) * scale, wobble = (rnd() - 0.5) * 5 * scale;
    const p0 = { x: L.x * start, y: along + L.y * start };
    const p1 = { x: p0.x + L.x * len * 0.5 + U.x * wobble, y: p0.y + L.y * len * 0.5 + U.y * wobble };
    const p2 = { x: p0.x + L.x * len - U.x * wobble * 0.6, y: p0.y + L.y * len - U.y * wobble * 0.6 };
    out += `<path d="M${f(p0.x)} ${f(p0.y)} Q${f(p1.x)} ${f(p1.y)} ${f(p2.x)} ${f(p2.y)}" fill="none" stroke="${ink}" stroke-width="${0.75 * scale}" stroke-opacity="${(0.5 + rnd() * 0.3).toFixed(2)}" stroke-linecap="round"/>`;
  }
  return out;
}
// F · Fire lines: straight rules from each firing tick, downwind, like the lines of fire on a tactical diagram.
// No cloud at all: gunfire, not smoke.
function smokeFire(length, seed, ink, leeDeg, scale = 1, thin = false) {
  const rnd = seeded(seed), L = leeVec(leeDeg), U = perp(L);
  let out = "";
  for (let i = 0; i < 8; i++) {
    if (thin && rnd() > 0.5) continue;
    const along = -length / 2 + ((i + 0.5) * length) / 8;
    const len = (16 + rnd() * 10) * scale;
    const p0 = { x: L.x * 4 * scale, y: along + L.y * 4 * scale };
    out += `<line x1="${f(p0.x)}" y1="${f(p0.y)}" x2="${f(p0.x + L.x * len)}" y2="${f(p0.y + L.y * len)}" stroke="${ink}" stroke-width="${0.7 * scale}" stroke-opacity="0.75" stroke-linecap="round"/>`;
    out += `<line x1="${f(p0.x + U.x * 1.5)}" y1="${f(p0.y + U.y * 1.5)}" x2="${f(p0.x + L.x * len * 0.55 + U.x * 1.5)}" y2="${f(p0.y + L.y * len * 0.55 + U.y * 1.5)}" stroke="${ink}" stroke-width="${0.5 * scale}" stroke-opacity="0.5" stroke-linecap="round"/>`;
  }
  return out;
}
// The wind blows toward 112 (from WNW). In a glyph's local frame that is 112 minus its heading.
const WIND_TO = 112;
// Smoke is authored along the column axis (ticks along y). For a line the ticks lie along x, so rotate.
function smokeFor(kind, u, v, scale = 1) {
  const thin = u.state === "broken";
  // The drift keeps to the lee flank: the wind's across-hull component is never less than about half,
  // and its along-hull component is damped, so smoke clears the ticks even when a ship runs downwind.
  const raw = ((WIND_TO - u.heading + (u.formation === "line" ? -90 : 0)) * Math.PI) / 180;
  let sx = Math.sin(raw), sy = -Math.cos(raw);
  sx = (sx >= 0 ? 1 : -1) * Math.max(Math.abs(sx), 0.55); sy *= 0.6;
  const lee = (Math.atan2(sx, -sy) * 180) / Math.PI;
  const L = (u.length ?? 72) * (scale === 1 ? 1 : 1);
  let s = "";
  if (kind === "drift") s = smokeDrift(L, u.state, u.seed, v.smoke, scale);
  else if (kind === "billow") s = smokeBillow(L, u.seed, v.ink, v.paper, lee, scale, thin);
  else if (kind === "flow") s = smokeFlow(L, u.seed, v.ink, lee, scale, thin);
  else if (kind === "fire") s = smokeFire(L, u.seed, v.ink, lee, scale, thin);
  return u.formation === "line" ? `<g transform="rotate(90)">${s}</g>` : s;
}

function arrow(a, b, { colour, width, dash = "", head, headSize }) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), deg = (ang * 180) / Math.PI;
  const trim = head === "filled" ? headSize * 0.7 : 0;
  const ex = b.x - Math.cos(ang) * trim, ey = b.y - Math.sin(ang) * trim;
  const s = headSize;
  const headPath = head === "filled"
    ? `<path d="M0 0 L${-s} ${-s * 0.5} L${-s * 0.7} 0 L${-s} ${s * 0.5} Z" fill="${colour}"/>`
    : `<path d="M${-s} ${-s * 0.55} L0 0 L${-s} ${s * 0.55}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(ex)}" y2="${f(ey)}" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>` +
    `<g transform="translate(${f(b.x)} ${f(b.y)}) rotate(${f(deg)})">${headPath}</g>`;
}
const TRACK = (ink) => ({ colour: ink, width: 1.2, dash: "0.1 4", head: "open", headSize: 7 });
const INTENT = (ink) => ({ colour: ink, width: 1.2, dash: "8 5", head: "open", headSize: 9 });
const DETACH = (c) => ({ colour: c, width: 1.8, head: "filled", headSize: 11 });

function label(x, y, name, detail, colour, ink, align = "start", leader) {
  const lead = leader ? `<line x1="${leader.x1}" y1="${leader.y1}" x2="${leader.x2}" y2="${leader.y2}" stroke="${ink}" stroke-width="0.8"/><circle cx="${leader.x1}" cy="${leader.y1}" r="1.6" fill="${ink}"/>` : "";
  return `${lead}<text x="${x}" y="${y - 8}" font-size="14" font-style="italic" fill="${colour}" text-anchor="${align}" dominant-baseline="middle">${name}</text>` +
    `<text x="${x}" y="${y + 8}" font-size="12" fill="${ink}" text-anchor="${align}" dominant-baseline="middle">${detail}</text>`;
}

// ---- Atlas glyph: a solid block, strength as the filled fraction, hatch when engaged ----
function block({ length = 72, formation = "column", state, strength = 1, colour, ink }) {
  const t = 10;
  const w = formation === "column" ? t : length, h = formation === "column" ? length : t;
  const fillLen = state === "destroyed" ? 0 : strength;
  const fw = formation === "column" ? w : length * fillLen, fh = formation === "column" ? length * fillLen : h;
  const dash = state === "broken" ? ` stroke-dasharray="3 2"` : "";
  let out = "";
  if (state === "engaged") {
    out += `<rect x="${-w / 2 - 7}" y="${-h / 2 - 7}" width="${w + 14}" height="${h + 14}" fill="url(#hatch)" stroke="none"/>`;
  }
  out += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="none" stroke="${colour}" stroke-width="1.4"${dash}/>`;
  if (fillLen > 0) out += `<rect x="${-w / 2}" y="${formation === "column" ? h / 2 - fh : -h / 2}" width="${fw}" height="${fh}" fill="${colour}"${state === "broken" ? ` fill-opacity="0.55"` : ""}/>`;
  // a heading nose
  out += formation === "column"
    ? `<path d="M${-w / 2} ${-h / 2} L0 ${-h / 2 - 8} L${w / 2} ${-h / 2} Z" fill="${colour}"/>`
    : `<path d="M-4 ${-h / 2} L0 ${-h / 2 - 8} L4 ${-h / 2} Z" fill="${colour}"/>`;
  return out;
}

// ---- furniture ----
function compass(cx, cy, ink, windFrom = 292, feathers = 1, big = true) {
  const R = 30;
  let out = `<g transform="translate(${cx} ${cy})" stroke="${ink}" fill="${ink}" stroke-width="1"><circle r="${R}" fill="none"/><circle r="3" stroke="none"/>`;
  for (let i = 0; i < 16; i++) out += `<line x1="0" y1="${-R}" x2="0" y2="${i % 4 === 0 ? -20 : -25}" transform="rotate(${i * 22.5})"/>`;
  out += `<path d="M0 -42 L4 -8 L0 0 L-4 -8 Z" stroke="none"/><text y="-46" font-size="13" text-anchor="middle" stroke="none" fill="${ink}">N</text>`;
  const tail = R + 26, head = -(R + 14);
  out += `<g transform="rotate(${windFrom + 180})" stroke-width="1.4" stroke-linecap="round" fill="none"><line x1="0" y1="${tail}" x2="0" y2="${head}"/><path d="M-5 ${head + 8} L0 ${head} L5 ${head + 8}"/>`;
  for (let i = 0; i < feathers; i++) out += `<line x1="0" y1="${tail - 2 - i * 6}" x2="-8" y2="${tail + 3 - i * 6}"/>`;
  out += `</g></g>`;
  if (big) out += `<text x="${cx + R + 34}" y="${cy - 8}" font-size="13" font-style="italic" fill="${ink}" dominant-baseline="hanging">Wind WNW, light</text>`;
  return out;
}
function scaleBar(x, y, ink, px = 100) {
  let out = `<g stroke="${ink}" stroke-width="1.5"><line x1="${x}" y1="${y}" x2="${x + px}" y2="${y}"/><line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 5}"/><line x1="${x + px}" y1="${y - 5}" x2="${x + px}" y2="${y + 5}"/>`;
  for (let i = 1; i < 5; i++) out += `<line x1="${x + (px * i) / 5}" y1="${y - 3}" x2="${x + (px * i) / 5}" y2="${y + 3}"/>`;
  out += `</g><text x="${x}" y="${y - 8}" font-size="12" font-style="italic" fill="${ink}">5 nautical miles</text>`;
  return out;
}
function legend(x, bottom, v, glyphFn) {
  const rows = 2 + 4 + 3, H = rows * 18 + 16, W = 168, y = bottom - H;
  let out = `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${v.panel}" stroke="${v.ink}" stroke-width="1"/>`;
  let ry = y + 8 + 9; const tx = x + 12 + 40 + 10, sx = x + 12 + 20;
  const sample = (opts) => `<g transform="translate(${sx} ${ry}) rotate(90)">${glyphFn({ length: 34, formation: "column", scale: 0.75, ink: v.ink, ...opts })}</g>`;
  for (const [side, c] of Object.entries(v.sides)) { out += sample({ state: "intact", strength: 1, colour: c, seed: 1 }) + `<text x="${tx}" y="${ry}" font-size="12" font-style="italic" fill="${c}" dominant-baseline="middle">${side}</text>`; ry += 18; }
  for (const st of ["intact", "engaged", "broken", "destroyed"]) { out += sample({ state: st, strength: st === "broken" ? 0.4 : 1, colour: v.ink, seed: 3 }) + `<text x="${tx}" y="${ry}" font-size="12" font-style="italic" fill="${v.ink}" dominant-baseline="middle">${st}</text>`; ry += 18; }
  const first = Object.values(v.sides)[0];
  for (const [name, st] of [["track", TRACK(v.ink)], ["intent", INTENT(v.ink)], ["detachment", DETACH(first)]]) {
    out += arrow({ x: x + 12, y: ry }, { x: x + 52, y: ry }, st) + `<text x="${tx}" y="${ry}" font-size="12" font-style="italic" fill="${v.ink}" dominant-baseline="middle">${name}</text>`; ry += 18;
  }
  return out;
}

// ---- the scene: Trafalgar, noon, four units ----
const COAST = "M870 20 L880 90 L840 120 L900 160 L960 200 L1000 260 L1030 320 L1050 380 L1100 430 L1100 20 Z";
function stipple(v, seed = 7, n = 260) {
  const rnd = seeded(seed); let out = "";
  for (let i = 0; i < n; i++) out += `<circle cx="${f(30 + rnd() * 1040)}" cy="${f(30 + rnd() * 500)}" r="${f(1.5 + rnd() * 4)}" fill="${v.stipple}"/>`;
  return out;
}

function scene(v, mode /* 'plate' | 'atlas' */, opts = {}) {
  const ink = v.ink, br = v.sides.British, cf = v.sides["Combined Fleet"];
  const engagedSmoke = opts.smoke ?? "billow";
  const glyph = (u) => {
    if (mode === "atlas") return block({ ...u, ink });
    const s = u.state === "engaged" || u.state === "broken" ? smokeFor(engagedSmoke, u, v) : "";
    return s + ticks({ ...u, colour: u.colour });
  };
  const legendGlyph = (o) => {
    const u = { heading: 270, formation: "column", length: o.length, ...o };
    const s = o.state === "engaged" || o.state === "broken" ? smokeFor(engagedSmoke, u, v, o.scale ?? 1) : "";
    return s + ticks(o);
  };
  const units = [
    { id: "van", x: 700, y: 150, heading: 320, formation: "line", state: "intact", strength: 1, colour: cf, seed: 11 },
    { id: "weather", x: 600, y: 245, heading: 100, formation: "column", state: "engaged", strength: 1, colour: br, seed: 5 },
    { id: "centre", x: 760, y: 300, heading: 270, formation: "line", state: "engaged", strength: 1, colour: cf, seed: 9 },
    { id: "lee", x: 640, y: 345, heading: 105, formation: "column", state: "engaged", strength: 0.9, colour: br, seed: 6 },
    { id: "rear", x: 790, y: 425, heading: 270, formation: "line", state: "broken", strength: 0.4, colour: cf, seed: 8 },
  ];
  const thick = mode === "atlas";
  let s = "";
  // ground
  s += `<rect width="1120" height="560" fill="${v.letterbox}"/><rect x="20" y="20" width="1080" height="520" fill="${v.paper}"/>`;
  s += `<clipPath id="ext"><rect x="20" y="20" width="1080" height="520"/></clipPath><g clip-path="url(#ext)">`;
  s += stipple(v);
  s += `<path d="${COAST}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>`;
  s += `<circle cx="868" cy="118" r="2.5" fill="${ink}"/><text x="876" y="118" font-size="13" font-style="italic" fill="${ink}" dominant-baseline="middle">Cadiz</text>`;
  s += `<circle cx="1062" cy="404" r="2.5" fill="${ink}"/><text x="1054" y="404" font-size="13" font-style="italic" fill="${ink}" text-anchor="end" dominant-baseline="middle">C. Trafalgar</text>`;
  // tracks and moves, under the glyphs
  s += arrow({ x: 600, y: 245 }, { x: 690, y: 262 }, thick ? { ...TRACK(ink), width: 1.6 } : TRACK(ink));
  s += arrow({ x: 640, y: 345 }, { x: 725, y: 368 }, thick ? { ...TRACK(ink), width: 1.6 } : TRACK(ink));
  s += arrow({ x: 700, y: 150 }, { x: 640, y: 60 }, thick ? { ...INTENT(ink), width: 2.4 } : INTENT(ink));
  s += arrow({ x: 640, y: 345 }, { x: 745, y: 470 }, thick ? { ...DETACH(br), width: 3.2, headSize: 14 } : DETACH(br));
  for (const u of units) s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading})">${glyph(u)}</g>`;
  // labels: name in side ink, state beneath in ink; the van's is displaced with a leader
  s += label(560, 245, "Weather column", "engaged", br, ink, "end");
  s += label(600, 380, "Lee column", "engaged · 90%", br, ink, "end");
  s += label(800, 300, "Combined Fleet", "engaged", cf, ink, "start");
  s += label(830, 425, "Rear", "broken · 40%", cf, ink, "start");
  s += label(580, 130, "Van", "intact", cf, ink, "end", { x1: 668, y1: 150, x2: 588, y2: 130 });
  s += `</g>`;
  // plate rule, furniture
  s += `<g fill="none" stroke="${ink}" stroke-width="1"><rect x="20.5" y="20.5" width="1079" height="519"/><rect x="25.5" y="25.5" width="1069" height="509"/></g>`;
  s += compass(94, 98, ink);
  s += `<text x="1078" y="38" font-size="22" fill="${ink}" text-anchor="end" dominant-baseline="hanging">The Battle of Trafalgar</text>`;
  s += scaleBar(46, 514, ink);
  s += legend(46, 514 - 8 - 14 - 14, v, mode === "atlas" ? block : legendGlyph);
  s += `<text x="1086" y="528" font-size="11" font-style="italic" fill="${ink}" text-anchor="end">Coastline: Natural Earth (public domain)</text>`;
  return s;
}

const HATCH = (ink) => `<defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="${ink}" stroke-width="0.9" stroke-opacity="0.55"/></pattern></defs>`;

function captionBand(v, w = 1120, top = 560, h = 90) {
  const ink = v.ink;
  return `<rect x="0" y="${top}" width="${w}" height="${h}" fill="${v.paper}"/>` +
    `<g stroke="${ink}" stroke-width="1"><line x1="0" y1="${top + 0.5}" x2="${w}" y2="${top + 0.5}"/><line x1="0" y1="${top + 3.5}" x2="${w}" y2="${top + 3.5}"/></g>` +
    `<text x="24" y="${top + 16}" font-size="26" fill="${ink}" dominant-baseline="hanging">12:00</text>` +
    `<text x="24" y="${top + 50}" font-size="13" font-style="italic" fill="${ink}" dominant-baseline="hanging">21 October 1805</text>` +
    `<text x="174" y="${top + 14}" font-size="12" fill="${ink}" dominant-baseline="hanging" letter-spacing="0.5">ROYAL SOVEREIGN BREAKS THE REAR</text>` +
    `<text x="174" y="${top + 32}" font-size="15" fill="${ink}" dominant-baseline="hanging">The action begins at twelve o’clock: the Fougueux fires the first gun at the Royal Sovereign, which stands on alone for ten minutes</text>` +
    `<text x="174" y="${top + 52}" font-size="15" fill="${ink}" dominant-baseline="hanging">under the fire of the enemy’s rear and then breaks through astern of the Santa Ana, engaging her at the muzzles of her guns.</text>` +
    `<text x="174" y="${top + 72}" font-size="12" font-style="italic" fill="${ink}" dominant-baseline="hanging">— Collingwood’s dispatch, Mahan, Southey, Dodd’s plan (1805)</text>`;
}

function page(title, body, extraStyle = "") {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${FONT}
  <style>
    body { margin: 0; font-family: ${FACE}; color: #2b2418; background: #efe3c6; }
    a { color: #8f2f24; } a:hover { color: #2b2418; }
    svg text { font-family: ${FACE}; }
    ${extraStyle}
  </style>
</helmet>
${body}
</x-dc>
</body>
</html>
`;
}

// ---- artboards ----
const SMOKES = ["billow", "flow", "fire", "drift"];
function viewBoard(v, mode) {
  const ink = v.ink;
  const board = (kind) => `<svg width="1120" height="650" viewBox="0 0 1120 650" xmlns="http://www.w3.org/2000/svg" style="display: block;">
${HATCH(ink)}
${scene(v, mode, { smoke: kind })}
${captionBand(v)}
</svg>`;
  if (mode === "atlas") return page(v.name, `<div style="width: 1120px; height: 650px; background: ${v.letterbox}; overflow: hidden;">${board("billow")}</div>`);
  // One artboard, four engaged treatments behind a switch, so each is judged in the whole scene.
  const branches = SMOKES.map((k) => `<sc-if value="{{ is_${k} }}" hint-placeholder-val="{{ ${k === "billow"} }}">${board(k)}</sc-if>`).join("\n");
  const script = `<script data-dc-script data-props='{"engaged":{"editor":"enum","options":["billow","flow","fire","drift"],"default":"billow","section":"Treatment"}}'>
class Component extends DCLogic {
  renderVals() {
    const k = this.props.engaged ?? "billow";
    return { is_billow: k === "billow", is_flow: k === "flow", is_fire: k === "fire", is_drift: k === "drift" };
  }
}
</script>`;
  return page(v.name, `<div style="width: 1120px; height: 650px; background: ${v.letterbox}; overflow: hidden;">${branches}</div>`).replace("</x-dc>", `</x-dc>\n${script}`);
}

writeFileSync("ChartPlate.dc.html", viewBoard(PLATE, "plate"));
writeFileSync("NightPlate.dc.html", viewBoard(NIGHT, "plate"));
writeFileSync("Atlas.dc.html", viewBoard(ATLAS, "atlas"));

// ---- treatments sheet: engaged glyph ×3, label anatomy, collapse order ----
function pair(smokeKind) {
  const v = PLATE, br = v.sides.British, cf = v.sides["Combined Fleet"];
  const g = (u) => smokeFor(smokeKind, u, v) + ticks({ ...u });
  return `<g transform="translate(70 70) rotate(100)">${g({ heading: 100, formation: "column", state: "engaged", colour: br, seed: 5 })}</g>` +
    `<g transform="translate(150 95) rotate(270)">${g({ heading: 270, formation: "line", state: "engaged", colour: cf, seed: 9 })}</g>`;
}
function card(x, y, w, h, title, body, inner) {
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" fill="#efe3c6" stroke="#2b2418" stroke-width="1"/>` +
    `<text x="14" y="18" font-size="15" fill="#2b2418" dominant-baseline="hanging">${title}</text>` +
    body.map((line, i) => `<text x="14" y="${h - 14 - (body.length - 1 - i) * 16}" font-size="12" font-style="italic" fill="#2b2418">${line}</text>`).join("") +
    `<g transform="translate(${w / 2 - 110} 30)">${inner}</g></g>`;
}
function labelCollapse() {
  const v = PLATE, br = v.sides.British, ink = v.ink;
  const g = `<g transform="rotate(100)">${smokeFor("billow", { heading: 100, formation: "column", state: "engaged", seed: 5 }, v)}${ticks({ formation: "column", state: "engaged", colour: br, seed: 5 })}</g>`;
  const steps = [
    ["0 · full", label(0, 44, "Weather column", "engaged · 90%", br, ink, "start")],
    ["1 · displaced, leader", label(30, -50, "Weather column", "engaged · 90%", br, ink, "start", { x1: 0, y1: 0, x2: 28, y2: -50 })],
    ["2 · percentage dropped", label(0, 44, "Weather column", "engaged", br, ink, "start")],
    ["3 · state dropped", `<text x="0" y="40" font-size="14" font-style="italic" fill="${br}" dominant-baseline="middle">Weather column</text>`],
    ["4 · short name", `<text x="0" y="40" font-size="14" font-style="italic" fill="${br}" dominant-baseline="middle">Weather</text>`],
    ["5 · numeral, keyed in the legend", `<circle cx="0" cy="42" r="8" fill="#efe3c6" stroke="${br}" stroke-width="1"/><text x="0" y="42.5" font-size="11" fill="${br}" text-anchor="middle" dominant-baseline="middle">1</text>`],
  ];
  return steps.map(([t, l], i) => `<g transform="translate(${60 + i * 175} 70)">${g}${l}<text x="-40" y="85" font-size="12" fill="${ink}">${t}</text></g>`).join("");
}
const TREATMENTS = page("Treatments",
  `<div style="width: 1120px; padding: 28px 32px; box-sizing: border-box; background: #efe3c6; display: flex; flex-direction: column; gap: 22px;">
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <div style="font-size: 22px;">Engaged: three engraved-ink treatments</div>
    <div style="font-size: 14px; font-style: italic;">The same two engaged units under each. Every treatment stays ink-on-paper: no glow, no colour but the side inks, nothing an engraver could not cut.</div>
  </div>
  <svg width="1056" height="230" viewBox="0 0 1056 230" xmlns="http://www.w3.org/2000/svg" style="display: block;">
    ${card(0, 0, 336, 230, "D · Billow", ["Outlined puffs merging into one cloud, hatched on the lee side.", "Reads: engraved gunsmoke, as the 1805 plans cut it. Blown by the wind.", "Costs: the busiest outline; needs care where two clouds meet."], pair("billow"))}
    ${card(360, 0, 336, 230, "E · Flow", ["Fine pen lines streaming to leeward, wavering as they go.", "Reads: smoke as an engraver’s flowing tint. Quietest; shows the wind.", "Costs: faint at a battle-wide extent; can read as current or hair."], pair("flow"))}
    ${card(720, 0, 336, 230, "F · Fire lines", ["Straight rules from each firing tick, downwind.", "Reads: lines of fire on a tactical diagram. Crisp; says who fires.", "Costs: no cloud, so a long action looks like a diagram, not a battle."], pair("fire"))}
  </svg>
  <svg width="1056" height="120" viewBox="0 0 1056 120" xmlns="http://www.w3.org/2000/svg" style="display: block;">
    ${card(0, 0, 336, 120, "v0.1 · Drift (rejected)", ["Alpha wash puffs: reads as airbrush, not as the pen."], `<g transform="translate(0 -10) scale(0.7)">${pair("drift")}</g>`)}
    <text x="360" y="30" font-size="13" font-style="italic" fill="#2b2418">Every treatment above is cut with the pen at 0.55 to 0.7px in ink, no tonal fill, and its drift follows the plate’s wind.</text>
    <text x="360" y="50" font-size="13" font-style="italic" fill="#2b2418">A broken unit gets the same treatment thinned. Switch the “engaged” chip on the Chart plate and Night plate to see each in the scene.</text>
  </svg>
  <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
    <div style="font-size: 22px;">The label and its leader</div>
    <div style="font-size: 14px; font-style: italic;">Name 14px italic in the side ink; beneath it the state word 12px upright in ink, with the percentage when strength is below 1. It sits on the glyph’s flank, 30px clear of the ticks, never ahead of the unit where the track and moves run. Displaced, it keeps a 0.8px leader from its near edge to a dot at the glyph’s centre.</div>
  </div>
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <div style="font-size: 18px;">Collapse order when the plate gets crowded</div>
    <div style="font-size: 14px; font-style: italic;">Each step is taken only when the one before still collides. Engaged units and units with a move keep their labels longest; among equals, roster order. Step 5 is the last resort and needs a per-frame numeral key in the legend, so it is a proposal for #39 to prove or reject.</div>
  </div>
  <svg width="1056" height="180" viewBox="0 0 1056 180" xmlns="http://www.w3.org/2000/svg" style="display: block;">${labelCollapse()}</svg>
</div>`);
writeFileSync("Treatments.dc.html", TREATMENTS);

// ---- phone ----
function phone() {
  const v = PLATE, ink = v.ink, br = v.sides.British, cf = v.sides["Combined Fleet"];
  // plate 390 wide: extent 350×245 at (20,20) after a 20px letterbox; the scene is scaled 350/1080
  const k = 350 / 1080;
  let s = `<rect width="390" height="285" fill="${v.letterbox}"/>`;
  s += `<g transform="translate(20 20) scale(${f(k)}) translate(-20 -20)"><clipPath id="pext"><rect x="20" y="20" width="1080" height="520"/></clipPath><g clip-path="url(#pext)">`;
  s += `<rect x="20" y="20" width="1080" height="520" fill="${v.paper}"/>${stipple(v, 7, 120)}<path d="${COAST}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="2"/>`;
  const big = (u) => (u.state !== "intact" ? smokeFor("billow", { ...u, length: 72 * 2.2 }, v, 2.2) : "") + ticks({ ...u, length: 72 * 2.2, scale: 2.2 });
  s += arrow({ x: 640, y: 345 }, { x: 745, y: 470 }, { ...DETACH(br), width: 4, headSize: 22 });
  s += arrow({ x: 700, y: 150 }, { x: 640, y: 60 }, { ...INTENT(ink), width: 2.6, dash: "16 10", headSize: 18 });
  for (const u of [
    { x: 700, y: 150, heading: 320, formation: "line", state: "intact", strength: 1, colour: cf, seed: 11 },
    { x: 600, y: 245, heading: 100, formation: "column", state: "engaged", strength: 1, colour: br, seed: 5 },
    { x: 760, y: 300, heading: 270, formation: "line", state: "engaged", strength: 1, colour: cf, seed: 9 },
    { x: 640, y: 345, heading: 105, formation: "column", state: "engaged", strength: 0.9, colour: br, seed: 6 },
    { x: 790, y: 425, heading: 270, formation: "line", state: "broken", strength: 0.4, colour: cf, seed: 8 },
  ]) s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading})">${big(u)}</g>`;
  s += `</g></g>`;
  // labels at phone size: collapse step 4 (short names), drawn unscaled
  const L = (x, y, t, c, a = "start") => `<text x="${x}" y="${y}" font-size="12" font-style="italic" fill="${c}" text-anchor="${a}" dominant-baseline="middle">${t}</text>`;
  const P = (x, y) => [20 + (x - 20) * k, 20 + (y - 20) * k];
  const [wx, wy] = P(600, 245), [lx, ly] = P(640, 345), [cx2, cy2] = P(760, 300), [rx, ry] = P(790, 425), [vx, vy] = P(700, 150);
  s += L(wx - 34, wy - 12, "Weather", br, "end") + L(lx - 30, ly + 18, "Lee", br, "end") + L(cx2 + 20, cy2, "Combined", cf) + L(rx + 18, ry, "Rear", cf) + L(vx - 30, vy - 6, "Van", cf, "end");
  s += `<g fill="none" stroke="${ink}" stroke-width="1"><rect x="20.5" y="20.5" width="349" height="244"/><rect x="24.5" y="24.5" width="341" height="236"/></g>`;
  // furniture, collapsed: N arrow + wind text in one line; scale bar; side strip instead of the legend; no title (it heads the band)
  s += `<g transform="translate(40 44)" stroke="${ink}" fill="${ink}"><path d="M0 -12 L3 4 L0 0 L-3 4 Z" stroke="none"/><text y="-16" font-size="10" text-anchor="middle" stroke="none">N</text></g>`;
  s += `<text x="54" y="42" font-size="11" font-style="italic" fill="${ink}" dominant-baseline="middle">Wind WNW, light</text>`;
  s += `<g stroke="${ink}" stroke-width="1.2"><line x1="34" y1="248" x2="84" y2="248"/><line x1="34" y1="244" x2="34" y2="252"/><line x1="84" y1="244" x2="84" y2="252"/></g><text x="34" y="240" font-size="10" font-style="italic" fill="${ink}">5 nmi</text>`;
  s += `<g transform="translate(248 244)"><rect x="-6" y="-9" width="122" height="18" fill="${v.panel}" stroke="${ink}" stroke-width="0.8"/><g transform="translate(6 0) rotate(90)">${ticks({ length: 18, colour: br, scale: 0.6 })}</g><text x="16" y="0.5" font-size="10" font-style="italic" fill="${br}" dominant-baseline="middle">British</text><g transform="translate(64 0) rotate(90)">${ticks({ length: 18, colour: cf, scale: 0.6 })}</g><text x="74" y="0.5" font-size="10" font-style="italic" fill="${cf}" dominant-baseline="middle">Combined</text></g>`;
  const band = `<rect x="0" y="285" width="390" height="150" fill="${v.paper}"/><g stroke="${ink}" stroke-width="1"><line x1="0" y1="285.5" x2="390" y2="285.5"/><line x1="0" y1="288.5" x2="390" y2="288.5"/></g>` +
    `<text x="14" y="300" font-size="20" fill="${ink}" dominant-baseline="hanging">12:00</text><text x="80" y="305" font-size="12" font-style="italic" fill="${ink}" dominant-baseline="hanging">21 October 1805 · The Battle of Trafalgar</text>` +
    `<text x="14" y="330" font-size="11" fill="${ink}" dominant-baseline="hanging" letter-spacing="0.5">ROYAL SOVEREIGN BREAKS THE REAR</text>` +
    ["The action begins at twelve o’clock: the Fougueux fires", "the first gun at the Royal Sovereign, which stands on", "alone for ten minutes under the fire of the enemy’s rear", "and then breaks through astern of the Santa Ana,", "engaging her at the muzzles of her guns."].map((t, i) => `<text x="14" y="${348 + i * 17}" font-size="13" fill="${ink}" dominant-baseline="hanging">${t}</text>`).join("");
  return page("Phone",
    `<div style="width: 390px; height: 844px; background: #efe3c6; display: flex; flex-direction: column; overflow: hidden;">
<svg width="390" height="435" viewBox="0 0 390 435" xmlns="http://www.w3.org/2000/svg" style="display: block; flex: none;">${s}${band}</svg>
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid rgba(43,36,24,0.55); font-size: 14px;">
  <div style="display: flex; align-items: center; height: 18px; border: 1px solid rgba(43,36,24,0.55); background: #e3d3ac; flex: 1 1 100%; position: relative;"><div style="position: absolute; left: 30%; top: 50%; width: 11px; height: 11px; margin: -6px 0 0 -6px; border: 1px solid #2b2418; border-radius: 50%; background: #efe3c6;"></div></div>
  <div style="border: 1px solid rgba(43,36,24,0.55); border-radius: 2px; padding: 4px 10px; min-height: 36px; box-sizing: border-box; display: flex; align-items: center;">⏮</div>
  <div style="border: 1px solid rgba(43,36,24,0.55); border-radius: 2px; padding: 4px 10px; min-width: 4em; min-height: 36px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;">Play</div>
  <div style="border: 1px solid rgba(43,36,24,0.55); border-radius: 2px; padding: 4px 10px; min-height: 36px; box-sizing: border-box; display: flex; align-items: center;">⏭</div>
  <div style="font-size: 17px; margin-left: auto; font-variant-numeric: tabular-nums;">12:00</div>
  <div style="border: 1px solid rgba(43,36,24,0.55); border-radius: 2px; padding: 4px 10px; min-height: 36px; box-sizing: border-box; display: flex; align-items: center;">1x</div>
  <div style="border: 1px solid rgba(43,36,24,0.55); border-radius: 2px; padding: 4px 10px; min-height: 36px; box-sizing: border-box; display: flex; align-items: center;">Details</div>
</div>
<div style="padding: 12px; font-size: 13px; line-height: 1.45; border-top: 1px solid rgba(43,36,24,0.55); display: flex; flex-direction: column; gap: 6px;">
  <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">What moved, and why</div>
  <div>Title leaves the plate for the band’s date line. Compass becomes a north arrow and the wind sentence. Legend becomes a one-line strip of the sides; states and line styles live in Details. Labels start at collapse step 4 (short names). Credit line goes to Details. The scale bar stays.</div>
</div>
</div>`);
}
writeFileSync("Phone.dc.html", phone());

// ---- Main: the system sheet ----
function swatch(c, name, val, dark = false) {
  return `<div style="display: flex; flex-direction: column; gap: 4px; width: 132px;"><div style="height: 56px; background: ${c}; border: 1px solid rgba(43,36,24,0.55);"></div><div style="font-size: 13px;">${name}</div><div style="font-size: 11px; font-style: italic; opacity: 0.8;">${val}</div></div>`;
}
const MAIN = page("Design language",
  `<div style="width: 760px; padding: 32px 36px; box-sizing: border-box; background: #efe3c6; display: flex; flex-direction: column; gap: 26px;">
  <div style="display: flex; flex-direction: column; gap: 6px;">
    <div style="font-size: 30px;">Sandtable · the design language</div>
    <div style="font-size: 15px; font-style: italic;">One engraved system. A view is a named treatment built from it, never a second aesthetic. Values below are the v0.1 renderer’s (src/render/style.ts), promoted to the rule.</div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 20px;">Materials</div>
    <div style="display: flex; flex-wrap: wrap; gap: 14px;">
      ${swatch("#efe3c6", "Paper (sea)", "#efe3c6")}
      ${swatch("#e3d3ac", "Land, sunk", "#e3d3ac")}
      ${swatch("#d9c8a2", "Letterbox", "#d9c8a2")}
      ${swatch("#2b2418", "Ink", "#2b2418")}
      ${swatch("#8f2f24", "Side 1, red ink", "#8f2f24")}
      ${swatch("#24406b", "Side 2, blue ink", "#24406b")}
      ${swatch("#3e5a2a", "Side 3", "#3e5a2a")}
      ${swatch("#6b4a1e", "Side 4", "#6b4a1e")}
      ${swatch("rgba(60,55,50,0.13)", "Smoke wash", "rgba(60,55,50,.13)")}
      ${swatch("rgba(43,36,24,0.55)", "Rule", "ink at .55")}
    </div>
    <div style="font-size: 13px; font-style: italic;">Sides are coloured by roster order, never by data. Side inks are hues that must survive a ground change: a view that changes the paper re-tunes the inks (see Night plate) but keeps the order and the hue family.</div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 20px;">Line weights</div>
    <svg width="688" height="150" viewBox="0 0 688 150" xmlns="http://www.w3.org/2000/svg" style="display: block;">
      <g fill="#2b2418" font-size="12" font-style="italic">
        <line x1="0" y1="12" x2="120" y2="12" stroke="#2b2418" stroke-width="1"/><text x="140" y="16">1 · plate rule (doubled, 5px apart), rose, legend box, coastline</text>
        <line x1="0" y1="38" x2="120" y2="38" stroke="#2b2418" stroke-width="1.4"/><text x="140" y="42">1.4 · ship tick, wind arrow</text>
        ${arrow({ x: 0, y: 64 }, { x: 120, y: 64 }, TRACK("#2b2418"))}<text x="140" y="68">1.2 dotted [0.1, 4] · track, open head 7</text>
        ${arrow({ x: 0, y: 90 }, { x: 120, y: 90 }, INTENT("#2b2418"))}<text x="140" y="94">1.2 dashed [8, 5] · intent, open head 9</text>
        ${arrow({ x: 0, y: 116 }, { x: 120, y: 116 }, DETACH("#8f2f24"))}<text x="140" y="120">1.8 solid, side ink · detachment, filled head 11</text>
        <line x1="0" y1="142" x2="120" y2="142" stroke="#2b2418" stroke-width="0.8"/><text x="140" y="146">0.8 · label leader, ending in a 1.6 dot</text>
      </g>
    </svg>
  </div>

  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 20px;">Type · IM Fell English, one face, upright and italic</div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 24px; font-size: 13px;">
      <div style="font-size: 26px;">26 · clock</div><div style="font-size: 22px;">22 · plate title</div>
      <div style="font-size: 15px;">15 · caption</div><div style="font-size: 14px; font-style: italic; color: #8f2f24;">14 italic, side ink · unit name</div>
      <div style="font-size: 13px; font-style: italic;">13 italic · wind, date, place names</div><div style="font-size: 12px;">12 · state word, phase label (caps, +0.5 tracking)</div>
      <div style="font-size: 12px; font-style: italic;">12 italic · legend, scale bar, sources</div><div style="font-size: 11px; font-style: italic;">11 italic · credit line</div>
    </div>
    <div style="font-size: 13px; font-style: italic;">Italic is for names and asides (a place, the wind, a source); upright is for facts (the clock, a state, the caption). No bold anywhere: emphasis is size and ink, as on a plate.</div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 10px;">
    <div style="font-size: 20px;">What a view may and may not change</div>
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
      <div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid #2b2418;">
        <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Fixed across views</div>
        <div style="font-size: 13px; line-height: 1.4;">The typeface and the type ramp. Side order and hue family. The furniture set and its corners: rose top-left, title top-right, scale and legend bottom-left, credit bottom-right, the caption band below. The glyph’s meaning: formation is arrangement, state is one of four words, strength is the shown fraction. Three motion styles that stay tellable apart when overlaid. North up. No glow, no badge, no data-driven colour.</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border: 1px solid #2b2418;">
        <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">A view owns</div>
        <div style="font-size: 13px; line-height: 1.4;">Paper and ink values, and the side inks re-tuned to them. How a unit is drawn (ticks or a block) and how engaged is shown. Line weights, within the ramp’s proportions. Whether the sea is stippled. The label style, keeping the two-line anatomy and the collapse order. Nothing the schema does not carry: a view cannot show a ship count or a unit type it was not given.</div>
      </div>
    </div>
  </div>
</div>`);
writeFileSync("Main.dc.html", MAIN);

const canvas = {
  artboards: [
    { file: "Main.dc.html", x: 0, y: 0, w: 760, h: 1180, title: "The system" },
    { file: "ChartPlate.dc.html", x: 860, y: 0, w: 1120, h: 650, title: "Chart plate · default view (reference)" },
    { file: "Treatments.dc.html", x: 860, y: 790, w: 1120, h: 760, title: "Treatments · engaged, labels, collapse order" },
    { file: "NightPlate.dc.html", x: 2080, y: 0, w: 1120, h: 650, title: "Candidate second view · Night plate" },
    { file: "Atlas.dc.html", x: 2080, y: 790, w: 1120, h: 650, title: "Candidate second view · Atlas" },
    { file: "Phone.dc.html", x: 3300, y: 0, w: 390, h: 844, title: "Phone · 390 wide" },
  ],
  annotations: [
    { id: "night-note", x: 2080, y: -150, w: 520, text: "NIGHT PLATE: the broadcast variant rebuilt in the system. Same plate, inverted: parchment ink on an indigo ground, side inks lifted to read on it, smoke as a pale wash.\nFor: the Nile is fought after dark, and this reads across a room. Against: loses the document feel; prints badly." },
    { id: "atlas-note", x: 2080, y: 640, w: 520, text: "ATLAS: the replay variant rebuilt in ink. Units as solid blocks with a heading nose, strength as the filled fraction, engaged as a hatched zone, thicker arrows.\nFor: mass and motion at a glance; Cannae’s envelopment is blocks and arrows. Against: closest to the game the concept rules out; no per-ship ticks." },
    { id: "pick-note", x: 3300, y: 900, w: 390, text: "TO DECIDE: (1) which engaged treatment, D Billow, E Flow or F Fire lines (switch the chip on the Chart plate); (2) which second view, Night plate or Atlas, or both; (3) whether collapse step 5 (numerals) is allowed; (4) the phone furniture collapse as drawn." },
    { id: "smoke-note", x: 860, y: -150, w: 520, text: "ENGAGED, REDRAWN: the v0.1 wash puffs read as airbrush. The three treatments here are all cut with the pen and blown by the plate’s wind. The chip above this artboard switches between them; the Treatments sheet below sets them side by side." },
  ],
  launch: { view: "canvas" },
};
writeFileSync("canvas.json", JSON.stringify(canvas, null, 2));
console.log("wrote artboards");

// dev only: the three pairs at 3x for inspection; not seeded
writeFileSync("zoom.html", `<!doctype html><body style="margin:0;background:#efe3c6"><svg width="1150" height="420" viewBox="0 0 1150 420">${["billow","flow","fire"].map((k,i)=>`<g transform="translate(${i*380} 20) scale(3)">${pair(k)}</g>`).join("")}</svg></body>`);
