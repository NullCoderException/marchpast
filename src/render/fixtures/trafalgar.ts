/**
 * A fixture battle for driving the renderer at a fixed instant, so
 * screenshots are reproducible. Positions are the static-frame prototype's
 * hand-placed ones, not authored data: `data/battles/trafalgar.json` is the
 * extraction slice's job, and nothing here is copied there.
 *
 * `phase4` is 12:15, Royal Sovereign breaking the rear: intact against
 * engaged, an intent move, tracks. `phase7` is 16:00, Dumanoir's van and
 * Gravina's retreat: the Combined Fleet `broken` at 0.33 with a `detachment`
 * move whose head lies outside the extent and is clipped.
 */
import type { Battle, MapFile, Phase, PlaceFeature, UnitSnapshot } from "../../schema/types.ts";
import { parseBattleTime } from "../../schema/time.ts";
import type { Picture, UnitPicture } from "../../timeline/picture.ts";

const WIND = { from: 292.5, force: "light" } as const;
const DISPATCH = [{ source: "collingwood-dispatch", locator: "p. 1365" }];

/** The Combined Fleet in line of battle, running north to south, broadsides to the west. */
const COMBINED_LINE = { formation: "line", heading: 270 } as const;

function phase(
  id: string,
  t: string,
  label: string,
  caption: string,
  units: UnitSnapshot[],
  references: Phase["references"] = DISPATCH,
): Phase {
  return { id, label, t, playback_rate: 600, wind: WIND, caption, references, units };
}

