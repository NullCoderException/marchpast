// The staff-map canvas (#139). `node build.mjs` regenerates every artboard and canvas.json.
// Nothing here is merged to main; the ground comes from the terrain prototype (#138) unchanged.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  STAFF, FACES, f, text, glyphs, frameGlyph, traceGlyph, move, staffLabel, northArrow, windBarb,
  staffScaleBar, staffLegend, neatLine, staffCaptionBand, page, card, cardHeight, TYPE,
} from "./staff.mjs";
import { scene, SCENES, SEAS } from "./scenes.mjs";
import { ticks, block, scaleBar, PLATE } from "../terrain/lib.mjs";

// Written beside this file, so the build runs from anywhere.
const HERE = dirname(fileURLToPath(import.meta.url));
const out = (name, body) => writeFileSync(join(HERE, name), body);

const ink = STAFF.ink, paper = STAFF.paper;
const RED = STAFF.sides[0], BLUE = STAFF.sides[1];
/** Archivo is variable: the condensed width is an axis, not a family, so it is set rather than named. */
const STRETCH = { plex: "", archivo: ` style="font-stretch: 75%; font-variation-settings: 'wdth' 75;"`, barlow: "" };

// The face is one tweak that cuts across the whole board, so it is bound rather than branched: three
// faces on a chip cost one hole, where three <sc-if> branches would cost three copies of the picture.
const FACE_PROPS = `"face":{"editor":"enum","options":["plex","archivo","barlow"],"default":"archivo","section":"View"}`;
const faceLogic = `const FACES = ${JSON.stringify(FACES)};
const STRETCH = { plex: "normal", archivo: "75%", barlow: "normal" };`;

function faceBody(w, h, svg, style = "") {
  return `<div style="width: ${w}px; height: ${h}px; background: ${STAFF.letterbox}; overflow: hidden; font-family: {{face}}; font-stretch: {{stretch}};${style}">${svg}</div>`;
}
function faceScript(props, extra) {
  return `<script data-dc-script data-props='{${FACE_PROPS}${props ? "," + props : ""}}'>
${faceLogic}
class Component extends DCLogic {
  renderVals() {
    const key = this.props.face ?? "plex";
    return { face: FACES[key], stretch: STRETCH[key]${extra ? `, ...(${extra})` : ""} };
  }
}
</script>`;
}
const withScript = (title, body, script) => page(title, body).replace("</x-dc>", `</x-dc>\n${script}`);

/** A board whose only chip is the face. */
const facedBoard = (title, w, h, svg, style = "") =>
  withScript(title, faceBody(w, h, svg, style), faceScript());

/**
 * A scene board: the face on a hole, and the design questions on <sc-if> branches. Branching costs a
 * copy of the picture, so only the questions this board is the evidence for get one.
 */
function sceneBoard(title, key, { variants, props, logic, w = 1120, h = 650 }) {
  const branches = variants.map(({ when, opts, first }) =>
    `<sc-if value="{{ ${when} }}" hint-placeholder-val="{{ ${first === true} }}"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display: block;">${scene(key, opts)}</svg></sc-if>`,
  ).join("\n");
  return withScript(title, faceBody(w, h, branches), faceScript(props, logic));
}

// ---------------------------------------------------------------------------------------------------
// Page 1 · the whole frames
// ---------------------------------------------------------------------------------------------------
const GLYPH_PROP = `"glyph":{"editor":"enum","options":["A · frame to frontage","B · symbol on the trace"],"default":"A · frame to frontage","section":"Candidates"}`;
const MOVES_PROP = `"moves":{"editor":"enum","options":["pen (today)","tapered (a moves hand)"],"default":"tapered (a moves hand)","section":"Candidates"}`;
const AIR_PROP = `"strikes":{"editor":"boolean","default":true,"section":"Candidates"}`;
const SEA_PROP = `"sea":{"editor":"enum","options":["lightened","#138's tone"],"default":"lightened","section":"Candidates"}`;

out("Main.dc.html", sceneBoard("Trafalgar 13:30 · staff map", "trafalgar", {
  variants: [
    { when: "is_Ap", opts: { kind: "A", moves: "pen" } },
    { when: "is_At", opts: { kind: "A", moves: "taper" }, first: true },
    { when: "is_Bp", opts: { kind: "B", moves: "pen" } },
    { when: "is_Bt", opts: { kind: "B", moves: "taper" } },
  ],
  props: `${GLYPH_PROP},${MOVES_PROP}`,
  logic: `(() => {
      const k = (this.props.glyph ?? "A").startsWith("A") ? "A" : "B";
      const m = (this.props.moves ?? "tapered").startsWith("pen") ? "p" : "t";
      const key = k + m;
      return { is_Ap: key === "Ap", is_At: key === "At", is_Bp: key === "Bp", is_Bt: key === "Bt" };
    })()`,
}));

out("Cannae.dc.html", sceneBoard("Cannae phase 6 · staff map", "cannae", {
  variants: [
    { when: "is_A", opts: { kind: "A", moves: "taper" }, first: true },
    { when: "is_B", opts: { kind: "B", moves: "taper" } },
  ],
  props: GLYPH_PROP,
  logic: `(() => { const k = (this.props.glyph ?? "A").startsWith("A"); return { is_A: k, is_B: !k }; })()`,
}));

