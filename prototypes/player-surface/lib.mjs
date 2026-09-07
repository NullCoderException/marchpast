// The player surface (#137): the shared pieces every artboard is built from.
// Nothing here is merged to main. Every value is lifted from the real files —
// palettes from src/render/views.ts, sizes and rules from src/player/player.css,
// the strip's order from src/player/controls.ts, the staff palette from #139's
// prototypes/staff-map/staff.mjs — so a picture here is the app, not a sketch.
import { faceBlock } from "./fonts.mjs";

/** The three v0.2 palettes verbatim from src/render/views.ts, and the staff map's from #139. */
export const VIEWS = {
  plate: {
    id: "plate",
    name: "Chart plate",
    ink: "#2b2418",
    paper: "#efe3c6",
    land: "#e3d3ac",
    letterbox: "#d9c8a2",
    face: `'IM Fell English', Georgia, serif`,
    stretch: "normal",
    caps: false,
  },
  night: {
    id: "night",
    name: "Night plate",
    ink: "#efe3c6",
    paper: "#1b2430",
    land: "#2a3340",
    letterbox: "#111820",
    face: `'IM Fell English', Georgia, serif`,
    stretch: "normal",
    caps: false,
  },
  atlas: {
    id: "atlas",
    name: "Atlas",
    ink: "#2b2418",
    paper: "#efe3c6",
    land: "#e3d3ac",
    letterbox: "#d9c8a2",
    face: `'IM Fell English', Georgia, serif`,
    stretch: "normal",
    caps: false,
  },
  staff: {
    id: "staff",
    name: "Staff map",
    ink: "#2f3134",
    paper: "#ded7c2",
    land: "#d9d2b8",
    letterbox: "#c8c1ab",
    face: `'Archivo', 'Helvetica Neue', Arial, sans-serif`,
    stretch: "75%",
    caps: true,
  },
};

