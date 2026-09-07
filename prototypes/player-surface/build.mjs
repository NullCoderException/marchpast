// The player-surface canvas (#137). `node build.mjs` regenerates every artboard
// and canvas.json. Nothing here is merged to main. The pictures in plate.png,
// night.png and atlas.png are the real app captured at 1120 by shoot.mjs, so the
// strip drawn beneath them is at the same scale as the plate above them;
// staff.png and phone-staff.png are #139's boards, which the app cannot draw yet.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VIEWS, surface, ratio, mix, r2, ruleAlpha, FILL_ALPHA, RULE_FLOOR, RULE_TARGET,
  strip, page, logic, control, nativeSelect, caretSelect, drawnSelect, scrubber, markSvg,
} from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const out = (name, body) => writeFileSync(join(HERE, name), body);

/** The picture's own height, read out of the PNG rather than written down twice. */
function pngHeight(file) {
  const b = readFileSync(join(HERE, file));
  return b.readUInt32BE(20);
}

// The battles the four pictures are of. Tick fractions are scrubberSegments()'s
// own output for the authored files; Midway's are a stand-in at its phase count
// from #124's research, since no Midway file exists yet.
const TRAFALGAR = {
  ticks: [0, 0.0326, 0.1413, 0.2065, 0.3152, 0.4783, 0.6739, 0.9022],
  at: 0.4783,
  clock: "13:30",
  levels: ["Columns", "Squadrons"],
  picker: "The Battle of Trafalgar",
};
const CANNAE = {
  ticks: [0, 0.0758, 0.1667, 0.2803, 0.3939, 0.5455, 0.6591, 0.9318],
  at: 0.6591,
  clock: "11:00",
  levels: undefined,
  picker: "The Battle of Cannae",
};
const MIDWAY = {
  ticks: Array.from({ length: 21 }, (_, i) => r2(i / 21)),
  at: 0.38,
  clock: "10:25",
  levels: ["Forces", "Strikes"],
  picker: "The Battle of Midway",
};

const CHIPS =
  `"derivation":{"editor":"enum","options":["decided","derived"],"default":"decided","section":"Surface"},` +
  `"chooser":{"editor":"enum","options":["native","caret","drawn"],"default":"native","section":"Surface"}`;

// --- the four surfaces ----------------------------------------------------

function surfaceBoard(v, b, picture) {
  const h = pngHeight(picture);
  const s = surface(v);
  const frame = h + 120;
  const body =
    `<div style="width: 1120px; min-height: ${frame}px; background: ${s.edge}; color-scheme: ${s.scheme};">` +
    `<img src="${picture}" alt="" style="display: block; width: 1120px; height: ${h}px;">` +
    strip(v, b) +
    `</div>`;
  return { html: page(body, { script: logic(CHIPS, "", v.id), scheme: s.scheme }), h: frame };
}

const boards = {
  Main: surfaceBoard(VIEWS.plate, TRAFALGAR, "plate.png"),
  Night: surfaceBoard(VIEWS.night, TRAFALGAR, "night.png"),
  Atlas: surfaceBoard(VIEWS.atlas, CANNAE, "atlas.png"),
  Staff: surfaceBoard(VIEWS.staff, MIDWAY, "staff.png"),
};
for (const [name, board] of Object.entries(boards)) out(`${name}.dc.html`, board.html);

// --- the sheets -----------------------------------------------------------
// Every sheet is the plate's own paper and ink in the plate's face: these are
// working drawings for this project, not a second design language.

const SHEET = { paper: "#efe3c6", ink: "#2b2418", rule: "rgba(43,36,24,0.55)", faint: "rgba(43,36,24,0.2)" };
const MONO = `'SFMono-Regular', Menlo, Consolas, monospace`;

const sheet = (w, h, inner) =>
  `<div style="width: ${w}px; min-height: ${h}px; box-sizing: border-box; background: ${SHEET.paper};` +
  ` color: ${SHEET.ink}; font-family: ${VIEWS.plate.face}; padding: 34px 40px 40px;">${inner}</div>`;

const head = (title, blurb) =>
  `<h1 style="margin: 0 0 4px; font-size: 26px; font-weight: normal;">${title}</h1>` +
  `<p style="margin: 0 0 26px; font-size: 15px; line-height: 1.5; max-width: 74ch;">${blurb}</p>`;