out("Midway.dc.html", sceneBoard("Midway 10:25 · staff map", "midway", {
  variants: [
    { when: "is_l1", opts: { kind: "A", aircraft: true, sea: "lightened" }, first: true },
    { when: "is_l0", opts: { kind: "A", aircraft: false, sea: "lightened" } },
    { when: "is_c1", opts: { kind: "A", aircraft: true, sea: "chosen" } },
    { when: "is_c0", opts: { kind: "A", aircraft: false, sea: "chosen" } },
  ],
  props: `${AIR_PROP},${SEA_PROP}`,
  logic: `(() => {
      const sea = (this.props.sea ?? "lightened").startsWith("light") ? "l" : "c";
      const a = this.props.strikes === false ? "0" : "1";
      const key = sea + a;
      return { is_c1: key === "c1", is_c0: key === "c0", is_l1: key === "l1", is_l0: key === "l0" };
    })()`,
}));

// ---------------------------------------------------------------------------------------------------
// Page 1 · the phone
// ---------------------------------------------------------------------------------------------------
function phone() {
  const S = SCENES.trafalgar, k = 350 / 1080;
  const P = (x, y) => [20 + (x - 20) * k, 20 + (y - 20) * k];
  // The glyph scale the design-language Phone board uses, so the comparison with the plate's phone
  // frame is like for like; how crowded a phone plate really is at the full plate constant is #86's.
  const G = 2.2;
  let s = `<rect width="390" height="285" fill="${STAFF.letterbox}"/>`;
  s += `<clipPath id="pext"><rect x="20" y="20" width="1080" height="520"/></clipPath>`;
  s += `<g transform="translate(20 20) scale(${f(k)}) translate(-20 -20)"><g clip-path="url(#pext)">`;
  s += S.ground();
  for (const m of S.moves.slice(2)) s += move(m.kind, m.a, m.b, { style: "taper", ink, colour: STAFF.sides[m.side], bend: (m.bend ?? 0) / k });
  for (const u of S.units) s += `<g transform="translate(${u.x} ${u.y}) rotate(${u.heading}) scale(${G})">${frameGlyph({ ...u, colour: STAFF.sides[u.side], ink })}</g>`;
  s += `</g></g>`;
  // Labels at the phone floor: collapse step 4, the short name alone, drawn unscaled.
  const SHORT = { van: "Van", centre: "Centre", rear: "Rear", rearmost: "Rearmost", weather: "Weather", weather2: "Weather 2", lee: "Lee", lee2: "Lee 2" };
  const at = { van: [-16, -22], centre: [20, -14], rear: [20, -4], rearmost: [-18, 16], weather: [-18, -20], weather2: [0, 26], lee: [-16, 22], lee2: [-14, 22] };
  for (const u of S.units) {
    const [px, py] = P(u.x, u.y), [dx, dy] = at[u.id];
    s += text(px + dx, py + dy, SHORT[u.id], "unitName", STAFF.sides[u.side], { anchor: dx === 0 ? "middle" : dx < 0 ? "end" : "start" });
  }
  s += neatLine(20, 20, 350, 245, ink);
  // Furniture collapsed (layout.ts): the rose becomes an arrow with the wind beside it, the legend a
  // one-line strip of the sides, the title goes to the band, the credit to Details. The scale bar stays.
  s += `<rect x="26" y="26" width="150" height="38" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.7"/>`;
  s += northArrow(42, 46, ink, { scale: 0.44 });
  s += windBarb(72, 44, ink, 292, "light");
  s += text(94, 45, "WNW · LIGHT", "credit", ink);
  s += `<rect x="26" y="228" width="112" height="30" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.7"/>`;
  s += staffScaleBar(34, 246, ink, { px: 54, divisions: 3, labels: ["0", "1", "2", "3"], unit: "NMI", h: 5 });
  s += `<g transform="translate(228 243)"><rect x="-10" y="-12" width="132" height="24" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.7"/>` +
    `<g transform="scale(0.3)">${frameGlyph({ length: 60, formation: "line", arm: "ship", state: "intact", strength: 1, colour: RED, ink })}</g>` +
    text(14, 0, "British", "credit", RED) +
    `<g transform="translate(62 0) scale(0.3)">${frameGlyph({ length: 60, formation: "line", arm: "ship", state: "intact", strength: 1, colour: BLUE, ink })}</g>` +
    text(76, 0, "Combined", "credit", BLUE) + `</g>`;

  // The band: on a phone the clock takes a line of its own with the date and the title beside it.
  const top = 285, bh = 150;
  let band = `<rect x="0" y="${top}" width="390" height="${bh}" fill="${paper}"/>`;
  band += `<line x1="0" y1="${top + 1.5}" x2="390" y2="${top + 1.5}" stroke="${ink}" stroke-width="3"/>`;
  band += `<text x="14" y="${top + 22}" font-size="22" font-weight="500" fill="${ink}" style="font-variant-numeric: tabular-nums;" dominant-baseline="middle">13:30</text>`;
  band += text(74, top + 22, "21 October 1805 · The Battle of Trafalgar", "credit", ink, { opacity: 0.9 });
  band += text(14, top + 46, S.band.phase, "credit", ink);
  ["The Victory is locked with the Redoutable and the", "Téméraire has come up on her far side; astern, the", "whole enemy rear has struck or is striking to", "Collingwood's division. Dumanoir's ten of the van", "are still standing to the northward."]
    .forEach((t, i) => { band += `<text x="14" y="${top + 68 + i * 17}" font-size="13" fill="${ink}" dominant-baseline="middle">${t}</text>`; });

  const ctl = (label, extra = "") => `<div style="border: 1px solid rgba(47,49,52,0.5); border-radius: 2px; padding: 4px 10px; min-height: 44px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; ${extra}">${label}</div>`;
  const body = faceBody(390, 844,
    `<svg width="390" height="435" viewBox="0 0 390 435" xmlns="http://www.w3.org/2000/svg" style="display: block; flex: none;">${s}${band}</svg>
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid rgba(47,49,52,0.5); font-size: 14px; background: ${paper};">
  <div style="display: flex; align-items: center; height: 18px; border: 1px solid rgba(47,49,52,0.5); background: ${STAFF.land}; flex: 1 1 100%; position: relative;"><div style="position: absolute; left: 44%; top: 50%; width: 11px; height: 11px; margin: -6px 0 0 -6px; border: 1px solid ${ink}; background: ${paper};"></div></div>
  ${ctl("&#9198;")}${ctl("Play", "min-width: 4em;")}${ctl("&#9197;")}
  <div style="font-size: 17px; margin-left: auto; font-variant-numeric: tabular-nums;">13:30</div>
  ${ctl("1x")}${ctl("Details")}
</div>
<div style="padding: 12px; font-size: 13px; line-height: 1.45; border-top: 1px solid rgba(47,49,52,0.5); display: flex; flex-direction: column; gap: 6px; background: ${paper};">
  <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">What the phone changes, and what it does not</div>
  <div>The collapse is <b>layout.ts</b>'s and not the view's, so the staff map thins in exactly the order the plate does: title to the band's date line, rose to a north arrow with the wind barb beside it, legend to a one-line strip of the sides, credit to Details, labels at collapse step 4. The scale bar stays. What the view supplies is only the hand each of those is drawn in — the barb, the blocked bar, the caps.</div>
  <div style="opacity: 0.8;">The controls take the surface tokens ADR-0023 derives from this palette; the chooser and the strip are not redrawn here, because that is #137's.</div>
</div>`, " display: flex; flex-direction: column;").replace(`background: ${STAFF.letterbox};`, `background: ${paper};`);
  return withScript("Phone · staff map", body, faceScript());
}
out("Phone.dc.html", phone());

