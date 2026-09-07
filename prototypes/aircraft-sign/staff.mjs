// The staff-map view (#139): the first view drawn outside the engraved system, in the idiom of a
// twentieth-century operations map. Everything here is one view's HAND — how a thing is drawn — and
// nothing here moves what the picture shows or where it sits (ADR-0021).
//
// The four modules ADR-0021 gives a view are all in this file: `glyph` (two candidates), `type`,
// `ground` (which #138 already decided — the `ops` sheet, imported from the terrain prototype) and
// `furniture`. `pens` is the one that does not fit, and showing why is half the point of the ticket.

// ---------------------------------------------------------------------------------------------------
// Materials. The sheet's own colours come from #138's chosen `ops` idiom and are not reopened here;
// what this file adds is the six side inks retuned to buff paper, in the fixed hue order (ADR-0021).
// ---------------------------------------------------------------------------------------------------
export const STAFF = {
  id: "staff",
  name: "Staff map",
  paper: "#ded7c2",
  land: "#d9d2b8",
  water: "#93a9b6",
  ink: "#2f3134",
  letterbox: "#c8c1ab",
  panel: "rgba(222,215,194,0.94)",
  coast: "#7b8a93",
  contour: "#8d6b43",
  grid: "#4c5157",
  knockout: "#d9d2b8",
  ramp: ["#d3cbab", "#cbc199", "#c1b587", "#b5a771", "#a6975e"],
  // Roster order, hue family fixed across views: red, blue, green, brown, purple, teal.
  sides: ["#9c3327", "#1f4f7a", "#3f6b32", "#7a5320", "#5f3f72", "#256762"],
};

/** The three faces on the chip. Fallbacks are picked for close metrics, because PNG export loses the webfont. */
export const FACES = {
  plex: `"IBM Plex Sans Condensed", "Arial Narrow", "Helvetica Neue", sans-serif`,
  archivo: `"Archivo", "Helvetica Neue", Arial, sans-serif`,
  barlow: `"Barlow Condensed", "Arial Narrow", "Helvetica Neue", sans-serif`,
};
export const FONT_LINK =
  `<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;500;600` +
  `&amp;family=Archivo:wdth,wght@75,400;75,500;75,600&amp;family=Barlow+Condensed:wght@400;500;600&amp;display=swap" rel="stylesheet">`;

