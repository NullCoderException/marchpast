// The three frames #139 asks for, each drawn whole in the staff-map view: Trafalgar at 13:30 (the
// overlap test every view passes), Cannae phase 6 (the idiom on an ancient battle) and Midway (a fleet
// battle in its own century). One scene function, three sets of data, so the difference between the
// boards is the picture and never the hand.
//
// Nothing here is geo-registered: as on the terrain canvas (#138), the ground is a scene, not a map file.
import {
  STAFF, f, text, glyphs, halfWidth, move, staffLabel, northArrow, windBarb, staffScaleBar,
  staffLegend, neatLine, staffCaptionBand, armMark,
} from "./staff.mjs";
import { staffTintSvg, staffContoursSvg, gridSvg, seaSvg } from "../terrain/terrain.mjs";
import { LAND_CANNAE, RIVER, polyPath, catmull } from "../terrain/ground.mjs";

export const EXT = { x: 20, y: 20, w: 1080, h: 520 };
const RELIEF_STAFF = { lineW: 0.45, lineA: 0.45, indexW: 0.9, indexA: 0.8, numA: 0.95 };
// #138 chose `#93a9b6` against a coastline sliver; Midway is the first frame that is sea edge to edge.
export const SEAS = { chosen: "#93a9b6", lightened: "#b3c4cb" };
let SEA = SEAS.chosen;

// ---------------------------------------------------------------------------------------------------
// The ground, per scene. #138 decided the staff map's `ground` and it is not reopened: flat steps, a
// slate graticule drawn here beside the land, contours in burnt sienna with the height set into the
// line, and flat water needing no shoal texture. What is new is the graticule on OPEN SEA, where the
// engraved plate has nothing to say at all.
// ---------------------------------------------------------------------------------------------------
function grid(opts = {}) {
  return gridSvg(EXT, STAFF.grid, { pitch: 86, alpha: 0.5, width: 0.6, numeralInk: STAFF.grid, ...opts });
}

function cannaeGround() {
  return `<rect x="${EXT.x}" y="${EXT.y}" width="${EXT.w}" height="${EXT.h}" fill="${SEA}"/>` +
    `<path d="${LAND_CANNAE}" fill="${STAFF.land}"/>` +
    `<g clip-path="url(#land)">${staffTintSvg(STAFF.ramp)}</g>` +
    `<path d="${LAND_CANNAE}" fill="none" stroke="${STAFF.coast}" stroke-width="1.4"/>` +
    `<g clip-path="url(#land)">${staffContoursSvg(RELIEF_STAFF, STAFF.contour, { extent: EXT, knockout: STAFF.knockout, size: 10 })}</g>` +
    `<path d="${RIVER.d}" fill="none" stroke="${SEA}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<path d="${RIVER.d}" fill="none" stroke="${STAFF.coast}" stroke-width="0.8" stroke-opacity="0.7" fill-opacity="0"/>` +
    grid();
}

const SPAIN = catmull([[880, 20], [892, 96], [852, 132], [916, 172], [978, 214], [1016, 276], [1044, 340], [1064, 402], [1100, 452]]);
function trafalgarGround() {
  return `<rect x="${EXT.x}" y="${EXT.y}" width="${EXT.w}" height="${EXT.h}" fill="${SEA}"/>` +
    `<path d="${SPAIN.d} L1100 540 L1100 20 Z" fill="${STAFF.land}" stroke="${STAFF.coast}" stroke-width="1.4"/>` +
    grid({ originE: 18, originN: 44 }) +
    place(884, 128, "Cadiz") + place(1052, 396, "C. Trafalgar", "end");
}