// ---------------------------------------------------------------------------------------------------
// Page 2 · the glyph sheet
// ---------------------------------------------------------------------------------------------------
const gA = (o) => frameGlyph({ ink, ...o });
const gB = (o) => traceGlyph({ ink, ...o });

/** A callout whose text is always set INWARD from the card's edge, so no label can run off the card. */
function callout(x, y, tx, ty, label, side) {
  const anchor = side === "left" ? "start" : "end";
  return `<line x1="${f(x)}" y1="${f(y)}" x2="${f(tx)}" y2="${f(ty)}" stroke="${ink}" stroke-width="0.7" stroke-opacity="0.6"/>` +
    `<circle cx="${f(x)}" cy="${f(y)}" r="1.8" fill="${ink}" fill-opacity="0.6"/>` +
    text(tx, ty, label, "credit", ink, { anchor, opacity: 0.9 });
}
function anatomy(which) {
  const s = 2.1, g = which === "A" ? gA : gB, cy = 62;
  let out = `<g transform="translate(0 ${cy}) scale(${s})">${g({ formation: "line", arm: "infantry", state: "intact", strength: 0.75, colour: RED })}</g>`;
  const L = -256, R = 256;
  const lines = which === "A"
    ? [[0, cy - 9 * s, L, 14, "THE LEADING EDGE, HEAVY", "left"],
       [-36 * s, cy, L, 122, "72 PX ALONG THE LONG AXIS", "left"],
       [-16 * s, cy + 8 * s, L, 142, "THE TINT IS THE FRACTION STILL FIGHTING", "left"],
       [0, cy, R, 122, "THE ARM MARK, SET IN THE MIDDLE", "right"],
       [36 * s, cy + 9 * s, R, 142, "18 PX DEEP ACROSS IT", "right"]]
    : [[-36 * s, cy, L, 122, "THE TRACE: 72 PX, GHOSTED WHERE IT IS LOST", "left"],
       [0, cy - 14 * s, L, 14, "THE FRONT TICK", "left"],
       [15, cy - 9, R, 122, "A TRUE-ASPECT BOX, 30 × 19, ASTRIDE IT", "right"],
       [-24 * s, cy, R, 142, "STRENGTH SHORTENS IT FROM THE REAR", "right"]];
  for (const [x, y, tx, ty, label, side] of lines) out += callout(x, y, tx, ty, label, side);
  return out;
}

