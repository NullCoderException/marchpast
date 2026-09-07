// The terrain canvas (#138): how each view draws the ground, now that ADR-0021 has made `ground` a
// module the view supplies rather than one shared pass. `node build.mjs` regenerates every artboard and
// canvas.json. Nothing here is merged to main.
//
// The scenes are the ones #62 decided against, so the comparison is like for like: Cannae phase 6 for
// relief and a river, Copenhagen phase 3 for a shoal and a point work, and a synthetic Alesia for line
// works. Terrain is synthetic and nothing is geo-registered; it is a scene, not a map file.
import { writeFileSync } from "node:fs";
import {
  PLATE, NIGHT, ATLAS, ticks, block, smokeFor, arrow, TRACK, INTENT, DETACH, label,
  compass, scaleBar, legend, HATCH, captionBandFor, page, card, seeded, f,
} from "./lib.mjs";
import { f1, catmull, LAND_CANNAE, RIVER, MIDDLE_GROUND, LAND_CPH, SALTHOLM, polyPath } from "./ground.mjs";
import {
  contoursSvg, hachuresSvg, hachureIndexSvg, tanakaSvg, tintSvg, hypsoSvg,
  staffTintSvg, staffContoursSvg, seaSvg, gridSvg, lineWorkSvg, ring,
} from "./terrain.mjs";

const EXT = { x: 20, y: 20, w: 1080, h: 520 };
const SANS_STACK = `"IBM Plex Sans Condensed", "Arial Narrow", sans-serif`;
const SANS = `font-family="${SANS_STACK}"`;

// ---------------------------------------------------------------------------------------------------
// The four views' materials. The engraved three are the values in src/render/views.ts; the staff map's
// two idioms are this ticket's proposal, and #139 picks the face and the rest of the view.
// ---------------------------------------------------------------------------------------------------
const CANNAE_SIDES = { plate: { Roman: "#8f2f24", Carthaginian: "#24406b" }, night: { Roman: "#e2685a", Carthaginian: "#86a9e8" } };
const V_PLATE = { ...PLATE, sides: CANNAE_SIDES.plate };
const V_NIGHT = { ...NIGHT, sides: CANNAE_SIDES.night };
const V_ATLAS = { ...ATLAS, sides: CANNAE_SIDES.plate };
const STAFF_A = {
  name: "Staff map", key: "ops", paper: "#ded7c2", land: "#d9d2b8", ink: "#2f3134", letterbox: "#c8c1ab",
  panel: "rgba(222,215,194,0.94)", coastStroke: "#7b8a93", stipple: "rgba(0,0,0,0)", smoke: "rgba(60,55,50,0.13)",
  contour: "#8d6b43", grid: "#4c5157", water: "#93a9b6", ramp: ["#d3cbab", "#cbc199", "#c1b587", "#b5a771", "#a6975e"],
  sides: { Roman: "#9c3327", Carthaginian: "#1f4f7a" },
};
const STAFF_B = {
  name: "Staff map", key: "modern", paper: "#f2f1ee", land: "#ebe9e0", ink: "#22252a", letterbox: "#dedcd6",
  panel: "rgba(242,241,238,0.94)", coastStroke: "#9fb4be", stipple: "rgba(0,0,0,0)", smoke: "rgba(60,55,50,0.10)",
  contour: "#a4906f", grid: "#b3b9c2", water: "#c6d7e0", ramp: ["#e7e4d6", "#e1ddca", "#d9d4bb", "#cfc9a9", "#c3bc95"],
  sides: { Roman: "#b03a2b", Carthaginian: "#28618f" },
};

// What each view tunes the relief to. The engraved three are today's values; the staff map's are its own.
const RELIEF = {
  plate: { lineW: 0.5, lineA: 0.32, indexW: 0.9, indexA: 0.62, numA: 0.75, hachA: 0.5, bandA: 0.065 },
  night: { lineW: 0.5, lineA: 0.22, indexW: 0.9, indexA: 0.5, numA: 0.65, hachA: 0.4, bandA: 0.055, tanakaGain: 2.4 },
  atlas: { lineW: 0.5, lineA: 0.22, indexW: 0.8, indexA: 0.45, numA: 0.65, hachA: 0.4, bandA: 0.075 },
  staff: { lineW: 0.45, lineA: 0.45, indexW: 0.9, indexA: 0.8, numA: 0.95 },
};
const ATLAS_RAMP = ["#e6d9b4", "#e0d0a4", "#d8c391", "#cdb37c", "#c0a066"];