// The atoll and its reef: Natural Earth carries both, so an open-ocean map needs no tracing (#124).
const ATOLL = catmull([[312, 408], [330, 400], [348, 408], [354, 424], [340, 436], [320, 434], [308, 422], [312, 408]]);
const REEF = catmull([[296, 400], [330, 386], [366, 402], [374, 428], [352, 450], [316, 450], [288, 430], [296, 400]]);
function midwayGround() {
  return `<rect x="${EXT.x}" y="${EXT.y}" width="${EXT.w}" height="${EXT.h}" fill="${SEA}"/>` +
    // A shoal is told from both the sea and the land by colour alone here: the sheet has a shallow tone,
    // so it needs no stipple and no dotted edge (#138).
    `<path d="${REEF.d}" fill="#b8c9cf" stroke="${STAFF.coast}" stroke-width="0.9" stroke-dasharray="5 3"/>` +
    `<path d="${ATOLL.d}" fill="${STAFF.land}" stroke="${STAFF.coast}" stroke-width="1.4"/>` +
    grid({ originE: 62, originN: 30 }) +
    place(372, 470, "Midway");
}

function place(x, y, name, anchor = "start") {
  const dx = anchor === "end" ? -8 : 8;
  return `<circle cx="${x}" cy="${y}" r="2.4" fill="${STAFF.ink}"/>` + text(x + dx, y, name, "legend", STAFF.ink, { anchor });
}

