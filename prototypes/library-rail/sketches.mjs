/**
 * Sketch battle files for the three v0.3 battles that do not exist yet, so the
 * library drawing can be judged with all seven stills rather than four.
 *
 * THESE ARE NOT DATA. Positions are eyeballed from the research notes
 * (#122 Alesia, #123 the Little Bighorn, #124 Midway) at map scale, not
 * authored against the sources; captions are one line each; the sources block
 * names the real source and nothing is quoted. They exist to put a picture of
 * the right shape and the right ink density in a card, which is what the
 * chronology rail has to be judged beside. The real files are build work.
 *
 * `node sketches.mjs` writes them under `sketch-data/`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "sketch-data");

/** A closed ring round a centre, squashed and jittered so a contour is not an ellipse. */
function ring(lon, lat, rx, ry, wobble = 0.12, seed = 1) {
  let s = seed;
  const random = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const points = [];
  const steps = 34;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + (random() - 0.5) * wobble;
    points.push([round(lon + Math.cos(a) * rx * k), round(lat + Math.sin(a) * ry * k)]);
  }
  points[points.length - 1] = points[0];
  return points;
}

const round = (n) => Number(n.toFixed(5));

/** Contours as nested rings round one summit: the set of levels is what holds the hill. */
function hill(lon, lat, rx, ry, levels, seed) {
  return levels.map(([elevation, scale], i) => ({
    type: "Feature",
    properties: { kind: "contour", elevation },
    geometry: { type: "LineString", coordinates: ring(lon, lat, rx * scale, ry * scale, 0.16, seed + i) },
  }));
}

const feature = (kind, geometry, properties = {}) => ({ type: "Feature", properties: { kind, ...properties }, geometry });
const line = (kind, coordinates, properties) => feature(kind, { type: "LineString", coordinates }, properties);
const point = (kind, coordinates, name) => feature(kind, { type: "Point", coordinates }, { name });
const polygon = (kind, coordinates) => feature(kind, { type: "Polygon", coordinates: [coordinates] });

/** A land polygon has to overhang the extent, or the coast shading draws a phantom shore round the frame (#132). */
const overhang = (extent, by = 0.2) =>
  polygon("land", [
    [extent.west - by, extent.south - by],
    [extent.east + by, extent.south - by],
    [extent.east + by, extent.north + by],
    [extent.west - by, extent.north + by],
    [extent.west - by, extent.south - by],
  ]);

const SOURCES = {
  alesia: {
    caesar: {
      label: "Caesar, Gallic War VII",
      work: "C. Iulius Caesar, Commentarii de Bello Gallico VII.68-90",
      url: "https://en.wikisource.org/wiki/Commentaries_on_the_Gallic_War",
      license: "public-domain",
      license_note: "Sketch file: the source is named for shape only and nothing here is quoted from it.",
    },
  },
  "little-bighorn": {
    reno: {
      label: "Reno's report",
      work: "Marcus A. Reno to the Adjutant General, Camp on Yellowstone, 5 July 1876, Report of the Secretary of War (1876)",
      url: "https://www.google.com/books/edition/_/0_pCAQAAMAAJ",
      license: "public-domain",
      license_note: "Sketch file: the source is named for shape only and nothing here is quoted from it.",
    },
  },
  midway: {
    cincpac: {
      label: "CINCPAC report",
      work: "Commander in Chief, Pacific Fleet, serial 01849, Battle of Midway, 28 June 1942",
      url: "https://www.history.navy.mil/research/library/online-reading-room.html",
      license: "public-domain",
      license_note: "Sketch file: the source is named for shape only and nothing here is quoted from it.",
    },
  },
};

/* ------------------------------------------------------------------ Alesia */

const alesiaExtent = { north: 47.591, south: 47.483, east: 4.56, west: 4.442 };
const OPPIDUM = [4.5, 47.537];