const row = (g, colour, items, draw) => items.map((it, i) => `<g transform="translate(${i * 132 + 62} 30)">${draw(g, colour, it)}${text(0, 46, it.caption, "credit", ink, { anchor: "middle", opacity: it.dim ? 0.55 : 1 })}</g>`).join("");
const STATES = [{ state: "intact", strength: 1, caption: "intact" }, { state: "engaged", strength: 1, caption: "engaged" }, { state: "broken", strength: 0.4, caption: "broken" }, { state: "destroyed", strength: 0, caption: "destroyed" }];
const ARMS = [{ arm: "infantry", caption: "infantry" }, { arm: "cavalry", caption: "cavalry" }, { arm: "ship", caption: "ship" }, { arm: "aircraft", caption: "aircraft · #140", dim: true }];
const pair = (draw, items) => row(gA, RED, items, draw) + `<g transform="translate(600 0)">${row(gB, BLUE, items, draw)}</g>`;
const asState = (g, colour, it) => g({ formation: "line", arm: "infantry", state: it.state, strength: it.strength, colour });
const asArm = (g, colour, it) => g({ formation: "line", arm: it.arm, state: "intact", strength: 1, colour });

function glyphSheet(size) {
  const W = 1160;
  let y = 20, s = "";
  const topNotesA = ["The unit's whole footprint is the symbol: the box IS the 72 px. For: mass at a glance; strength reads as area; nothing to learn. Against: a 4:1 box is not the aspect the symbol tradition reads at, and a mass at 36 × 36 is a small square."];
  const topNotesB = ["A 72 px unit trace with a true-aspect symbol box astride it. For: the real operations-map shape, and the arm mark gets a 3:2 field. Against: two marks per unit, and lighter, so a weak unit reads faintly at a crowded extent."];
  const topH = Math.max(cardHeight(552, topNotesA, 166), cardHeight(552, topNotesB, 166));
  s += card(20, y, 552, topH, "A · FRAME TO FRONTAGE — CHOSEN", topNotesA, anatomy("A"), 276);
  s += card(588, y, 552, topH, "B · SYMBOL ON THE TRACE — NOT CHOSEN", topNotesB, anatomy("B"), 276);
  y += topH + 24;

  const band = (title, notes, inner, innerH = 78) => {
    const h = cardHeight(1120, notes, innerH);
    const g = card(20, y, 1120, h, title, notes, inner, 20);
    y += h + 24;
    return g;
  };
  s += band("THE FOUR STATES · A, AND · B", [
    "Intact keeps the heavy front edge. Engaged serrates it into the operations map's own CONTACT LINE — drawn inside the unit's own footprint, so this glyph lays nothing down before the bodies and has no `mark` half at all, which the Glyph interface already allows for. Broken dashes the frame and drops the tint. Destroyed is struck out and stays in the SIDE INK, because ink is the only carrier of side (#130).",
  ], pair(asState, STATES));
  s += band("THE ARMS", [
    "Foot is the crossed diagonals and horse the single one, which is what Atlas already draws and what a reader brings from a modern map. A ship is a hull in plan, bow up — Atlas leaves a ship as the plain block, and two of the seven battles are naval. AIRCRAFT IS A CANDIDATE ONLY: whether it is an arm at all is #131's, and its sign is #140's, which #131 blocks.",
  ], pair(asArm, ARMS));
  s += band("LINE, COLUMN AND MASS", [
    "A mass is four across and two deep (ADR-0016): half a line's frontage, twice its depth. Both candidates measure it the same way, so all four views agree on what a mass is — A doubles the box's depth, B runs a second trace.",
  ], [["line", "line"], ["column", "column"], ["mass", "mass"]].map(([fm, name], i) =>
    `<g transform="translate(${i * 176 + 92} 48)">${gA({ formation: fm, arm: "infantry", state: "intact", strength: 1, colour: RED })}${text(0, 62, name, "credit", ink, { anchor: "middle" })}</g>` +
    `<g transform="translate(${i * 176 + 692} 48)">${gB({ formation: fm, arm: "infantry", state: "intact", strength: 1, colour: BLUE })}${text(0, 62, name, "credit", ink, { anchor: "middle" })}</g>`).join(""), 122);

  s += band("THE SAME UNIT IN FOUR VIEWS", [
    "One line of ships at 72 px, engaged, at 90% — the plate's ticks with Billow, the Atlas block with its hatch, and the two staff candidates. The anatomy is identical in all four: the same length, the same flank, the same four states, the same side ink by roster order. Only the hand changes.",
  ], [
    ["Chart plate", `<g transform="rotate(90)">${ticks({ length: 72, formation: "column", state: "engaged", strength: 0.9, colour: PLATE.sides.British, seed: 5 })}</g>`],
    ["Atlas", `<g transform="rotate(90)">${block({ length: 72, formation: "column", state: "engaged", strength: 0.9, colour: PLATE.sides.British, ink: PLATE.ink })}</g>`],
    ["Staff map · A", gA({ formation: "line", arm: "ship", state: "engaged", strength: 0.9, colour: RED })],
    ["Staff map · B", gB({ formation: "line", arm: "ship", state: "engaged", strength: 0.9, colour: RED })],
  ].map(([name, g], i) => `<g transform="translate(${i * 272 + 136} 40)">${g}${text(0, 56, name, "credit", ink, { anchor: "middle" })}</g>`).join(""), 102);

  const H = y;
  size.h = H;
  return facedBoard("The staff glyph", W, H, `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display: block;"><rect width="${W}" height="${H}" fill="${STAFF.letterbox}"/>${s}</svg>`);
}
const GLYPH_H = { h: 0 };
out("Glyph.dc.html", glyphSheet(GLYPH_H));