// ---------------------------------------------------------------------------------------------------
// The ground, per view. This is the module ADR-0021 hands to the view; every branch of it is derived
// from the contour polylines and their levels, and from nothing else.
// ---------------------------------------------------------------------------------------------------
function groundSvg(mode, v, treatment) {
  const r = RELIEF[mode];
  if (treatment === "none") return "";
  if (treatment === "contours") return contoursSvg(v, r);
  if (treatment === "hachures") return hachuresSvg(v, r);
  if (treatment === "hachures+index") return hachureIndexSvg(v, r);
  if (treatment === "illuminated") return tanakaSvg(v, r, { shade: "#0d141c" });
  if (treatment === "tint") return tintSvg(v, r);
  if (treatment === "hypsometric") return hypsoSvg(v, r, ATLAS_RAMP);
  if (treatment === "staff") {
    return staffTintSvg(v.ramp) + staffContoursSvg(r, v.contour, { knockout: v.ramp[1], face: SANS });
  }
  return "";
}

// A staff map draws north as an arrow, not as a rose. Furniture is not this ticket's — this is a
// stand-in so the artboard does not claim an engraved rose belongs on an operations sheet (#139).
function northArrow(cx, cy, ink) {
  return `<g transform="translate(${cx} ${cy})" fill="${ink}" stroke="${ink}">` +
    `<line x1="0" y1="26" x2="0" y2="-20" stroke-width="1.4"/>` +
    `<path d="M0 -30 L5 -16 L0 -20 L-5 -16 Z" stroke="none"/>` +
    `<text y="42" font-size="12" text-anchor="middle" stroke="none" ${SANS} letter-spacing="1">N</text></g>`;
}

// ---------------------------------------------------------------------------------------------------
// Cannae, phase 6 (~10:15): the allied cavalry flees. The crowding is the point — the ground has to
// carry seven units and eight labels, which is what rules a treatment in or out.
// ---------------------------------------------------------------------------------------------------
const WIND_CANNAE = 315;
const CANNAE_UNITS = [
  { id: "roman-cavalry", x: 575, y: 225, heading: 200, formation: "line", state: "destroyed", strength: 0, side: "Roman", seed: 21 },
  { id: "roman-infantry", x: 690, y: 258, heading: 200, formation: "line", state: "engaged", strength: 0.9, side: "Roman", seed: 22 },
  { id: "allied-cavalry", x: 862, y: 338, heading: 110, formation: "line", state: "broken", strength: 0.1, side: "Roman", seed: 23 },
  { id: "hasdrubal", x: 790, y: 203, heading: 250, formation: "column", state: "engaged", strength: 1, side: "Carthaginian", seed: 24 },
  { id: "libyans-left", x: 620, y: 302, heading: 110, formation: "line", state: "engaged", strength: 1, side: "Carthaginian", seed: 25 },
  { id: "libyans-right", x: 768, y: 306, heading: 290, formation: "line", state: "engaged", strength: 1, side: "Carthaginian", seed: 26 },
  { id: "centre", x: 698, y: 338, heading: 20, formation: "line", state: "engaged", strength: 0.8, side: "Carthaginian", seed: 27 },
  { id: "numidians", x: 890, y: 246, heading: 110, formation: "column", state: "engaged", strength: 1, side: "Carthaginian", seed: 28 },
];

function placeSvg(x, y, name, v, align = "start", face = "") {
  const tx = align === "start" ? x + 8 : x - 8;
  const italic = face ? "" : ` font-style="italic"`;
  return `<circle cx="${x}" cy="${y}" r="2.5" fill="${v.ink}"/><text x="${tx}" y="${y}" font-size="13"${italic} ${face} fill="${v.ink}" text-anchor="${align}" dominant-baseline="middle">${name}</text>`;
}
// The point work: the engraved plan sign, and the staff map's own square-with-a-flag-staff.
function workSvg(x, y, name, v, staff = false) {
  if (staff) {
    return `<g transform="translate(${x} ${y})" stroke="${v.ink}" fill="none" stroke-width="1.2"><rect x="-4.5" y="-4.5" width="9" height="9" fill="${v.paper}"/><line x1="0" y1="-4.5" x2="0" y2="-13"/><path d="M0 -13 L7 -11 L0 -9 Z" fill="${v.ink}" stroke="none"/></g>` +
      `<text x="${x + 12}" y="${y}" font-size="11" ${SANS} fill="${v.ink}" dominant-baseline="middle" letter-spacing="0.6">${name.toUpperCase()}</text>`;
  }
  return `<g transform="translate(${x} ${y})" stroke="${v.ink}" fill="none" stroke-width="1"><rect x="-4" y="-4" width="8" height="8"/>` +
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `<path d="M${sx * 4} ${sy * 1.5} L${sx * 6.5} ${sy * 6.5} L${sx * 1.5} ${sy * 4}" fill="${v.paper}"/>`).join("") + `</g>` +
    `<text x="${x + 11}" y="${y}" font-size="11" fill="${v.ink}" dominant-baseline="middle" letter-spacing="0.5">${name.toUpperCase()}</text>`;
}

