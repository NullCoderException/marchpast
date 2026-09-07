// The two Midway frames #140 asks for, drawn whole on the chart plate: the first strike going in, and
// the moment four carriers burn. The point of drawing them whole rather than on a sample sheet is that
// a sign is only decided at a crowded extent — the aircraft sign has to hold against the ship's chevron
// when both are on the same square inch of paper, which is exactly what happens at 10:25.
//
// Nothing here is geo-registered. As on the terrain canvas (#138) and the staff-map canvas (#139) these
// are scenes, not map files: the atoll, the reef and every position are drawn to read, not to survey.

import {
  PLATE, NIGHT, f, arrow, TRACK, INTENT, DETACH, captionBandFor, compass, scaleBar, HATCH,
} from "./lib.mjs";
import { seaSvg } from "./terrain.mjs";
import { catmull } from "./ground.mjs";
import { plateGlyph, billow, surfaceDrift, atlasGlyph, GLYPH_PX } from "./aircraft.mjs";

export const EXT = { x: 20, y: 20, w: 1080, h: 520 };
export const PLATE_W = 1120, BAND_TOP = 560, PLATE_H = 650;

// The atoll and its reef. Natural Earth 10m carries both, so an open-ocean map needs no tracing (#124).
const ATOLL = catmull([[312, 408], [330, 400], [348, 408], [354, 424], [340, 436], [320, 434], [308, 422], [312, 408]]);
const REEF = catmull([[292, 398], [330, 382], [368, 400], [378, 428], [354, 454], [314, 454], [284, 430], [292, 398]]);

/** Midway blows from the south-east all day; the plate's wind is a heading-to and a five-word force. */
export const WIND_TO = 308;

function ground(v) {
  let s = seaSvg(v === NIGHT ? "faint" : "mottle", v, EXT);
  // The reef as ADR-0012's shoal: a dotted band inside a fine line, the way a chart draws foul ground.
  s += `<path d="${REEF.d}" fill="none" stroke="${v.coastStroke}" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.75"/>`;
  s += `<path d="${ATOLL.d}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1.2"/>`;
  s += `<text x="366" y="430" font-size="12" font-style="italic" fill="${v.ink}" dominant-baseline="middle">Midway</text>`;
  s += `<text x="366" y="446" font-size="11" fill="${v.ink}" fill-opacity="0.8" dominant-baseline="middle">Sand and Eastern Islands</text>`;
  return s;
}