const alesiaMap = {
  type: "FeatureCollection",
  license: "public-domain",
  attribution: "Sketch geometry, not survey: eyeballed from the research note for #151's drawing.",
  features: [
    overhang(alesiaExtent),
    ...hill(OPPIDUM[0], OPPIDUM[1], 0.019, 0.011, [[300, 2.5], [340, 1.9], [380, 1.35], [400, 0.8], [420, 0.4]], 3),
    ...hill(4.468, 47.564, 0.014, 0.009, [[300, 2.1], [340, 1.5], [380, 0.9]], 11),
    ...hill(4.534, 47.508, 0.013, 0.008, [[300, 2.0], [340, 1.3], [370, 0.7]], 23),
    ...hill(4.455, 47.5, 0.012, 0.008, [[300, 1.8], [340, 1.1]], 31),
    line("river", [[4.442, 47.556], [4.472, 47.552], [4.503, 47.556], [4.534, 47.562], [4.56, 47.566]]),
    line("river", [[4.444, 47.512], [4.474, 47.508], [4.506, 47.51], [4.538, 47.516], [4.56, 47.522]]),
    point("place", OPPIDUM, "Alesia"),
    point("place", [4.468, 47.567], "Mont Réa"),
    point("place", [4.536, 47.505], "Mont Flavigny"),
    point("place", [4.487, 47.575], "Plaine des Laumes"),
    point("work", [4.472, 47.578], "Camp A"),
    point("work", [4.522, 47.575], "Camp B"),
    point("work", [4.545, 47.541], "Camp C"),
    point("work", [4.519, 47.497], "Camp D"),
    point("work", [4.462, 47.505], "Camp E"),
    point("work", [4.452, 47.545], "Camp F"),
  ],
};

const alesiaUnits = [
  { id: "vercingetorix", side: "Gaul", label: "Vercingetorix in the oppidum", short_label: "Vercingetorix", commander: "Vercingetorix", arm: "infantry" },
  { id: "gallic-sortie", side: "Gaul", label: "The sortie from the town", short_label: "The sortie", arm: "infantry" },
  { id: "relief-army", side: "Gaul", label: "The relief army", short_label: "Relief army", commander: "Commius", arm: "infantry" },
  { id: "vercassivellaunus", side: "Gaul", label: "Vercassivellaunus's sixty thousand", short_label: "Vercassivellaunus", commander: "Vercassivellaunus", arm: "infantry" },
  { id: "gallic-horse", side: "Gaul", label: "The Gallic horse", short_label: "Gallic horse", arm: "cavalry" },
  { id: "rea-sector", side: "Rome", label: "The Réa sector", short_label: "Réa sector", commander: "Antistius Reginus", arm: "infantry" },
  { id: "north-camps", side: "Rome", label: "The northern camps", short_label: "North camps", commander: "Caesar", arm: "infantry" },
  { id: "plain-sector", side: "Rome", label: "The lines on the plain", short_label: "The plain", arm: "infantry" },
  { id: "german-horse", side: "Rome", label: "The German horse", short_label: "German horse", arm: "cavalry" },
];