function riverSvg(d, v, staff = false) {
  if (staff) return `<path d="${d}" fill="none" stroke="${v.water}" stroke-width="3.6" stroke-linecap="round"/>`;
  return `<path d="${d}" fill="none" stroke="${v.ink}" stroke-width="3.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${v.paper}" stroke-width="2" stroke-linecap="round"/>`;
}

function cannaeScene(v, mode, treatment) {
  const ink = v.ink, r = RELIEF[mode];
  const isStaff = mode === "staff";
  const isAtlas = mode === "atlas";
  const face = isStaff ? SANS : "";
  const glyph = (u) => {
    const colour = v.sides[u.side];
    if (isAtlas || isStaff) return block({ ...u, colour, ink });
    const s = u.state === "engaged" || u.state === "broken" ? smokeFor("billow", { ...u, colour }, v, 1, WIND_CANNAE) : "";
    return s + ticks({ ...u, colour });
  };
  const legendGlyph = (o) => {
    const u = { heading: 270, formation: "column", length: o.length, ...o };
    const s = o.state === "engaged" || o.state === "broken" ? smokeFor("billow", u, v, o.scale ?? 1, WIND_CANNAE) : "";
    return s + ticks(o);
  };
  const T = isAtlas ? { ...TRACK(ink), width: 1.6 } : TRACK(ink);
  const I = isAtlas ? { ...INTENT(ink), width: 2.4 } : INTENT(ink);
  const D = (c) => (isAtlas ? { ...DETACH(c), width: 3.2, headSize: 14 } : DETACH(c));
  const ro = v.sides.Roman, ca = v.sides.Carthaginian;

  let s = `<rect width="1120" height="560" fill="${v.letterbox}"/>`;
  s += seaSvg(isStaff ? "flat" : mode === "night" ? "faint" : isAtlas ? "none" : "stipple", v, EXT, { water: v.water });
  s += `<clipPath id="ext"><rect x="20" y="20" width="1080" height="520"/></clipPath><clipPath id="landclip"><path d="${LAND_CANNAE}"/></clipPath><g clip-path="url(#ext)">`;
  s += `<path d="${LAND_CANNAE}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>`;
  s += `<g clip-path="url(#landclip)">${groundSvg(mode, v, treatment)}</g>`;
  // The grid is ground, not furniture: map space, under the units, its edge numerals riding with it.
  if (isStaff) s += gridSvg(EXT, v.grid, { face: SANS, alpha: isStaff && v.key === "ops" ? 0.5 : 0.7, numeralInk: v.ink });
  s += `<g clip-path="url(#landclip)">${riverSvg(RIVER.d, v, isStaff)}</g>`;
  s += placeSvg(440, 372, "Cannae", v, "start", face);
  s += placeSvg(318, 336, "Aufidus", v, "end", face);
  s += workSvg(372, 292, "Roman camp", v, isStaff);
  s += workSvg(236, 312, "Hannibal’s camp", v, isStaff);
  s += arrow({ x: 862, y: 338 }, { x: 968, y: 392 }, T);
  s += arrow({ x: 790, y: 203 }, { x: 712, y: 206 }, I);
  s += arrow({ x: 890, y: 246 }, { x: 1050, y: 330 }, D(ca));
  for (const u of CANNAE_UNITS) s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading})">${glyph(u)}</g>`;
  const lab = (x, y, name, detail, colour, align, leader) =>
    label(x, y, name, detail, colour, ink, align, leader);
  s += lab(552, 214, "Roman cavalry", "destroyed", ro, "end");
  s += lab(616, 148, "Roman infantry", "engaged · 90%", ro, "end", { x1: 690, y1: 258, x2: 622, y2: 156 });
  s += lab(884, 376, "Allied cavalry", "broken · 10%", ro, "start");
  s += lab(808, 168, "Hasdrubal’s horse", "engaged", ca, "start");
  s += lab(596, 302, "Libyans, river flank", "engaged", ca, "end");
  s += lab(958, 286, "Libyans, open flank", "engaged", ca, "start", { x1: 768, y1: 306, x2: 954, y2: 290 });
  s += lab(698, 392, "Spanish and Gallic foot", "engaged · 80%", ca, "middle");
  s += lab(912, 222, "Numidians", "engaged", ca, "start");
  s += `</g>`;

  // The plate rule and the furniture. Furniture is #139's and #127's; drawn here only so the ground is
  // judged with the corners covered, as it will be in the app.
  if (isStaff) {
    s += `<g fill="none" stroke="${ink}" stroke-width="1.2"><rect x="20.5" y="20.5" width="1079" height="519"/></g>`;
    s += `<rect x="34" y="34" width="150" height="96" fill="${v.panel}" stroke="${v.grid}" stroke-width="0.8"/>`;
    s += northArrow(72, 78, ink);
    s += `<text x="104" y="62" font-size="12" ${SANS} fill="${ink}" dominant-baseline="hanging">WIND SE</text>`;
    s += `<text x="104" y="80" font-size="12" ${SANS} fill="${ink}" dominant-baseline="hanging">FRESH</text>`;
    // The graticule runs under every corner, so the title and credit take panels as they do on a plate
    // with relief under them (#62's rule, which the grid makes true of a staff map at every extent).
    s += `<rect x="812" y="30" width="278" height="30" fill="${v.panel}"/>`;
    s += `<text x="1080" y="38" font-size="20" ${SANS} fill="${ink}" text-anchor="end" dominant-baseline="hanging" letter-spacing="1.2">THE BATTLE OF CANNAE</text>`;
    s += `<rect x="700" y="516" width="392" height="16" fill="${v.panel}"/>`;
    s += `<rect x="34" y="330" width="200" height="200" fill="${v.panel}" stroke="${v.grid}" stroke-width="0.8"/>`;
    s += scaleBar(46, 514, ink, 100, "2 km · contours at 10 m");
    s += legend(46, 514 - 8 - 14 - 14, v, block);
    s += `<text x="1086" y="528" font-size="11" ${SANS} fill="${ink}" text-anchor="end">Contours: SRTM 1 arc-second · river: Natural Earth (both public domain)</text>`;
  } else {
    s += `<g fill="none" stroke="${ink}" stroke-width="1"><rect x="20.5" y="20.5" width="1079" height="519"/><rect x="25.5" y="25.5" width="1069" height="509"/></g>`;
    s += `<rect x="34" y="34" width="236" height="128" fill="${v.panel}"/>`;
    s += compass(94, 98, ink, 135, 2, true, "Wind SE, fresh");
    s += `<rect x="868" y="32" width="222" height="34" fill="${v.panel}"/>`;
    s += `<text x="1078" y="38" font-size="22" fill="${ink}" text-anchor="end" dominant-baseline="hanging">The Battle of Cannae</text>`;
    s += `<rect x="34" y="330" width="200" height="200" fill="${v.panel}"/>`;
    s += scaleBar(46, 514, ink, 100, "2 km · contours at 10 m");
    s += legend(46, 514 - 8 - 14 - 14, v, isAtlas ? block : legendGlyph);
    s += `<rect x="700" y="516" width="392" height="16" fill="${v.panel}"/>`;
    s += `<text x="1086" y="528" font-size="11" font-style="italic" fill="${ink}" text-anchor="end">Contours: SRTM 1 arc-second · river: Natural Earth (both public domain)</text>`;
  }
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