// ---------------------------------------------------------------------------------------------------
// Page 2 · the moves sheet — the ticket's sharpest question
// ---------------------------------------------------------------------------------------------------
function movesSheet(size) {
  const W = 1160, A = { x: 0, y: 0 }, B = { x: 236, y: 0 };
  const strip = (style) => [
    ["track", "where it came from"],
    ["intent", "where it is going"],
    ["detachment", "an ordered move of part"],
  ].map(([kind, gloss], i) =>
    `<g transform="translate(16 ${i * 74 + 42})">${move(kind, A, B, { style, ink, colour: RED, bend: kind === "intent" ? 10 : 0 })}` +
    text(258, -8, kind, "legend", ink) + text(258, 8, gloss, "stateWord", ink, { opacity: 0.7 }) + `</g>`).join("");
  const tangle = (style) => [
    ["track", { x: 16, y: 128 }, { x: 208, y: 70 }, ink],
    ["intent", { x: 60, y: 26 }, { x: 262, y: 100 }, ink],
    ["detachment", { x: 34, y: 156 }, { x: 274, y: 34 }, BLUE],
  ].map(([k, a, b, c]) => move(k, a, b, { style, ink, colour: c, bend: k === "intent" ? 14 : 0 })).join("");

  let y = 20, s = "";
  const nPen = ["A width, a dash, a head shape and a head size. Nothing else. Legible, cheap, and no new slot: `pens` stays exactly as ADR-0021 left it. But a 5 px stroked line with a barb is a THICK LINE, not a broad arrow."];
  const nTap = ["A polygon that tapers from tail to shoulder and opens into the head: hollow for intent, solid for a detachment, curved along its axis, and sized to its own run. It cannot come out of a Pen at any values."];
  const h1 = Math.max(cardHeight(552, nPen, 232), cardHeight(552, nTap, 232));
  s += card(20, y, 552, h1, "PEN · WHAT `Pens` CAN EXPRESS TODAY — NOT CHOSEN", nPen, strip("pen"), 20);
  s += card(588, y, 552, h1, "TAPER · WHAT AN OPERATIONS MAP DRAWS — CHOSEN", nTap, strip("taper"), 20);
  y += h1 + 24;

  const nPen2 = ["The anatomy's test: three motion styles tellable apart where they overlap. Pen passes it — dash and weight are enough — but all three read as one family of line."];
  const nTap2 = ["Taper passes it more widely: a pipped line, a hollow arrow and a solid one are three MATERIALS, not three weights, so the reading survives the crowding Trafalgar 13:30 actually reaches."];
  const h2 = Math.max(cardHeight(552, nPen2, 190), cardHeight(552, nTap2, 190));
  s += card(20, y, 552, h2, "THREE STYLES CROSSING · PEN", nPen2, tangle("pen"), 120);
  s += card(588, y, 552, h2, "THREE STYLES CROSSING · TAPER", nTap2, tangle("taper"), 120);
  y += h2 + 24;

  const nDec = [
    "DECIDED: the staff map takes the taper, so ADR-0021's fifth slot is cut — a view supplies a `moves` hand of three functions beside `glyph`, `type`, `ground` and `furniture`, and the engraved three wrap the arrow they already draw. ADR-0021: \"if #139's drawing shows that a tapered operations arrow cannot be had from a width, a dash and a head, the handoff cuts a `moves` hand then, against a drawing. Coming back to ask is the expected path, not a failure.\"",
    "It cannot. A taper needs a width that VARIES along the shaft, which is a polygon and not a stroke; and a hollow head needs a fill distinct from its stroke, which `Pen` has no field for. So either the staff map takes the fifth slot — a `moves` hand of three functions — or it accepts the PEN column, which is a legitimate answer: the three styles stay tellable apart and no view yet needs the taper except on aesthetic grounds.",
    "What is NOT an option is a taper factor on `Pen`. It would put a value on every view for one view's polygon, which is exactly the general table of overridable passes ADR-0021 rejected.",
  ];
  const h3 = cardHeight(1120, nDec, 8);
  s += card(20, y, 1120, h3, "THE DECISION ADR-0021 ASKED FOR — THE SLOT IS CUT", nDec, "", 20);
  y += h3 + 20;

  size.h = y;
  return facedBoard("The staff map's moves", W, y, `<svg width="${W}" height="${y}" viewBox="0 0 ${W} ${y}" xmlns="http://www.w3.org/2000/svg" style="display: block;"><rect width="${W}" height="${y}" fill="${STAFF.letterbox}"/>${s}</svg>`);
}
const MOVES_H = { h: 0 };
out("Moves.dc.html", movesSheet(MOVES_H));