export const TRAFALGAR: Battle = {
  schema_version: 1,
  title: "The Battle of Trafalgar",
  date: "21 October 1805",
  extent: { north: 36.64, south: 36.08, east: -5.85, west: -6.65 },
  scale_unit: "nmi",
  map: "cadiz",
  end: "17:30",
  license: "CC-BY-4.0",
  attribution: "Sandtable contributors, CC BY 4.0",
  sources: {
    "collingwood-dispatch": {
      label: "Collingwood's dispatch",
      work: "Collingwood to Marsden, 22 October 1805, London Gazette Extraordinary no. 15858",
      url: "https://en.wikisource.org/wiki/The_London_Gazette/Number_15858",
      license: "public-domain",
      license_note: "Crown copyright in an 1805 publication long expired",
    },
    james: {
      label: "James, Naval History",
      work: "William James, The Naval History of Great Britain, vol. IV (1837)",
      license: "public-domain",
    },
  },
  units: [
    { id: "weather-column", side: "British", label: "Weather column", commander: "Nelson" },
    { id: "lee-column", side: "British", label: "Lee column", commander: "Collingwood" },
    { id: "combined-fleet", side: "Combined Fleet", label: "Combined Fleet", commander: "Villeneuve" },
  ],
  phases: [
    phase("dawn-sighting", "05:40", "Dawn: the fleets sight each other", "At daylight the enemy is discovered six or seven miles to the eastward.", [
      { id: "weather-column", position: { lat: 36.3, lon: -6.55 }, heading: 90, formation: "column", state: "intact" },
      { id: "lee-column", position: { lat: 36.24, lon: -6.55 }, heading: 90, formation: "column", state: "intact" },
      { id: "combined-fleet", position: { lat: 36.2, lon: -6.28 }, heading: 180, formation: "column", state: "intact" },
    ]),
    phase("villeneuve-wears", "08:00", "Villeneuve wears to the northward", "The Combined Fleet wears together and forms a line of battle on the larboard tack, heading for Cadiz.", [
      { id: "weather-column", position: { lat: 36.285, lon: -6.45 }, heading: 80, formation: "column", state: "intact" },
      { id: "lee-column", position: { lat: 36.22, lon: -6.45 }, heading: 85, formation: "column", state: "intact" },
      { id: "combined-fleet", position: { lat: 36.23, lon: -6.22 }, heading: 270, formation: "line", state: "intact" },
    ]),
    phase("approach", "11:45", "The columns bear down", "Nelson's signal is made: England expects that every man will do his duty.", [
      { id: "weather-column", position: { lat: 36.27, lon: -6.33 }, heading: 75, formation: "column", state: "intact" },
      { id: "lee-column", position: { lat: 36.203, lon: -6.31 }, heading: 85, formation: "column", state: "intact" },
      { id: "combined-fleet", position: { lat: 36.24, lon: -6.21 }, ...COMBINED_LINE, state: "intact" },
    ]),
    phase(
      "royal-sovereign-breaks-the-rear",
      "12:15",
      "Royal Sovereign breaks the rear",
      "The Action began at Twelve o'Clock, by the leading Ships of the Columns breaking through the Enemy's Line, the Commander in Chief about the Tenth Ship from the Van, the Second in Command about the Twelfth from the Rear.",
      [
        {
          id: "weather-column",
          position: { lat: 36.265, lon: -6.285 },
          heading: 70,
          formation: "column",
          state: "intact",
          moves: [{ kind: "intent", to: { lat: 36.258, lon: -6.198 } }],
        },
        { id: "lee-column", position: { lat: 36.2, lon: -6.275 }, heading: 85, formation: "column", state: "engaged" },
        { id: "combined-fleet", position: { lat: 36.245, lon: -6.205 }, ...COMBINED_LINE, state: "engaged" },
      ],
      [...DISPATCH, { source: "collingwood-dispatch", locator: "p. 1366" }],
    ),
    phase("melee", "13:30", "The melee", "Victory breaks the line astern of Bucentaure; the centre and rear are engaged at close quarters.", [
      { id: "weather-column", position: { lat: 36.262, lon: -6.235 }, heading: 70, formation: "column", state: "engaged" },
      { id: "lee-column", position: { lat: 36.2, lon: -6.24 }, heading: 85, formation: "column", state: "engaged" },
      { id: "combined-fleet", position: { lat: 36.258, lon: -6.198 }, ...COMBINED_LINE, state: "engaged" },
    ]),
    phase("villeneuve-strikes", "14:30", "Villeneuve strikes", "Bucentaure strikes; the Combined Fleet's centre has ceased to fight as a body.", [
      { id: "weather-column", position: { lat: 36.268, lon: -6.215 }, heading: 50, formation: "column", state: "engaged" },
      { id: "lee-column", position: { lat: 36.208, lon: -6.228 }, heading: 70, formation: "column", state: "engaged" },
      { id: "combined-fleet", position: { lat: 36.28, lon: -6.185 }, ...COMBINED_LINE, state: "broken", strength: 0.6 },
    ]),
    phase(
      "van-and-retreat",
      "16:00",
      "Dumanoir's van passes to windward; Gravina retreats",
      "Admiral Gravina, with Ten Ships joining their Frigates to Leeward, stood towards Cadiz. The Five headmost Ships in their Van tacked, and standing to the Southward, to Windward of the British Line, were engaged.",
      [
        { id: "weather-column", position: { lat: 36.27, lon: -6.205 }, heading: 30, formation: "column", state: "engaged" },
        { id: "lee-column", position: { lat: 36.212, lon: -6.222 }, heading: 60, formation: "column", state: "engaged" },
        {
          id: "combined-fleet",
          position: { lat: 36.31, lon: -6.165 },
          heading: 25,
          formation: "column",
          state: "broken",
          strength: 0.33,
          moves: [{ kind: "detachment", to: { lat: 35.98, lon: -6.52 } }],
        },
      ],
      [...DISPATCH, { source: "james", locator: "vol. IV, p. 60" }],
    ),
    phase("the-fleets-part", "17:00", "The fleets part", "Gravina's remnant makes for Cadiz as the wind rises; the British lie to with their prizes.", [
      { id: "weather-column", position: { lat: 36.278, lon: -6.2 }, heading: 30, formation: "column", state: "engaged" },
      { id: "lee-column", position: { lat: 36.215, lon: -6.218 }, heading: 60, formation: "column", state: "engaged" },
      { id: "combined-fleet", position: { lat: 36.38, lon: -6.2 }, heading: 25, formation: "column", state: "broken", strength: 0.33 },
    ]),
  ],
};