const caps = (text, extra = "") =>
  `<h2 style="margin: 0 0 10px; font-size: 12px; font-weight: normal; letter-spacing: 0.08em;` +
  ` text-transform: uppercase; ${extra}">${text}</h2>`;

const num = (n, ok) =>
  `<span style="font-family: ${MONO}; font-size: 13px;${ok === false ? " font-weight: 700;" : ""}">${n}</span>`;

const swatch = (hex, w = 46) =>
  `<span style="display: inline-block; width: ${w}px; height: 18px; background: ${hex};` +
  ` border: 1px solid ${SHEET.rule}; vertical-align: -4px;"></span>`;

/** One view's row in the token table, under one derivation. */
function tokenRow(v, mode) {
  const s = surface(v, mode);
  const tests = [
    ["ink on ground", r2(ratio(s.ink, s.ground)), 4.5],
    ["ink on fill", r2(ratio(s.ink, s.sunk)), 4.5],
    ["rule on ground", r2(ratio(s.rule, s.ground)), RULE_TARGET],
  ];
  const fillStep = r2(ratio(s.sunk, s.ground));
  const cell = (hex) =>
    `<td style="padding: 7px 10px 7px 0;">${swatch(hex)}<br>` +
    `<span style="font-family: ${MONO}; font-size: 11px; opacity: 0.75;">${hex}</span></td>`;
  return (
    `<tr>` +
    `<td style="padding: 7px 16px 7px 0; font-size: 15px; white-space: nowrap;">${v.name}</td>` +
    cell(s.ground) + cell(s.ink) + cell(s.sunk) + cell(s.rule) + cell(s.edge) +
    tests
      .map(
        ([, value, target]) =>
          `<td style="padding: 7px 14px 7px 0; text-align: right;">${num(value.toFixed(2), value >= target)}` +
          `<br><span style="font-size: 11px; opacity: 0.75;">${value >= target ? "passes" : "fails"}</span></td>`,
      )
      .join("") +
    `<td style="padding: 7px 0; text-align: right;">${num(fillStep.toFixed(2))}` +
    `<br><span style="font-size: 11px; opacity: 0.75;">${fillStep >= 1.1 ? "visible" : "not visible"}</span></td>` +
    `</tr>`
  );
}

function tokenTable(mode) {
  const th = (t, extra = "") =>
    `<th style="padding: 0 14px 8px 0; font-size: 11px; font-weight: normal; letter-spacing: 0.07em;` +
    ` text-transform: uppercase; text-align: left; border-bottom: 1px solid ${SHEET.faint}; ${extra}">${t}</th>`;
  return (
    `<table style="border-collapse: collapse; width: 100%;">` +
    `<tr>${th("View")}${th("--st-ground")}${th("--st-ink")}${th("--st-sunk")}${th("--st-rule")}${th("--st-edge")}` +
    `${th("ink : ground", "text-align: right;")}${th("ink : fill", "text-align: right;")}` +
    `${th("rule : ground", "text-align: right;")}${th("fill : ground", "text-align: right;")}</tr>` +
    Object.values(VIEWS).map((v) => tokenRow(v, mode)).join("") +
    `</table>`
  );
}