// ---------------------------------------------------------------------------------------------------
// Page 2 · furniture, type, labels
// ---------------------------------------------------------------------------------------------------
function furnitureSheet(size) {
  const W = 1160;
  let y = 20, s = "";
  const two = (titleL, notesL, innerL, xL, titleR, notesR, innerR, xR, innerH) => {
    const h = Math.max(cardHeight(552, notesL, innerH), cardHeight(552, notesR, innerH));
    const g = card(20, y, 552, h, titleL, notesL, innerL, xL) + card(588, y, 552, h, titleR, notesR, innerR, xR);
    y += h + 24;
    return g;
  };

  const forces = ["calm", "light", "moderate", "fresh", "gale"];
  s += two(
    "NORTH AND WIND · TOP LEFT",
    ["The rose becomes a needle; the feathered wind arrow becomes the meteorological station BARB, which is what a twentieth-century sheet draws. No declination diagram: we have no declination, and a sheet that drew one would be saying something it does not know. ADR-0021: a north arrow is the rose's hand, not a new piece."],
    northArrow(44, 62, ink) + forces.map((force, i) =>
      `<g transform="translate(${i * 94 + 142} 62)">${windBarb(0, 0, ink, 292, force)}${text(0, 44, force, "credit", ink, { anchor: "middle" })}</g>`).join(""),
    0,
    "SCALE BAR · BOTTOM LEFT",
    ["Alternating blocks with the numerals under the divisions and the unit named at the end, where the plate rules a hairline bar with ticks and writes the whole distance above it. The one piece that never leaves, in either mode: nothing else says how big the ground is."],
    staffScaleBar(0, 34, ink, SCENES.trafalgar.scale) +
      `<g transform="translate(0 96)">${scaleBar(0, 0, ink, 120, "5 nautical miles")}${text(150, -2, "the chart plate's, for comparison", "stateWord", ink, { opacity: 0.6 })}</g>`,
    60, 112);

  const sample = (o) => `<g transform="scale(0.62)">${frameGlyph({ length: 68, formation: "line", arm: o.arm ?? "infantry", ink, ...o })}</g>`;
  const leg = staffLegend(0, 0, { sides: SCENES.cannae.sides, ink, panel: STAFF.panel, sample, arms: ["infantry", "cavalry"] });
  s += two(
    "LEGEND · BOTTOM LEFT, ABOVE THE SCALE BAR",
    ["The sheet's marginal key: a heavy head rule, caps, and rows sampling THE VIEW'S OWN GLYPH — which is why this legend shows staff frames while the plate's shows ticks, with no pass anywhere knowing that either view exists."],
    `<g transform="translate(0 ${-leg.y})">${leg.svg}</g>`, 160,
    "TITLE · TOP RIGHT   ·   CREDIT · BOTTOM RIGHT   ·   THE NEAT LINE",
    ["Caps and tracked for the sheet name; the credit in the marginal-data hand, small caps at the foot. Both take paper panels, because the graticule runs under every corner at every extent (#138). The plate's doubled hairline becomes a heavy outer rule with a fine inner one."],
    `<rect x="-166" y="0" width="332" height="32" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.8"/>` +
      text(154, 17, "The Battle of Cannae", "title", ink, { anchor: "end" }) +
      `<rect x="-166" y="48" width="332" height="22" fill="${STAFF.panel}" stroke="${ink}" stroke-width="0.8"/>` +
      text(154, 59, "RELIEF: SRTM GL1 (PUBLIC DOMAIN)", "credit", ink, { anchor: "end", opacity: 0.85 }) +
      `<g transform="translate(-166 88)">${neatLine(0, 0, 332, 48, ink)}${text(166, 25, "THE NEAT LINE", "credit", ink, { anchor: "middle", opacity: 0.75 })}</g>`,
    276, Math.max(leg.H + 8, 150));

  const bandNotes = ["Full width below the plate with the clock at the left, and its slots, are anatomy. The hand is the view's: one heavy rule where the plate doubles a hairline, a vertical rule ruling the clock column off the prose the way a printed form does, tabular figures, and caps for the date, the phase and the credit — and, again, no italic anywhere."];
  const bh = cardHeight(1120, bandNotes, 116);
  s += card(20, y, 1120, bh, "THE CAPTION BAND", bandNotes, `<g transform="scale(0.98)">${staffCaptionBand(STAFF, SCENES.cannae.band, 1120, 0, 96)}</g>`, 6);
  y += bh + 24;

  const unit = `<g transform="rotate(100)">${frameGlyph({ formation: "column", arm: "ship", state: "engaged", strength: 0.9, colour: RED, ink })}</g>`;
  const labelNotes = [
    "Two lines on the glyph's flank, never ahead of the unit, in the collapse order the anatomy fixes. The hand: the NAME IN CAPS AND TRACKED in the side ink, the fact upper-lower beneath it.",
    "ADR-0021 gives the label pass no slot of its own, and it also names \"its own label leader\" as one of the four places this view broke the old list. DECIDED: the elbow, and `type` owns it — a view's hand for setting a name against a thing, the leader included — so the label pass still gains no slot of its own and ADR-0021 is narrowed rather than contradicted.",
  ];
  const lh = cardHeight(1120, labelNotes, 176);
  s += card(20, y, 1120, lh, "THE LABEL AND ITS LEADER", labelNotes, [
    ["THE PLATE'S: A HAIRLINE TO A DOT — NOT CHOSEN", false],
    ["THE SHEET'S: AN ELBOW ENDING IN A TICK — CHOSEN", true],
  ].map(([name, elbow], i) => `<g transform="translate(${i * 340 + 130} 108)">${unit}` +
    staffLabel(48, -54, "Weather column", "engaged · 90%", RED, ink, "start", { x1: 0, y1: 0, x2: 44, y2: -54 }, { elbow }) +
    text(-44, 52, name, "credit", ink, { opacity: 0.8 }) + `</g>`).join("") +
    `<g transform="translate(778 108)">${unit}${text(72, -74, "COLLAPSE, STEPS 0 TO 4", "credit", ink, { opacity: 0.8 })}` +
    [["0", "Weather column", "engaged · 90%"], ["2", "Weather column", "engaged"], ["3", "Weather column", ""], ["4", "Weather", ""]]
      .map(([n, name, fact], i) => `<g transform="translate(72 ${i * 26 - 40})">${text(-18, 0, n, "credit", ink, { opacity: 0.5 })}${text(0, 0, name, "unitName", RED)}${fact ? text(136, 0, fact, "stateWord", ink, { opacity: 0.8 }) : ""}</g>`).join("") + `</g>`, 20);
  y += lh + 24;

  // The face, three ways.
  const ramp = [["clock", "13:30"], ["title", "The Battle of Cannae"], ["caption", "The Libyans wheel inward."], ["unitName", "Hasdrubal's horse"], ["stateWord", "broken · 55%"], ["legend", "destroyed"], ["scale", "3 kilometres"], ["credit", "SRTM GL1 (public domain)"]];
  const column = (key, name, note) => `<g><rect x="-14" y="-30" width="352" height="308" fill="${paper}" stroke="${ink}" stroke-width="0.8"/>` +
    text(0, -16, name, "legend", ink) + text(0, 2, note, "stateWord", ink, { opacity: 0.7 }) +
    `<g font-family="${FACES[key].replace(/"/g, "&quot;")}"${STRETCH[key]}>` +
    ramp.map(([role, t], i) => `<text x="0" y="${i * 30 + 40}" font-size="${Math.min(TYPE[role].size, 22)}" font-weight="${TYPE[role].weight}"${TYPE[role].track ? ` letter-spacing="${TYPE[role].track}"` : ""} fill="${ink}" dominant-baseline="middle">${TYPE[role].caps ? t.toUpperCase() : t}</text>` +
      `<text x="330" y="${i * 30 + 40}" font-size="9" letter-spacing="0.6" fill="${ink}" fill-opacity="0.45" text-anchor="end" dominant-baseline="middle">${role.toUpperCase()}</text>`).join("") + `</g></g>`;
  const faceNotes = [
    "One file is the cost, whichever wins: ADR-0021 fetches every non-default face at idle and a switch WAITS rather than drawing in a fallback. Archivo is the only variable one of the three — one file carries both the condensed width and both weights, where the other two need a static file per weight.",
    "Every row here is set upright, because this view tells a name from a fact by CASE AND TRACKING rather than by slope. That is what makes one weight axis enough.",
  ];
  const fh = cardHeight(1120, faceNotes, 320);
  s += card(20, y, 1120, fh, "THE FACE", faceNotes,
    [["archivo", "ARCHIVO, wdth 75 — CHOSEN", "one variable file, both weights; 179 px"], ["plex", "IBM PLEX SANS CONDENSED", "the terrain stand-in; two files; 197 px"], ["barlow", "BARLOW CONDENSED", "two files; the narrowest, 157 px"]]
      .map(([key, name, note], i) => `<g transform="translate(${i * 372} 34)">${column(key, name, note)}</g>`).join(""), 30);
  y += fh + 20;

  size.h = y;
  return page("Furniture, type and the label", `<div style="width: ${W}px; height: ${y}px; background: ${STAFF.letterbox}; overflow: hidden;"><svg width="${W}" height="${y}" viewBox="0 0 ${W} ${y}" xmlns="http://www.w3.org/2000/svg" style="display: block;"><rect width="${W}" height="${y}" fill="${STAFF.letterbox}"/>${s}</svg></div>`);
}
const FURN_H = { h: 0 };
out("Furniture.dc.html", furnitureSheet(FURN_H));

