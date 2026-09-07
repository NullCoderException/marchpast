// The aircraft sign (#140). ADR-0024 put `aircraft` on the arm allowlist, and ADR-0015 obliges every
// view to draw every arm — so the chart plate, the night plate, Atlas and the staff map each need a
// sign, and this file draws the candidates for all four hands in one place so they can be compared.
//
// Everything is drawn at the origin heading up the negative y axis, exactly as the renderer's glyphs
// are: the caller has rotated, and no sign ever learns a compass bearing (ADR-0014).
//
// The plate machinery below is a faithful port of `src/render/glyphs/slots.ts` and `ticks.ts` — the
// same eight slots, the same strength run, the same knocked-out ranks — so a candidate is judged at
// the arithmetic the renderer will actually use, not at a flattering one.

import { seeded, f } from "./lib.mjs";

// ---------------------------------------------------------------------------------------------------
// The plate's constants, from src/render/style.ts.
// ---------------------------------------------------------------------------------------------------
export const GLYPH_PX = 72;
export const SIGNS_PER_GLYPH = 8;
export const SIGN_HALF_WIDTH = 2.6;
export const SIGN_HALF_HEIGHT = 3.25;
const MASS_FRONTAGE = 4;
const MASS_RANKS = 2;
/** The rank bar's weight, and how far a destroyed outline stands off the footprint. */
const RANK_BAR_THICKNESS = 2.6;
const OUTLINE_PAD = 2;

export const frontage = (formation, length) =>
  formation === "mass" ? (length * MASS_FRONTAGE) / SIGNS_PER_GLYPH : length;

/** Every slot a formation offers, in the order strength fills them (slots.ts). */
export function signSlots(formation, length) {
  const pitch = length / SIGNS_PER_GLYPH;
  if (formation === "mass") {
    return Array.from({ length: SIGNS_PER_GLYPH }, (_, i) => ({
      x: ((i % MASS_FRONTAGE) - (MASS_FRONTAGE - 1) / 2) * pitch,
      y: (Math.floor(i / MASS_FRONTAGE) - (MASS_RANKS - 1) / 2) * pitch,
    }));
  }
  const along = (i) => (i - (SIGNS_PER_GLYPH - 1) / 2) * pitch;
  return Array.from({ length: SIGNS_PER_GLYPH }, (_, i) =>
    formation === "column" ? { x: 0, y: along(i) } : { x: along(i), y: 0 },
  );
}

export const shownSigns = (state, strength) =>
  state === "destroyed" ? 0 : Math.max(1, Math.round(SIGNS_PER_GLYPH * strength));

function centredRank(count, base) {
  const start = base + Math.floor((MASS_FRONTAGE - count) / 2);
  return Array.from({ length: count }, (_, i) => start + i);
}
function byRank(shown) {
  const front = Math.min(shown, MASS_FRONTAGE);
  return [...centredRank(front, 0), ...centredRank(shown - front, MASS_FRONTAGE)];
}
function scattered(shown, rnd) {
  const set = new Set();
  for (let i = 0; i < shown; i++) {
    const ideal = ((i + 0.5) * SIGNS_PER_GLYPH) / shown;
    const nudge = Math.floor(rnd() * 2) - 1;
    let index = Math.min(SIGNS_PER_GLYPH - 1, Math.max(0, Math.floor(ideal) + nudge));
    while (set.has(index) && index < SIGNS_PER_GLYPH - 1) index++;
    set.add(index);
  }
  return [...set];
}
export function occupiedSlots(formation, state, shown, rnd) {
  if (shown <= 0) return [];
  if (state === "broken") return scattered(shown, rnd);
  if (formation === "mass") return byRank(shown);
  const start = Math.floor((SIGNS_PER_GLYPH - shown) / 2);
  return Array.from({ length: shown }, (_, i) => start + i);
}