const staffRule = ruleAlpha(VIEWS.staff);
out(
  "Tokens.dc.html",
  page(
    sheet(
      1180,
      1010,
      head(
        "The surface, derived",
        `ADR-0023 derives every token the strip uses from the palette a view already has, and locks the ` +
          `derivation with a conformance test over <em>VIEWS</em>: text at 4.5:1 against the ground and against the ` +
          `hover fill, the rule at 3:1 against the ground. The staff map is the fourth view, and the first one the ` +
          `derivation was not written against. It fails, by two hundredths of an alpha — and it fails a second ` +
          `time in a place the test does not look.`,
      ) +
        caps("A &middot; as ADR-0023 decided &mdash; fill from <em>land</em>, rule at ink 55%") +
        tokenTable("decided") +
        `<div style="height: 34px;"></div>` +
        caps(
          `B &middot; both derived from the ink over the ground &mdash; fill at ${Math.round(FILL_ALPHA * 100)}%,` +
            ` rule at the least alpha from ${RULE_FLOOR} up that clears ${RULE_TARGET}:1`,
        ) +
        tokenTable("derived") +
        `<p style="margin: 26px 0 0; font-size: 14px; line-height: 1.55; max-width: 96ch;">` +
        `<strong>What B costs and what it buys.</strong> The plate's fill moves from ${VIEWS.plate.land} to ` +
        `${mix(VIEWS.plate.ink, VIEWS.plate.paper, FILL_ALPHA)} and the night plate's from ${VIEWS.night.land} to ` +
        `${mix(VIEWS.night.ink, VIEWS.night.paper, FILL_ALPHA)}: the same luminance step to two decimal places, a ` +
        `little greyer in hue, and no rule anywhere changes, because 0.55 already clears 3:1 on all three engraved ` +
        `views. The staff map's fill goes from a step of 1.05 &mdash; which is no step &mdash; to 1.14, and its rule ` +
        `from 2.91 to ${r2(ratio(mix(VIEWS.staff.ink, VIEWS.staff.paper, staffRule), VIEWS.staff.paper)).toFixed(2)} ` +
        `at an alpha of ${staffRule.toFixed(2)}. B also takes <em>land</em> back off the surface, which is the ` +
        `deeper reason: <em>land</em> is what ground is coloured on a map, and a printed operations sheet colours ` +
        `its sea and its land one tone apart on purpose. It was never a control value.` +
        `</p>`,
    ),
    { scheme: "light" },
  ),
);

// --- the choosers ---------------------------------------------------------

/** The tail of the strip — readout, speed, view, level, Details — in one view. */
function tail(v, b, chooser, prefixed = false) {
  const s = surface(v);
  const bake = (html) =>
    html
      .replaceAll("{{ground}}", s.ground)
      .replaceAll("{{rule}}", s.rule)
      .replaceAll("{{ink}}", s.ink)
      .replaceAll("{{sunk}}", s.sunk);
  const sel = (options, selected) =>
    chooser === "native"
      ? nativeSelect(options, selected)
      : chooser === "caret"
        ? caretSelect(options, selected, v.id)
        : drawnSelect(selected, v.id);
  const body =
    `<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 10px 14px;` +
    ` background: {{ground}}; color: {{ink}}; font-family: ${v.face}; font-stretch: ${v.stretch};` +
    ` font-size: 16px; border: 1px solid {{rule}}; box-sizing: border-box; color-scheme: ${s.scheme};">` +
    `<output style="min-width: 4.2em; font-size: 20px; text-align: right; font-variant-numeric: tabular-nums;">` +
    `${b.clock}</output>` +
    sel(
      ["0.5x", "1x", "2x", "4x"].map((x) => (prefixed ? `Speed ${x}` : x)),
      prefixed ? "Speed 1x" : "1x",
    ) +
    sel(
      Object.values(VIEWS).map((x) => (prefixed ? `View: ${x.name}` : x.name)),
      prefixed ? `View: ${v.name}` : v.name,
    ) +
    sel(
      b.levels.map((x) => (prefixed ? `Level: ${x}` : x)),
      prefixed ? `Level: ${b.levels[0]}` : b.levels[0],
    ) +
    `<button style="${control("background: {{sunk}};")}">Details</button>` +
    `</div>`;
  return bake(body);
}

const CANDIDATES = [
  {
    key: "native",
    title: "A &middot; the native select, as it stands",
    forIt:
      "Costs nothing and is already right where it is hardest: the operating system draws the popup, so a phone " +
      "gets its own wheel picker, a screen reader gets a control it knows, and arrow keys work without a line of " +
      "code. #130 leaned on exactly this when it let <em>answersItself</em> stand aside for a focused select.",
    against:
      "The one glyph the view cannot reach is the caret, and it is the only thing in the strip drawn in neither " +
      "the view's ink nor its hand. Under the staff map it is a rounded system chevron on a squared printed sheet.",
  },
  {
    key: "caret",
    title: "B &middot; appearance: none, and the caret in the view's ink",
    forIt:
      "Keeps the element, the popup and every property A buys, and takes back the one glyph. Two declarations and " +
      "an inline SVG per chooser; the view supplies nothing new, because the caret is drawn in the ink it already has.",
    against:
      "The caret is now a fourth thing a view is drawn in that no module owns, and <em>appearance: none</em> " +
      "also drops the focus ring on some platforms, so the strip's own <em>:focus-visible</em> rule has to carry it.",
  },
  {
    key: "drawn",
    title: "C &middot; a control drawn in the view's hand",
    forIt:
      "The only candidate where the chooser belongs to the aesthetic: the engraved hand can double the rule the " +
      "way the plate's neat line is doubled, and the staff hand can square the corners, set the value in caps and " +
      "file a solid caret. It is what ADR-0021's <em>furniture</em> module would do if the strip were furniture.",
    against:
      "It is a listbox: a popup to position, a roving tabindex, type-ahead, and every one of them per view. It " +
      "throws away the phone picker, and it puts a new hand on every future view before that view has a picture.",
  },
];