const alesia = {
  schema_version: 2,
  title: "The Siege of Alesia",
  summary:
    "Caesar shuts Vercingetorix inside two rings of ditch and rampart, twenty-one miles of them, and holds both faces at once when a Gallic army four times his size comes down on his back.",
  dates: ["September 52 BC", "September 52 BC, the next day"],
  sort_date: { year: -51, month: 9, day: 20 },
  extent: alesiaExtent,
  scale_unit: "km",
  map: "alesia",
  end: "17:00",
  license: "CC-BY-4.0",
  attribution: "Sketch file for #151's drawing. Not data.",
  sources: SOURCES.alesia,
  units: alesiaUnits,
  phases: [
    {
      id: "relief-arrives",
      label: "The relief army comes down into the plain",
      t: "12:00",
      playback_rate: 900,
      caption: "The relief army occupies the hill outside the lines, and the town sees its own people for the first time in six weeks.",
      notes: "Sketch positions, eyeballed at map scale from the research note. Not authored against Caesar.",
      references: [{ source: "caesar", locator: "VII.79" }],
      units: [
        { id: "vercingetorix", position: { lat: 47.537, lon: 4.5 }, heading: 300, formation: "mass", state: "intact" },
        { id: "gallic-sortie", position: { lat: 47.545, lon: 4.489 }, heading: 315, formation: "line", state: "intact" },
        { id: "relief-army", position: { lat: 47.579, lon: 4.487 }, heading: 180, formation: "mass", state: "intact", moves: [{ kind: "intent", to: { lat: 47.562, lon: 4.492 } }] },
        { id: "vercassivellaunus", position: { lat: 47.575, lon: 4.452 }, heading: 150, formation: "mass", state: "intact" },
        { id: "gallic-horse", position: { lat: 47.572, lon: 4.514 }, heading: 200, formation: "line", state: "intact" },
        { id: "rea-sector", position: { lat: 47.566, lon: 4.469 }, heading: 330, formation: "line", state: "intact" },
        { id: "north-camps", position: { lat: 47.573, lon: 4.5 }, heading: 0, formation: "line", state: "intact" },
        { id: "plain-sector", position: { lat: 47.556, lon: 4.499 }, heading: 0, formation: "line", state: "intact" },
        { id: "german-horse", position: { lat: 47.561, lon: 4.522 }, heading: 20, formation: "line", state: "intact" },
      ],
    },
    {
      id: "rea-assault",
      label: "Vercassivellaunus comes down on the Réa sector",
      day: 1,
      t: "12:30",
      playback_rate: 240,
      caption:
        "The sixty thousand come down out of the wood on the one stretch of line the ground would not let Caesar hold, and the town comes out against the inner face at the same hour.",
      notes: "Sketch positions, eyeballed at map scale from the research note. Not authored against Caesar.",
      references: [{ source: "caesar", locator: "VII.83-88" }],
      units: [
        { id: "vercingetorix", position: { lat: 47.535, lon: 4.494 }, heading: 300, formation: "mass", state: "engaged", strength: 0.9 },
        { id: "gallic-sortie", position: { lat: 47.549, lon: 4.481 }, heading: 320, formation: "line", state: "engaged", strength: 0.8, moves: [{ kind: "intent", to: { lat: 47.556, lon: 4.474 } }] },
        { id: "relief-army", position: { lat: 47.566, lon: 4.495 }, heading: 190, formation: "mass", state: "engaged", strength: 0.85 },
        { id: "vercassivellaunus", position: { lat: 47.567, lon: 4.462 }, heading: 140, formation: "mass", state: "engaged", strength: 0.75, moves: [{ kind: "intent", to: { lat: 47.556, lon: 4.476 } }] },
        { id: "gallic-horse", position: { lat: 47.569, lon: 4.523 }, heading: 210, formation: "line", state: "broken", strength: 0.5 },
        { id: "rea-sector", position: { lat: 47.561, lon: 4.472 }, heading: 320, formation: "line", state: "engaged", strength: 0.6 },
        { id: "north-camps", position: { lat: 47.572, lon: 4.499 }, heading: 0, formation: "line", state: "engaged", strength: 0.9 },
        { id: "plain-sector", position: { lat: 47.552, lon: 4.494 }, heading: 340, formation: "line", state: "engaged", strength: 0.8 },
        { id: "german-horse", position: { lat: 47.564, lon: 4.456 }, heading: 280, formation: "line", state: "intact", moves: [{ kind: "detachment", to: { lat: 47.572, lon: 4.45 } }] },
      ],
    },
  ],
};

/* --------------------------------------------------------- Little Bighorn */

const lbhExtent = { north: 45.615, south: 45.495, east: -107.375, west: -107.51 };

const lbhMap = {
  type: "FeatureCollection",
  license: "public-domain",
  attribution: "Sketch geometry, not survey: eyeballed from the research note for #151's drawing.",
  features: [
    overhang(lbhExtent),
    line("river", [
      [-107.408, 45.495], [-107.418, 45.517], [-107.44, 45.529], [-107.437, 45.545],
      [-107.449, 45.558], [-107.446, 45.575], [-107.462, 45.59], [-107.458, 45.615],
    ]),
    line("river", [[-107.437, 45.545], [-107.418, 45.541], [-107.398, 45.547]]),
    ...hill(-107.4, 45.567, 0.016, 0.011, [[960, 2.1], [990, 1.5], [1010, 0.9]], 5),
    ...hill(-107.418, 45.526, 0.014, 0.01, [[960, 1.9], [990, 1.2]], 17),
    ...hill(-107.482, 45.548, 0.013, 0.009, [[960, 1.6], [980, 0.9]], 29),
    point("place", [-107.452, 45.6], "Little Bighorn River"),
    point("place", [-107.42, 45.549], "Medicine Tail Coulee"),
    point("place", [-107.414, 45.525], "Reno Hill"),
    point("place", [-107.398, 45.573], "Last Stand Hill"),
    point("place", [-107.48, 45.553], "The village"),
  ],
};