// --- colour ---------------------------------------------------------------
// The same arithmetic ADR-0023's conformance test names, so a number printed on
// an artboard is the number the test would compute.

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
export const L = (h) => {
  const [r, g, b] = rgb(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const ratio = (a, b) => {
  const x = L(a), y = L(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
export const mix = (fg, bg, a) => {
  const F = rgb(fg), B = rgb(bg);
  return "#" + [0, 1, 2].map((i) => Math.round(F[i] * a + B[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
};
export const r2 = (n) => Math.round(n * 100) / 100;

/**
 * The two candidate derivations of the surface's two *derived* tones.
 *
 *  `decided` — ADR-0023 as written: the hover fill and the trough are the
 *  palette's `land`, the rule is the ink at a flat 55%.
 *
 *  `derived` — both come off the ink over the ground instead: the fill is an
 *  8% wash, the rule the least alpha from 0.55 up that clears 3:1. `land` is a
 *  picture value (what ground is coloured on a map) and stops doing control
 *  duty; the plate and the night plate move by less than a JND, and the staff
 *  map, whose sea and land are one tone apart by design, gains a fill that can
 *  be seen and a rule that passes.
 */
export const FILL_ALPHA = 0.08;
export const RULE_FLOOR = 0.55;
export const RULE_TARGET = 3;

export function ruleAlpha(v) {
  for (let a = RULE_FLOOR; a <= 1.0001; a = r2(a + 0.01)) {
    if (ratio(mix(v.ink, v.paper, a), v.paper) >= RULE_TARGET) return a;
  }
  return 1;
}

export function surface(v, mode = "decided") {
  const derived = mode === "derived";
  return {
    ink: v.ink,
    ground: v.paper,
    edge: v.letterbox,
    face: v.face,
    stretch: v.stretch,
    sunk: derived ? mix(v.ink, v.paper, FILL_ALPHA) : v.land,
    rule: mix(v.ink, v.paper, derived ? ruleAlpha(v) : RULE_FLOOR),
    scheme: L(v.paper) > 0.18 ? "light" : "dark",
  };
}

// --- the strip ------------------------------------------------------------
// player.css, transcribed. The classes are kept as comments so a reader can put
// any rule here back against the file it came from.

/** `.st-controls button, .st-controls select` — font inherit, ground, 1px rule, 2px radius, 4/10 padding. */
export const control = (extra = "") =>
  `font: inherit; color: inherit; background: {{ground}}; border: 1px solid {{rule}}; border-radius: 2px;` +
  ` padding: 4px 10px; cursor: pointer; ${extra}`;

/** A native `<select>`, exactly as the strip has three of today. */
export const nativeSelect = (options, selected, extra = "") =>
  `<select style="${control(extra)}">` +
  options.map((o) => `<option${o === selected ? " selected" : ""}>${o}</option>`).join("") +
  `</select>`;

/**
 * `appearance: none` and a caret drawn in the view's own ink. The popup stays
 * the operating system's, so every keyboard, screen-reader and phone-picker
 * property of a native select is untouched; only the one glyph the OS draws
 * inside the box changes hands.
 */
export const caretSelect = (options, selected, hand, extra = "") => {
  const caret =
    hand === "staff"
      ? `<svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M0 0 L9 0 L4.5 6 Z" fill="{{ink}}"/></svg>`
      : `<svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M0.6 0.6 L4.5 5 L8.4 0.6" fill="none" stroke="{{ink}}" stroke-width="1.1" stroke-linecap="round"/></svg>`;
  return (
    `<span style="position: relative; display: inline-flex; align-items: center;">` +
    `<select style="${control("appearance: none; -webkit-appearance: none; padding-right: 28px;")}${extra}">` +
    options.map((o) => `<option${o === selected ? " selected" : ""}>${o}</option>`).join("") +
    `</select>` +
    `<span style="position: absolute; right: 9px; display: flex; pointer-events: none;">${caret}</span>` +
    `</span>`
  );
};

/**
 * A control drawn in the view's hand: no `<select>` at all, a button over a
 * listbox this prototype does not build. The engraved hand doubles the rule
 * under the value the way the plate's neat line is doubled; the staff hand
 * squares the corners, sets the value in caps and files a solid caret.
 */
export const drawnSelect = (label, hand) => {
  if (hand === "staff") {
    return (
      `<span style="display: inline-flex; align-items: center; gap: 9px; padding: 4px 10px 4px 11px;` +
      ` border: 1px solid {{ink}}; border-radius: 0; background: {{ground}}; cursor: pointer;` +
      ` font-size: 13px; letter-spacing: 0.09em; text-transform: uppercase;">` +
      `<span>${label}</span>` +
      `<svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M0 0 L9 0 L4.5 6 Z" fill="{{ink}}"/></svg>` +
      `</span>`
    );
  }
  // `3px double` is literally two hairlines with a hairline between them, which
  // is the plate's own doubled neat line at the size the strip has room for.
  return (
    `<span style="display: inline-flex; align-items: center; gap: 9px; padding: 4px 10px 2px;` +
    ` border: 1px solid {{rule}}; border-bottom: 3px double {{rule}}; border-radius: 2px;` +
    ` background: {{ground}}; cursor: pointer;">` +
    `<span>${label}</span>` +
    `<svg width="9" height="6" viewBox="0 0 9 6" aria-hidden="true"><path d="M0.6 0.6 L4.5 5 L8.4 0.6" fill="none" stroke="{{ink}}" stroke-width="1.1" stroke-linecap="round"/></svg>` +
    `</span>`
  );
};

/** The chooser under whichever candidate the chip is on, as three `<sc-if>` branches. */
export const chooserBranches = (options, selected, hand, extra = "") =>
  `<sc-if value="{{isNative}}" hint-placeholder-val="{{ true }}">${nativeSelect(options, selected, extra)}</sc-if>` +
  `<sc-if value="{{isCaret}}" hint-placeholder-val="{{ false }}">${caretSelect(options, selected, hand, extra)}</sc-if>` +
  `<sc-if value="{{isDrawn}}" hint-placeholder-val="{{ false }}">${drawnSelect(selected, hand)}</sc-if>`;

/** `.st-bar`, its `.st-tick`s and its `.st-thumb`: the trough is `--st-sunk`, the marks are ink. */
export function scrubber(ticks, at, { phone = false } = {}) {
  const h = phone ? 24 : 18;
  const tickTop = phone ? -6 : -4;
  const tickH = phone ? 36 : 24;
  const marks = ticks
    .map(
      (f) =>
        `<span style="position: absolute; left: ${r2(f * 100)}%; top: ${tickTop}px; width: 1px;` +
        ` height: ${tickH}px; margin-left: 0; background: {{ink}};"></span>`,
    )
    .join("");
  return (
    `<span style="position: relative; display: flex; flex: 1 1 220px; min-width: 0; height: ${h}px;` +
    ` border: 1px solid {{rule}}; background: {{sunk}}; cursor: pointer;${phone ? " flex-basis: 100%;" : ""}">` +
    marks +
    `<span style="position: absolute; left: ${r2(at * 100)}%; top: 50%; width: 11px; height: 11px;` +
    ` margin: -6px 0 0 -6px; border: 1px solid {{ink}}; border-radius: 50%; background: {{ground}};"></span>` +
    `</span>`
  );
}

/**
 * The control strip, in the order `createControls` appends it: previous, play,
 * next, bar, readout, speed, view, level (when the battle has more than one),
 * Details, then the Picker apart from the transport.
 */
export function strip(v, b, { hand = v.id, phone = false, chooser = "branch", back = "none", faceHole = false } = {}) {
  const face = faceHole ? "{{face}}" : v.face;
  const stretch = faceHole ? "{{stretch}}" : v.stretch;
  const pad = phone ? "8px 10px" : "10px 24px";
  const gap = phone ? 8 : 12;
  const minTarget = phone ? " min-height: 36px;" : "";
  const btn = (label, extra = "") =>
    `<button style="${control(minTarget + extra)}">${label}</button>`;
  const select = (options, selected, extra = "") =>
    chooser === "branch"
      ? chooserBranches(options, selected, hand, minTarget + extra)
      : chooser === "caret"
        ? caretSelect(options, selected, hand, minTarget + extra)
        : chooser === "drawn"
          ? drawnSelect(selected, hand)
          : nativeSelect(options, selected, minTarget + extra);

  const home =
    back === "link"
      ? `<a href="#" style="color: inherit; text-decoration: none; border-bottom: 1px solid {{rule}};` +
        ` padding-bottom: 1px; margin-right: 2px;">&#8592; All battles</a>`
      : back === "mark"
        ? `<span style="display: inline-flex; align-items: center; cursor: pointer;" title="All battles">${markSvg()}</span>`
        : "";

  const parts = [
    home,
    btn("&#9198;"),
    btn("Play", phone ? " min-width: 4em;" : " min-width: 5.5em;"),
    btn("&#9197;"),
    scrubber(b.ticks, b.at, { phone }),
    `<output style="min-width: ${phone ? "0" : "4.2em"}; font-size: ${phone ? 17 : 20}px; text-align: right;` +
      ` font-variant-numeric: tabular-nums;">${b.clock}</output>`,
    select(["0.5x", "1x", "2x", "4x"], "1x"),
    select(Object.values(VIEWS).map((x) => x.name), v.name),
    // ADR-0017's honesty rule: every visit opens on the coarsest level.
    b.levels ? select(b.levels, b.levels[0]) : "",
    `<button style="${control(minTarget + " background: {{sunk}};")}">Details</button>`,
    b.picker ? select([b.picker], b.picker) : "",
  ].filter(Boolean);

  return (
    `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: ${gap}px; padding: ${pad};` +
    ` border-top: 1px solid {{rule}}; background: {{ground}}; color: {{ink}}; font-family: ${face};` +
    ` font-stretch: ${stretch}; font-size: 16px; user-select: none; box-sizing: border-box;">` +
    parts.join("") +
    `</div>`
  );
}

/**
 * #135's mark in its small cut: below about 24 the doubled rule cannot stay
 * doubled, so it is spent as one bar and the rank drops to two ticks, keeping
 * the tick that has passed. The rule is thin and tall against ticks that are
 * thick and short, which is the one thing #135 found the mark only reads with.
 */
export const markSvg = (px = 20, colour = "{{ink}}") =>
  `<svg width="${px}" height="${px}" viewBox="0 0 16 16" aria-hidden="true">` +
  `<rect x="7.6" y="1" width="0.9" height="14" fill="${colour}"/>` +
  `<rect x="10.2" y="5.4" width="4.4" height="5.2" fill="${colour}"/>` +
  `<rect x="1.4" y="5.4" width="4.4" height="5.2" fill="${colour}"/>` +
  `</svg>`;

// --- the page wrapper -----------------------------------------------------

/** Every artboard: the two faces embedded, the link colours the skill asks for, no margin. */
export function page(body, { script = "", scheme = "light" } = {}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
    ${faceBlock()}
    body { margin: 0; font-family: system-ui, sans-serif; color-scheme: ${scheme}; }
    a { color: inherit; } a:hover { color: inherit; }
    select { font-stretch: inherit; }
    button, select, output, a { font-stretch: inherit; }
  </style>
</helmet>
${body}
</x-dc>
${script}
</body>
</html>
`;
}

/** The logic every chip-bearing board shares: the derivation, and which chooser branch is live. */
export function logic(props, extraVals = "", defaultView = "plate") {
  return `<script data-dc-script data-props='{${props}}'>
const rgb = (h) => [1,3,5].map((i) => parseInt(h.slice(i,i+2),16));
const lin = (c) => (c/255 <= 0.04045 ? c/255/12.92 : Math.pow((c/255+0.055)/1.055, 2.4));
const L = (h) => { const [r,g,b] = rgb(h); return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b); };
const ratio = (a,b) => { const x=L(a), y=L(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
const mix = (fg,bg,a) => "#" + [0,1,2].map((i) => Math.round(rgb(fg)[i]*a + rgb(bg)[i]*(1-a)).toString(16).padStart(2,"0")).join("");
const ruleAlpha = (ink, paper) => { for (let a = 0.55; a <= 1.0001; a += 0.01) { if (ratio(mix(ink,paper,a), paper) >= 3) return a; } return 1; };
const VIEWS = ${JSON.stringify(VIEWS)};
function surfaceOf(v, mode) {
  const derived = mode === "derived";
  return {
    ink: v.ink, ground: v.paper, edge: v.letterbox,
    sunk: derived ? mix(v.ink, v.paper, ${FILL_ALPHA}) : v.land,
    rule: mix(v.ink, v.paper, derived ? ruleAlpha(v.ink, v.paper) : 0.55),
    scheme: L(v.paper) > 0.18 ? "light" : "dark",
  };
}
class Component extends DCLogic {
  renderVals() {
    const mode = this.props.derivation ?? "decided";
    const chooser = this.props.chooser ?? "native";
    const view = VIEWS[this.props.view ?? "${defaultView}"];
    const s = surfaceOf(view, mode);
    return {
      ...s,
      isNative: chooser === "native", isCaret: chooser === "caret", isDrawn: chooser === "drawn",
      ${extraVals}
    };
  }
}
</script>`;
}