// One artboard per view, with a chip that switches its ground. The chip is the argument: every option
// behind it is a candidate for THAT view's `ground` module, not a setting shared with the others.
function viewBoard(v, mode, treatments, prop) {
  const board = (t) => `<svg width="1120" height="650" viewBox="0 0 1120 650" xmlns="http://www.w3.org/2000/svg" style="display: block;">
${HATCH(v.ink)}
${cannaeScene(v, mode, t)}
${captionBandFor(v, CANNAE_CAPTION)}
</svg>`;
  const key = (t) => t.replace(/[^a-z]/g, "_");
  const branches = treatments.map((t, i) => `<sc-if value="{{ is_${key(t)} }}" hint-placeholder-val="{{ ${i === 0} }}">${board(t)}</sc-if>`).join("\n");
  const opts = JSON.stringify(treatments);
  const script = `<script data-dc-script data-props='{"${prop}":{"editor":"enum","options":${opts},"default":"${treatments[0]}","section":"Ground"}}'>
class Component extends DCLogic {
  renderVals() {
    const k = this.props.${prop} ?? ${JSON.stringify(treatments[0])};
    return { ${treatments.map((t) => `is_${key(t)}: k === ${JSON.stringify(t)}`).join(", ")} };
  }
}
</script>`;
  const style = mode === "staff" ? `svg text { font-family: ${SANS_STACK}; }` : "";
  return page(v.name, `<div style="width: 1120px; height: 650px; background: ${v.letterbox}; overflow: hidden;">${branches}</div>`, style)
    .replace("</x-dc>", `</x-dc>\n${script}`);
}