out(
  "Choosers.dc.html",
  page(
    sheet(
      1440,
      1180,
      head(
        "The chooser",
        `ADR-0023 handed this here against a drawing: the three choosers are native <em>&lt;select&gt;</em>s, and ` +
          `<em>color-scheme</em> is what keeps them alive in a dark view. The question is whether they stay that ` +
          `way now that a view outside the engraved system exists. Each row is one candidate, in the tail of the ` +
          `real strip &mdash; readout, speed, view, level, Details &mdash; on the chart plate, the night plate and ` +
          `the staff map.`,
      ) +
        CANDIDATES.map(
          (c) =>
            `<div style="margin-bottom: 30px;">` +
            caps(c.title) +
            `<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;` +
            ` align-items: start; margin-bottom: 10px;">` +
            tail(VIEWS.plate, TRAFALGAR, c.key) +
            tail(VIEWS.night, TRAFALGAR, c.key) +
            tail(VIEWS.staff, MIDWAY, c.key) +
            `</div>` +
            `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px;` +
            ` font-size: 13px; line-height: 1.5;">` +
            `<p style="margin: 0;"><em>For.</em> ${c.forIt}</p>` +
            `<p style="margin: 0;"><em>Against.</em> ${c.against}</p>` +
            `</div></div>`,
        ).join("") +
        `<div style="border-top: 1px solid ${SHEET.faint}; padding-top: 20px;">` +
        caps("And the level chooser beside it") +
        `<p style="margin: 0 0 14px; font-size: 14px; line-height: 1.55; max-width: 96ch;">` +
        `Whatever the chooser is, the strip's tail is three of them in a row with nothing to tell them apart: ` +
        `<em>1x</em>, <em>Chart plate</em>, <em>Columns</em>. Speed and view are the same words in every battle; ` +
        `the level's are the battle's own, so <em>Columns</em> and <em>Strikes</em> and <em>Wings</em> arrive with ` +
        `no word saying what they are the level of. Below: the bare row, then the same row with the word inside ` +
        `each control. The prefix is not free &mdash; it adds about 130px across the three, and the strip is ` +
        `already two rows at 1120 &mdash; so what it buys has to be worth a control's width somewhere else.` +
        `</p>` +
        `<div style="display: grid; gap: 12px; align-items: start;">` +
        tail(VIEWS.plate, TRAFALGAR, "native") +
        tail(VIEWS.plate, TRAFALGAR, "native", true) +
        `</div></div>`,
    ),
    { scheme: "light" },
  ),
);

// --- the details panel ----------------------------------------------------

const PHASE = {
  label: "The melee; the line gives way",
  notes:
    "Strength 0.6 is the middle of the interval: the Redoutable struck about 13:55 and the Bucentaure at 14:05, " +
    "and by Hardy&#39;s report near 14:25 twelve or fourteen of the thirty-three had struck (Southey says ten), " +
    "leaving about twenty in company. The Combined Fleet is authored broken from 13:30 because its centre has " +
    "ceased to fight as a body and its van is acting on its own; the formation stays line as a label for the wreck " +
    "of the crescent.",
  references: [
    {
      label: "Mahan",
      locator: "vol. II, ch. XXIII, paragraph beginning &lsquo;While such things were happening&rsquo;",
      quote: "the French flagship &ldquo;Bucentaure&rdquo; surrendered, at five minutes past two",
    },
    {
      label: "Collingwood&#39;s dispatch",
      locator: "London Gazette Extraordinary no. 15858, p. 1366",
      quote: undefined,
    },
  ],
};
const SOURCES = [
  ["Collingwood&#39;s dispatch", "Collingwood to Marsden, 22 October 1805, London Gazette Extraordinary no. 15858", "en.wikisource.org/wiki/The_London_Gazette/Number_15858", "public-domain"],
  ["Mahan", "A. T. Mahan, The Life of Nelson (1897), vol. II", "archive.org/details/lifeofnelsonemb02maha", "public-domain"],
  ["Southey", "Robert Southey, The Life of Horatio, Lord Nelson (1813), ch. IX", "gutenberg.org/ebooks/947", "public-domain"],
];
const ATTRIBUTION =
  "Marchpast contributors, CC BY 4.0. Positions and captions authored from public-domain sources listed in the file.";

