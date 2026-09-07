// Shared drawing helpers for the design-language canvas. Materials, glyphs, smoke, arrows, labels
// and furniture, lifted from src/render/style.ts and player.css. build.mjs (the v0.2 design language)
// and build-v2.mjs (the v2 map features) both draw from here so the two sets of artboards stay one system.

export const FONT = `<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&amp;display=swap" rel="stylesheet">`;
export const FACE = `"IM Fell English", Georgia, "Times New Roman", serif`;

// ---- the plate's materials ----
export const PLATE = {
  name: "Chart plate",
  ink: "#2b2418", paper: "#efe3c6", land: "#e3d3ac", letterbox: "#d9c8a2", panel: "rgba(239,227,198,0.92)",
  rule: "rgba(43,36,24,0.55)", smoke: "rgba(60,55,50,0.13)", stipple: "rgba(43,36,24,0.10)",
  sides: { British: "#8f2f24", "Combined Fleet": "#24406b" },
  coastStroke: "#2b2418",
};
export const NIGHT = {
  name: "Night plate",
  ink: "#efe3c6", paper: "#1b2430", land: "#2a3340", letterbox: "#111820", panel: "rgba(27,36,48,0.92)",
  rule: "rgba(239,227,198,0.55)", smoke: "rgba(239,227,198,0.16)", stipple: "rgba(239,227,198,0.07)",
  sides: { British: "#e2685a", "Combined Fleet": "#86a9e8" },
  coastStroke: "#a9b6c6",
};
export const ATLAS = {
  name: "Atlas",
  ink: "#2b2418", paper: "#efe3c6", land: "#e3d3ac", letterbox: "#d9c8a2", panel: "rgba(239,227,198,0.92)",
  rule: "rgba(43,36,24,0.55)", smoke: "rgba(60,55,50,0.13)", stipple: "rgba(43,36,24,0.0)",
  sides: { British: "#8f2f24", "Combined Fleet": "#24406b" },
  coastStroke: "#2b2418",
};