// ---------------------------------------------------------------------------------------------------
// Page 2 · the name in the chooser
// ---------------------------------------------------------------------------------------------------
function nameSheet() {
  const W = 552;
  const rows = (fourth) => ["Chart plate", "Night plate", "Atlas", fourth].map((n, i) => `<option${i === 3 ? " selected" : ""}>${n}</option>`).join("");
  const case_ = (name, why) => `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid rgba(47,49,52,0.35); background: ${paper};">
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; opacity: 0.7;">View</div>
      <select style="font: inherit; font-size: 14px; padding: 6px 8px; border: 1px solid rgba(47,49,52,0.55); background: ${paper}; color: ${ink};">${rows(name)}</select>
    </div>
    <div style="font-size: 13px; line-height: 1.45;">${why}</div>
  </div>`;
  return page("The name in the chooser", `<div style="width: ${W}px; padding: 24px; box-sizing: border-box; background: ${STAFF.letterbox}; display: flex; flex-direction: column; gap: 14px; font-family: ${FACES.plex}; color: ${ink};">
  <div style="font-size: 17px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">The name of the view</div>
  <div style="font-size: 13px; line-height: 1.45;">The three names it stands beside are all <b>the physical object</b> — a plate, a plate, a bound atlas — never what the picture is about. The fourth should be an object too, and one word or two.</div>
  ${case_("Staff map — CHOSEN", "<b>The object.</b> The map a staff works on, and the ticket's own working name. Keeps the rhythm of the three beside it and says <i>whose</i> map it is, which is the whole idiom: a working sheet, marked up, rather than a published engraving.")}
  ${case_("Situation map", "<b>The doctrinal term</b> (SITMAP) for a map showing the present disposition — which is exactly what our picture is, at every phase. The most accurate of the three, and the only one that describes the <i>content</i>, which breaks the pattern the other three set.")}
  ${case_("Operations map", "<b>Also real</b>, and the most familiar of the three to a general reader. Leans toward the plan rather than the present state, which is slightly wrong for a view whose whole job is to show where things are now.")}
  <div style="font-size: 12px; line-height: 1.45; opacity: 0.75;">Whatever wins is only what the chooser shows. The id stays <code>staff</code> either way, and the id is what player state, the remembered view (ADR-0023) and the URL carry.</div>
</div>`);
}
out("Name.dc.html", nameSheet());