writeFileSync("Main.dc.html", viewBoard(V_PLATE, "plate", ["contours", "hachures", "hachures+index", "tint", "none"], "ground"));
writeFileSync("NightPlate.dc.html", viewBoard(V_NIGHT, "night", ["contours", "illuminated", "hachures"], "ground"));
writeFileSync("Atlas.dc.html", viewBoard(V_ATLAS, "atlas", ["tint", "hypsometric", "contours"], "ground"));
writeFileSync("StaffMap.dc.html", (() => {
  const board = (v) => `<svg width="1120" height="650" viewBox="0 0 1120 650" xmlns="http://www.w3.org/2000/svg" style="display: block;">
${HATCH(v.ink)}
${cannaeScene(v, "staff", "staff")}
${captionBandFor(v, CANNAE_CAPTION)}
</svg>`;
  const branches = [STAFF_A, STAFF_B].map((v, i) => `<sc-if value="{{ is_${v.key} }}" hint-placeholder-val="{{ ${i === 0} }}">${board(v)}</sc-if>`).join("\n");
  const script = `<script data-dc-script data-props='{"sheet":{"editor":"enum","options":["ops","modern"],"default":"ops","section":"Ground"}}'>
class Component extends DCLogic {
  renderVals() {
    const k = this.props.sheet ?? "ops";
    return { is_ops: k === "ops", is_modern: k === "modern" };
  }
}
</script>`;
  return page("Staff map", `<div style="width: 1120px; height: 650px; background: ${STAFF_A.letterbox}; overflow: hidden;">${branches}</div>`,
    `svg text { font-family: ${SANS_STACK}; }`).replace("</x-dc>", `</x-dc>\n${script}`);
})());