/** `.st-details`: the panel as the DOM builds it, holes for the two derived tones. */
function detailsPanel({ clipped }) {
  const sub = (t) =>
    `<h3 style="margin: 14px 0 6px; font-size: 12px; font-weight: normal; letter-spacing: 0.08em;` +
    ` text-transform: uppercase;">${t}</h3>`;
  const refs = PHASE.references
    .map(
      (r) =>
        `<li style="margin-bottom: 2px;"><span style="font-style: italic;">${r.label}</span>` +
        `<span style="font-style: normal;">, </span>${r.locator}` +
        (r.quote
          ? `<blockquote style="margin: 4px 0 8px; padding-left: 10px; border-left: 2px solid {{rule}};">` +
            `${r.quote}</blockquote>`
          : ""),
    )
    .join("");
  const rows = SOURCES.map(
    ([label, work, url, licence]) =>
      `<tr><td style="padding: 3px 12px 3px 0; border-bottom: 1px solid {{rule}}; vertical-align: top;` +
      ` font-style: italic;">${label}</td>` +
      `<td style="padding: 3px 12px 3px 0; border-bottom: 1px solid {{rule}}; vertical-align: top;">${work}</td>` +
      `<td style="padding: 3px 12px 3px 0; border-bottom: 1px solid {{rule}}; vertical-align: top;` +
      ` word-break: break-all;"><a href="#" style="color: inherit;">${url}</a></td>` +
      `<td style="padding: 3px 0; border-bottom: 1px solid {{rule}}; vertical-align: top;">${licence}</td></tr>`,
  ).join("");
  return (
    `<section style="${clipped ? "max-height: 288px; overflow: hidden;" : ""} padding: 16px 24px;` +
    ` border-top: 1px solid {{rule}}; background: {{ground}}; color: {{ink}}; font-family: {{face}};` +
    ` font-stretch: {{stretch}}; font-size: 14px; line-height: 1.45; box-sizing: border-box;">` +
    `<h2 style="margin: 0 0 6px; font-size: 18px; font-weight: normal;">${PHASE.label}</h2>` +
    `<p style="margin: 0;">${PHASE.notes}</p>` +
    sub("References") +
    `<ul style="margin: 0; padding-left: 18px;">${refs}</ul>` +
    sub("Sources") +
    `<p style="margin: 0 0 8px;">${ATTRIBUTION}</p>` +
    `<table style="border-collapse: collapse; width: 100%; text-align: left;"><thead><tr>` +
    ["Label", "Work", "Read it at", "Licence"]
      .map(
        (h) =>
          `<th style="padding: 3px 12px 3px 0; border-bottom: 1px solid {{rule}}; font-weight: normal;` +
          ` font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">${h}</th>`,
      )
      .join("") +
    `</tr></thead><tbody>${rows}</tbody></table>` +
    `</section>`
  );
}

out(
  "Details.dc.html",
  page(
    `<div style="width: 1120px; min-height: 1180px; background: {{edge}}; box-sizing: border-box;` +
      ` color-scheme: {{scheme}};">` +
      `<div style="padding: 22px 24px 4px; font-family: {{face}}; font-stretch: {{stretch}}; font-size: 12px;` +
      ` letter-spacing: 0.08em; text-transform: uppercase; color: {{ink}}; background: {{ground}};">` +
      `As the viewer sees it &mdash; clipped at max-height 40vh, the panel&#39;s own scroll below the fold` +
      `</div>` +
      detailsPanel({ clipped: true }) +
      strip(VIEWS.plate, TRAFALGAR, { chooser: "native", faceHole: true }) +
      `<div style="height: 26px;"></div>` +
      `<div style="padding: 12px 24px 4px; font-family: {{face}}; font-stretch: {{stretch}}; font-size: 12px;` +
      ` letter-spacing: 0.08em; text-transform: uppercase; color: {{ink}}; background: {{ground}};">` +
      `The same panel unclipped, so the references and the sources table can be read in the view&#39;s tokens` +
      `</div>` +
      detailsPanel({ clipped: false }) +
      `</div>`,
    {
      script: logic(
        `"view":{"editor":"enum","options":["plate","night","atlas","staff"],"default":"plate","section":"Surface"},` +
          `"derivation":{"editor":"enum","options":["decided","derived"],"default":"decided","section":"Surface"}`,
        `face: view.face, stretch: view.stretch,`,
        "plate",
      ),
    },
  ),
);