// ---------------------------------------------------------------------------------------------------
// canvas.json
// ---------------------------------------------------------------------------------------------------
const canvas = {
  pages: [
    { id: "page-1", name: "The view, whole" },
    { id: "page-2", name: "The hand" },
  ],
  artboards: [
    { file: "Main.dc.html", x: 0, y: 0, w: 1120, h: 650, title: "Trafalgar 13:30 · the overlap test", page: "page-1" },
    { file: "Cannae.dc.html", x: 1240, y: 0, w: 1120, h: 650, title: "Cannae phase 6 · an ancient battle", page: "page-1" },
    { file: "Midway.dc.html", x: 0, y: 810, w: 1120, h: 650, title: "Midway 10:25 · a fleet battle in its own century", page: "page-1" },
    { file: "Phone.dc.html", x: 1240, y: 810, w: 390, h: 844, title: "Phone · 390 wide", page: "page-1" },
    { file: "Glyph.dc.html", x: 0, y: 0, w: 1160, h: GLYPH_H.h, title: "The staff glyph: two candidates", page: "page-2" },
    { file: "Moves.dc.html", x: 1280, y: 0, w: 1160, h: MOVES_H.h, title: "The moves, and the fifth slot", page: "page-2" },
    { file: "Furniture.dc.html", x: 0, y: GLYPH_H.h + 200, w: 1160, h: FURN_H.h, title: "Furniture, type and the label", page: "page-2" },
    { file: "Name.dc.html", x: 1280, y: MOVES_H.h + 140, w: 552, h: 620, title: "The name in the chooser", page: "page-2" },
  ],
  annotations: [
    {
      id: "view-intro", x: 0, y: -260, w: 1120, page: "page-1",
      text: "THE STAFF-MAP VIEW (#139), RESOLVED 2026-09-07 — the first view built outside the engraved system. ADR-0021 fixed the rule it works to: what the picture shows, where each thing sits and what it means is the same in every view; HOW any of it is drawn is the view's. So every board here is one hand redrawing an unchanged anatomy — same extent and north up, same furniture in the same corners, same caption band with the clock at the left, same label on the flank, same four states, same 72 px glyph, same side ink by roster order.\nThe chips open on what was CHOSEN — candidate A for the glyph, the tapered arrow for the moves, Archivo for the face, the lightened sea — and the unchosen candidates stay behind them. The GROUND is not reopened: #138 chose the `ops` sheet and it is imported unchanged.",
    },
    {
      id: "view-test", x: 1240, y: -260, w: 1120, page: "page-1",
      text: "WHAT EACH FRAME IS FOR. TRAFALGAR 13:30 is the overlap test every view passes — eight units, four of them locked together in the same 200 px, which is where a glyph that looked handsome alone stops reading. CANNAE asks whether a twentieth-century idiom on a 216 BC battle is absurd or clarifying; the marks are the ones a reader already brings (crossed diagonals for foot, one for horse), and the ground is #138's. MIDWAY is the case the engraved plate serves worst: open ocean, where a graticule is the only thing that says where anything is.\nNothing is geo-registered — as on the terrain canvas, these are scenes, not map files.",
    },
    {
      id: "view-sea", x: 0, y: 1490, w: 1120, page: "page-1",
      text: "ONE THING #138 COULD NOT HAVE SEEN, now settled. Its water tone was chosen against a sliver of sea on a land battle; Midway is the first frame that is water edge to edge, and at full frame `#93a9b6` read as a blue sheet rather than a buff one with sea on it. DECIDED: open water is lightened to `#b3c4cb`, and `#93a9b6` becomes the shallow and reef tone — a correction to the chosen `ops` palette, not a reopening of it. The old tone stays on the chip.",
    },
    {
      id: "hand-decide", x: 0, y: -330, w: 1160, page: "page-2",
      text: "DECIDED, 2026-09-07. The chips open on what was chosen; the unchosen candidates stay behind them.\n1 · THE GLYPH: A, the frame to frontage — the box IS the unit's 72 px footprint.\n2 · THE MOVES: the tapered operations arrow, which cannot come out of a `Pen`. ADR-0021's fifth slot is CUT: a view supplies a `moves` hand of three functions, and the engraved three wrap the arrow they already draw.\n3 · THE FACE: Archivo at wdth 75 — the only variable one of the three, so one file carries the condensed width and both weights.\n4 · THE LEADER: the elbow ending in a tick, owned by `type`, so the label pass still gains no slot of its own.\n5 · THE NAME: Staff map.\n6 · THE SEA: lightened at full frame.\nNOT this ticket: the aircraft sign (#140, blocked on #131) is a candidate only; the player's controls and chooser are #137's; the ground is #138's, closed.",
    },
  ],
  launch: { view: "canvas", page: "page-1" },
};
out("canvas.json", JSON.stringify(canvas, null, 2) + "\n");

console.log("staff-map: 8 artboards written");