// ---------------------------------------------------------------------------------------------------
// The scenes.
// ---------------------------------------------------------------------------------------------------
export const SCENES = {
  trafalgar: {
    title: "The Battle of Trafalgar",
    ground: trafalgarGround,
    sides: [["British", STAFF.sides[0]], ["Combined Fleet", STAFF.sides[1]]],
    arms: [],
    wind: { fromDeg: 292, force: "light", words: "WIND WNW · LIGHT" },
    scale: { px: 120, labels: ["0", "1", "2", "3", "4", "5"], unit: "NAUTICAL MILES" },
    credit: "COASTLINE: NATURAL EARTH (PUBLIC DOMAIN)",
    band: {
      clock: "13:30", date: "21 October 1805",
      phase: "THE VAN STANDS ON; THE REAR IS TAKEN",
      lines: [
        "The Victory is locked with the Redoutable and the Téméraire has come up on her far side; astern, the whole enemy rear has struck or",
        "is striking to Collingwood's division. Dumanoir's ten of the van are still standing to the northward and have not yet worn.",
      ],
      sources: "— COLLINGWOOD'S DISPATCH, MAHAN, DODD'S PLAN (1805)",
    },
    units: [
      { id: "van", x: 742, y: 112, heading: 340, formation: "line", arm: "ship", state: "intact", strength: 1, side: 1, name: "Van", fact: "intact", lx: 660, ly: 66, align: "end", leader: true },
      { id: "centre", x: 772, y: 252, heading: 200, formation: "line", arm: "ship", state: "engaged", strength: 1, side: 1, name: "Centre", fact: "engaged", lx: 852, ly: 236, align: "start" },
      { id: "rear", x: 800, y: 398, heading: 200, formation: "line", arm: "ship", state: "broken", strength: 0.5, side: 1, name: "Rear", fact: "broken · 50%", lx: 880, ly: 396, align: "start" },
      { id: "rearmost", x: 828, y: 488, heading: 205, formation: "line", arm: "ship", state: "engaged", strength: 0.8, side: 1, name: "Rearmost", fact: "engaged · 80%", lx: 906, ly: 486, align: "start" },
      { id: "weather", x: 700, y: 246, heading: 105, formation: "column", arm: "ship", state: "engaged", strength: 0.9, side: 0, name: "Weather column", fact: "engaged · 90%", lx: 640, ly: 176, align: "end", leader: true },
      { id: "weather2", x: 566, y: 214, heading: 105, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Weather, second", fact: "intact", lx: 512, ly: 168, align: "end" },
      { id: "lee", x: 736, y: 396, heading: 112, formation: "column", arm: "ship", state: "engaged", strength: 0.8, side: 0, name: "Lee column", fact: "engaged · 80%", lx: 664, ly: 456, align: "end", leader: true },
      { id: "lee2", x: 592, y: 366, heading: 112, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Lee, second", fact: "intact", lx: 528, ly: 420, align: "end" },
    ],
    moves: [
      { kind: "track", a: { x: 500, y: 188 }, b: { x: 688, y: 242 }, side: 0 },
      { kind: "track", a: { x: 520, y: 336 }, b: { x: 722, y: 390 }, side: 0 },
      { kind: "intent", a: { x: 742, y: 96 }, b: { x: 690, y: 40 }, side: 1, bend: 10 },
      { kind: "detachment", a: { x: 752, y: 414 }, b: { x: 876, y: 508 }, side: 0, bend: -14 },
    ],
  },

  cannae: {
    title: "The Battle of Cannae",
    ground: cannaeGround,
    sides: [["Roman", STAFF.sides[0]], ["Carthaginian", STAFF.sides[1]]],
    arms: ["infantry", "cavalry"],
    sampleArm: "infantry",
    wind: undefined,
    scale: { px: 120, labels: ["0", "1", "2", "3"], unit: "KILOMETRES" },
    credit: "RELIEF: SRTM GL1 (PUBLIC DOMAIN) · RIVER DERIVED FROM THE DEM",
    band: {
      clock: "14:20", date: "2 August 216 BC",
      phase: "THE LIBYANS CLOSE ON BOTH FLANKS",
      lines: [
        "The Gallic and Spanish centre has given back to its starting line and beyond it, drawing the legions into the bow; on either flank the",
        "Libyan columns wheel inward on the Roman shoulders, and Hasdrubal's horse comes up behind the maniples from the river.",
      ],
      sources: "— POLYBIUS III.113–116, LIVY XXII.44–49",
    },
    units: [
      { id: "legions", x: 566, y: 300, heading: 92, formation: "mass", arm: "infantry", state: "broken", strength: 0.55, side: 0, name: "The legions", fact: "broken · 55%", lx: 566, ly: 372, align: "middle" },
      { id: "roman-horse", x: 596, y: 176, heading: 88, formation: "line", arm: "cavalry", state: "destroyed", strength: 0, side: 0, name: "Roman horse", fact: "destroyed", lx: 596, ly: 126, align: "middle" },
      { id: "allied-horse", x: 604, y: 428, heading: 92, formation: "line", arm: "cavalry", state: "broken", strength: 0.25, side: 0, name: "Allied horse", fact: "broken · 25%", lx: 604, ly: 480, align: "middle" },
      { id: "libyan-n", x: 688, y: 198, heading: 186, formation: "line", arm: "infantry", state: "engaged", strength: 1, side: 1, name: "Libyans, north", fact: "engaged", lx: 762, ly: 182, align: "start" },
      { id: "libyan-s", x: 690, y: 404, heading: 6, formation: "line", arm: "infantry", state: "engaged", strength: 1, side: 1, name: "Libyans, south", fact: "engaged", lx: 764, ly: 420, align: "start" },
      { id: "centre", x: 706, y: 300, heading: 272, formation: "mass", arm: "infantry", state: "broken", strength: 0.6, side: 1, name: "Gauls and Spaniards", fact: "broken · 60%", lx: 790, ly: 300, align: "start" },
      { id: "hasdrubal", x: 470, y: 302, heading: 90, formation: "line", arm: "cavalry", state: "intact", strength: 1, side: 1, name: "Hasdrubal's horse", fact: "intact", lx: 442, ly: 232, align: "end" },
      { id: "numidians", x: 632, y: 476, heading: 268, formation: "line", arm: "cavalry", state: "intact", strength: 1, side: 1, name: "Numidians", fact: "intact", lx: 726, ly: 486, align: "start" },
    ],
    moves: [
      { kind: "intent", a: { x: 688, y: 220 }, b: { x: 634, y: 268 }, side: 1, bend: -8 },
      { kind: "intent", a: { x: 690, y: 382 }, b: { x: 636, y: 334 }, side: 1, bend: 8 },
      { kind: "detachment", a: { x: 494, y: 302 }, b: { x: 552, y: 360 }, side: 1, bend: 12 },
      { kind: "track", a: { x: 380, y: 236 }, b: { x: 452, y: 292 }, side: 1 },
    ],
  },

  midway: {
    title: "The Battle of Midway",
    ground: midwayGround,
    sides: [["United States", STAFF.sides[0]], ["Japan", STAFF.sides[1]]],
    arms: ["infantry", "ship"],
    sampleArm: "ship",
    wind: { fromDeg: 128, force: "moderate", words: "WIND SE · MODERATE" },
    scale: { px: 120, labels: ["0", "20", "40", "60"], unit: "NAUTICAL MILES" },
    credit: "ATOLL AND REEF: NATURAL EARTH 10M (PUBLIC DOMAIN)",
    band: {
      clock: "10:25", date: "4 June 1942",
      phase: "THE DIVE BOMBERS COME DOWN",
      lines: [
        "Nagumo has turned north-east to close Spruance and is re-arming for a second strike; the Kaga, Akagi and Sōryū are hit within six",
        "minutes by Enterprise and Yorktown squadrons, and only the Hiryū, standing on to the north, is left able to fly off.",
      ],
      sources: "— CINCPAC 01849, COMBAT NARRATIVE (1943), NAGUMO REPORT (1947)",
    },
    units: [
      { id: "kido", x: 596, y: 236, heading: 66, formation: "line", arm: "ship", state: "engaged", strength: 0.35, side: 1, name: "Kidō Butai", fact: "engaged · 35%", lx: 486, ly: 314, align: "end", leader: true },
      { id: "hiryu", x: 706, y: 146, heading: 44, formation: "column", arm: "ship", state: "intact", strength: 1, side: 1, name: "Hiryū, detached", fact: "intact", lx: 626, ly: 106, align: "end" },
      { id: "tf16", x: 986, y: 132, heading: 232, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Task Force 16", fact: "intact", lx: 940, ly: 96, align: "end" },
      { id: "tf17", x: 1016, y: 306, heading: 238, formation: "column", arm: "ship", state: "intact", strength: 1, side: 0, name: "Task Force 17", fact: "intact", lx: 968, ly: 374, align: "end" },
      { id: "garrison", x: 330, y: 418, heading: 0, formation: "mass", arm: "infantry", state: "engaged", strength: 0.85, side: 0, name: "Midway garrison", fact: "engaged · 85%", lx: 404, ly: 396, align: "start", leader: true },
    ],
    // A CANDIDATE ONLY. Whether a strike is a unit and aircraft an arm is #131's; what the sign looks
    // like is #140's, which #131 blocks. Drawn here so both have a drawing to argue against.
    strikes: [
      { id: "eb", x: 794, y: 194, heading: 252, formation: "line", arm: "aircraft", state: "intact", strength: 1, side: 0, name: "Enterprise strike", fact: "intact", lx: 752, ly: 256, align: "end" },
      { id: "yb", x: 826, y: 306, heading: 246, formation: "line", arm: "aircraft", state: "intact", strength: 0.7, side: 0, name: "Yorktown strike", fact: "intact · 70%", lx: 782, ly: 378, align: "end" },
    ],
    moves: [
      { kind: "track", a: { x: 520, y: 428 }, b: { x: 578, y: 274 }, side: 1 },
      { kind: "detachment", a: { x: 692, y: 122 }, b: { x: 632, y: 50 }, side: 1, bend: 8 },
      { kind: "intent", a: { x: 906, y: 186 }, b: { x: 660, y: 226 }, side: 0, bend: -26 },
    ],
  },
};

// ---------------------------------------------------------------------------------------------------
// One scene, drawn whole: ground, moves, units, labels, neat line, furniture, caption band.
// ---------------------------------------------------------------------------------------------------
export function scene(key, { kind = "A", moves = "taper", elbow = true, aircraft = false, sea = "chosen", w = 1120, h = 650, bandTop = 560 } = {}) {
  const S = SCENES[key], ink = STAFF.ink;
  SEA = SEAS[sea];
  const glyph = glyphs[kind];
  const units = [...S.units, ...(aircraft && S.strikes ? S.strikes : [])];
  const colourOf = (u) => STAFF.sides[u.side];

  let s = `<rect width="${w}" height="${bandTop}" fill="${STAFF.letterbox}"/>`;
  s += `<clipPath id="ext"><rect x="${EXT.x}" y="${EXT.y}" width="${EXT.w}" height="${EXT.h}"/></clipPath>`;
  s += `<clipPath id="land"><path d="${LAND_CANNAE}"/></clipPath>`;
  s += `<g clip-path="url(#ext)">`;
  s += S.ground();

  for (const m of S.moves) s += move(m.kind, m.a, m.b, { style: moves, ink, colour: STAFF.sides[m.side], bend: m.bend ?? 0 });
  for (const u of units) s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading})">${glyph({ ...u, colour: colourOf(u), ink })}</g>`;
  for (const u of units) {
    const leader = u.leader ? { x1: u.x, y1: u.y, x2: u.lx + (u.align === "end" ? 6 : -6), y2: u.ly } : undefined;
    s += staffLabel(u.lx, u.ly, u.name, u.fact, colourOf(u), ink, u.align, leader, { elbow });
  }
  s += `</g>`;

  s += neatLine(EXT.x, EXT.y, EXT.w, EXT.h, ink);
  // Furniture, each piece in the corner the anatomy gives it, each drawn in the sheet's hand. The
  // graticule runs under every corner, so the title and the credit take paper panels as #62's rule has
  // the rose and the legend do on a plate with relief.
  s += `<rect x="${EXT.x + 14}" y="${EXT.y + 14}" width="240" height="116" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.8"/>`;
  s += northArrow(EXT.x + 46, EXT.y + 64, ink);
  if (S.wind) {
    s += windBarb(EXT.x + 150, EXT.y + 64, ink, S.wind.fromDeg, S.wind.force);
    s += text(EXT.x + 26, EXT.y + 116, S.wind.words, "scale", ink);
  } else {
    s += text(EXT.x + 26, EXT.y + 116, "NO WIND RECORDED", "scale", ink, { opacity: 0.55 });
  }

  const titleRight = EXT.x + EXT.w - 22;
  s += `<rect x="${titleRight - 320}" y="${EXT.y + 14}" width="336" height="34" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.8"/>`;
  s += text(titleRight, EXT.y + 31, S.title, "title", ink, { anchor: "end" });

  const scaleY = EXT.y + EXT.h - 26;
  s += `<rect x="${EXT.x + 22}" y="${scaleY - 22}" width="248" height="42" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.8"/>`;
  s += staffScaleBar(EXT.x + 34, scaleY, ink, S.scale);

  const sample = (o) => `<g transform="scale(0.62)">${glyph({ length: 68, formation: "line", arm: o.arm ?? S.sampleArm ?? "ship", ink, ...o })}</g>`;
  s += staffLegend(EXT.x + 22, scaleY - 34, { sides: S.sides, ink, panel: STAFF.panel, sample, arms: S.arms }).svg;

  const creditRight = EXT.x + EXT.w - 22;
  s += `<rect x="${creditRight - 344}" y="${EXT.y + EXT.h - 34}" width="352" height="22" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.8"/>`;
  s += text(creditRight, EXT.y + EXT.h - 23, S.credit, "credit", ink, { anchor: "end", opacity: 0.85 });

  s += staffCaptionBand(STAFF, S.band, w, bandTop, h - bandTop);
  return s;
}