// --- the phone ------------------------------------------------------------

/**
 * A phone. `index.html` gives the canvas `flex: 1`, so the picture is whatever
 * height the strip leaves — which is why the picture here sits in a flexed box
 * that clips it rather than at a height written down in advance: the strip is
 * within a few pixels of wrapping to a fifth row, and the artboard should show
 * the same thing the viewer's own browser decides.
 */
function phoneBoard(v, b, picture, { fill = false } = {}) {
  const h = pngHeight(picture);
  const s = surface(v);
  return page(
    `<div style="width: 390px; height: 844px; background: ${s.edge}; color-scheme: ${s.scheme};` +
      ` display: flex; flex-direction: column; overflow: hidden;">` +
      `<div style="flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;` +
      ` justify-content: ${fill ? "flex-start" : "flex-end"}; background: ${v.paper};">` +
      `<img src="${picture}" alt="" style="display: block; flex: none; width: 390px; height: ${h}px;">` +
      `</div>` +
      strip(v, b, { phone: true }) +
      `</div>`,
    { script: logic(CHIPS, "", v.id), scheme: s.scheme },
  );
}

out("PhonePlate.dc.html", phoneBoard(VIEWS.plate, TRAFALGAR, "phone-plate.png"));
out("PhoneStaff.dc.html", phoneBoard(VIEWS.staff, MIDWAY, "phone-staff.png", { fill: true }));

// --- the library's boundary ----------------------------------------------

const ROUTES = [
  {
    key: "none",
    title: "A &middot; nothing &mdash; the Picker is the only way out",
    note:
      "What the player has today, and what ADR-0023 described when it said there is no back link to decide about. " +
      "It was true when every battle was <em>/?battle=&lt;name&gt;</em> reached from the library. ADR-0028 has " +
      "since made <em>/trafalgar/</em> a real page with its own card, so the common arrival is now a shared link, " +
      "and from there the Picker moves sideways to another battle and the library is unreachable.",
  },
  {
    key: "link",
    title: "B &middot; the link the error path already has, at the head of the strip",
    note:
      "<em>&#8592; All battles</em> exists in <em>libraryPage.ts</em> and appears on the player only when a " +
      "battle fails to load; ADR-0023 already took it off the library's declaration so it inherits the strip's " +
      "tokens. Promoting it costs no new element and no new rule. It spends about 90px of a strip that wraps at " +
      "1120, and it is a fourth thing in the transport&#39;s half of the row.",
  },
  {
    key: "mark",
    title: "C &middot; the mark from #135, as the way home",
    note:
      "The mark is a rank of ticks filing past a rule, and it is the site&#39;s one piece of brand. At 18px in " +
      "the view&#39;s ink it costs a third of B&#39;s width and reads as a home affordance the way a masthead " +
      "does. But it is drawn in the view&#39;s ink rather than the brand&#39;s, and #135 decided the mark is " +
      "never in a side ink &mdash; whether it may take a view&#39;s ink at all is a question this asks and " +
      "#135 did not answer.",
  },
];

out(
  "Boundary.dc.html",
  page(
    sheet(
      1180,
      1200,
      head(
        "Where the theme stops, and the way back",
        `The library keeps one look, the brand&#39;s, and the player takes the view&#39;s: that boundary is ` +
          `settled. What is not is whether the player page has a door back to the library at all. ADR-0023 said ` +
          `there was nothing to decide because the page is a canvas and a strip; ADR-0028 then gave every battle ` +
          `its own URL and its own social card, so the ordinary arrival is a link from somewhere else.`,
      ) +
        ROUTES.map(
          (r) =>
            `<div style="margin-bottom: 24px;">` +
            caps(r.title) +
            `<div style="margin-bottom: 8px;">${bakedStrip(VIEWS.plate, TRAFALGAR, r.key)}</div>` +
            `<div style="margin-bottom: 8px;">${bakedStrip(VIEWS.staff, MIDWAY, r.key)}</div>` +
            `<p style="margin: 0; font-size: 13px; line-height: 1.55; max-width: 104ch;">${r.note}</p>` +
            `</div>`,
        ).join(""),
    ),
    { scheme: "light" },
  ),
);