// ---------------------------------------------------------------------------------------------------
// The two frames. `arm: "aircraft"` units are strikes; `aboard` marks one drawn at its carrier's
// position, which is what ADR-0024's launch and recovery phases put on the plate.
// ---------------------------------------------------------------------------------------------------
export const FRAMES = {
  first: {
    title: "The Battle of Midway",
    band: {
      clock: "07:05", date: "4 June 1942",
      phase: "THE ATOLL'S STRIKE GOES IN",
      lines: [
        "The six Avengers and four Marauders sent out from Eastern Island attack the Kidō Butai without fighter escort and without a hit;",
        "seven do not come back. Tomonaga's Midway strike is an hour from home, and Spruance has begun to range his own on deck.",
      ],
      sources: "— CINCPAC 01849, COMBAT NARRATIVE (1943), NAGUMO REPORT (1947)",
    },
    units: [
      { id: "akagi", x: 592, y: 214, heading: 60, formation: "column", arm: "ship", state: "intact", strength: 1, side: 1, name: "Akagi", fact: "intact", lx: 528, ly: 146, align: "end", seed: 3 },
      { id: "kaga", x: 628, y: 252, heading: 60, formation: "column", arm: "ship", state: "intact", strength: 1, side: 1, name: "Kaga", fact: "intact", lx: 676, ly: 268, align: "start", seed: 5 },
      { id: "soryu", x: 552, y: 258, heading: 62, formation: "column", arm: "ship", state: "intact", strength: 1, side: 1, name: "Sōryū", fact: "intact", lx: 500, ly: 276, align: "end", seed: 7 },
      { id: "hiryu", x: 586, y: 300, heading: 58, formation: "column", arm: "ship", state: "intact", strength: 1, side: 1, name: "Hiryū", fact: "intact", lx: 618, ly: 338, align: "start", seed: 9 },
      { id: "midway-strike", x: 578, y: 172, heading: 42, formation: "line", arm: "aircraft", state: "engaged", strength: 0.6, side: 0, name: "Eastern Island strike", fact: "engaged · 60%", lx: 452, ly: 118, align: "end", leader: true, seed: 11 },
      { id: "tomonaga", x: 452, y: 356, heading: 44, formation: "mass", arm: "aircraft", state: "intact", strength: 0.85, side: 1, name: "Tomonaga's strike", fact: "returning · 85%", lx: 386, ly: 320, align: "end", leader: true, seed: 13 },
      { id: "midway-air", x: 338, y: 466, heading: 30, formation: "mass", arm: "aircraft", state: "broken", strength: 0.35, side: 0, name: "Midway's air group", fact: "broken · 35%", lx: 404, ly: 486, align: "start", seed: 15 },
      { id: "tf16", x: 934, y: 158, heading: 232, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Task Force 16", fact: "intact", lx: 976, ly: 122, align: "start", seed: 17 },
      // The aboard case: Enterprise's strike is ranged on deck, so ADR-0024 gives it TF16's position.
      { id: "eb", x: 934, y: 158, heading: 232, formation: "column", arm: "aircraft", state: "intact", strength: 1, side: 0, name: "Enterprise strike", fact: "ranging on deck", lx: 1054, ly: 236, align: "end", aboard: true, seed: 19 },
      { id: "tf17", x: 1006, y: 320, heading: 236, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Task Force 17", fact: "intact", lx: 966, ly: 380, align: "end", seed: 21 },
    ],
    moves: [
      { kind: "track", a: { x: 372, y: 452 }, b: { x: 556, y: 200 }, side: 0 },
      { kind: "track", a: { x: 560, y: 428 }, b: { x: 466, y: 372 }, side: 1 },
      { kind: "intent", a: { x: 906, y: 186 }, b: { x: 706, y: 246 }, side: 0 },
    ],
  },

  burning: {
    title: "The Battle of Midway",
    band: {
      clock: "10:25", date: "4 June 1942",
      phase: "THE DIVE BOMBERS COME DOWN",
      lines: [
        "Nagumo has turned north-east to close Spruance and is re-arming for a second strike when the Enterprise and Yorktown squadrons",
        "come down out of a clear sky. In six minutes the Kaga, the Akagi and the Sōryū are burning; only the Hiryū is left able to fly off.",
      ],
      sources: "— CINCPAC 01849, COMBAT NARRATIVE (1943), NAGUMO REPORT (1947)",
    },
    units: [
      { id: "akagi", x: 604, y: 220, heading: 66, formation: "column", arm: "ship", state: "broken", strength: 0.4, side: 1, name: "Akagi", fact: "broken · 40%", lx: 566, ly: 180, align: "end", seed: 3 },
      { id: "kaga", x: 646, y: 262, heading: 66, formation: "column", arm: "ship", state: "broken", strength: 0.3, side: 1, name: "Kaga", fact: "broken · 30%", lx: 700, ly: 282, align: "start", seed: 5 },
      { id: "soryu", x: 562, y: 268, heading: 68, formation: "column", arm: "ship", state: "broken", strength: 0.35, side: 1, name: "Sōryū", fact: "broken · 35%", lx: 496, ly: 292, align: "end", seed: 7 },
      { id: "hiryu", x: 700, y: 140, heading: 44, formation: "column", arm: "ship", state: "intact", strength: 1, side: 1, name: "Hiryū, standing on", fact: "intact", lx: 738, ly: 106, align: "start", seed: 9 },
      { id: "eb", x: 596, y: 176, heading: 200, formation: "line", arm: "aircraft", state: "engaged", strength: 1, side: 0, name: "Enterprise dive bombers", fact: "engaged", lx: 448, ly: 128, align: "end", leader: true, seed: 11 },
      { id: "yb", x: 630, y: 330, heading: 340, formation: "line", arm: "aircraft", state: "engaged", strength: 0.85, side: 0, name: "Yorktown dive bombers", fact: "engaged · 85%", lx: 664, ly: 404, align: "start", leader: true, seed: 13 },
      { id: "vt3", x: 508, y: 196, heading: 78, formation: "line", arm: "aircraft", state: "destroyed", strength: 0, side: 0, name: "Torpedo Three", fact: "destroyed", lx: 434, ly: 188, align: "end", seed: 15 },
      { id: "midway-air", x: 338, y: 466, heading: 30, formation: "mass", arm: "aircraft", state: "broken", strength: 0.3, side: 0, name: "Midway's air group", fact: "broken · 30%", lx: 404, ly: 486, align: "start", seed: 17 },
      { id: "tf16", x: 964, y: 148, heading: 244, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Task Force 16", fact: "intact", lx: 1004, ly: 114, align: "start", seed: 19 },
      { id: "tf17", x: 1016, y: 316, heading: 248, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Task Force 17", fact: "intact", lx: 972, ly: 376, align: "end", seed: 21 },
    ],
    moves: [
      { kind: "track", a: { x: 902, y: 178 }, b: { x: 636, y: 200 }, side: 0 },
      { kind: "track", a: { x: 940, y: 300 }, b: { x: 672, y: 314 }, side: 0 },
      { kind: "detachment", a: { x: 668, y: 168 }, b: { x: 728, y: 92 }, side: 1 },
    ],
  },
};

// ---------------------------------------------------------------------------------------------------
// The plate's legend, with the arm rows ADR-0015 keys when the roster holds two or more. This is the
// sheet the sign has to survive: at legend scale the aircraft sign sits one row under the ship's, and
// if the two cannot be told apart there, the sign has failed whatever it does at full size.
// ---------------------------------------------------------------------------------------------------
export function plateLegend(x, bottom, v, sides, arms, candidate) {
  const rows = sides.length + 4 + arms.length;
  const H = rows * 18 + 16, W = 186, y = bottom - H;
  let s = `<rect x="${x}" y="${f(y)}" width="${W}" height="${H}" fill="${v.panel}" stroke="${v.ink}" stroke-width="1"/>`;
  let ry = y + 8 + 9;
  const tx = x + 12 + 40 + 10, sx = x + 12 + 20;
  const sample = (opts) =>
    `<g transform="translate(${sx} ${f(ry)}) rotate(90)">${plateGlyph({ length: 34, formation: "column", scale: 0.75, candidate, seed: 4, ...opts })}</g>`;
  for (const [name, colour] of sides) {
    s += sample({ arm: arms[0] ?? "ship", state: "intact", strength: 1, colour }) +
      `<text x="${tx}" y="${f(ry)}" font-size="12" font-style="italic" fill="${colour}" dominant-baseline="middle">${name}</text>`;
    ry += 18;
  }
  for (const st of ["intact", "engaged", "broken", "destroyed"]) {
    s += sample({ arm: arms[0] ?? "ship", state: st, strength: st === "broken" ? 0.4 : 1, colour: v.ink }) +
      `<text x="${tx}" y="${f(ry)}" font-size="12" font-style="italic" fill="${v.ink}" dominant-baseline="middle">${st}</text>`;
    ry += 18;
  }
  for (const arm of arms) {
    s += sample({ arm, state: "intact", strength: 1, colour: v.ink }) +
      `<text x="${tx}" y="${f(ry)}" font-size="12" font-style="italic" fill="${v.ink}" dominant-baseline="middle">${arm}</text>`;
    ry += 18;
  }
  return s;
}

// ---------------------------------------------------------------------------------------------------
// One frame, drawn whole.
// ---------------------------------------------------------------------------------------------------
export function plateFrame(key, { v = PLATE, candidate = "A", drift = "surface", aboard = "author", w = PLATE_W, h = PLATE_H, bandTop = BAND_TOP } = {}) {
  const F = FRAMES[key];
  const ink = v.ink;
  const sides = [["United States", v.sides.British], ["Japan", v.sides["Combined Fleet"]]];
  const colourOf = (u) => (u.side === 0 ? sides[0][1] : sides[1][1]);

  let s = `<rect width="${w}" height="${bandTop}" fill="${v.letterbox}"/>`;
  s += HATCH(ink);
  s += `<clipPath id="ext"><rect x="${EXT.x}" y="${EXT.y}" width="${EXT.w}" height="${EXT.h}"/></clipPath>`;
  s += `<g clip-path="url(#ext)">`;
  s += ground(v);

  for (const m of F.moves) {
    const pen = m.kind === "track" ? TRACK(ink) : m.kind === "intent" ? INTENT(ink) : DETACH(m.side === 0 ? sides[0][1] : sides[1][1]);
    s += arrow(m.a, m.b, pen);
  }

  // A strike drawn at its carrier's position is nudged clear when `aboard` is "author": nothing in the
  // renderer moves it, the author does, which is the cheapest of the three ways out.
  const at = (u) => (u.aboard && aboard === "author" ? { x: u.x + 13, y: u.y + 9 } : { x: u.x, y: u.y });

  // Every mark before any body, so a melee does not erase itself (view.ts).
  for (const u of F.units) {
    if (u.state !== "engaged" && u.state !== "broken") continue;
    const p = at(u);
    const deg = u.arm === "aircraft" && drift === "astern" ? 180 : surfaceDrift(WIND_TO, u.heading, u.formation);
    s += `<g transform="translate(${p.x} ${p.y}) rotate(${u.heading})">` +
      billow({ formation: u.formation, state: u.state, seed: u.seed, ink, paper: v.paper, driftDeg: deg }) + `</g>`;
  }
  for (const u of F.units) {
    const p = at(u);
    s += `<g transform="translate(${p.x} ${p.y}) rotate(${u.heading})">` +
      plateGlyph({ formation: u.formation, arm: u.arm, state: u.state, strength: u.strength, colour: colourOf(u), seed: u.seed, candidate }) + `</g>`;
  }
  for (const u of F.units) {
    const c = colourOf(u);
    const p = at(u);
    const lead = u.leader
      ? `<line x1="${f(p.x)}" y1="${f(p.y)}" x2="${u.lx + (u.align === "end" ? 8 : -8)}" y2="${u.ly}" stroke="${ink}" stroke-width="0.8" stroke-opacity="0.8"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r="1.6" fill="${ink}"/>`
      : "";
    s += lead +
      `<text x="${u.lx}" y="${u.ly - 8}" font-size="14" font-style="italic" fill="${c}" text-anchor="${u.align}" dominant-baseline="middle">${u.name}</text>` +
      `<text x="${u.lx}" y="${u.ly + 8}" font-size="12" fill="${ink}" text-anchor="${u.align}" dominant-baseline="middle">${u.fact}</text>`;
  }
  s += `</g>`;

  // The doubled hairline the plate rules round its picture.
  s += `<g fill="none" stroke="${ink}"><rect x="${EXT.x + 0.5}" y="${EXT.y + 0.5}" width="${EXT.w - 1}" height="${EXT.h - 1}" stroke-width="1"/>` +
    `<rect x="${EXT.x + 3.5}" y="${EXT.y + 3.5}" width="${EXT.w - 7}" height="${EXT.h - 7}" stroke-width="0.6"/></g>`;

  s += `<rect x="${EXT.x + 14}" y="${EXT.y + 14}" width="252" height="112" fill="${v.panel}" stroke="${ink}" stroke-width="0.8"/>`;
  s += compass(EXT.x + 70, EXT.y + 66, ink, 128, 1, false);
  s += `<text x="${EXT.x + 122}" y="${EXT.y + 52}" font-size="13" font-style="italic" fill="${ink}" dominant-baseline="hanging">Wind SE,</text>`;
  s += `<text x="${EXT.x + 122}" y="${EXT.y + 70}" font-size="13" font-style="italic" fill="${ink}" dominant-baseline="hanging">moderate</text>`;

  s += `<text x="${EXT.x + EXT.w - 22}" y="${EXT.y + 30}" font-size="19" fill="${ink}" text-anchor="end" letter-spacing="0.5">${F.title}</text>`;

  s += `<rect x="${EXT.x + 22}" y="${EXT.y + EXT.h - 66}" width="236" height="44" fill="${v.panel}" stroke="${ink}" stroke-width="0.8"/>`;
  s += scaleBar(EXT.x + 34, EXT.y + EXT.h - 30, ink, 120, "60 nautical miles");

  s += plateLegend(EXT.x + 22, EXT.y + EXT.h - 76, v, sides, ["ship", "aircraft"], candidate);

  s += `<text x="${EXT.x + EXT.w - 22}" y="${EXT.y + EXT.h - 22}" font-size="11" font-style="italic" fill="${ink}" fill-opacity="0.85" text-anchor="end">Atoll and reef: Natural Earth 10m (public domain)</text>`;

  s += captionBandFor(v, F.band, w, bandTop, h - bandTop);
  return s;
}

/** The same frame in Atlas's hand, for the board that asks what the block's arm mark does at a melee. */
export function atlasFrame(key, { candidate = "A", w = PLATE_W, h = PLATE_H, bandTop = BAND_TOP } = {}) {
  const F = FRAMES[key];
  const v = { ...PLATE, stipple: "rgba(43,36,24,0)" };
  const ink = v.ink;
  const sides = [["United States", v.sides.British], ["Japan", v.sides["Combined Fleet"]]];
  const colourOf = (u) => (u.side === 0 ? sides[0][1] : sides[1][1]);
  let s = `<rect width="${w}" height="${bandTop}" fill="${v.letterbox}"/>` + HATCH(ink);
  s += `<clipPath id="ext2"><rect x="${EXT.x}" y="${EXT.y}" width="${EXT.w}" height="${EXT.h}"/></clipPath>`;
  s += `<g clip-path="url(#ext2)">`;
  s += seaSvg("none", v, EXT);
  s += `<path d="${REEF.d}" fill="none" stroke="${v.coastStroke}" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.7"/>`;
  s += `<path d="${ATOLL.d}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1.2"/>`;
  let i = 0;
  for (const u of F.units) {
    s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading})">` +
      atlasGlyph({ formation: u.formation, arm: u.arm, state: u.state, strength: u.strength, colour: colourOf(u), paper: v.paper, candidate, clipId: `af${i++}` }) + `</g>`;
  }
  s += `</g>`;
  s += `<g fill="none" stroke="${ink}"><rect x="${EXT.x + 0.5}" y="${EXT.y + 0.5}" width="${EXT.w - 1}" height="${EXT.h - 1}" stroke-width="1"/></g>`;
  s += captionBandFor(v, F.band, w, bandTop, h - bandTop);
  return s;
}

export { PLATE, NIGHT, GLYPH_PX };