/** A rough Cadiz-to-Trafalgar coast, land to the east, with Cadiz on its spit. Eyeballed for the fixture, not cut from a dataset. */
export const CADIZ: MapFile = {
  type: "FeatureCollection",
  license: "CC0-1.0",
  attribution: "Coastline sketched for the renderer fixture",
  features: [
    {
      type: "Feature",
      properties: { kind: "land" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-6.45, 36.8],
            [-6.44, 36.72],
            [-6.38, 36.64],
            [-6.33, 36.615],
            [-6.26, 36.595],
            [-6.22, 36.58],
            [-6.19, 36.54],
            [-6.17, 36.5],
            [-6.18, 36.46],
            [-6.2, 36.43],
            [-6.25, 36.48],
            [-6.29, 36.525],
            [-6.305, 36.535],
            [-6.29, 36.505],
            [-6.26, 36.455],
            [-6.235, 36.415],
            [-6.19, 36.36],
            [-6.14, 36.32],
            [-6.09, 36.28],
            [-6.03, 36.18],
            [-5.93, 36.18],
            [-5.85, 36.1],
            [-5.8, 36.03],
            [-5.7, 36.03],
            [-5.7, 36.85],
            [-6.45, 36.85],
            [-6.45, 36.8],
          ],
        ],
      },
    },
    place("Cadiz", -6.305, 36.535),
    place("Rota", -6.37, 36.62),
    place("Sancti Petri", -6.22, 36.4),
    place("Cape Trafalgar", -6.03, 36.183),
    place("Barbate", -5.92, 36.19),
  ],
};

function place(name: string, lon: number, lat: number): PlaceFeature {
  return { type: "Feature", properties: { kind: "place", name }, geometry: { type: "Point", coordinates: [lon, lat] } };
}

/**
 * The picture at a phase's own instant: the snapshot verbatim, with the track
 * running to the next phase's position. A fixture helper only; the timeline
 * (#21) is where tweening lives.
 */
export function pictureOfPhase(battle: Battle, phaseIndex: number): Picture {
  const current = battle.phases[phaseIndex];
  if (current === undefined) throw new RangeError(`No phase at index ${phaseIndex}`);
  const next = battle.phases[phaseIndex + 1];

  const units: UnitPicture[] = battle.units.map((unit) => {
    const snapshot = current.units.find((u) => u.id === unit.id);
    if (snapshot === undefined) throw new RangeError(`Phase ${current.id} has no snapshot for ${unit.id}`);
    const ahead = next?.units.find((u) => u.id === unit.id);
    return {
      id: unit.id,
      position: snapshot.position,
      heading: snapshot.heading,
      formation: snapshot.formation,
      state: snapshot.state,
      strength: snapshot.strength ?? 1,
      moves: snapshot.moves ?? [],
      ...(ahead === undefined ? {} : { track: { from: snapshot.position, to: ahead.position } }),
    };
  });

  return {
    phaseIndex,
    phase: current,
    clock: parseBattleTime(current.t) * 60,
    units,
    ...(current.wind === undefined ? {} : { wind: current.wind }),
    caption: current.caption,
    label: current.label,
    references: current.references,
    ...(current.notes === undefined ? {} : { notes: current.notes }),
  };
}

/** The fixtures by the name given on the query string: the two frames the prototype drew. */
export const FIXTURES: Readonly<Record<string, () => { battle: Battle; map: MapFile; picture: Picture }>> = {
  phase4: () => ({ battle: TRAFALGAR, map: CADIZ, picture: pictureOfPhase(TRAFALGAR, 3) }),
  phase7: () => ({ battle: TRAFALGAR, map: CADIZ, picture: pictureOfPhase(TRAFALGAR, 6) }),
};