// ---------------------------------------------------------------------------------------------------
// THE PLATE'S SIGNS. Three of them exist (ADR-0016): the ship's chevron unchanged from v1, a solid
// rank bar for foot, the same bar barred for horse. The fourth is what this ticket decides.
//
// The footprint every one of them fills is 5.2 by 6.5 px — half is {2.6, 3.25} — which is the whole
// difficulty: at that size an aeroplane is three or four strokes at most, and it has to stay tellable
// from a chevron eight times over, at a rank's pitch of nine pixels, and again at legend scale.
// ---------------------------------------------------------------------------------------------------

/** `half` is the sign's footprint; `w` the stroke the body pass has already set (1.4 * scale). */
const stroke = (d, colour, w, extra = "") =>
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

export const PLATE_SIGNS = {
  ship: (half, colour, w) => stroke(`M${f(-half.x)} ${f(half.y)} L0 ${f(-half.y)} L${f(half.x)} ${f(half.y)}`, colour, w),
  infantry: (half, colour, w, scale) =>
    `<rect x="${f(-half.x)}" y="${f((-RANK_BAR_THICKNESS * scale) / 2)}" width="${f(half.x * 2)}" height="${f(RANK_BAR_THICKNESS * scale)}" fill="${colour}"/>`,
  cavalry: (half, colour, w, scale) =>
    `<rect x="${f(-half.x)}" y="${f((-RANK_BAR_THICKNESS * scale) / 2)}" width="${f(half.x * 2)}" height="${f(RANK_BAR_THICKNESS * scale)}" fill="${colour}"/>` +
    stroke(`M${f(-half.x)} ${f(half.y)} L${f(half.x)} ${f(-half.y)}`, colour, w),
};

/**
 * The three candidates, each a different KIND of answer rather than three drawings of one.
 *
 *   A · PLAN     the aeroplane seen from above — fuselage, wing, tailplane. Pictorial, three strokes,
 *                and the only candidate a reader needs nothing explained about.
 *   B · DART     the swept arrowhead the symbol traditions use for air. One filled shape, so it holds
 *                its weight at any size; but the plate's only filled sign today is the rank bar, and
 *                this is the same silhouette the `detachment` pen already puts on the plate.
 *   C · ROUNDEL  the national marking every aeroplane in 1942 carried: a ring, and the one mark in the
 *                system that is neither a line nor a wedge. It does not point.
 *   D · WINGS    two swept strokes and no fuselage — the lightest mark that still points. Drawn, and
 *                kept on the sheet, because at plate size it comes out as the ship's own chevron:
 *                the sharpest thing the drawing found, and the reason a fourth was needed.
 */
export const AIRCRAFT_PLATE = {
  A: (half, colour, w) =>
    stroke(`M0 ${f(-half.y)} L0 ${f(half.y)}`, colour, w) +
    stroke(`M${f(-half.x)} ${f(-half.y * 0.18)} L${f(half.x)} ${f(-half.y * 0.18)}`, colour, w) +
    stroke(`M${f(-half.x * 0.46)} ${f(half.y * 0.72)} L${f(half.x * 0.46)} ${f(half.y * 0.72)}`, colour, w * 0.8),
  B: (half, colour, w) =>
    `<path d="M0 ${f(-half.y)} L${f(half.x)} ${f(half.y)} L0 ${f(half.y * 0.3)} L${f(-half.x)} ${f(half.y)} Z" fill="${colour}" stroke="${colour}" stroke-width="${f(w * 0.5)}" stroke-linejoin="round"/>`,
  C: (half, colour, w) =>
    `<circle cx="0" cy="0" r="${f(half.x * 0.85)}" fill="none" stroke="${colour}" stroke-width="${f(w * 0.85)}"/>`,
  D: (half, colour, w) =>
    stroke(`M${f(-half.x)} ${f(half.y * 0.75)} L${f(-half.x * 0.2)} ${f(-half.y * 0.6)}`, colour, w) +
    stroke(`M${f(half.x)} ${f(half.y * 0.75)} L${f(half.x * 0.2)} ${f(-half.y * 0.6)}`, colour, w),
};

export const PLATE_CANDIDATE_NAMES = {
  A: "A · Plan",
  B: "B · Dart",
  C: "C · Roundel",
  D: "D · Wings",
};