const lbhUnits = [
  { id: "custer", side: "7th Cavalry", label: "Custer's battalion", short_label: "Custer", commander: "Custer", arm: "cavalry" },
  { id: "reno", side: "7th Cavalry", label: "Reno's battalion", short_label: "Reno", commander: "Reno", arm: "cavalry" },
  { id: "benteen", side: "7th Cavalry", label: "Benteen's battalion", short_label: "Benteen", commander: "Benteen", arm: "cavalry" },
  { id: "pack-train", side: "7th Cavalry", label: "The pack train", short_label: "Packs", arm: "cavalry" },
  { id: "hunkpapa", side: "The village", label: "The Hunkpapa circle", short_label: "Hunkpapa", commander: "Gall", arm: "cavalry" },
  { id: "cheyenne", side: "The village", label: "The Cheyenne circle", short_label: "Cheyenne", arm: "cavalry" },
  { id: "crazy-horse", side: "The village", label: "Crazy Horse's warriors", short_label: "Crazy Horse", commander: "Crazy Horse", arm: "cavalry" },
  { id: "oglala", side: "The village", label: "The Oglala circle", short_label: "Oglala", arm: "cavalry" },
];

const littleBighorn = {
  schema_version: 2,
  title: "The Battle of the Little Bighorn",
  summary:
    "Custer divides the 7th Cavalry and attacks the largest village on the plains from two directions; within an hour his own five companies are surrounded on a ridge above the ford and killed to the last man.",
  dates: ["25 June 1876", "26 June 1876"],
  sort_date: { year: 1876, month: 6, day: 25 },
  extent: lbhExtent,
  scale_unit: "km",
  map: "little-bighorn",
  end: "10:00",
  end_day: 1,
  license: "CC-BY-4.0",
  attribution: "Sketch file for #151's drawing. Not data.",
  sources: SOURCES["little-bighorn"],
  units: lbhUnits,
  phases: [
    {
      id: "reno-charges",
      label: "Reno charges the upper end of the village",
      t: "15:03",
      playback_rate: 60,
      caption: "Reno's three companies cross the ford and come down the valley at a gallop with the village in front of them.",
      notes: "Sketch positions, eyeballed at map scale from the research note. Not authored against the sources.",
      references: [{ source: "reno", locator: "the valley fight" }],
      units: [
        { id: "custer", position: { lat: 45.545, lon: -107.383 }, heading: 315, formation: "column", state: "intact", moves: [{ kind: "intent", to: { lat: 45.564, lon: -107.4 } }] },
        { id: "reno", position: { lat: 45.523, lon: -107.446 }, heading: 340, formation: "line", state: "engaged", strength: 0.95 },
        { id: "benteen", position: { lat: 45.505, lon: -107.4 }, heading: 320, formation: "column", state: "intact" },
        { id: "pack-train", position: { lat: 45.499, lon: -107.388 }, heading: 320, formation: "column", state: "intact" },
        { id: "hunkpapa", position: { lat: 45.534, lon: -107.468 }, heading: 160, formation: "mass", state: "engaged", strength: 0.95 },
        { id: "cheyenne", position: { lat: 45.566, lon: -107.487 }, heading: 120, formation: "mass", state: "intact" },
        { id: "crazy-horse", position: { lat: 45.552, lon: -107.483 }, heading: 90, formation: "mass", state: "intact" },
        { id: "oglala", position: { lat: 45.545, lon: -107.478 }, heading: 130, formation: "mass", state: "intact" },
      ],
    },
    {
      id: "last-stand",
      label: "The Keogh wing goes; the rest close on the ridge",
      t: "16:40",
      playback_rate: 30,
      caption: "Custer's five companies are pushed off the ridge above the ford and the fight closes on the knoll at its north end.",
      notes: "Sketch positions, eyeballed at map scale from the research note. Not authored against the archaeology.",
      references: [{ source: "reno", locator: "the hilltop fight" }],
      units: [
        { id: "custer", position: { lat: 45.572, lon: -107.399 }, heading: 250, formation: "line", state: "broken", strength: 0.35 },
        { id: "reno", position: { lat: 45.526, lon: -107.414 }, heading: 300, formation: "mass", state: "engaged", strength: 0.6 },
        { id: "benteen", position: { lat: 45.524, lon: -107.409 }, heading: 300, formation: "mass", state: "engaged", strength: 0.85 },
        { id: "pack-train", position: { lat: 45.519, lon: -107.404 }, heading: 320, formation: "column", state: "intact" },
        { id: "hunkpapa", position: { lat: 45.566, lon: -107.409 }, heading: 30, formation: "mass", state: "engaged", strength: 0.95, moves: [{ kind: "intent", to: { lat: 45.571, lon: -107.403 } }] },
        { id: "cheyenne", position: { lat: 45.581, lon: -107.408 }, heading: 160, formation: "mass", state: "engaged", strength: 0.95, moves: [{ kind: "intent", to: { lat: 45.575, lon: -107.401 } }] },
        { id: "crazy-horse", position: { lat: 45.579, lon: -107.42 }, heading: 120, formation: "mass", state: "engaged", strength: 0.95 },
        { id: "oglala", position: { lat: 45.535, lon: -107.428 }, heading: 60, formation: "mass", state: "engaged", strength: 0.9 },
      ],
    },
  ],
};

