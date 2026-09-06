// Generates the design-canvas artboards for the Sandtable design language.
// One Trafalgar scene, drawn in each view, so the difference between artboards is treatment only.
// The v2 map features (relief, shoals, rivers, works) are a second set of artboards in build-v2.mjs,
// which imports this file so one `node build-v2.mjs` regenerates the whole canvas.
import { writeFileSync } from "node:fs";
import {
  PLATE, NIGHT, ATLAS, seeded, f, ticks, smokeFor, arrow, TRACK, INTENT, DETACH, label, block,
  compass, scaleBar, legend, HATCH, captionBand, page, card,
} from "./lib.mjs";

// ---- the scene: Trafalgar, noon, four units ----
const COAST = "M870 20 L880 90 L840 120 L900 160 L960 200 L1000 260 L1030 320 L1050 380 L1100 430 L1100 20 Z";
export function stipple(v, seed = 7, n = 260) {
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

export const canvas = {
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