/** The whole plate glyph, for any arm, at the renderer's own arithmetic. */
export function plateGlyph({
  length = GLYPH_PX,
  formation = "line",
  arm = "ship",
  state = "intact",
  strength = 1,
  colour,
  seed = 1,
  scale = 1,
  candidate = "A",
}) {
  const rnd = seeded(seed);
  if (state === "destroyed") return hollowOutline(length, formation, scale, colour);
  const half = { x: SIGN_HALF_WIDTH * scale, y: SIGN_HALF_HEIGHT * scale };
  const w = 1.4 * scale;
  const sign = arm === "aircraft" ? AIRCRAFT_PLATE[candidate] : PLATE_SIGNS[arm];
  const slots = signSlots(formation, length);
  let out = "";
  for (const i of occupiedSlots(formation, state, shownSigns(state, strength), rnd)) {
    const slot = slots[i];
    if (!slot) continue;
    const dis = state === "broken" ? ((rnd() - 0.5) * 0.9 * 180) / Math.PI : 0;
    out += `<g transform="translate(${f(slot.x)} ${f(slot.y)}) rotate(${f(dis)})">${sign(half, colour, w, scale)}</g>`;
  }
  return out;
}

/** The destroyed glyph: the outline the signs would have filled, and nothing inside it (ticks.ts). */
function hollowOutline(length, formation, scale, colour) {
  const slots = signSlots(formation, length);
  const pitch = length / SIGNS_PER_GLYPH;
  const pad = (SIGN_HALF_WIDTH + OUTLINE_PAD) * scale;
  const half = (values) => {
    const span = Math.max(...values);
    return span === 0 ? pad : span + pitch / 2;
  };
  const w = half(slots.map((s) => s.x));
  const h = half(slots.map((s) => s.y));
  return `<rect x="${f(-w)}" y="${f(-h)}" width="${f(2 * w)}" height="${f(2 * h)}" rx="${f(Math.min(w, h))}" fill="none" stroke="${colour}" stroke-width="${f(scale)}"/>`;
}

/** Half the glyph's reach across its long axis, for the label pass (ticks.ts). */
export const plateHalfWidth = (scale, formation) =>
  (formation === "mass" ? GLYPH_PX / SIGNS_PER_GLYPH / 2 + SIGN_HALF_HEIGHT : SIGN_HALF_WIDTH) * scale;

// ---------------------------------------------------------------------------------------------------
// ATLAS. One block per unit with the arm's sign inside it: crossed diagonals for foot, a single
// diagonal for horse, nothing at all for a ship (ADR-0015).
//
// One constraint decides more here than taste does. `block.ts` draws the sign TWICE under a clip —
// once in the unit's ink over the bare part of the block, once in the paper's over the filled part —
// and `paintSign` sets only `strokeStyle`. So an Atlas sign that FILLS would come out in whatever the
// last fill colour happened to be. Every candidate below is therefore stroke-only, and a filled one
// would be a change to the shared pass, not to a view's hand.
// ---------------------------------------------------------------------------------------------------
const SIGN_ASPECT = 1.4;
function signField(half) {
  const across = Math.min(half.x, half.y);
  const along = Math.min(Math.max(half.x, half.y), across * SIGN_ASPECT);
  return half.x >= half.y ? { x: along, y: across } : { x: across, y: along };
}

/**
 *   A · PLAN   the same aeroplane the plate's candidate A draws, so the arm reads the same in both
 *              views the way foot's cross and horse's slash already do.
 *   B · CROSS  foot's X turned upright. The cheapest fourth sign the family can have: two strokes,
 *              already in the vocabulary, told from the X because the block is rotated with the unit.
 *   C · VEE    an open chevron pointing to the block's front. Reads at once — but the block already
 *              carries a filled heading barb at its nose, so this says the same thing twice.
 */