/* ----------------------------------------------------------------- Midway */

const midwayExtent = { north: 30.6, south: 26.6, east: -175.2, west: -179.6 };

const midwayMap = {
  type: "FeatureCollection",
  license: "public-domain",
  attribution: "Sketch geometry, not survey: eyeballed from the research note for #151's drawing.",
  features: [
    polygon("land", [[-177.395, 28.205], [-177.36, 28.2], [-177.352, 28.216], [-177.386, 28.222], [-177.395, 28.205]]),
    polygon("land", [[-177.345, 28.19], [-177.32, 28.188], [-177.318, 28.202], [-177.342, 28.204], [-177.345, 28.19]]),
    feature("shoal", { type: "Polygon", coordinates: [ring(-177.36, 28.2, 0.075, 0.055, 0.05, 7)] }),
    point("place", [-177.36, 28.24], "Midway"),
    point("place", [-178.32, 28.42], "Kure"),
    point("work", [-177.38, 28.21], "Naval Air Station"),
  ],
};

const midwayUnits = [
  { id: "kido-butai", side: "Japan", label: "The First Carrier Striking Force", short_label: "Kidō Butai", commander: "Nagumo", arm: "ship" },
  { id: "hiryu", side: "Japan", label: "Hiryū", short_label: "Hiryū", commander: "Yamaguchi", arm: "ship", parent: "kido-butai" },
  { id: "japanese-strike", side: "Japan", label: "The Midway strike", short_label: "Midway strike", arm: "ship", parent: "kido-butai" },
  { id: "invasion-force", side: "Japan", label: "The invasion force", short_label: "Invasion force", commander: "Kondō", arm: "ship" },
  { id: "tf16", side: "United States", label: "Task Force 16", short_label: "TF16", commander: "Spruance", arm: "ship" },
  { id: "tf17", side: "United States", label: "Task Force 17", short_label: "TF17", commander: "Fletcher", arm: "ship" },
  { id: "enterprise-strike", side: "United States", label: "Enterprise's dive bombers", short_label: "Enterprise SBDs", commander: "McClusky", arm: "ship", parent: "tf16" },
  { id: "midway-air", side: "United States", label: "The Midway air group", short_label: "Midway air", arm: "ship" },
];