export const f = (n) => Number(n.toFixed(2));
export function seeded(seed) {
  let s = (Math.abs(Math.floor(seed)) * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

// ---------------------------------------------------------------------------------------------------
// TYPE. The roles, their rank and the name/fact distinction are anatomy; the face, the sizes and the
// device are the view's (ADR-0021). The engraved plate tells a name from a fact by SLOPE — 14px italic
// against 12px upright. This view has no italic at all: it tells them apart by CASE AND TRACKING, the
// way a printed sheet sets a designation against a note. That is why it costs one weight axis and not
// a second file.
// ---------------------------------------------------------------------------------------------------
export const TYPE = {
  clock: { size: 30, weight: 500, caps: false, track: 0 },
  title: { size: 19, weight: 600, caps: true, track: 1.5 },
  caption: { size: 15, weight: 400, caps: false, track: 0 },
  unitName: { size: 12.5, weight: 600, caps: true, track: 0.9 },
  stateWord: { size: 12, weight: 400, caps: false, track: 0 },
  legend: { size: 11.5, weight: 400, caps: true, track: 0.7 },
  scale: { size: 11, weight: 500, caps: true, track: 0.8 },
  credit: { size: 10, weight: 400, caps: true, track: 0.7 },
};

const caps = (s) => s.toUpperCase();
/** One run of type in the staff hand. `role` names a TYPE row, so no size is written twice. */
export function text(x, y, s, role, fill, { anchor = "start", opacity = 1, baseline = "middle" } = {}) {
  const t = TYPE[role];
  const body = t.caps ? caps(s) : s;
  return `<text x="${f(x)}" y="${f(y)}" font-size="${t.size}" font-weight="${t.weight}"` +
    (t.track ? ` letter-spacing="${t.track}"` : "") +
    ` fill="${fill}"${opacity === 1 ? "" : ` fill-opacity="${opacity}"`}` +
    ` text-anchor="${anchor}" dominant-baseline="${baseline}">${body}</text>`;
}

// ---------------------------------------------------------------------------------------------------
// GLYPH. Two candidates, both drawn at the origin heading up the negative y axis, with the caller
// already rotated — so neither ever learns a compass bearing, which is the ADR-0014 clause that stands.
//
//   A · FRAME TO FRONTAGE  the unit's whole footprint is the symbol: a box GLYPH_PX along its long
//                          axis by DEPTH across it, tinted, with the arm mark set in the middle.
//   B · SYMBOL ON THE TRACE a unit trace GLYPH_PX long carrying the front tick at its leading end,
//                          with a true-aspect symbol box astride the middle of it.
//
// Both keep ADR-0016's fixed 72px long axis visible, and both give a mass the two-rank footprint.
// ---------------------------------------------------------------------------------------------------
export const GLYPH_PX = 72;
const DEPTH = 18;
const MASS_FRONTAGE = 4, SIGNS = 8, MASS_RANKS = 2;
const frontage = (formation, length) => (formation === "mass" ? (length * MASS_FRONTAGE) / SIGNS : length);

/** The box a formation fills in candidate A, at the origin heading up. */
export function frameSize(formation, length = GLYPH_PX) {
  if (formation === "mass") return { w: frontage("mass", length), h: DEPTH * MASS_RANKS };
  return formation === "column" ? { w: DEPTH, h: length } : { w: length, h: DEPTH };
}

// --- the arm marks: one shape per arm, drawn inside a square-ish field, weight already set by caller ---
// Foot is the crossed diagonals and horse the single one, which is what Atlas draws and what a reader
// brings from a modern map; the ship is a hull in plan, bow up, because a plain box would say nothing
// on two naval battles out of seven.
const SIGN_ASPECT = 1.35;
function signField(half) {
  const across = Math.min(half.x, half.y);
  const along = Math.min(Math.max(half.x, half.y), across * SIGN_ASPECT);
  return half.x >= half.y ? { x: along, y: across } : { x: across, y: along };
}
export function armMark(arm, half, colour, w = 1.3) {
  const p = signField({ x: half.x * 0.72, y: half.y * 0.72 });
  const line = (x1, y1, x2, y2) =>
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${colour}" stroke-width="${w}" stroke-linecap="round"/>`;
  if (arm === "infantry") return line(-p.x, p.y, p.x, -p.y) + line(-p.x, -p.y, p.x, p.y);
  if (arm === "cavalry") return line(-p.x, p.y, p.x, -p.y);
  if (arm === "ship") {
    const a = Math.min(p.x, p.y) * 0.95, b = Math.min(p.x, p.y) * 1.5;
    return `<path d="M0 ${f(-b)} Q${f(a)} 0 0 ${f(b)} Q${f(-a)} 0 0 ${f(-b)} Z" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linejoin="round"/>`;
  }
  // DECIDED by #140: the swept arrowhead this view greyed in, drawn STROKED rather than filled, so it
  // weighs what its three siblings weigh. The shape is the symbol tradition's and stays this view's own;
  // the chart plate and Atlas draw the arm as an aeroplane in plan instead.
  if (arm === "aircraft") {
    const a = Math.max(p.x, p.y) * 1.05, b = Math.min(p.x, p.y) * 1.15;
    return `<path d="M${f(-a)} ${f(b)} L0 ${f(-b)} L${f(a)} ${f(b)} L0 ${f(b * 0.25)} Z" fill="none" stroke="${colour}" stroke-width="${f(w)}" stroke-linejoin="round"/>`;
  }
  return "";
}

/**
 * The contact line: the operations map's own device for two forces in touch, a serration along the
 * unit's front. It is what Billow and the Atlas hatch are in their idioms — but it is drawn INSIDE the
 * unit's own footprint, so this glyph lays nothing down before the bodies and has no `mark` half at all.
 */
function contactLine(x1, x2, y, colour, w = 2.2, tooth = 5) {
  const span = x2 - x1, n = Math.max(3, Math.round(span / tooth));
  let d = `M${f(x1)} ${f(y)}`;
  for (let i = 0; i < n; i++) {
    const a = x1 + (span * (i + 0.5)) / n, b = x1 + (span * (i + 1)) / n;
    d += ` L${f(a)} ${f(y - tooth * 0.8)} L${f(b)} ${f(y)}`;
  }
  return `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/** Candidate A: the frame IS the unit's footprint. */
export function frameGlyph({ length = GLYPH_PX, formation = "line", arm = "infantry", state = "intact", strength = 1, colour, ink }) {
  const { w, h } = frameSize(formation, length);
  const half = { x: w / 2, y: h / 2 };
  const dead = state === "destroyed";
  const broken = state === "broken";
  let s = "";

  // The tint: the fraction still fighting, filled from the front. Flat colour, not stacked ink — the
  // printed sheet's material, where Atlas lays a solid block.
  if (!dead && strength > 0) {
    const alpha = broken ? 0.12 : 0.22;
    const fw = formation === "line" ? w * strength : w;
    const fh = formation === "line" ? h : h * strength;
    const fx = -w / 2, fy = -h / 2;
    s += `<rect x="${f(fx)}" y="${f(fy)}" width="${f(fw)}" height="${f(fh)}" fill="${colour}" fill-opacity="${alpha}"/>`;
  }

  // The frame.
  s += `<rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="${colour}"` +
    ` stroke-width="${dead ? 1.1 : 1.5}"${broken ? ` stroke-dasharray="5 3"` : ""}${dead ? ` stroke-opacity="0.75"` : ""}/>`;

  // The leading edge, heavy: the sheet's way of saying which side is the front, where Atlas puts a barb.
  // Engaged turns it into the contact serration; broken and destroyed have no front to hold.
  if (state === "intact") {
    s += `<line x1="${f(-w / 2)}" y1="${f(-h / 2)}" x2="${f(w / 2)}" y2="${f(-h / 2)}" stroke="${colour}" stroke-width="3.2" stroke-linecap="square"/>`;
  } else if (state === "engaged") {
    s += contactLine(-w / 2, w / 2, -h / 2, colour, 2.4, Math.min(6, Math.max(4, w / 12)));
  }

  if (dead) {
    // Struck out: the sheet cancels a symbol rather than hollowing it, and the side ink stays, because
    // ink is the only carrier of side (#130).
    s += `<line x1="${f(-w / 2)}" y1="${f(-h / 2)}" x2="${f(w / 2)}" y2="${f(h / 2)}" stroke="${colour}" stroke-width="1.6" stroke-linecap="round"/>`;
    s += `<line x1="${f(-w / 2)}" y1="${f(h / 2)}" x2="${f(w / 2)}" y2="${f(-h / 2)}" stroke="${colour}" stroke-width="1.6" stroke-linecap="round"/>`;
  } else {
    s += armMark(arm, half, colour, 1.35);
  }
  return s;
}

/** Candidate B: a unit trace with a true-aspect symbol box astride it. */
const BOX = { w: 30, h: 19 };
export function traceGlyph({ length = GLYPH_PX, formation = "line", arm = "infantry", state = "intact", strength = 1, colour, ink }) {
  const dead = state === "destroyed", broken = state === "broken";
  const run = frontage(formation, length);
  // The trace runs along the unit's long axis; a mass runs two of them, one per rank.
  const along = formation === "column" ? "y" : "x";
  const ranks = formation === "mass" ? [-DEPTH / 2, DEPTH / 2] : [0];
  const front = -DEPTH / 2 - 1;
  let s = "";

  for (const off of ranks) {
    const A = along === "x" ? { x1: -run / 2, y1: off, x2: run / 2, y2: off } : { x1: off, y1: -run / 2, x2: off, y2: run / 2 };
    // The whole trace as a ghost, so ADR-0016's fixed length stays visible however weak the unit is,
    // then the part still held drawn over it. Strength shortens the held part from the rear.
    s += `<line x1="${f(A.x1)}" y1="${f(A.y1)}" x2="${f(A.x2)}" y2="${f(A.y2)}" stroke="${colour}" stroke-width="1" stroke-opacity="0.3"/>`;
    if (!dead && strength > 0) {
      const k = strength;
      const hx = along === "x" ? { x1: A.x2 - run * k, y1: off, x2: A.x2, y2: off } : { x1: off, y1: A.y1, x2: off, y2: A.y1 + run * k };
      const w = broken ? 2 : 3.2;
      if (state === "engaged") {
        s += along === "x"
          ? contactLine(hx.x1, hx.x2, off, colour, 2.4, 5)
          : `<g transform="rotate(90)">${contactLine(-run * k / 2, run * k / 2, -off, colour, 2.4, 5)}</g>`;
      } else {
        s += `<line x1="${f(hx.x1)}" y1="${f(hx.y1)}" x2="${f(hx.x2)}" y2="${f(hx.y2)}" stroke="${colour}" stroke-width="${w}"${broken ? ` stroke-dasharray="6 4"` : ""} stroke-linecap="butt"/>`;
      }
    }
  }
  // The front tick at the leading end of the trace: which way the unit faces, in one stroke.
  if (!dead) {
    s += along === "x"
      ? `<line x1="0" y1="${f(ranks[0])}" x2="0" y2="${f(front - 5)}" stroke="${colour}" stroke-width="1.4"/>`
      : `<line x1="${f(ranks[0])}" y1="${f(-run / 2)}" x2="${f(ranks[0] - 0)}" y2="${f(-run / 2 - 6)}" stroke="${colour}" stroke-width="1.4"/>`;
  }

  // The symbol box astride the middle, upright in the unit's own frame.
  const half = { x: BOX.w / 2, y: BOX.h / 2 };
  if (!dead && strength > 0) s += `<rect x="${f(-half.x)}" y="${f(-half.y)}" width="${BOX.w}" height="${BOX.h}" fill="${colour}" fill-opacity="${broken ? 0.1 : 0.2}"/>`;
  s += `<rect x="${f(-half.x)}" y="${f(-half.y)}" width="${BOX.w}" height="${BOX.h}" fill="${STAFF.paper}" fill-opacity="0.55"/>`;
  s += `<rect x="${f(-half.x)}" y="${f(-half.y)}" width="${BOX.w}" height="${BOX.h}" fill="none" stroke="${colour}" stroke-width="${dead ? 1.1 : 1.5}"${broken ? ` stroke-dasharray="4 3"` : ""}/>`;
  if (dead) {
    s += `<line x1="${f(-half.x)}" y1="${f(-half.y)}" x2="${f(half.x)}" y2="${f(half.y)}" stroke="${colour}" stroke-width="1.5"/>`;
    s += `<line x1="${f(-half.x)}" y1="${f(half.y)}" x2="${f(half.x)}" y2="${f(-half.y)}" stroke="${colour}" stroke-width="1.5"/>`;
  } else {
    s += armMark(arm, half, colour, 1.35);
  }
  return s;
}

export const glyphs = { A: frameGlyph, B: traceGlyph };
/** Half the glyph's reach across its long axis: what the shared label pass clears. */
export function halfWidth(kind, formation) {
  if (kind === "B") return Math.max(BOX.h / 2, formation === "mass" ? DEPTH : DEPTH / 2) + 6;
  return (formation === "mass" ? DEPTH * MASS_RANKS : DEPTH) / 2 + 4;
}

// ---------------------------------------------------------------------------------------------------
// MOVES. The three motion styles must stay tellable apart (anatomy); how each is drawn is the view's.
// Two candidates, and the difference between them is the ticket's sharpest finding:
//
//   PEN   what `Pens` can express today: a width, a dash, a head and a head size. Nothing else.
//   TAPER what an operations map actually draws: a broad arrow that TAPERS from tail to shoulder and
//         opens into a head — a filled polygon, hollow for intent and solid for a detachment.
//
// A taper is not a stroked line, so it cannot come out of a `Pen` at any values. Drawing both is what
// ADR-0021 asked for before cutting a fifth slot ("against a drawing", not against a sentence).
// ---------------------------------------------------------------------------------------------------
export const PEN = {
  track: (ink) => ({ colour: ink, width: 1.4, dash: "1 5", head: "open", headSize: 8 }),
  intent: (ink) => ({ colour: ink, width: 3, dash: "12 7", head: "open", headSize: 14 }),
  detachment: (c) => ({ colour: c, width: 5, dash: "", head: "filled", headSize: 18 }),
};

export function penArrow(a, b, { colour, width, dash = "", head, headSize }) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), deg = (ang * 180) / Math.PI;
  const trim = head === "filled" ? headSize * 0.7 : 0;
  const ex = b.x - Math.cos(ang) * trim, ey = b.y - Math.sin(ang) * trim;
  const s = headSize;
  const headPath = head === "filled"
    ? `<path d="M0 0 L${-s} ${-s * 0.5} L${f(-s * 0.7)} 0 L${-s} ${f(s * 0.5)} Z" fill="${colour}"/>`
    : `<path d="M${-s} ${f(-s * 0.55)} L0 0 L${-s} ${f(s * 0.55)}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(ex)}" y2="${f(ey)}" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>` +
    `<g transform="translate(${f(b.x)} ${f(b.y)}) rotate(${f(deg)})">${headPath}</g>`;
}

/**
 * The operations arrow as a polygon: tail half-width, shoulder half-width, head half-width, head
 * length. `bend` lifts a control point off the chord so the shaft curves the way an axis of advance
 * does on a real overlay.
 */
export function taperArrow(a, b, { tail = 3, shoulder = 9, head = 17, headLen = 26, fill = "none", stroke, strokeW = 1.5, dash = "", bend = 0 } = {}) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  // The arrow is sized to its own run: a short move drawn at the long move's head is all head and no
  // shaft, which is what made the Cannae flanking arrows swamp the units they belonged to.
  const k = Math.max(0.5, Math.min(1, len / 150));
  tail *= k; shoulder *= k; head *= k; headLen = Math.min(headLen * k, len * 0.45);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const P = (t, o) => {
    const cx = a.x + ux * t + nx * bend * Math.sin((Math.PI * t) / len);
    const cy = a.y + uy * t + ny * bend * Math.sin((Math.PI * t) / len);
    return { x: cx + nx * o, y: cy + ny * o };
  };
  const sh = Math.max(0, len - headLen);
  const pts = [P(0, tail), P(sh, shoulder), P(sh, head), P(len, 0), P(sh, -head), P(sh, -shoulder), P(0, -tail)];
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${f(p.x)} ${f(p.y)}`).join(" ") + " Z";
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

/** The staff map's track: a fine line pipped at the start and ticked along its run, with an open head. */
export function trackLine(a, b, ink) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  let s = `<circle cx="${f(a.x)}" cy="${f(a.y)}" r="2.6" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
  s += `<line x1="${f(a.x + ux * 4)}" y1="${f(a.y + uy * 4)}" x2="${f(b.x)}" y2="${f(b.y)}" stroke="${ink}" stroke-width="1.2"/>`;
  for (let t = 26; t < len - 8; t += 26) {
    const cx = a.x + ux * t, cy = a.y + uy * t;
    s += `<line x1="${f(cx - nx * 3.5)}" y1="${f(cy - ny * 3.5)}" x2="${f(cx + nx * 3.5)}" y2="${f(cy + ny * 3.5)}" stroke="${ink}" stroke-width="1.1"/>`;
  }
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  s += `<g transform="translate(${f(b.x)} ${f(b.y)}) rotate(${f(deg)})"><path d="M-8 -4.5 L0 0 L-8 4.5" fill="none" stroke="${ink}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  return s;
}

/** All three motion styles in one call, either candidate. */
export function move(kind, a, b, { style, ink, colour, bend = 0 }) {
  if (style === "pen") {
    if (kind === "track") return penArrow(a, b, PEN.track(ink));
    if (kind === "intent") return penArrow(a, b, PEN.intent(ink));
    return penArrow(a, b, PEN.detachment(colour));
  }
  if (kind === "track") return trackLine(a, b, ink);
  if (kind === "intent") return taperArrow(a, b, { tail: 3, shoulder: 9, head: 17, headLen: 26, fill: STAFF.paper, stroke: ink, strokeW: 1.5, bend });
  return taperArrow(a, b, { tail: 4, shoulder: 11, head: 20, headLen: 30, fill: colour, stroke: colour, strokeW: 1, bend });
}

// ---------------------------------------------------------------------------------------------------
// LABELS. Two lines on the glyph's flank, never ahead of the unit, in the collapse order the anatomy
// fixes. The hand is the view's: the name in CAPS and tracked in the side ink, the fact upper-lower
// beneath it — no italic anywhere — and, when it is displaced, an ELBOW leader ending in a tick on the
// unit rather than the plate's hairline and dot.
// ---------------------------------------------------------------------------------------------------
export function staffLabel(x, y, name, fact, colour, ink, align = "start", leader, { elbow = true } = {}) {
  let lead = "";
  if (leader) {
    const { x1, y1, x2, y2 } = leader; // x1,y1 = the unit; x2,y2 = the label's near edge
    if (elbow) {
      // The operations-map annotation leader: a run out from the text, then square down to the thing,
      // ending in a tick across it — never a hairline to a dot, which is the plate's.
      lead = `<path d="M${f(x2)} ${f(y2)} L${f(x1)} ${f(y2)} L${f(x1)} ${f(y1)}" fill="none" stroke="${ink}" stroke-width="1" stroke-opacity="0.85" stroke-linejoin="miter"/>`;
      lead += `<line x1="${f(x1 - 4.5)}" y1="${f(y1)}" x2="${f(x1 + 4.5)}" y2="${f(y1)}" stroke="${ink}" stroke-width="1.5"/>`;
    } else {
      lead = `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${ink}" stroke-width="0.8"/><circle cx="${f(x1)}" cy="${f(y1)}" r="1.6" fill="${ink}"/>`;
    }
  }
  return lead + text(x, y - 8, name, "unitName", colour, { anchor: align }) +
    text(x, y + 8, fact, "stateWord", ink, { anchor: align, opacity: 0.85 });
}

// ---------------------------------------------------------------------------------------------------
// FURNITURE. The set is closed and each piece keeps its corner (anatomy); every one of them is redrawn
// here in the sheet's hand.
// ---------------------------------------------------------------------------------------------------

/** North: a slim filled needle over a stem, in place of the engraved rose. No declination diagram — we have no declination. */
export function northArrow(cx, cy, ink, { scale = 1 } = {}) {
  const s = scale;
  return `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s)})">` +
    `<line x1="0" y1="${f(30)}" x2="0" y2="${f(-8)}" stroke="${ink}" stroke-width="1.4"/>` +
    `<path d="M0 -24 L5 -4 L0 -9 L-5 -4 Z" fill="${ink}"/>` +
    `<path d="M0 -24 L5 -4 L0 -9 Z" fill="${ink}" fill-opacity="0.45"/>` +
    `<text x="0" y="${f(-34)}" font-size="12" font-weight="600" letter-spacing="1" fill="${ink}" text-anchor="middle" dominant-baseline="middle">N</text>` +
    `</g>`;
}

/**
 * Wind: the meteorological station barb, which is what a twentieth-century sheet draws where the plate
 * cuts feathers on to a rose's arrow. The shaft points along the direction the wind blows FROM; the
 * barbs sit at the outer end. Calm is the bare ring, and force climbs by half barb, barb, two, pennant.
 */
const BARBS = { calm: 0, light: 0.5, moderate: 1, fresh: 2, gale: 4 };
export function windBarb(cx, cy, ink, fromDeg = 292, force = "light") {
  const n = BARBS[force] ?? 1;
  let g = `<g transform="translate(${f(cx)} ${f(cy)})">` +
    `<circle r="3" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
  if (n === 0) return g + `</g>`;
  const L = 30;
  g += `<g transform="rotate(${f(fromDeg + 180)})" stroke="${ink}" stroke-width="1.5" fill="${ink}" stroke-linecap="round">`;
  g += `<line x1="0" y1="-3" x2="0" y2="${-L}"/>`;
  if (n >= 4) {
    g += `<path d="M0 ${-L} L11 ${-L + 5} L0 ${-L + 10} Z" stroke="none"/>`;
  } else {
    let y = -L, left = n;
    while (left >= 1) { g += `<line x1="0" y1="${f(y)}" x2="11" y2="${f(y + 5)}"/>`; y += 6; left -= 1; }
    if (left === 0.5) g += `<line x1="0" y1="${f(y)}" x2="5.5" y2="${f(y + 2.5)}"/>`;
  }
  return g + `</g></g>`;
}

/**
 * The scale bar as a sheet prints one: alternating filled and hollow blocks with the numerals under
 * the divisions and the unit named at the right, where the plate rules a hairline bar with ticks and
 * writes the whole distance above it.
 */
export function staffScaleBar(x, y, ink, { px = 120, divisions = 5, labels = ["0", "1", "2", "3", "4", "5"], unit = "NAUTICAL MILES", h = 7 } = {}) {
  const step = px / divisions;
  let s = "";
  for (let i = 0; i < divisions; i++) {
    s += `<rect x="${f(x + i * step)}" y="${f(y - h)}" width="${f(step)}" height="${h}" fill="${i % 2 === 0 ? ink : "none"}" stroke="${ink}" stroke-width="0.9"/>`;
  }
  labels.forEach((t, i) => { s += text(x + i * step, y + 11, t, "scale", ink, { anchor: "middle" }); });
  s += text(x + px + 10, y - h / 2 + 0.5, unit, "scale", ink, { anchor: "start" });
  return s;
}

/** The legend as the sheet's marginal key: a ruled head, caps, and rows that sample the view's own glyph. */
export function staffLegend(x, bottom, { sides, ink, panel, sample, arms = [], head = "LEGEND" }) {
  const rows = sides.length + 4 + arms.length;
  const H = rows * 22 + 40, W = 214, y = bottom - H;
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${W}" height="${f(H)}" fill="${panel}" stroke="${ink}" stroke-width="1"/>`;
  s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + W)}" y2="${f(y)}" stroke="${ink}" stroke-width="3"/>`;
  s += text(x + 12, y + 17, head, "legend", ink);
  s += `<line x1="${f(x + 12)}" y1="${f(y + 26)}" x2="${f(x + W - 12)}" y2="${f(y + 26)}" stroke="${ink}" stroke-width="0.7" stroke-opacity="0.5"/>`;
  let ry = y + 44;
  const tx = x + 92;
  const put = (inner, name, colour) => { s += `<g transform="translate(${f(x + 46)} ${f(ry)})">${inner}</g>` + text(tx, ry, name, "legend", colour ?? ink); ry += 22; };
  for (const [name, colour] of sides) put(sample({ state: "intact", strength: 1, colour }), name, colour);
  for (const st of ["intact", "engaged", "broken", "destroyed"]) put(sample({ state: st, strength: st === "broken" ? 0.4 : 1, colour: ink }), st, ink);
  for (const arm of arms) put(sample({ state: "intact", strength: 1, colour: ink, arm }), arm, ink);
  return { svg: s, rowY: ry, x, y, W, H };
}