export const AIRCRAFT_ATLAS = {
  A: (half, colour, w) => {
    const p = signField(half);
    return stroke(`M0 ${f(-p.y)} L0 ${f(p.y)}`, colour, w) +
      stroke(`M${f(-p.x)} ${f(-p.y * 0.2)} L${f(p.x)} ${f(-p.y * 0.2)}`, colour, w) +
      stroke(`M${f(-p.x * 0.45)} ${f(p.y * 0.72)} L${f(p.x * 0.45)} ${f(p.y * 0.72)}`, colour, w);
  },
  B: (half, colour, w) => {
    const p = signField(half);
    return stroke(`M0 ${f(-p.y)} L0 ${f(p.y)}`, colour, w) + stroke(`M${f(-p.x)} 0 L${f(p.x)} 0`, colour, w);
  },
  C: (half, colour, w) => {
    const p = signField(half);
    return stroke(`M${f(-p.x)} ${f(p.y)} L0 ${f(-p.y)} L${f(p.x)} ${f(p.y)}`, colour, w);
  },
};

export const ATLAS_SIGNS = {
  ship: () => "",
  infantry: (half, colour, w) => {
    const p = signField(half);
    return stroke(`M${f(-p.x)} ${f(p.y)} L${f(p.x)} ${f(-p.y)}`, colour, w) +
      stroke(`M${f(-p.x)} ${f(-p.y)} L${f(p.x)} ${f(p.y)}`, colour, w);
  },
  cavalry: (half, colour, w) => {
    const p = signField(half);
    return stroke(`M${f(-p.x)} ${f(p.y)} L${f(p.x)} ${f(-p.y)}`, colour, w);
  },
};

const ATLAS_THICKNESS = 10;
const ATLAS_HATCH_PAD = 7;
const BARB = 4;
const BARB_HALF_WIDTH = 2.5;

/** The Atlas block, ported from block.ts, with the aircraft candidate plugged into the sign table. */
export function atlasGlyph({
  length = GLYPH_PX,
  formation = "line",
  arm = "ship",
  state = "intact",
  strength = 1,
  colour,
  paper = "#efe3c6",
  scale = 1,
  candidate = "A",
  clipId = "ab",
}) {
  const t = ATLAS_THICKNESS * scale;
  const { w, h } =
    formation === "mass"
      ? { w: frontage("mass", length), h: t * MASS_RANKS }
      : formation === "column"
        ? { w: t, h: length }
        : { w: length, h: t };
  const filled = state === "destroyed" ? 0 : strength;
  const fill =
    formation === "line"
      ? { x: -w / 2, y: -h / 2, w: w * filled, h }
      : { x: -w / 2, y: h / 2 - h * filled, w, h: h * filled };

  const alpha = state === "broken" ? ` opacity="0.55"` : "";
  let s = `<g${alpha}>`;
  if (state === "engaged") {
    s += `<rect x="${f(-w / 2 - ATLAS_HATCH_PAD * scale)}" y="${f(-h / 2 - ATLAS_HATCH_PAD * scale)}" width="${f(w + ATLAS_HATCH_PAD * 2 * scale)}" height="${f(h + ATLAS_HATCH_PAD * 2 * scale)}" fill="url(#hatch)"/>`;
  }
  if (fill.w > 0 && fill.h > 0) {
    s += `<rect x="${f(fill.x)}" y="${f(fill.y)}" width="${f(fill.w)}" height="${f(fill.h)}" fill="${colour}"/>`;
  }
  const half = { x: w / 2, y: h / 2 };
  const sign = arm === "aircraft" ? AIRCRAFT_ATLAS[candidate] : ATLAS_SIGNS[arm];
  const signW = 1.2 * scale;
  // Twice, under a clip each time: the unit's ink on the bare part, the paper's over the filled part.
  s += `<clipPath id="${clipId}-bare"><rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}"/></clipPath>`;
  s += `<g clip-path="url(#${clipId}-bare)">${sign(half, colour, signW)}</g>`;
  if (fill.w > 0 && fill.h > 0) {
    s += `<clipPath id="${clipId}-fill"><rect x="${f(fill.x)}" y="${f(fill.y)}" width="${f(fill.w)}" height="${f(fill.h)}"/></clipPath>`;
    s += `<g clip-path="url(#${clipId}-fill)">${sign(half, paper, signW)}</g>`;
  }
  s += `<rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="${colour}" stroke-width="${f(1.4 * scale)}"${state === "broken" ? ` stroke-dasharray="${f(3 * scale)} ${f(2 * scale)}"` : ""}/>`;
  const barb = BARB * scale;
  const base = Math.min(w / 2, BARB_HALF_WIDTH * scale);
  s += `<path d="M${f(-base)} ${f(-h / 2)} L0 ${f(-h / 2 - barb)} L${f(base)} ${f(-h / 2)} Z" fill="${colour}"/>`;
  return s + `</g>`;
}