const midway = {
  schema_version: 2,
  title: "The Battle of Midway",
  summary:
    "Four Japanese carriers steam on an atoll two hundred miles away, are caught with their decks full, and burn within six minutes of each other; the fourth is found and burned that afternoon.",
  dates: ["4 June 1942", "5 June 1942"],
  sort_date: { year: 1942, month: 6, day: 4 },
  extent: midwayExtent,
  scale_unit: "nmi",
  map: "midway",
  end: "18:00",
  end_day: 1,
  license: "CC-BY-4.0",
  attribution: "Sketch file for #151's drawing. Not data.",
  sources: SOURCES.midway,
  levels: ["Forces", "Ships and strikes"],
  units: midwayUnits,
  phases: [
    {
      id: "first-strike",
      label: "The Midway strike goes in",
      t: "06:30",
      playback_rate: 240,
      caption: "A hundred and eight aircraft bomb the atoll while the carriers that sent them steam north-west of it, unfound.",
      notes: "Sketch positions, eyeballed at map scale from the research note. Not authored against the action reports.",
      references: [{ source: "cincpac", locator: "the morning attack" }],
      units: [
        { id: "kido-butai", position: { lat: 30.1, lon: -178.8 }, heading: 135, formation: "mass", state: "intact" },
        { id: "hiryu", position: { lat: 30.18, lon: -178.72 }, heading: 135, formation: "column", state: "intact" },
        { id: "japanese-strike", position: { lat: 28.9, lon: -178.0 }, heading: 130, formation: "line", state: "engaged", strength: 0.95, moves: [{ kind: "intent", to: { lat: 28.3, lon: -177.45 } }] },
        { id: "invasion-force", position: { lat: 27.2, lon: -179.4 }, heading: 70, formation: "column", state: "intact" },
        { id: "tf16", position: { lat: 30.05, lon: -176.3 }, heading: 240, formation: "mass", state: "intact", moves: [{ kind: "intent", to: { lat: 29.2, lon: -177.6 } }] },
        { id: "tf17", position: { lat: 30.35, lon: -176.05 }, heading: 240, formation: "column", state: "intact" },
        { id: "enterprise-strike", position: { lat: 30.0, lon: -176.35 }, heading: 240, formation: "line", state: "intact" },
        { id: "midway-air", position: { lat: 28.35, lon: -177.3 }, heading: 300, formation: "line", state: "engaged", strength: 0.8 },
      ],
    },
    {
      id: "six-minutes",
      label: "Three carriers burn in six minutes",
      t: "10:25",
      playback_rate: 60,
      caption: "Two squadrons of dive bombers arrive over the Japanese force unopposed, and by 10:30 Akagi, Kaga and Sōryū are on fire.",
      notes: "Sketch positions, eyeballed at map scale from the research note. Not authored against the action reports.",
      references: [{ source: "cincpac", locator: "the dive-bombing attack" }],
      units: [
        { id: "kido-butai", position: { lat: 29.65, lon: -178.05 }, heading: 20, formation: "mass", state: "destroyed" },
        { id: "hiryu", position: { lat: 29.86, lon: -178.16 }, heading: 20, formation: "column", state: "intact", moves: [{ kind: "detachment", to: { lat: 29.4, lon: -177.4 } }] },
        { id: "japanese-strike", position: { lat: 29.72, lon: -178.0 }, heading: 200, formation: "line", state: "broken", strength: 0.4 },
        { id: "invasion-force", position: { lat: 27.5, lon: -179.15 }, heading: 60, formation: "column", state: "intact" },
        { id: "tf16", position: { lat: 29.2, lon: -177.05 }, heading: 300, formation: "mass", state: "intact" },
        { id: "tf17", position: { lat: 29.55, lon: -176.85 }, heading: 300, formation: "column", state: "intact" },
        { id: "enterprise-strike", position: { lat: 29.62, lon: -177.95 }, heading: 290, formation: "line", state: "engaged", strength: 0.9, moves: [{ kind: "intent", to: { lat: 29.2, lon: -177.1 } }] },
        { id: "midway-air", position: { lat: 28.3, lon: -177.36 }, heading: 320, formation: "line", state: "broken", strength: 0.45 },
      ],
    },
  ],
};

mkdirSync(join(out, "battles"), { recursive: true });
mkdirSync(join(out, "maps"), { recursive: true });
for (const [name, battle, map] of [
  ["alesia", alesia, alesiaMap],
  ["little-bighorn", littleBighorn, lbhMap],
  ["midway", midway, midwayMap],
]) {
  writeFileSync(join(out, "battles", `${name}.json`), `${JSON.stringify(battle, null, 2)}\n`);
  writeFileSync(join(out, "maps", `${name}.geojson`), `${JSON.stringify(map, null, 2)}\n`);
  console.log(`wrote ${name}`);
}