/** The sheet's neat line: a heavy outer rule and a fine inner one, where the plate cuts two hairlines. */
export function neatLine(x, y, w, h, ink) {
  return `<g fill="none" stroke="${ink}">` +
    `<rect x="${f(x + 1)}" y="${f(y + 1)}" width="${f(w - 2)}" height="${f(h - 2)}" stroke-width="2"/>` +
    `<rect x="${f(x + 6.5)}" y="${f(y + 6.5)}" width="${f(w - 13)}" height="${f(h - 13)}" stroke-width="0.7"/></g>`;
}

/**
 * The caption band. Full width below the plate with the clock at the left, and its slots, are anatomy;
 * this is the hand: one heavy rule where the plate doubles a hairline, a vertical rule ruling the clock
 * column off the prose the way a printed form does, tabular figures, and caps for the date, the phase
 * and the credit — the whole band set without one italic.
 */
export function staffCaptionBand(v, { clock, date, phase, lines, sources }, w = 1120, top = 560, h = 90) {
  const ink = v.ink;
  let s = `<rect x="0" y="${top}" width="${w}" height="${h}" fill="${v.paper}"/>`;
  s += `<line x1="0" y1="${top + 1.5}" x2="${w}" y2="${top + 1.5}" stroke="${ink}" stroke-width="3"/>`;
  s += `<line x1="152" y1="${top + 14}" x2="152" y2="${top + h - 12}" stroke="${ink}" stroke-width="0.7" stroke-opacity="0.45"/>`;
  s += `<text x="24" y="${top + 34}" font-size="30" font-weight="500" fill="${ink}" style="font-variant-numeric: tabular-nums;" dominant-baseline="middle">${clock}</text>`;
  s += text(24, top + 58, date, "credit", ink, { opacity: 0.9 });
  s += text(176, top + 20, phase, "legend", ink);
  lines.forEach((t, i) => { s += text(176, top + 42 + i * 20, t, "caption", ink); });
  s += text(176, top + h - 14, sources, "credit", ink, { opacity: 0.8 });
  return s;
}