// ---------------------------------------------------------------------------------------------------
// THE STAFF MAP. #139 drew an aircraft mark greyed on its own boards and said in words that it was a
// candidate only, for this ticket to argue against. These are the three ways it can go.
//
//   A · DELTA   #139's own: a filled swept arrowhead with a notched tail. The symbol tradition's mark.
//   B · OUTLINE the same shape, stroked rather than filled, so it weighs what its three siblings weigh
//               (foot's crossed lines, horse's single one, the ship's hollow hull in plan).
//   C · PLAN    the aeroplane in plan again, so all four views draw one arm one way.
// ---------------------------------------------------------------------------------------------------
const STAFF_ASPECT = 1.35;
function staffField(half) {
  const p = { x: half.x * 0.72, y: half.y * 0.72 };
  const across = Math.min(p.x, p.y);
  const along = Math.min(Math.max(p.x, p.y), across * STAFF_ASPECT);
  return p.x >= p.y ? { x: along, y: across } : { x: across, y: along };
}

export const AIRCRAFT_STAFF = {
  A: (half, colour, w) => {
    const p = staffField(half);
    const a = Math.max(p.x, p.y) * 1.05, b = Math.min(p.x, p.y) * 1.15;
    return `<path d="M${f(-a)} ${f(b)} L0 ${f(-b)} L${f(a)} ${f(b)} L0 ${f(b * 0.25)} Z" fill="${colour}" stroke="${colour}" stroke-width="${f(w * 0.8)}" stroke-linejoin="round"/>`;
  },
  B: (half, colour, w) => {
    const p = staffField(half);
    const a = Math.max(p.x, p.y) * 1.05, b = Math.min(p.x, p.y) * 1.15;
    return `<path d="M${f(-a)} ${f(b)} L0 ${f(-b)} L${f(a)} ${f(b)} L0 ${f(b * 0.25)} Z" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linejoin="round"/>`;
  },
  C: (half, colour, w) => {
    const p = staffField(half);
    const a = Math.max(p.x, p.y) * 1.05, b = Math.min(p.x, p.y) * 1.1;
    return stroke(`M0 ${f(-b)} L0 ${f(b)}`, colour, w) +
      stroke(`M${f(-a)} ${f(-b * 0.25)} L${f(a)} ${f(-b * 0.25)}`, colour, w) +
      stroke(`M${f(-a * 0.42)} ${f(b * 0.7)} L${f(a * 0.42)} ${f(b * 0.7)}`, colour, w);
  },
};

// ---------------------------------------------------------------------------------------------------
// BILLOW ON A UNIT THAT IS MOSTLY SKY.
//
// ADR-0016 made Billow the engaged mark for every arm, under ADR-0014's wind rule: the cloud drifts to
// the unit's lee flank under the phase's wind. On land it reads as dust. Over the sea, on a body of
// aeroplanes three thousand feet up, what it reads as — and whether the SURFACE wind is the right
// thing to blow it — is this ticket's.
//
//   SURFACE  today's rule, unchanged: the cloud goes downwind of the strike.
//   ASTERN   the cloud streams back along the strike's own heading, which is where flak bursts and a
//            burning aircraft actually leave their smoke. Costs an arm-dependent branch in `mark`.
// ---------------------------------------------------------------------------------------------------
const BILLOW = {
  engaged: { puffs: 16, reach: 26, radius: 3.5, growth: 6.5 },
  broken: { puffs: 8, reach: 16, radius: 3, growth: 3.5 },
};
const HULL_CLEARANCE = 3;