// ---------------------------------------------------------------------------------------------------
// Copenhagen: the shoal and the point work, the same water in all four views.
// ---------------------------------------------------------------------------------------------------
function shoalSvg(d, v, id, kind) {
  const rnd = seeded(17);
  let fill = "";
  if (kind === "flat") {
    // the staff map has a colour for shallow water, so it needs no texture at all
    return `<path d="${d}" fill="${v.shallow}" stroke="${v.water}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  }
  for (let y = 36; y < 526; y += 7) for (let x = 460; x < 576; x += 7) {
    fill += `<circle cx="${f1(x + (rnd() - 0.5) * 3)}" cy="${f1(y + (rnd() - 0.5) * 3)}" r="0.8" fill="${v.ink}" fill-opacity="0.45"/>`;
  }
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${fill}</g>` +
    `<path d="${d}" fill="none" stroke="${v.ink}" stroke-width="1" stroke-dasharray="1 3" stroke-linecap="round"/>`;
}

function copenhagenScene(v, mode, id) {
  const isStaff = mode === "staff";
  const ink = v.ink, face = isStaff ? SANS : "";
  let s = `<rect width="1120" height="560" fill="${v.letterbox}"/>`;
  s += seaSvg(isStaff ? "flat" : mode === "night" ? "faint" : mode === "atlas" ? "none" : "stipple", v, EXT, { water: v.water });
  s += `<clipPath id="e${id}"><rect x="20" y="20" width="1080" height="520"/></clipPath><g clip-path="url(#e${id})">`;
  s += shoalSvg(MIDDLE_GROUND.d, v, `sh${id}`, isStaff ? "flat" : "dots");
  s += `<path d="${LAND_CPH}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>`;
  s += `<path d="${SALTHOLM.d}" fill="${v.land}" stroke="${v.coastStroke}" stroke-width="1"/>`;
  if (isStaff) s += gridSvg(EXT, v.grid, { face: SANS, alpha: 0.5, numeralInk: v.ink, pitch: 110, originE: 61, originN: 44 });
  s += placeSvg(200, 130, "Copenhagen", v, "start", face);
  s += placeSvg(516, 200, "Middle Ground", v, "end", face);
  s += placeSvg(968, 318, "Saltholm", v, "start", face);
  s += workSvg(352, 170, "Trekroner", v, isStaff);
  s += `</g><g fill="none" stroke="${ink}" stroke-width="1"><rect x="20.5" y="20.5" width="1079" height="519"/></g>`;
  return s;
}

// ---------------------------------------------------------------------------------------------------
// Alesia: a work that is a line. `work` is a Point today (ADR-0012) — whether the schema gains a line
// work is #132's; what one LOOKS like is this ticket's, and the four idioms differ.
// ---------------------------------------------------------------------------------------------------
const OPPIDUM = ring(560, 268, 96, 62, 26, 7, 0.06);
const CONTRA = ring(560, 272, 168, 118, 46, 11, 0.05); // the inner line, facing the town
const CIRCUM = ring(560, 276, 268, 196, 58, 13, 0.05); // the outer line, facing the relief army

function alesiaScene(v, mode, id) {
  const isStaff = mode === "staff";
  const isAtlas = mode === "atlas";
  const kind = isStaff ? "staff" : isAtlas ? "atlas" : "engraved";
  const face = isStaff ? SANS : "";
  const ink = v.ink;
  let s = `<rect width="1120" height="560" fill="${v.letterbox}"/>`;
  s += seaSvg(isStaff ? "none" : mode === "night" ? "faint" : isAtlas ? "none" : "stipple", v, EXT, {});
  s += `<clipPath id="a${id}"><rect x="20" y="20" width="1080" height="520"/></clipPath><g clip-path="url(#a${id})">`;
  s += `<rect x="20" y="20" width="1080" height="520" fill="${v.land}"/>`;
  if (isStaff) s += gridSvg(EXT, v.grid, { face: SANS, alpha: 0.45, numeralInk: v.ink, pitch: 120, originE: 18, originN: 55 });
  // the oppidum's hill, as a closed form; the lines follow the ground around it
  s += `<path d="${polyPath(OPPIDUM, true)}" fill="${isStaff ? v.ramp[2] : v.ink}" fill-opacity="${isStaff ? 1 : 0.09}" stroke="${isStaff ? v.contour : v.ink}" stroke-width="0.9" stroke-opacity="0.7"/>`;
  // teeth outward: the contravallation faces the town (inward), the circumvallation faces the relief army
  s += lineWorkSvg(CONTRA, v, kind, { outward: -1, stroke: isStaff ? v.ink : v.ink });
  s += lineWorkSvg(CIRCUM, v, kind, { outward: 1, stroke: isStaff ? v.ink : v.ink });
  s += placeSvg(560, 268, "Alesia", v, "start", face);
  s += workSvg(700, 150, "North camp", v, isStaff);
  s += workSvg(392, 402, "Camp C", v, isStaff);
  s += `</g><g fill="none" stroke="${ink}" stroke-width="1"><rect x="20.5" y="20.5" width="1079" height="519"/></g>`;
  return s;
}

// A four-up sheet: the same ground in all four views, so the difference is the only thing on the page.
// The window is a 1:1 DETAIL of the scene, not the scene shrunk — a shoal's stipple and a work's teeth
// are the whole argument, and at half size all four views look alike.
function fourUp(title, note, sceneFn, filename, win) {
  const views = [
    [V_PLATE, "plate", "Chart plate"],
    [V_NIGHT, "night", "Night plate"],
    [V_ATLAS, "atlas", "Atlas"],
    [{ ...STAFF_A, shallow: "#b8c9d1" }, "staff", "Staff map"],
  ];
  const PW = 528, PH = 288;
  const panels = views.map(([v, mode, name], i) => {
    const x = 32 + (i % 2) * (PW + 24), y = 118 + Math.floor(i / 2) * (PH + 48);
    return `<g transform="translate(${x} ${y})">` +
      `<clipPath id="p${i}"><rect width="${PW}" height="${PH}"/></clipPath>` +
      `<g clip-path="url(#p${i})"><g transform="translate(${-win.x} ${-win.y})">${sceneFn(v, mode, i)}</g></g>` +
      `<rect x="0.5" y="0.5" width="${PW - 1}" height="${PH - 1}" fill="none" stroke="#2b2418" stroke-width="1"/>` +
      `<text x="0" y="${PH + 18}" font-size="15" fill="#2b2418">${name}</text></g>`;
  }).join("");
  const H = 118 + 2 * (PH + 48) + 8;
  const svg = `<svg width="1140" height="${H}" viewBox="0 0 1140 ${H}" xmlns="http://www.w3.org/2000/svg" style="display: block;">
  <rect width="1140" height="${H}" fill="#efe3c6"/>
  <text x="32" y="40" font-size="28" fill="#2b2418">${title}</text>
  ${note.map((t, i) => `<text x="32" y="${72 + i * 19}" font-size="14" font-style="italic" fill="#2b2418">${t}</text>`).join("")}
  ${panels}</svg>`;
  writeFileSync(filename, page(title, `<div style="width: 1140px; background: #efe3c6;">${svg}</div>`, `svg text.sans { font-family: ${SANS_STACK}; }`));
  return H;
}

const SHORE_H = fourUp(
  "Shore, sea and a work at a point",
  [
    "The same water in every view. The plate tells the shoal from the sea by density and regularity against a loose mottle; the night plate does the same in parchment;",
    "the atlas drops the sea stipple altogether; the staff map has a colour for shallow water, so it needs no texture at all and the shoal becomes a tint with a dashed edge.",
  ],
  copenhagenScene, "Shore.dc.html", { x: 292, y: 56 });

const WORKS_H = fourUp(
  "A work that is a line",
  [
    "Alesia’s two lines: the contravallation facing the town, the circumvallation facing the relief army, teeth on the outward side of each. `work` is a Point today (ADR-0012);",
    "whether the schema gains a line work is #132’s. What one looks like is this ticket’s — a fine line with the ditch’s teeth engraved, one heavy line in the atlas, an obstacle in the staff map.",
  ],
  alesiaScene, "LineWorks.dc.html", { x: 566, y: 132 });

// ---------------------------------------------------------------------------------------------------
// The cost sheet: what each treatment charges the build, per view.
// ---------------------------------------------------------------------------------------------------
const COST_ROWS = [
  ["Chart plate", "contours weighted by level", "palette + shared", "Shipped. Two widths, two alphas, numerals in a column at the foot of the plate.", "none"],
  ["Chart plate", "hachures from the contours", "a drawing pass", "One walk per ring at a fixed arc step, plus a nearest-point search on the level above. ~5 000 strokes on Cannae.", "a `ground` hand"],
  ["Night plate", "illuminated contours", "a drawing pass", "One pass over the same rings, segment by segment, weight and ink from the angle to one light.", "a `ground` hand"],
  ["Atlas", "tint bands, stacked ink", "palette", "Shipped. Five fills of one alpha; higher ground darkens because the bands stack.", "none"],
  ["Atlas", "hypsometric ramp", "palette", "The same five fills, each a colour off a ramp the view carries instead of one alpha.", "five palette values"],
  ["Staff map", "flat steps, grid, contours", "a drawing pass", "The tints as above, a graticule in map space with edge numerals, contours numbered into the line.", "a `ground` hand"],
];
const COST = page("What each treatment costs",
  `<div style="width: 1140px; padding: 32px; box-sizing: border-box; background: #efe3c6; display: flex; flex-direction: column; gap: 20px;">
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="font-size: 30px;">What each treatment costs the build</div>
    <div style="font-size: 15px; font-style: italic; max-width: 940px;">ADR-0021 gives a view four modules, of which <b style="font-weight: normal; font-style: normal;">ground</b> is the one this ticket fills. A treatment is either a value the view already carries on its palette, or a hand the view supplies that draws. Every one of them below is derived from the contour polylines and their levels and from nothing else, so ADR-0007’s “exactly two” and ADR-0012’s contours-only decision stand unamended — which is the fact that reopens the hachures #62 rejected.</div>
  </div>
  <div style="display: grid; grid-template-columns: 130px 210px 130px 1fr 150px; gap: 0; border: 1px solid #2b2418; font-size: 13px;">
    ${["View", "Treatment", "Kind", "What it costs", "New in the view"].map((h) => `<div style="padding: 9px 11px; border-bottom: 1px solid #2b2418; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">${h}</div>`).join("")}
    ${COST_ROWS.map((row, i) => row.map((cell) => `<div style="padding: 9px 11px; ${i < COST_ROWS.length - 1 ? "border-bottom: 1px solid rgba(43,36,24,0.25);" : ""} line-height: 1.45;">${cell}</div>`).join("")).join("")}
  </div>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;">
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 13px 15px; border: 1px solid #2b2418;">
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">The anatomy, unchanged by any of it</div>
      <div style="font-size: 13px; line-height: 1.45;">The ground is drawn in map space through the projection, under everything else; land, then the ground’s own treatment, then water, then the named things. Every fifth level is the index level and carries the height. The sea is told from the land. A shoal is neither. None of it carries a side’s colour. A reader who has learned to read height on one view reads it on all four.</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px; padding: 13px 15px; border: 1px solid #2b2418;">
      <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">What the view owns</div>
      <div style="font-size: 13px; line-height: 1.45;">Whether height is a line, a stroke down the slope, a tone or a step of colour; whether the sea is a mottle, a fainter mottle, blank paper or a flat body of water; where the numerals sit — a column at the foot of the plate, or broken into the line and turned to lie along it; whether there is a graticule, which is <b style="font-weight: normal; font-style: normal;">ground</b> and not furniture (ADR-0021), and so is drawn here beside the land.</div>
    </div>
  </div>
</div>`);
writeFileSync("Cost.dc.html", COST);

// ---------------------------------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------------------------------
const P1 = "page-1", P2 = "page-2";
const canvas = {
  pages: [{ id: P1, name: "The ground, four views" }, { id: P2, name: "Shore, works and cost" }],
  artboards: [
    { file: "Main.dc.html", x: 0, y: 0, w: 1120, h: 650, title: "Chart plate · Cannae (ground chip)", page: P1 },
    { file: "NightPlate.dc.html", x: 1220, y: 0, w: 1120, h: 650, title: "Night plate · Cannae (ground chip)", page: P1 },
    { file: "Atlas.dc.html", x: 0, y: 800, w: 1120, h: 650, title: "Atlas · Cannae (ground chip)", page: P1 },
    { file: "StaffMap.dc.html", x: 1220, y: 800, w: 1120, h: 650, title: "Staff map · Cannae (sheet chip)", page: P1 },
    { file: "Shore.dc.html", x: 0, y: 0, w: 1140, h: SHORE_H, title: "Shore, sea and a work at a point", page: P2 },
    { file: "LineWorks.dc.html", x: 1240, y: 0, w: 1140, h: WORKS_H, title: "A work that is a line", page: P2 },
    { file: "Cost.dc.html", x: 2480, y: 0, w: 1140, h: 700, title: "What each treatment costs", page: P2 },
  ],
  annotations: [
    { id: "ground-intro", x: 0, y: -230, w: 1120, page: P1, text: "TERRAIN TREATMENTS PER VIEW (#138). ADR-0021 made `ground` a module the view supplies, so the question #62 answered once for one shared pass is open again per view. Each board is Cannae phase 6 — seven units, eight labels, 64 contour lines at 10 m — with a chip that switches that view's ground. The crowding is the point: a treatment that drowns the units is out however well it draws. Units are the tick and block glyphs already decided; what a legion looks like, and the staff map's own glyph, type and furniture, are #139's." },
    { id: "ground-claim", x: 1220, y: -230, w: 1120, page: P1, text: "THE CLAIM TO TEST FIRST. #62 rejected hachures because \"they need slope and aspect, which means the raster foreign member\", and so amended ADR-0007 and ADR-0012. That is not true of the hachures on the plate board: a contour ring carries its own uphill direction in its winding, and the distance to the next ring up is the steepness. Every treatment here is cut from the contour polylines and their levels and NOTHING else — no slope field, no aspect, no raster. If the hachures are still rejected it is now on the drawing, not on the data." },
    { id: "ground-night", x: 2440, y: 0, w: 520, page: P1, text: "THE NIGHT PLATE'S OWN READING. Under ADR-0021 the night plate may do more than invert the plate's alphas. `illuminated` is Tanaka's method: one light low in the north-west, each contour segment lit or shaded by the angle its uphill normal makes with it, so the hill is modelled by the lines themselves and nothing is washed over the paper. The cost is measurement — on the shaded side the line all but goes out, and a height cannot be read there. Whether that is the night plate's bargain to make is the decision." },
    { id: "ground-staff", x: 1220, y: 1480, w: 1120, page: P1, text: "THE STAFF MAP'S GROUND, in two idioms: `ops` a printed operations sheet, `modern` a clean one. Both draw the same anatomy in a different hand — flat steps of colour instead of stacked ink, a kilometre graticule (which ADR-0021 makes GROUND, not furniture, so it is drawn here beside the land and under the units), and the height set INTO the contour, turned to lie along it, where the plate gathers its numerals in a column at the foot. The face is IBM Plex Sans Condensed as a stand-in; the view's type, glyph and furniture are #139's." },
    { id: "cost-note", x: 2480, y: -230, w: 1140, page: P2, text: "TO DECIDE: (1) the chart plate's ground — contours as they are, or hachures now that they cost no schema change. (2) Whether the night plate keeps the plate's ground or takes the illuminated one. (3) Whether the atlas's bands stay stacked ink or become a ramp the view carries. (4) The staff map's sheet, ops or modern. (5) The sea per view. (6) A line work's three idioms, which is also the drawing #132 decides its schema against." },
  ],
  launch: { view: "canvas", page: P1 },
};
writeFileSync("canvas.json", JSON.stringify(canvas, null, 2));
console.log("wrote terrain artboards");