/** A strip with every hole already filled: the sheets have no chips of their own. */
function bakedStrip(v, b, back) {
  const s = surface(v);
  return strip(v, b, { chooser: "native", back })
    .replaceAll("{{ground}}", s.ground)
    .replaceAll("{{rule}}", s.rule)
    .replaceAll("{{ink}}", s.ink)
    .replaceAll("{{sunk}}", s.sunk);
}

// --- the canvas -----------------------------------------------------------

const GAP_X = 140;
const GAP_Y = 170;
const row1 = Math.max(boards.Main.h, boards.Night.h);
const canvas = {
  pages: [
    { id: "page-1", name: "The four surfaces" },
    { id: "page-2", name: "The open questions" },
  ],
  artboards: [
    { file: "Main.dc.html", x: 0, y: 0, w: 1120, h: boards.Main.h, title: "Chart plate · Trafalgar 13:30", page: "page-1" },
    { file: "Night.dc.html", x: 1120 + GAP_X, y: 0, w: 1120, h: boards.Night.h, title: "Night plate · Trafalgar 13:30", page: "page-1" },
    { file: "Atlas.dc.html", x: 0, y: row1 + GAP_Y, w: 1120, h: boards.Atlas.h, title: "Atlas · Cannae 11:00", page: "page-1" },
    { file: "Staff.dc.html", x: 1120 + GAP_X, y: row1 + GAP_Y, w: 1120, h: boards.Staff.h, title: "Staff map · Midway 10:25", page: "page-1" },
    { file: "PhonePlate.dc.html", x: 2 * (1120 + GAP_X), y: 0, w: 390, h: 844, title: "Phone · chart plate", page: "page-1" },
    { file: "PhoneStaff.dc.html", x: 2 * (1120 + GAP_X) + 530, y: 0, w: 390, h: 844, title: "Phone · staff map", page: "page-1" },
    { file: "Tokens.dc.html", x: 0, y: 0, w: 1180, h: 1010, title: "The surface, derived", page: "page-2" },
    { file: "Choosers.dc.html", x: 1180 + GAP_X, y: 0, w: 1440, h: 1180, title: "The chooser", page: "page-2" },
    { file: "Details.dc.html", x: 0, y: 1010 + GAP_Y, w: 1120, h: 1180, title: "The details panel", page: "page-2" },
    { file: "Boundary.dc.html", x: 1180 + GAP_X, y: 1180 + GAP_Y, w: 1180, h: 1200, title: "The library's boundary", page: "page-2" },
  ],
  annotations: [
    {
      id: "brief",
      x: 0,
      y: -220,
      w: 640,
      text:
        "#137 · The player surface under each view.\n" +
        "The pictures are the real app captured at 1120; the strip, the panel and the choosers beneath them are " +
        "player.css and controls.ts redrawn at the same scale, so nothing here is a sketch of the app — it is the app.\n" +
        "Two chips on every surface board: the derivation (what --st-sunk and --st-rule come off) and the chooser.",
    },
    {
      id: "staff-fails",
      x: 1120 + GAP_X,
      y: row1 + GAP_Y - 150,
      w: 620,
      text:
        "The staff map is where the derivation was never tested. Flip the derivation chip: the trough and the " +
        "Details toggle appear. As decided, its fill sits 1.05 from its ground — no step at all — and its rule " +
        "measures 2.91 against ADR-0023's own 3:1.",
    },
    {
      id: "wrap",
      x: 700,
      y: -220,
      w: 640,
      text:
        "At 1120 the strip already wraps to two rows on any battle with a level chooser, and the scrubber is " +
        "squeezed to about 215px for eight phases. Midway wants twenty-one.",
    },
  ],
  launch: { view: "canvas", page: "page-1" },
};
out("canvas.json", JSON.stringify(canvas, null, 2) + "\n");

console.log(
  "wrote",
  Object.keys(boards).length + 6,
  "artboards; staff rule alpha",
  staffRule.toFixed(2),
  "->",
  r2(ratio(mix(VIEWS.staff.ink, VIEWS.staff.paper, staffRule), VIEWS.staff.paper)).toFixed(2),
);