export function seeded(seed) {
  let s = (Math.abs(Math.floor(seed)) * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
export const f = (n) => Number(n.toFixed(2));

// ---- glyph: eight chevron ticks, column along the heading, line abreast; drawn heading up, then rotated ----
export function ticks({ length = 72, formation = "column", state = "intact", strength = 1, colour, seed = 1, scale = 1 }) {
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

// Smoke in engraved treatments. All drawn heading-up at the origin like the ticks.
export function smokeDrift(length, state, seed, colour, scale = 1) {
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

// ---- engraved smoke: three treatments cut with the pen, all blown to leeward. `lee` is the wind's
// heading-to in the glyph's local frame (0 = up the glyph's heading), so the drift follows the plate's wind.
export const leeVec = (leeDeg) => { const r = (leeDeg * Math.PI) / 180; return { x: Math.sin(r), y: -Math.cos(r) }; };
export const perp = (v) => ({ x: -v.y, y: v.x });

// D · Billow: outlined puffs whose overlaps merge into one cloud (each puff filled paper over the last),
// shaded with three chords of hatching on the lee side of every puff, as an engraver shades a cloud.
export function smokeBillow(length, seed, ink, paper, leeDeg, scale = 1, thin = false) {
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
export function smokeFlow(length, seed, ink, leeDeg, scale = 1, thin = false) {
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
export function smokeFire(length, seed, ink, leeDeg, scale = 1, thin = false) {
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
// Trafalgar's wind blows toward 112 (from WNW). In a glyph's local frame that is windTo minus its heading.
export const WIND_TO = 112;
// Smoke is authored along the column axis (ticks along y). For a line the ticks lie along x, so rotate.
export function smokeFor(kind, u, v, scale = 1, windTo = WIND_TO) {
  const thin = u.state === "broken";
  // The drift keeps to the lee flank: the wind's across-hull component is never less than about half,
  // and its along-hull component is damped, so smoke clears the ticks even when a ship runs downwind.
  const raw = ((windTo - u.heading + (u.formation === "line" ? -90 : 0)) * Math.PI) / 180;
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

export function arrow(a, b, { colour, width, dash = "", head, headSize }) {
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
export const TRACK = (ink) => ({ colour: ink, width: 1.2, dash: "0.1 4", head: "open", headSize: 7 });
export const INTENT = (ink) => ({ colour: ink, width: 1.2, dash: "8 5", head: "open", headSize: 9 });
export const DETACH = (c) => ({ colour: c, width: 1.8, head: "filled", headSize: 11 });

export function label(x, y, name, detail, colour, ink, align = "start", leader) {
  const lead = leader ? `<line x1="${leader.x1}" y1="${leader.y1}" x2="${leader.x2}" y2="${leader.y2}" stroke="${ink}" stroke-width="0.8"/><circle cx="${leader.x1}" cy="${leader.y1}" r="1.6" fill="${ink}"/>` : "";
  return `${lead}<text x="${x}" y="${y - 8}" font-size="14" font-style="italic" fill="${colour}" text-anchor="${align}" dominant-baseline="middle">${name}</text>` +
    `<text x="${x}" y="${y + 8}" font-size="12" fill="${ink}" text-anchor="${align}" dominant-baseline="middle">${detail}</text>`;
}

// ---- Atlas glyph: a solid block, strength as the filled fraction, hatch when engaged ----
export function block({ length = 72, formation = "column", state, strength = 1, colour, ink }) {
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
export function compass(cx, cy, ink, windFrom = 292, feathers = 1, big = true, windText = "Wind WNW, light") {
  const R = 30;
  let out = `<g transform="translate(${cx} ${cy})" stroke="${ink}" fill="${ink}" stroke-width="1"><circle r="${R}" fill="none"/><circle r="3" stroke="none"/>`;
  for (let i = 0; i < 16; i++) out += `<line x1="0" y1="${-R}" x2="0" y2="${i % 4 === 0 ? -20 : -25}" transform="rotate(${i * 22.5})"/>`;
  out += `<path d="M0 -42 L4 -8 L0 0 L-4 -8 Z" stroke="none"/><text y="-46" font-size="13" text-anchor="middle" stroke="none" fill="${ink}">N</text>`;
  const tail = R + 26, head = -(R + 14);
  out += `<g transform="rotate(${windFrom + 180})" stroke-width="1.4" stroke-linecap="round" fill="none"><line x1="0" y1="${tail}" x2="0" y2="${head}"/><path d="M-5 ${head + 8} L0 ${head} L5 ${head + 8}"/>`;
  for (let i = 0; i < feathers; i++) out += `<line x1="0" y1="${tail - 2 - i * 6}" x2="-8" y2="${tail + 3 - i * 6}"/>`;
  out += `</g></g>`;
  if (big) out += `<text x="${cx + R + 34}" y="${cy - 8}" font-size="13" font-style="italic" fill="${ink}" dominant-baseline="hanging">${windText}</text>`;
  return out;
}
export function scaleBar(x, y, ink, px = 100, text = "5 nautical miles") {
  let out = `<g stroke="${ink}" stroke-width="1.5"><line x1="${x}" y1="${y}" x2="${x + px}" y2="${y}"/><line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 5}"/><line x1="${x + px}" y1="${y - 5}" x2="${x + px}" y2="${y + 5}"/>`;
  for (let i = 1; i < 5; i++) out += `<line x1="${x + (px * i) / 5}" y1="${y - 3}" x2="${x + (px * i) / 5}" y2="${y + 3}"/>`;
  out += `</g><text x="${x}" y="${y - 8}" font-size="12" font-style="italic" fill="${ink}">${text}</text>`;
  return out;
}
export function legend(x, bottom, v, glyphFn) {
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

export const HATCH = (ink) => `<defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="${ink}" stroke-width="0.9" stroke-opacity="0.55"/></pattern></defs>`;

// The caption band: clock and date left, phase label, caption lines and the sources line right.
export function captionBandFor(v, { clock, date, phase, lines, sources }, w = 1120, top = 560, h = 90) {
  const ink = v.ink;
  return `<rect x="0" y="${top}" width="${w}" height="${h}" fill="${v.paper}"/>` +
    `<g stroke="${ink}" stroke-width="1"><line x1="0" y1="${top + 0.5}" x2="${w}" y2="${top + 0.5}"/><line x1="0" y1="${top + 3.5}" x2="${w}" y2="${top + 3.5}"/></g>` +
    `<text x="24" y="${top + 16}" font-size="26" fill="${ink}" dominant-baseline="hanging">${clock}</text>` +
    `<text x="24" y="${top + 50}" font-size="13" font-style="italic" fill="${ink}" dominant-baseline="hanging">${date}</text>` +
    `<text x="174" y="${top + 14}" font-size="12" fill="${ink}" dominant-baseline="hanging" letter-spacing="0.5">${phase}</text>` +
    lines.map((t, i) => `<text x="174" y="${top + 32 + i * 20}" font-size="15" fill="${ink}" dominant-baseline="hanging">${t}</text>`).join("") +
    `<text x="174" y="${top + 72}" font-size="12" font-style="italic" fill="${ink}" dominant-baseline="hanging">${sources}</text>`;
}
export function captionBand(v, w = 1120, top = 560, h = 90) {
  return captionBandFor(v, {
    clock: "12:00", date: "21 October 1805", phase: "ROYAL SOVEREIGN BREAKS THE REAR",
    lines: [
      "The action begins at twelve o’clock: the Fougueux fires the first gun at the Royal Sovereign, which stands on alone for ten minutes",
      "under the fire of the enemy’s rear and then breaks through astern of the Santa Ana, engaging her at the muzzles of her guns.",
    ],
    sources: "— Collingwood’s dispatch, Mahan, Southey, Dodd’s plan (1805)",
  }, w, top, h);
}

export function page(title, body, extraStyle = "") {
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

// A card on a treatments sheet: a titled box, a drawing inside, and italic notes along the bottom.
export function card(x, y, w, h, title, body, inner, innerX = w / 2 - 110) {
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" fill="#efe3c6" stroke="#2b2418" stroke-width="1"/>` +
    `<text x="14" y="18" font-size="15" fill="#2b2418" dominant-baseline="hanging">${title}</text>` +
    body.map((line, i) => `<text x="14" y="${h - 14 - (body.length - 1 - i) * 16}" font-size="12" font-style="italic" fill="#2b2418">${line}</text>`).join("") +
    `<g transform="translate(${innerX} 30)">${inner}</g></g>`;
}