/**
 * The renderer's Billow, in SVG: puffs in one union, the outline as a band, three lee-side chords per
 * puff. `driftDeg` is the drift's direction in the glyph's own frame, 0 being up the heading.
 */
export function billow({ length = GLYPH_PX, formation = "line", state = "engaged", seed = 1, scale = 1, ink, paper, driftDeg = 90 }) {
  if (state !== "engaged" && state !== "broken") return "";
  const cloud = state === "broken" ? BILLOW.broken : BILLOW.engaged;
  const rnd = seeded(seed);
  const r = (driftDeg * Math.PI) / 180;
  const drift = { x: Math.sin(r), y: -Math.cos(r) };
  const along = formation === "column" ? { x: 0, y: 1 } : { x: 1, y: 0 };
  const count = Math.max(4, Math.round(cloud.puffs * scale));
  const clearance = plateHalfWidth(scale, formation) + HULL_CLEARANCE * scale;
  const front = frontage(formation, length);
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const out = i / Math.max(1, count - 1);
    const spread = (rnd() - 0.5) * front * (0.5 + out * 0.5);
    const distance = clearance + out * cloud.reach * scale;
    puffs.push({
      x: along.x * spread + drift.x * distance,
      y: along.y * spread + drift.y * distance,
      r: (cloud.radius + out * cloud.growth) * scale,
    });
  }
  // The union in ink, then the union eroded by the line width punched back out in paper — the same two
  // passes `paintCloud` makes on its scratch canvas, so no puff's outline shows inside another and the
  // cloud's inside is genuinely empty rather than a heap of bubbles.
  const width = Math.max(0.55, 0.7 * scale);
  const union = (grow) =>
    puffs.map(({ x, y, r }) => {
      const rr = Math.max(0.1, r + grow);
      return `M${f(x - rr)} ${f(y)} A${f(rr)} ${f(rr)} 0 1 0 ${f(x + rr)} ${f(y)} A${f(rr)} ${f(rr)} 0 1 0 ${f(x - rr)} ${f(y)} Z`;
    }).join(" ");
  let s = `<path d="${union(0)}" fill="${ink}" fill-rule="nonzero"/>`;
  s += `<path d="${union(-width)}" fill="${paper}" fill-rule="nonzero"/>`;
  if (scale >= 0.9) {
    const u = { x: -drift.y, y: drift.x };
    for (const p of puffs) {
      for (const t of [0.3, 0.52, 0.74]) {
        const off = p.r * t;
        const half = Math.sqrt(Math.max(0, p.r * p.r - off * off)) * 0.82;
        const cx = p.x + drift.x * off, cy = p.y + drift.y * off;
        s += `<line x1="${f(cx - u.x * half)}" y1="${f(cy - u.y * half)}" x2="${f(cx + u.x * half)}" y2="${f(cy + u.y * half)}" stroke="${ink}" stroke-width="${f(0.55 * scale)}" stroke-opacity="0.75"/>`;
      }
    }
  }
  return s;
}

/**
 * The drift direction the plate uses today, in the glyph's own frame: the phase's wind, damped so its
 * across-axis component is never less than about half and the cloud clears the signs even when a unit
 * runs downwind (ADR-0014's rule, as `leeDrift` implements it).
 */
export function surfaceDrift(windTo, heading, formation) {
  const r = ((windTo - heading) * Math.PI) / 180;
  let x = Math.sin(r), y = -Math.cos(r);
  if (formation === "line") {
    // The signs lie along x, so the cloud is pushed off in y.
    y = (y >= 0 ? 1 : -1) * Math.max(Math.abs(y), 0.55);
    x *= 0.6;
  } else {
    y *= 0.6;
    x = (x >= 0 ? 1 : -1) * Math.max(Math.abs(x), 0.55);
  }
  return (Math.atan2(x, -y) * 180) / Math.PI;
}
