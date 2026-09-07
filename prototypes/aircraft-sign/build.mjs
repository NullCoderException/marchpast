// Builds the aircraft-sign canvas (#140): eleven artboards across two pages. Run `node build.mjs` in
// this directory, then seed and publish with the design skill's helper.
//
// One design canvas per prototype ticket (ADR-0021), so #58's, #138's and #139's all stay frozen; what
// this one borrows from them it borrows as copied source (lib.mjs, terrain.mjs, ground.mjs from
// prototype/terrain; staff.mjs, scenes.mjs from prototype/staff-map), never by editing theirs.

import { writeFileSync } from "node:fs";
import { PLATE, NIGHT, ATLAS, f } from "./lib.mjs";
import {
  plateGlyph, atlasGlyph, billow, surfaceDrift, AIRCRAFT_PLATE, AIRCRAFT_STAFF,
  PLATE_SIGNS, SIGN_HALF_WIDTH, SIGN_HALF_HEIGHT,
} from "./aircraft.mjs";
import { plateFrame, plateLegend, WIND_TO } from "./frames.mjs";
import { STAFF, FACES, FONT_LINK, frameGlyph, traceGlyph } from "./staff.mjs";
import { scene } from "./scenes.mjs";

const FONT = `<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&amp;display=swap" rel="stylesheet">`;
const FACE = `"IM Fell English", Georgia, "Times New Roman", serif`;
const US = PLATE.sides.British, JP = PLATE.sides["Combined Fleet"];