/** The page shell every artboard shares. `face` is bound to a tweak, so the whole board changes face at once. */
export function page(title, body, { extraStyle = "" } = {}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${FONT_LINK}
  <style>
    body { margin: 0; font-family: ${FACES.plex}; color: ${STAFF.ink}; background: ${STAFF.letterbox}; }
    a { color: ${STAFF.sides[0]}; } a:hover { color: ${STAFF.ink}; }
    svg text { font-family: inherit; }
    ${extraStyle}
  </style>
</helmet>
${body}
</x-dc>
</body>
</html>
`;
}

/** Break a note into lines that fit `cols` characters, so nothing runs off a card. */
export function wrap(body, cols = 96) {
  const out = [];
  for (const para of [].concat(body)) {
    let line = "";
    for (const word of para.split(" ")) {
      if (line && (line + " " + word).length > cols) { out.push(line); line = word; } else line = line ? line + " " + word : word;
    }
    if (line) out.push(line);
  }
  return out;
}

/** A titled card on a sheet of candidates, with its notes along the foot. */
export function card(x, y, w, h, title, notes, inner, innerX = w / 2) {
  const lines = wrap(notes, Math.floor((w - 28) / 5.9));
  return `<g transform="translate(${f(x)} ${f(y)})"><rect width="${w}" height="${f(h)}" fill="${STAFF.paper}" stroke="${STAFF.ink}" stroke-width="1"/>` +
    `<line x1="0" y1="1" x2="${w}" y2="1" stroke="${STAFF.ink}" stroke-width="2.5"/>` +
    text(14, 20, title, "legend", STAFF.ink) +
    lines.map((line, i) => text(14, h - 14 - (lines.length - 1 - i) * 15, line, "stateWord", STAFF.ink, { opacity: 0.85 })).join("") +
    `<g transform="translate(${f(innerX)} 36)">${inner}</g></g>`;
}

/** How deep a card must stand to hold `inner` of this height plus its wrapped notes. */
export function cardHeight(w, notes, innerH) {
  return 36 + innerH + wrap(notes, Math.floor((w - 28) / 5.9)).length * 15 + 16;
}