// ---------------------------------------------------------------------------------------------------
// Sheet furniture: a titled page with a heading, a standfirst and a run of cards, all in the plate's
// own hand so a candidate is never flattered by chrome the plate would not draw.
// ---------------------------------------------------------------------------------------------------
function sheet(title, standfirst, body, w, h, { face = FACE, font = FONT, ground = PLATE.paper, ink = PLATE.ink } = {}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${font}
  <style>
    body { margin: 0; font-family: ${face}; color: ${ink}; background: ${ground}; }
    a { color: ${US}; } a:hover { color: ${ink}; }
    svg text { font-family: inherit; }
  </style>
</helmet>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="${ground}"/>
  <text x="40" y="46" font-size="26" fill="${ink}">${title}</text>
  ${wrap(standfirst, Math.floor((w - 80) / 6.1)).map((t, i) => `<text x="40" y="${76 + i * 19}" font-size="14" font-style="italic" fill="${ink}" fill-opacity="0.88">${t}</text>`).join("\n  ")}
  <line x1="40" y1="${80 + wrap(standfirst, Math.floor((w - 80) / 6.1)).length * 19}" x2="${w - 40}" y2="${80 + wrap(standfirst, Math.floor((w - 80) / 6.1)).length * 19}" stroke="${ink}" stroke-width="1"/>
  <line x1="40" y1="${83 + wrap(standfirst, Math.floor((w - 80) / 6.1)).length * 19}" x2="${w - 40}" y2="${83 + wrap(standfirst, Math.floor((w - 80) / 6.1)).length * 19}" stroke="${ink}" stroke-width="0.5"/>
${body}
</svg>
</x-dc>
</body>
</html>
`;
}

function wrap(body, cols) {
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

/** A card: a ruled box, a small-caps head, a drawing, and italic notes along the foot. */
function card(x, y, w, h, head, notes, inner, { ink = PLATE.ink, paper = PLATE.paper, innerX = w / 2, innerY = 44, chosen = false } = {}) {
  const lines = wrap(notes, Math.floor((w - 28) / 5.5));
  return `<g transform="translate(${x} ${y})">` +
    `<rect width="${w}" height="${h}" fill="${paper}" stroke="${ink}" stroke-width="${chosen ? 2.4 : 1}"/>` +
    `<text x="14" y="24" font-size="14" fill="${ink}" letter-spacing="0.6">${head}</text>` +
    (chosen ? `<text x="${w - 14}" y="24" font-size="10.5" fill="${ink}" text-anchor="end" letter-spacing="1.6">CHOSEN</text>` : "") +
    `<line x1="14" y1="33" x2="${w - 14}" y2="33" stroke="${ink}" stroke-width="${chosen ? 1.6 : 0.6}" stroke-opacity="${chosen ? 0.9 : 0.5}"/>` +
    lines.map((t, i) => `<text x="14" y="${h - 14 - (lines.length - 1 - i) * 15}" font-size="11.5" font-style="italic" fill="${ink}" fill-opacity="0.9">${t}</text>`).join("") +
    `<g transform="translate(${innerX} ${innerY})">${inner}</g></g>`;
}

const headTop = (standfirst, w) => 102 + wrap(standfirst, Math.floor((w - 80) / 6.1)).length * 19;

const cardH = (w, notes, innerH, innerY = 44) => innerY + innerH + wrap(notes, Math.floor((w - 28) / 5.5)).length * 15 + 16;

/** A caption under a drawing. */
const cap = (x, y, t, ink = PLATE.ink, anchor = "middle", size = 11) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-style="italic" fill="${ink}" fill-opacity="0.85" text-anchor="${anchor}">${t}</text>`;

/** One sign magnified, with the 5.2 × 6.5 footprint it has to live inside drawn round it. */
function magnified(signFn, colour, k = 9, ink = PLATE.ink) {
  const half = { x: SIGN_HALF_WIDTH * k, y: SIGN_HALF_HEIGHT * k };
  return `<rect x="${f(-half.x)}" y="${f(-half.y)}" width="${f(half.x * 2)}" height="${f(half.y * 2)}" fill="none" stroke="${ink}" stroke-width="0.7" stroke-dasharray="3 3" stroke-opacity="0.5"/>` +
    signFn(half, colour, 1.4 * k, k);
}

// ===================================================================================================
// 1 · Main — the plate's sign
// ===================================================================================================
function boardMain() {
  const SF = ["ADR-0024 put `aircraft` on the arm allowlist; ADR-0015 obliges every view to draw every arm, enforced by the sign table's type. This is the chart plate's, and the night plate takes it unchanged.","The footprint is fixed: 5.2 by 6.5 px, eight of them to a unit at a pitch of nine (ADR-0016). Everything below is drawn at that size, at the renderer's own slot arithmetic, in the plate's 1.4 px pen."];
  const W = 1300, ink = PLATE.ink;
  let s = "";
  let y = headTop(SF, W);

  // The three that exist, as the baseline the fourth has to join.
  const existing = [
    ["Ship — the v1 chevron", "ship", "An open chevron pointing ahead. The only sign that shows a heading."],
    ["Infantry — the rank bar", "infantry", "A short solid bar across the heading. Says nothing about which way it faces."],
    ["Cavalry — the bar, barred", "cavalry", "The same bar with one diagonal, the convention Atlas uses inside its block."],
  ];
  s += `<text x="40" y="${y}" font-size="17" fill="${ink}">The three signs that exist (ADR-0016)</text>`;
  y += 22;
  existing.forEach(([head, arm, note], i) => {
    const x = 40 + i * 414;
    s += card(x, y, 390, 178, head, note,
      magnified(PLATE_SIGNS[arm], ink) +
      `<g transform="translate(120 0)">${plateGlyph({ arm, formation: "line", colour: ink, seed: 2 })}</g>` +
      cap(0, 52, "one sign, ×9") + cap(120, 52, "eight, in line"),
      { innerX: 110, innerY: 74 });
  });
  y += 178 + 34;

  s += `<text x="40" y="${y}" font-size="17" fill="${ink}">The fourth: three candidates</text>`;
  y += 22;

  const cands = [
    ["A · Plan", "The aeroplane seen from above — fuselage, wing, tailplane. Three strokes, and the only candidate nobody has to be taught. Against it: three strokes is the most ink of the three, and the tailplane is the first thing to close up at legend scale."],
    ["B · Dart", "The swept arrowhead the symbol traditions use for air. One filled shape, so it keeps its weight at any size. Against it: the plate's only filled sign today is the rank bar, and this is the same silhouette the detachment pen already puts on the plate."],
    ["C · Roundel", "The national marking every aeroplane in 1942 carried, and the one mark in this system that is neither a line nor a wedge — so nothing else on the plate can be mistaken for it. Against it: it does not point, so a strike's attack run is carried by the rank's orientation and the track alone; and eight small rings sit close to what Billow's puffs already are."],
  ];
  const candH = Math.max(...cands.map(([, n]) => cardH(390, n, 178, 74)));
  cands.forEach(([head, note], i) => {
    const x = 40 + i * 414;
    const k = head[0];
    const inner =
      `<g transform="translate(-132 0)">${magnified(AIRCRAFT_PLATE[k], ink)}</g>` +
      `<g transform="translate(0 0)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "line", colour: ink, seed: 2 })}</g>` +
      `<g transform="translate(120 0)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "mass", colour: ink, seed: 2 })}</g>` +
      cap(-132, 50, "one sign, ×9") + cap(0, 50, "line") + cap(120, 50, "mass") +
      `<g transform="translate(-132 118)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "column", colour: ink, seed: 2 })}</g>` +
      cap(-132, 166, "column") +
      // The crowded test: a strike drawn hard over a carrier, both at plate size, 22 px apart.
      `<g transform="translate(40 106)">${plateGlyph({ arm: "ship", formation: "line", colour: JP, seed: 4 })}</g>` +
      `<g transform="translate(40 128)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "line", colour: US, seed: 4 })}</g>` +
      cap(40, 166, "a strike over a carrier, 22 px apart");
    s += card(x, y, 390, candH, head, note, inner, { innerX: 195, innerY: 74, chosen: k === "A" });
  });
  y += candH + 34;

  // Strength: VT-8's twenty minutes, in every candidate.
  const deadNote = "A fourth was drawn first and is kept here because it decided the shape of the question. Two swept strokes with no fuselage is the lightest mark that still points, and at nine times magnification it is plainly an aeroplane — but at the footprint the plate actually draws, with a 1.4 px pen and round caps, the two strokes close up at the nose and it comes out as the ship's own chevron. Side by side below, in the two inks a Midway plate would use, there is nothing to tell them apart. That is why every surviving candidate departs from the chevron in KIND — a cross, a solid, a ring — rather than in degree.";
  const deadInner =
    `<g transform="translate(-150 0)">${magnified(AIRCRAFT_PLATE.D, ink)}</g>` +
    `<g transform="translate(-150 60)">${magnified(PLATE_SIGNS.ship, ink, 5)}</g>` +
    `<g transform="translate(20 0)">${plateGlyph({ arm: "aircraft", candidate: "D", formation: "line", colour: US, seed: 4 })}</g>` +
    `<g transform="translate(20 22)">${plateGlyph({ arm: "ship", formation: "line", colour: JP, seed: 4 })}</g>` +
    `<g transform="translate(230 0)">${plateGlyph({ arm: "aircraft", candidate: "D", formation: "line", colour: ink, seed: 4 })}</g>` +
    `<g transform="translate(230 22)">${plateGlyph({ arm: "ship", formation: "line", colour: ink, seed: 4 })}</g>` +
    cap(-150, 96, "D at ×9, the chevron at ×5 beneath") + cap(20, 48, "in two side inks") + cap(230, 48, "in one ink");
  s += card(40, y, W - 80, cardH(W - 80, deadNote, 106, 74), "D · Wings — the one the paper refused", deadNote, deadInner, { innerX: 300, innerY: 74 });
  y += cardH(W - 80, deadNote, 106, 74) + 34;

  s += `<text x="40" y="${y}" font-size="17" fill="${ink}">Strength: Torpedo Eight's twenty minutes</text>`;
  y += 22;
  const runs = [1, 0.75, 0.5, 0.25, 0];
  const note = "Eight signs, thinned by ADR-0016's round(8 × strength) and dropped from the ends of a centred run — the same arithmetic the ships use. At zero the glyph becomes the hollow outline of the footprint the signs would have filled, which is the same rectangle for every arm: destroyed says nothing about what the unit was made of. Whether that is right for a strike, whose destruction leaves nothing on the water at all, is the one state worth arguing about.";
  const runInner = ["A", "B", "C"].map((k, r) =>
    `<g transform="translate(0 ${r * 54})">` +
    runs.map((st, i) => `<g transform="translate(${i * 128} 0)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "line", state: st === 0 ? "destroyed" : "intact", strength: st, colour: US, seed: 6 })}</g>`).join("") +
    `<text x="-58" y="0" font-size="12" fill="${ink}" text-anchor="end" dominant-baseline="middle">${k}</text></g>`).join("") +
    runs.map((st, i) => cap(i * 128, 172, st === 0 ? "destroyed" : `${st * 100}%`)).join("");
  s += card(40, y, W - 80, cardH(W - 80, note, 186), "A strike runs 1 to 0 in twenty minutes (ADR-0024)", note, runInner, { innerX: 130, innerY: 62 });
  y += cardH(W - 80, note, 186) + 40;

  return sheet(
    "The fourth arm on the chart plate",
    [
      "ADR-0024 put `aircraft` on the arm allowlist; ADR-0015 obliges every view to draw every arm, enforced by the sign table's type. This is the chart plate's, and the night plate takes it unchanged.",
      "The footprint is fixed: 5.2 by 6.5 px, eight of them to a unit at a pitch of nine (ADR-0016). Everything below is drawn at that size, at the renderer's own slot arithmetic, in the plate's 1.4 px pen.",
    ],
    s, W, y);
}

// ===================================================================================================
// 2 · States — the four states on a body of aeroplanes
// ===================================================================================================
function boardStates() {
  const SF = ["ADR-0018 closed the state list at four and ADR-0024 said what each means for a strike: intact on deck and en route, engaged from the attack, broken when it scatters, destroyed when nothing comes home.","Nothing here is a new mechanism. The question each row asks is only whether the mark still reads once the state has had its way with it."];
  const W = 1300, ink = PLATE.ink;
  let s = "";
  let y = headTop(SF, W);
  const states = [
    ["intact", 1, "Eight signs, centred, in rank."],
    ["engaged", 1, "Billow, and the signs unchanged beneath it."],
    ["broken", 0.4, "Thinned and knocked out of rank — which is exactly what a strike that has scattered is."],
    ["destroyed", 0, "The hollow outline of the footprint. The same rectangle for every arm."],
  ];
  const PER_CANDIDATE = {
    B: "The one candidate whose broken state gains something: a solid mark knocked out of rank still reads as a body at a quarter strength, where a stroked one thins away to nothing. Against that, engaged buries it — eight solids under a cloud outlined in the same ink is the densest square inch on the plate.",
    C: "Broken is where the ring is weakest. A scattered handful of small circles is very close to what Billow's thinned cloud already is, and here the two are drawn on top of one another: at 40% the mark and the mark's mark are the same shape at nearly the same size.",
  };
  ["A", "B", "C"].forEach((k, r) => {
    const x = 40;
    const yy = y + r * 224;
    let inner = "";
    states.forEach(([st, strength], i) => {
      const cx = i * 296;
      if (st === "engaged" || st === "broken") {
        inner += `<g transform="translate(${cx} 0)">${billow({ formation: "line", state: st, seed: 8, ink, paper: PLATE.paper, driftDeg: surfaceDrift(WIND_TO, 40, "line") })}</g>`;
      }
      inner += `<g transform="translate(${cx} 0)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "line", state: st, strength, colour: US, seed: 8 })}</g>`;
      inner += cap(cx, 74, st);
    });
    s += card(x, yy, W - 80, 206, `${k} · the four states${k === "A" ? " — chosen" : ""}`, r === 0 ? states.map(([st, , n]) => `${st}: ${n}`).join("  ") : PER_CANDIDATE[k], inner, { innerX: 130, innerY: 78, chosen: k === "A" });
  });
  y += 3 * 224 + 22;

  const note = "The night plate takes the plate's glyph and gains nothing to draw (ADR-0016), so the sign is decided once for both — but the ink reverses, and a mark that FILLS gains weight on a dark ground where a stroked one loses it. B is the candidate this bears on: paper-on-ink, the dart is the heaviest thing on the plate; A and C thin out and want the same pen they have.";
  const nightInner = ["A", "B", "C"].map((k, i) =>
    `<g transform="translate(${i * 300} 0)">` +
    `<g transform="translate(0 0)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "line", colour: NIGHT.sides.British, seed: 8 })}</g>` +
    `<g transform="translate(0 30)">${plateGlyph({ arm: "ship", formation: "line", colour: NIGHT.sides["Combined Fleet"], seed: 8 })}</g>` +
    `<g transform="translate(0 62)">${magnified(AIRCRAFT_PLATE[k], NIGHT.ink, 5, NIGHT.ink)}</g>` +
    cap(0, 106, `${k} on the night plate`, NIGHT.ink) + `</g>`).join("");
  s += card(40, y, W - 80, cardH(W - 80, note, 130, 60), "The same sign in reversed ink", note,
    `<rect x="-160" y="-24" width="1060" height="150" fill="${NIGHT.paper}"/>` + nightInner,
    { innerX: 200, innerY: 60 });
  y += cardH(W - 80, note, 130, 60) + 40;

  return sheet(
    "The four states, and the sign in reversed ink",
    [
      "ADR-0018 closed the state list at four and ADR-0024 said what each means for a strike: intact on deck and en route, engaged from the attack, broken when it scatters, destroyed when nothing comes home.",
      "Nothing here is a new mechanism. The question each row asks is only whether the mark still reads once the state has had its way with it.",
    ],
    s, W, y);
}

// ===================================================================================================
// 3 · Legend — the test that decides it
// ===================================================================================================
function boardLegend() {
  const SF = ["The plate's legend samples its own glyph at three-quarters of plate size. Every candidate survives at nine times magnification; the question is which one survives at 0.75."];
  const W = 1300, ink = PLATE.ink;
  let s = "";
  let y = headTop(SF, W);
  const note = "ADR-0015 keys one legend row per arm when the roster holds two or more, sampled from the view's own glyph — at length 34 and scale 0.75, so the footprint is 3.9 by 4.9 px and the pitch is four. This is the size that decides the sign: if the aircraft row cannot be told from the ship's one row above it, nothing the mark does at full size can save it. ADR-0024 narrowed the clause so the row keys the roster at the level shown, not the arms drawn this phase — the aircraft row does not blink out on 6 June when only ships are left.";
  const legends = ["A", "B", "C"].map((k, i) =>
    `<g transform="translate(${i * 300} 0)">` +
    plateLegend(0, 160, PLATE, [["United States", US], ["Japan", JP]], ["ship", "aircraft"], k) +
    cap(93, 186, `candidate ${k}`) + `</g>`).join("");
  s += card(40, y, W - 80, cardH(W - 80, note, 200, 56), "The legend at 0.75 scale, all four rows", note, legends, { innerX: 120, innerY: 56 });
  y += cardH(W - 80, note, 200, 56) + 30;

  const note2 = "The same four arms in one rank, at legend scale, with nothing else on the paper. Foot's bar and horse's barred bar were drawn to be told apart at this size; the chevron was inherited from v1. The fourth has to join them without being any of them.";
  const rowInner = ["A", "B", "C"].map((k, r) =>
    `<g transform="translate(0 ${r * 62})">` +
    ["ship", "infantry", "cavalry"].map((arm, i) =>
      `<g transform="translate(${i * 150} 0) rotate(90)">${plateGlyph({ arm, formation: "column", length: 34, scale: 0.75, colour: ink, seed: 3 })}</g>`).join("") +
    `<g transform="translate(450 0) rotate(90)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "column", length: 34, scale: 0.75, colour: ink, seed: 3 })}</g>` +
    // and the same four at plate size, for the difference the scale makes
    ["ship", "infantry", "cavalry"].map((arm, i) =>
      `<g transform="translate(${640 + i * 110} 0)">${plateGlyph({ arm, formation: "line", colour: ink, seed: 3 })}</g>`).join("") +
    `<g transform="translate(970 0)">${plateGlyph({ arm: "aircraft", candidate: k, formation: "line", colour: ink, seed: 3 })}</g>` +
    `<text x="-26" y="0" font-size="12" fill="${ink}" text-anchor="end" dominant-baseline="middle">${k}</text>` +
    `</g>`).join("") +
    ["ship", "infantry", "cavalry", "aircraft"].map((n, i) => cap(i * 150, 210, n)).join("") +
    ["ship", "infantry", "cavalry", "aircraft"].map((n, i) => cap(640 + i * 110, 210, n)).join("") +
    cap(225, 232, "legend scale, 0.75") + cap(805, 232, "plate size");
  s += card(40, y, W - 80, cardH(W - 80, note2, 246, 58), "Told from the ship's and the cavalry's", note2, rowInner, { innerX: 90, innerY: 58 });
  y += cardH(W - 80, note2, 246, 58) + 40;

  return sheet(
    "The legend, which is where the sign is really decided",
    [
      "The plate's legend samples its own glyph at three-quarters of plate size. Every candidate above survives at nine times magnification; the question is which one survives at 0.75.",
    ],
    s, W, y);
}

// ===================================================================================================
// 4 · Engaged — Billow on a unit that is mostly sky
// ===================================================================================================
function boardEngaged() {
  const SF = ["The plate's engaged mark is Billow: outlined puffs merging into one scalloped cloud, drifting off the unit's lee flank under the phase's wind (ADR-0014, ADR-0016). Nothing about it was drawn with aeroplanes in mind."];
  const W = 1300, ink = PLATE.ink;
  let s = "";
  let y = headTop(SF, W);

  const note = "ADR-0016 made Billow the engaged mark for EVERY arm and refused a second one by name: a separate land mark would be a second vocabulary the legend keys twice. On land the cloud reads as dust; over the sea it is gunsmoke. On a body of aeroplanes three thousand feet up it reads as flak — outlined puffs hanging in the air is exactly what a 1940s plate draws anti-aircraft fire as — so the mark needs no change at all. What is worth arguing about is the WIND: ADR-0014 blows the cloud to the unit's lee flank under the phase's surface wind, and a burst at altitude does not drift with the surface wind. The two are drawn side by side; neither is a new mark, and only the second costs an arm-dependent branch in the shared mark pass.";
  const drifts = [
    ["Surface wind — the rule today, and kept", surfaceDrift(WIND_TO, 200, "line")],
    ["Astern of the strike's own heading — not taken", 180],
  ];
  const inner = drifts.map(([label, deg], i) =>
    `<g transform="translate(${i * 420} 0)">` +
    `<g transform="rotate(200)">${billow({ formation: "line", state: "engaged", seed: 12, ink, paper: PLATE.paper, driftDeg: deg })}</g>` +
    `<g transform="rotate(200)">${plateGlyph({ arm: "aircraft", candidate: "A", formation: "line", state: "engaged", colour: US, seed: 12 })}</g>` +
    cap(0, 72, label) + `</g>`).join("");
  s += card(40, y, W - 80, cardH(W - 80, note, 100, 92), "Where the cloud goes — the surface wind stays", note, inner, { innerX: 250, innerY: 92, chosen: true });
  y += cardH(W - 80, note, 100, 92) + 30;

  const note2 = "10:25, drawn at the two positions the sources give: the dive bombers are over the carriers, and both are engaged. Two Billows at one place is not a new problem — Trafalgar at 13:30 already puts four of them in the same two hundred pixels, which is why the units pass runs every mark before any body — but it is the first time two of them belong to units at different ALTITUDES, and the plate has no way to say so. The reading it does give is the honest one: the fight is here.";
  const pair =
    `<g transform="translate(0 0) rotate(66)">${billow({ formation: "column", state: "broken", seed: 5, ink, paper: PLATE.paper, driftDeg: surfaceDrift(WIND_TO, 66, "column") })}</g>` +
    `<g transform="translate(46 -34) rotate(200)">${billow({ formation: "line", state: "engaged", seed: 12, ink, paper: PLATE.paper, driftDeg: surfaceDrift(WIND_TO, 200, "line") })}</g>` +
    `<g transform="translate(0 0) rotate(66)">${plateGlyph({ arm: "ship", formation: "column", state: "broken", strength: 0.3, colour: JP, seed: 5 })}</g>` +
    `<g transform="translate(46 -34) rotate(200)">${plateGlyph({ arm: "aircraft", candidate: "A", formation: "line", state: "engaged", colour: US, seed: 12 })}</g>` +
    cap(20, 86, "Kaga burning, the Enterprise bombers over her");
  s += card(40, y, 620, cardH(620, note2, 118, 96), "A strike engaged over a ship engaged", note2, pair, { innerX: 300, innerY: 96 });

  const note3 = "The mark pass runs for engaged AND broken (ticks.ts), so a scattered strike keeps a thinned cloud. On a body of aeroplanes that reads as the fight breaking up rather than as a wreck burning, which is what broken means for a strike anyway — VT-8 was not on fire, it was gone.";
  const brokenInner =
    `<g transform="rotate(200)">${billow({ formation: "line", state: "broken", seed: 14, ink, paper: PLATE.paper, driftDeg: surfaceDrift(WIND_TO, 200, "line") })}</g>` +
    `<g transform="rotate(200)">${plateGlyph({ arm: "aircraft", candidate: "A", formation: "line", state: "broken", strength: 0.35, colour: US, seed: 14 })}</g>` +
    cap(0, 72, "broken, at 35%");
  s += card(700, y, W - 740, cardH(620, note2, 118, 96), "Broken keeps a thinned cloud", note3, brokenInner, { innerX: 250, innerY: 92 });
  y += cardH(620, note2, 118, 96) + 40;

  return sheet(
    "The engaged mark on a unit that is mostly sky",
    [
      "The plate's engaged mark is Billow: outlined puffs merging into one scalloped cloud, drifting off the unit's lee flank under the phase's wind (ADR-0014, ADR-0016). Nothing about it was drawn with aeroplanes in mind.",
    ],
    s, W, y);
}

// ===================================================================================================
// 5 · Atlas — the block's arm mark
// ===================================================================================================
function boardAtlas() {
  const SF = ["Atlas keeps one block for every arm and puts the sign inside it (ADR-0015). The field is near-square whatever shape the block is, and the pen is 1.2 px - finer than the block's own edge, because it is detail and not outline."];
  const W = 1300, ink = ATLAS.ink;
  let s = "";
  let y = headTop(SF, W);

  const note = "block.ts draws the arm's sign TWICE under a clip — the unit's ink over the bare part of the block, the paper's over the filled part — so one diagonal reads whichever ground it crosses. `paintSign` sets only strokeStyle. Every candidate here is therefore stroke-only, and a filled Atlas sign would be a change to the shared pass rather than to a view's hand: that is a constraint on this decision, not a preference within it.";
  const cands = [
    ["A · Plan", "The same aeroplane the plate's A draws, so the arm reads the same in both views — which is the argument ADR-0015 already made for foot's cross and horse's slash."],
    ["B · Cross", "Foot's X turned upright. Two strokes, already in the vocabulary; told from the X because the block is rotated with the unit, so the two never share an orientation."],
    ["C · Vee", "An open chevron pointing to the block's front. Reads at once — and says the same thing as the filled heading barb already sitting on the block's nose."],
  ];
  const atlasH = Math.max(...cands.map(([, n]) => cardH(390, n, 118, 60)));
  cands.forEach(([head, n], i) => {
    const x = 40 + i * 414;
    const k = head[0];
    const inner =
      `<g transform="translate(-90 0)">${atlasGlyph({ arm: "aircraft", candidate: k, formation: "line", colour: US, paper: ATLAS.paper, clipId: `at${k}1` })}</g>` +
      `<g transform="translate(90 0)">${atlasGlyph({ arm: "aircraft", candidate: k, formation: "line", strength: 0.55, colour: US, paper: ATLAS.paper, clipId: `at${k}2` })}</g>` +
      `<g transform="translate(-90 76)">${atlasGlyph({ arm: "aircraft", candidate: k, formation: "mass", colour: JP, paper: ATLAS.paper, clipId: `at${k}3` })}</g>` +
      `<g transform="translate(90 76) rotate(90)">${atlasGlyph({ arm: "aircraft", candidate: k, formation: "column", length: 34, scale: 0.75, colour: ink, paper: ATLAS.paper, clipId: `at${k}4` })}</g>` +
      cap(-90, 24, "line, full strength") + cap(90, 24, "line, at 55%") +
      cap(-90, 100, "mass") + cap(90, 100, "legend scale");
    s += card(x, y, 390, atlasH, head, n, inner, { innerX: 195, innerY: 60, chosen: k === "A" });
  });
  y += atlasH + 30;

  const note2 = "The three that exist, for the fourth to be told from. Crossed diagonals for foot, one diagonal for horse, and nothing at all inside a ship — which means the aircraft sign is also what stops a strike reading as a ship, the one pair Atlas has never had to separate.";
  const existing = ["ship", "infantry", "cavalry"].map((arm, i) =>
    `<g transform="translate(${i * 200} 0)">${atlasGlyph({ arm, formation: "line", colour: ink, paper: ATLAS.paper, clipId: `ax${i}` })}</g>` + cap(i * 200, 30, arm)).join("") +
    ["A", "B", "C"].map((k, i) =>
      `<g transform="translate(${640 + i * 200} 0)">${atlasGlyph({ arm: "aircraft", candidate: k, formation: "line", colour: ink, paper: ATLAS.paper, clipId: `ay${k}` })}</g>` + cap(640 + i * 200, 30, `aircraft · ${k}`)).join("");
  s += card(40, y, W - 80, cardH(W - 80, note2, 60, 56), "All four arms in one rank", note2, existing, { innerX: 60, innerY: 56 });
  y += cardH(W - 80, note2, 60, 56) + 40;

  return sheet(
    "Atlas: the mark inside the block",
    [
      "Atlas keeps one block for every arm and puts the sign inside it (ADR-0015). The field is near-square whatever shape the block is, and the pen is 1.2 px — finer than the block's own edge, because it is detail and not outline.",
    ],
    s, W, y, { ground: ATLAS.paper });
}

// ===================================================================================================
// 6 · StaffMap — the symbol-tradition mark
// ===================================================================================================
function boardStaff() {
  const SF = ["#139 drew three arm marks and greyed the fourth, saying in words that whether aircraft is an arm at all was #131's and what its sign looks like is this ticket's. ADR-0024 answered the first. This answers the second.","#139 has since closed and chose its glyph A, the frame to frontage; the mark is drawn on that and on the B it left on the chip, because a mark that only works on the winner is a mark fitted to one drawing."];
  const W = 1300, ink = STAFF.ink;
  const US_S = STAFF.sides[0], JP_S = STAFF.sides[1];
  let s = "";
  let y = headTop(SF, W);

  const scard = (x, yy, w, h, head, notes, inner, innerX = w / 2, innerY = 44, chosen = false) =>
    card(x, yy, w, h, head, notes, inner, { ink, paper: STAFF.paper, innerX, innerY, chosen });

  const cands = [
    ["A · Delta", "#139's own, drawn greyed on its boards and labelled a candidate for this ticket. A filled swept arrowhead with a notched tail: the symbol tradition's mark for air, and the loudest thing in the box."],
    ["B · Outline", "The same shape stroked rather than filled, so it weighs what its three siblings weigh — foot's crossed lines, horse's single one, and the hollow hull in plan the ship takes."],
    ["C · Plan", "The aeroplane in plan again, so all four views draw the arm one way. ADR-0015's own argument for foot and horse: a viewer who switches views carries the same reading across."],
  ];
  const staffH = Math.max(...cands.map(([, n]) => cardH(390, n, 172, 60)));
  cands.forEach(([head, n], i) => {
    const x = 40 + i * 414;
    const k = head[0];
    const glyphWith = (glyph, formation, state, strength, colour) => {
      // Both of #139's candidates take their arm mark from staff.mjs; here the mark is swapped for ours.
      const drawn = glyph({ formation, arm: "ship", state, strength, colour, ink });
      return drawn;
    };
    const box = (fn, formation, colour, state = "intact", strength = 1) => {
      const half = formation === "mass" ? { x: 18, y: 18 } : { x: 15, y: 9.5 };
      return fn({ formation, arm: "ship", state, strength, colour, ink });
    };
    // Draw #139's frame and trace glyphs, then lay the candidate's mark in the middle of each.
    const inner =
      `<g transform="translate(0 0)">${frameGlyph({ formation: "line", arm: "none", state: "intact", strength: 1, colour: US_S, ink })}` +
      AIRCRAFT_STAFF[k]({ x: 36, y: 9 }, US_S, 1.35) + `</g>` +
      `<g transform="translate(0 62)">${traceGlyph({ formation: "line", arm: "none", state: "intact", strength: 1, colour: US_S, ink })}` +
      AIRCRAFT_STAFF[k]({ x: 15, y: 9.5 }, US_S, 1.35) + `</g>` +
      `<g transform="translate(0 128) scale(0.62)">${frameGlyph({ formation: "line", arm: "none", state: "intact", strength: 1, colour: ink, ink })}` +
      AIRCRAFT_STAFF[k]({ x: 36, y: 9 }, ink, 1.35) + `</g>` +
      cap(0, 30, "on #139's A, the chosen glyph", ink) +
      cap(0, 92, "on #139's B, left on the chip", ink) +
      cap(0, 158, "legend scale, 0.62", ink);
    s += scard(x, y, 390, staffH, head, n, inner, 175, 60, k === "B");
  });
  y += staffH + 30;

  const note2 = "The three marks #139 settled, with the fourth beside them. Its ship is a hull in plan, bow up, chosen because two of the seven battles are naval and this is the modern view — which is precisely the pair the aircraft mark has to separate itself from, since a hull in plan and an aeroplane in plan are both narrow, pointed and upright.";
  const arms = ["infantry", "cavalry", "ship"];
  const row =
    arms.map((arm, i) => `<g transform="translate(${i * 150} 0)">${frameGlyph({ formation: "line", arm, state: "intact", strength: 1, colour: ink, ink })}</g>` + cap(i * 150, 32, arm, ink)).join("") +
    ["A", "B", "C"].map((k, i) =>
      `<g transform="translate(${480 + i * 150} 0)">${frameGlyph({ formation: "line", arm: "none", state: "intact", strength: 1, colour: ink, ink })}${AIRCRAFT_STAFF[k]({ x: 36, y: 9 }, ink, 1.35)}</g>` +
      cap(480 + i * 150, 32, `aircraft · ${k}`, ink)).join("");
  s += scard(40, y, W - 80, cardH(W - 80, note2, 62, 58), "All four arms in the staff hand", note2, row, 130, 58);
  y += cardH(W - 80, note2, 62, 58) + 40;

  return sheet(
    "The staff map: the symbol-tradition mark",
    [
      "#139 drew three arm marks and greyed the fourth, saying in words that whether aircraft is an arm at all was #131's and what its sign looks like is this ticket's. ADR-0024 answered the first. This answers the second.",
      "#139 has since closed and chose its glyph A, the frame to frontage; the mark is drawn on that and on the B it left on the chip, because a mark that only works on the winner is a mark fitted to one drawing.",
    ],
    s, W, y, { face: FACES.plex, font: FONT_LINK, ground: STAFF.letterbox, ink });
}

// ===================================================================================================
// 7-9 · The frames
// ===================================================================================================
const plateBoard = (key, opts = {}) => `<!doctype html>
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
    body { margin: 0; font-family: ${FACE}; color: ${PLATE.ink}; background: ${(opts.v ?? PLATE).letterbox}; }
    a { color: ${US}; } a:hover { color: ${PLATE.ink}; }
    svg text { font-family: inherit; }
  </style>
</helmet>
<svg width="1120" height="650" viewBox="0 0 1120 650" xmlns="http://www.w3.org/2000/svg">
${plateFrame(key, opts)}
</svg>
</x-dc>
</body>
</html>
`;

const staffBoard = (key, opts = {}) => `<!doctype html>
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
  </style>
</helmet>
<svg width="1120" height="650" viewBox="0 0 1120 650" xmlns="http://www.w3.org/2000/svg">
${scene(key, opts)}
</svg>
</x-dc>
</body>
</html>
`;

// ===================================================================================================
// 10 · Aboard — a strike drawn at its carrier's position
// ===================================================================================================
function boardAboard() {
  const SF = ["ADR-0024 fixed the position and left the reading open: a launch phase puts the strike on its carrier and it tweens outward; a recovery phase brings it home and it is struck below. Three ways that can look, none of them a schema change."];
  const W = 1300, ink = PLATE.ink;
  let s = "";
  let y = headTop(SF, W);

  const HDG = 232;
  const ship = (dx, dy) => `<g transform="translate(${dx} ${dy}) rotate(${HDG})">${plateGlyph({ arm: "ship", formation: "column", colour: US, seed: 17 })}</g>`;
  const strike = (dx, dy, formation) => `<g transform="translate(${dx} ${dy}) rotate(${HDG})">${plateGlyph({ arm: "aircraft", candidate: "A", formation, colour: US, seed: 19 })}</g>`;

  const ways = [
    ["1 · As ADR-0024 leaves it", "The strike's position IS the carrier's, and its formation is its own — line, for a squadron ranged abreast. Eight aeroplanes across eight chevrons at one point, in one ink, and the crosses land between the chevrons rather than beside them. Two labels want the same flank as well, and the label pass has no rule that says which unit owns it.", () => ship(0, 0) + strike(0, 0, "line")],
    ["2 · The author nudges it", "Nothing in the renderer moves; the authoring pass puts the strike a glyph's width off its carrier for the one phase it is aboard. Costs no schema, no rule and no code — and it is a lie of about a mile, on a plate whose scale bar says sixty. It is the same lie the roster already tells when it draws a task force as one column.", () => ship(0, 0) + strike(15, 11, "line")],
    ["3 · Ranged on deck, in file", "The strike is authored `column` on the carrier's own heading, so its aeroplanes lie in file along her — which is what ranging a deck-load actually looks like. Still one position and still two glyphs, but the two readings stop fighting: the chevrons are the ships, the crosses are on them. An authoring rule, not a drawing one.", () => ship(0, 0) + strike(0, 0, "column")],
  ];
  const wayH = Math.max(...ways.map(([, n]) => cardH(390, n, 86, 64)));
  ways.forEach(([head, n, draw], i) => {
    s += card(40 + i * 414, y, 390, wayH, head, n, draw() + cap(0, 60, "07:05 — Enterprise's strike ranging on deck"), { innerX: 195, innerY: 64, chosen: head.startsWith("3") });
  });
  y += wayH + 30;

  const note = "Recovery is the same instant run backwards, and it is the harder one: at the recovery phase the strike is drawn on its carrier, and at the next phase it is not drawn at all. ADR-0024 says a unit goes at the phase instant with NO fade, so the aeroplanes are simply struck below between one frame and the next. Whether that reads as landing or as annihilation is the question, and the answer the plate gives is the caption's rather than the glyph's — which is the same answer ADR-0019 already gave for anchoring and for the truce. Absence is what pays for all of it: a strike costs nothing in the hours it is not flying, so the sixteen ceiling counts per level per phase and all sixteen strikes the sources describe become affordable. The cost lands here instead, at the two instants a strike shares a position with the ship it left.";
  const recov = ship(0, 0) + strike(0, 0, "column") + cap(0, 60, "17:50 · the recovery phase") +
    `<g transform="translate(300 0)">${ship(0, 0)}</g>` + cap(300, 60, "18:20 · the next phase");
  s += card(40, y, W - 80, cardH(W - 80, note, 86, 64), "And what going looks like", note, recov, { innerX: 320, innerY: 64 });
  y += cardH(W - 80, note, 86, 64) + 40;

  return sheet("Aboard: a strike drawn at its carrier's position", SF, s, W, y);
}

// ===================================================================================================
// Write everything
// ===================================================================================================
const boards = {
  "Main.dc.html": boardMain(),
  "States.dc.html": boardStates(),
  "Legend.dc.html": boardLegend(),
  "Engaged.dc.html": boardEngaged(),
  "Atlas.dc.html": boardAtlas(),
  "StaffMap.dc.html": boardStaff(),
  "FirstStrike.dc.html": plateBoard("first", { candidate: "A" }),
  "Burning.dc.html": plateBoard("burning", { candidate: "A" }),
  "NightBurning.dc.html": plateBoard("burning", { v: NIGHT, candidate: "A" }),
  "Aboard.dc.html": boardAboard(),
  "MidwayStaff.dc.html": staffBoard("midway", { kind: "A", aircraft: true, sea: "lightened" }),
};

for (const [name, html] of Object.entries(boards)) writeFileSync(new URL(name, import.meta.url), html);

// The frame is the artboard's own size, read back off the drawing rather than guessed: w and h
// neither scale nor crop, so a frame short of its root clips the sheet silently.
const size = (name) => {
  const m = /<svg width="([0-9]+)" height="([0-9]+)"/.exec(boards[name]);
  return { w: Number(m[1]), h: Number(m[2]) + 8 };
};
const place = (rows, page) => {
  const out = [];
  let y = 0;
  for (const row of rows) {
    let x = 0;
    let tallest = 0;
    for (const file of row) {
      const { w, h } = size(file);
      out.push({ file, page, x, y, w, h });
      x += w + 120;
      tallest = Math.max(tallest, h);
    }
    y += tallest + 140;
  }
  return out;
};

const canvas = {
  pages: [
    { id: "page-1", name: "The sign" },
    { id: "page-2", name: "The frames" },
  ],
  artboards: [
    ...place([
      ["Main.dc.html", "States.dc.html", "Legend.dc.html"],
      ["Engaged.dc.html", "Atlas.dc.html", "StaffMap.dc.html"],
    ], "page-1"),
    ...place([
      ["FirstStrike.dc.html", "Burning.dc.html", "NightBurning.dc.html", "MidwayStaff.dc.html"],
      ["Aboard.dc.html"],
    ], "page-2"),
  ],
  annotations: [
    {
      id: "brief", page: "page-1", x: 0, y: -170, w: 660,
      text: ["#140 - The aircraft sign, in the four hands ADR-0015 obliges.",
        "The legend sheet is the one that decides it: every candidate reads at nine times magnification, and the plate's legend samples at 0.75."].join("\n"),
    },
    {
      id: "frames", page: "page-2", x: 0, y: -170, w: 660,
      text: ["Both plate frames are drawn with candidate A; the staff frame keeps #139's own greyed mark.",
        "Nothing here is geo-registered - these are scenes, not map files."].join("\n"),
    },
  ],
  launch: { view: "canvas", page: "page-1" },
};
writeFileSync(new URL("canvas.json", import.meta.url), JSON.stringify(canvas, null, 2) + "\n");

console.log(`wrote ${Object.keys(boards).length} artboards and canvas.json`);
