/**
 * Runtime validator for the battle file (schema.md section 2).
 *
 * Checks every shape rule (types, required fields, enums, ranges, unknown keys
 * rejected at every level) and the twelve cross-field rules of schema.md 2.9.
 * Never throws on bad data; collects every error with a JSON-pointer path.
 *
 * Each `read*` function checks one table of the spec and returns the typed
 * value only when every field read cleanly, recording errors otherwise. The
 * cross-field checks run over whatever did read cleanly, so one malformed
 * unit never hides an unrelated ordering error.
 */
import { readAttribution, readLicense } from "./licenseFields.ts";
import { classOf, ranksAbove, type LicenseId } from "./licenses.ts";
import { isBattleTime, parseBattleTime } from "./time.ts";
import type {
  Battle,
  BattleTime,
  Extent,
  Move,
  Phase,
  Position,
  Reference,
  Source,
  Unit,
  UnitSnapshot,
  Wind,
} from "./types.ts";
import { allDefined, defined, Errors, join, ObjectReader, type ValidationError } from "./validation.ts";

export type BattleValidation = { ok: true; battle: Battle } | { ok: false; errors: ValidationError[] };

const SCALE_UNITS = ["nmi", "km"] as const;
const WIND_FORCES = ["calm", "light", "moderate", "fresh", "gale"] as const;
const FORMATIONS = ["column", "line"] as const;
const STATES = ["intact", "engaged", "broken", "destroyed"] as const;
const MOVE_KINDS = ["detachment", "intent"] as const;

const LAT = { min: -90, max: 90 };
const LON = { min: -180, max: 180 };
/** Degrees true: `0 <= x < 360`. */
const ANGLE = { min: 0, max: 360, exclusiveMax: true };
/** A bare map name (rule 11): the file's stem under `data/maps/`, never a path or a file name. */
const BARE_MAP_NAME = /^[A-Za-z0-9_-]+$/;

/** What a phase needs from the rest of the file to check its own cross-references (rules 5 and 6). */
interface PhaseContext {
  /** Every roster id, or `undefined` when the roster did not read cleanly and rule 5 cannot be judged. */
  rosterIds: Set<string> | undefined;
  /** Every key of `sources`, or `undefined` when they did not read cleanly. */
  sourceIds: Set<string> | undefined;
}

export function validateBattle(json: unknown): BattleValidation {
  const errors = new Errors();
  const battle = readBattle(json, errors);
  if (battle === undefined || errors.any) return { ok: false, errors: errors.list };
  return { ok: true, battle };
}

function readBattle(json: unknown, errors: Errors): Battle | undefined {
  const obj = ObjectReader.of(json, "", errors, [
    "schema_version",
    "title",
    "date",
    "extent",
    "scale_unit",
    "map",
    "end",
    "license",
    "attribution",
    "sources",
    "units",
    "phases",
  ]);
  if (obj === undefined) return undefined;

  const schemaVersion = readSchemaVersion(obj);
  const title = obj.string("title");
  const date = obj.string("date");
  const extent = readExtent(obj.object("extent", ["north", "south", "east", "west"]));
  const scaleUnit = obj.oneOf("scale_unit", SCALE_UNITS);
  const map = readMapName(obj);
  const end = readBattleTime(obj, "end");
  const license = readLicense(obj);
  const attribution = readAttribution(obj, license);
  const sources = obj.record("sources", (value, path) => readSource(value, path, errors));
  if (sources !== undefined && license !== undefined) checkSourceRanks(sources, license, obj.at("sources"), errors);
  const units = obj.array("units", (value, path) => readUnit(value, path, errors), { nonEmpty: true });
  if (units !== undefined) checkUniqueIds(units.items, units.path, errors);
  const context: PhaseContext = {
    rosterIds: units !== undefined && allDefined(units.items) ? new Set(units.items.map((unit) => unit.id)) : undefined,
    sourceIds: sources === undefined ? undefined : new Set(Object.keys(sources)),
  };
  const phases = obj.array("phases", (value, path) => readPhase(value, path, errors, context), { nonEmpty: true });
  if (phases !== undefined) {
    checkUniqueIds(phases.items, phases.path, errors);
    checkPhaseOrder(phases.items, phases.path, end, obj, errors);
    checkWindAllOrNothing(phases.items, phases.path, errors);
  }

  if (
    schemaVersion === undefined ||
    title === undefined ||
    date === undefined ||
    extent === undefined ||
    scaleUnit === undefined ||
    end === undefined ||
    license === undefined ||
    sources === undefined ||
    units === undefined ||
    !allDefined(units.items) ||
    phases === undefined ||
    !allDefined(phases.items)
  ) {
    return undefined;
  }

  return defined({
    schema_version: schemaVersion,
    title,
    date,
    extent,
    scale_unit: scaleUnit,
    map,
    end,
    license,
    attribution,
    sources,
    units: units.items,
    phases: phases.items,
  });
}

/** Rule 1: `schema_version` is exactly `1`. */
function readSchemaVersion(obj: ObjectReader): 1 | undefined {
  const version = obj.number("schema_version");
  if (version === undefined) return undefined;
  if (version !== 1) {
    obj.errors.add(obj.at("schema_version"), `unsupported schema version ${version}; this validator reads version 1`);
    return undefined;
  }
  return 1;
}

function readBattleTime(obj: ObjectReader, key: string): BattleTime | undefined {
  const raw = obj.string(key);
  if (raw === undefined) return undefined;
  if (!isBattleTime(raw)) {
    obj.errors.add(obj.at(key), 'expected a battle-clock time "HH:MM", 00:00 to 23:59');
    return undefined;
  }
  return raw;
}

/** Rule 11: `map` is a bare name, never a path or a file name. */
function readMapName(obj: ObjectReader): string | undefined {
  const name = obj.string("map", { optional: true });
  if (name === undefined) return undefined;
  if (!BARE_MAP_NAME.test(name)) {
    obj.errors.add(obj.at("map"), `expected a bare map name (letters, digits, - and _), got ${JSON.stringify(name)}`);
    return undefined;
  }
  return name;
}

/** Rule 2 lives here beside the range checks: `south < north`, `west < east`. */
function readExtent(obj: ObjectReader | undefined): Extent | undefined {
  if (obj === undefined) return undefined;
  const north = obj.number("north", LAT);
  const south = obj.number("south", LAT);
  const east = obj.number("east", LON);
  const west = obj.number("west", LON);
  if (north === undefined || south === undefined || east === undefined || west === undefined) return undefined;
  if (south >= north) obj.errors.add(obj.path, `expected south < north, got south ${south} and north ${north}`);
  if (west >= east) obj.errors.add(obj.path, `expected west < east, got west ${west} and east ${east}`);
  return { north, south, east, west };
}

function readPosition(obj: ObjectReader | undefined): Position | undefined {
  if (obj === undefined) return undefined;
  const lat = obj.number("lat", LAT);
  const lon = obj.number("lon", LON);
  if (lat === undefined || lon === undefined) return undefined;
  return { lat, lon };
}

function readSource(value: unknown, path: string, errors: Errors): Source | undefined {
  const obj = ObjectReader.of(value, path, errors, ["label", "work", "url", "license", "license_note"]);
  if (obj === undefined) return undefined;
  const label = obj.string("label");
  const work = obj.string("work");
  const url = obj.string("url", { optional: true });
  const license = readLicense(obj);
  const licenseNote = obj.string("license_note", { optional: true });
  if (label === undefined || work === undefined || license === undefined) return undefined;
  return defined({ label, work, url, license, license_note: licenseNote });
}

/** Rule 10, second half: no source's licence class ranks above the file's. */
function checkSourceRanks(sources: Record<string, Source>, fileLicense: LicenseId, path: string, errors: Errors): void {
  for (const [id, source] of Object.entries(sources)) {
    if (ranksAbove(source.license, fileLicense)) {
      errors.add(
        join(path, id, "license"),
        `${source.license} (${classOf(source.license)}) ranks above the file's ${fileLicense} (${classOf(fileLicense)})`,
      );
    }
  }
}

function readUnit(value: unknown, path: string, errors: Errors): Unit | undefined {
  const obj = ObjectReader.of(value, path, errors, ["id", "side", "label", "commander"]);
  if (obj === undefined) return undefined;
  const id = obj.string("id");
  const side = obj.string("side");
  const label = obj.string("label");
  const commander = obj.string("commander", { optional: true });
  if (id === undefined || side === undefined || label === undefined) return undefined;
  return defined({ id, side, label, commander });
}

/** Rule 3: ids unique within an array; the later duplicate is the one reported. */
function checkUniqueIds(items: ({ id: string } | undefined)[], path: string, errors: Errors): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (item === undefined) return;
    if (seen.has(item.id)) errors.add(join(path, index, "id"), `duplicate id ${JSON.stringify(item.id)}`);
    seen.add(item.id);
  });
}

function readPhase(value: unknown, path: string, errors: Errors, context: PhaseContext): Phase | undefined {
  const obj = ObjectReader.of(value, path, errors, [
    "id",
    "label",
    "t",
    "playback_rate",
    "wind",
    "caption",
    "notes",
    "references",
    "units",
  ]);
  if (obj === undefined) return undefined;
  const id = obj.string("id");
  const label = obj.string("label");
  const t = readBattleTime(obj, "t");
  const playbackRate = obj.number("playback_rate", { min: 0, exclusiveMin: true });
  const windPresent = obj.has("wind");
  const wind = readWind(obj.object("wind", ["from", "force"], { optional: true }));
  const caption = obj.string("caption");
  const notes = obj.string("notes", { optional: true });
  const references = obj.array("references", (item, itemPath) => readReference(item, itemPath, errors), {
    nonEmpty: true,
  });
  if (references !== undefined) checkReferencesResolve(references.items, references.path, context.sourceIds, errors);
  const units = obj.array("units", (item, itemPath) => readSnapshot(item, itemPath, errors));
  if (units !== undefined) checkRosterCovered(units.items, units.path, context.rosterIds, errors);

  if (
    id === undefined ||
    label === undefined ||
    t === undefined ||
    playbackRate === undefined ||
    (windPresent && wind === undefined) ||
    caption === undefined ||
    references === undefined ||
    !allDefined(references.items) ||
    units === undefined ||
    !allDefined(units.items)
  ) {
    return undefined;
  }
  return defined({
    id,
    label,
    t,
    playback_rate: playbackRate,
    wind,
    caption,
    notes,
    references: references.items,
    units: units.items,
  });
}

/** Rule 4: `t` strictly increasing across the phases that read cleanly, and `end` later than the last `t`. */
function checkPhaseOrder(
  phases: (Phase | undefined)[],
  path: string,
  end: BattleTime | undefined,
  root: ObjectReader,
  errors: Errors,
): void {
  let previous: { t: BattleTime; index: number } | undefined;
  phases.forEach((phase, index) => {
    if (phase === undefined) return;
    if (previous !== undefined && parseBattleTime(phase.t) <= parseBattleTime(previous.t)) {
      errors.add(join(path, index, "t"), `expected later than phase ${previous.index} at ${previous.t}, got ${phase.t}`);
    }
    previous = { t: phase.t, index };
  });
  if (end !== undefined && previous !== undefined && parseBattleTime(end) <= parseBattleTime(previous.t)) {
    errors.add(root.at("end"), `expected later than the last phase at ${previous.t}, got ${end}`);
  }
}

/** Rule 7: either every phase has `wind` or none does. Reported on each phase that lacks it. */
function checkWindAllOrNothing(phases: (Phase | undefined)[], path: string, errors: Errors): void {
  const read = phases.filter((phase) => phase !== undefined);
  const some = read.some((phase) => phase.wind !== undefined);
  const all = read.every((phase) => phase.wind !== undefined);
  if (!some || all) return;
  phases.forEach((phase, index) => {
    if (phase !== undefined && phase.wind === undefined) {
      errors.add(join(path, index, "wind"), "required: wind is all or nothing, and other phases have it");
    }
  });
}

/** Rule 8: `from` is present if and only if `force` is not `calm`. */
function readWind(obj: ObjectReader | undefined): Wind | undefined {
  if (obj === undefined) return undefined;
  const from = obj.number("from", ANGLE, { optional: true });
  const force = obj.oneOf("force", WIND_FORCES);
  if (force === undefined) return undefined;
  if (force === "calm" && obj.has("from")) {
    obj.errors.add(obj.at("from"), "forbidden when force is calm");
    return undefined;
  }
  if (force !== "calm" && !obj.has("from")) {
    obj.errors.add(obj.at("from"), `required when force is ${force}`);
    return undefined;
  }
  return defined({ from, force });
}

function readReference(value: unknown, path: string, errors: Errors): Reference | undefined {
  const obj = ObjectReader.of(value, path, errors, ["source", "locator", "quote", "note"]);
  if (obj === undefined) return undefined;
  const source = obj.string("source");
  const locator = obj.string("locator");
  const quote = obj.string("quote", { optional: true });
  const note = obj.string("note", { optional: true });
  if (source === undefined || locator === undefined) return undefined;
  return defined({ source, locator, quote, note });
}

/** Rule 6, second half: every reference points at a key of `sources`. */
function checkReferencesResolve(
  references: (Reference | undefined)[],
  path: string,
  sourceIds: Set<string> | undefined,
  errors: Errors,
): void {
  if (sourceIds === undefined) return;
  references.forEach((reference, index) => {
    if (reference !== undefined && !sourceIds.has(reference.source)) {
      errors.add(join(path, index, "source"), `${JSON.stringify(reference.source)} is not a key of sources`);
    }
  });
}

function readSnapshot(value: unknown, path: string, errors: Errors): UnitSnapshot | undefined {
  const obj = ObjectReader.of(value, path, errors, [
    "id",
    "position",
    "heading",
    "formation",
    "state",
    "strength",
    "moves",
  ]);
  if (obj === undefined) return undefined;
  const id = obj.string("id");
  const position = readPosition(obj.object("position", ["lat", "lon"]));
  const heading = obj.number("heading", ANGLE);
  const formation = obj.oneOf("formation", FORMATIONS);
  const state = obj.oneOf("state", STATES);
  const strength = obj.number("strength", { min: 0, max: 1 }, { optional: true });
  const moves = obj.array("moves", (item, itemPath) => readMove(item, itemPath, errors), { optional: true });

  if (id === undefined || position === undefined || heading === undefined || formation === undefined || state === undefined) {
    return undefined;
  }
  let moveList: Move[] | undefined;
  if (moves !== undefined) {
    if (!allDefined(moves.items)) return undefined;
    moveList = moves.items;
  }
  return defined({ id, position, heading, formation, state, strength, moves: moveList });
}

/** Rule 5: a phase lists every roster unit exactly once and no id off the roster. */
function checkRosterCovered(
  snapshots: (UnitSnapshot | undefined)[],
  path: string,
  rosterIds: Set<string> | undefined,
  errors: Errors,
): void {
  if (rosterIds === undefined) return;
  const seen = new Set<string>();
  snapshots.forEach((snapshot, index) => {
    if (snapshot === undefined) return;
    if (!rosterIds.has(snapshot.id)) {
      errors.add(join(path, index, "id"), `${JSON.stringify(snapshot.id)} is not on the roster`);
    } else if (seen.has(snapshot.id)) {
      errors.add(join(path, index, "id"), `${JSON.stringify(snapshot.id)} is listed more than once in this phase`);
    }
    seen.add(snapshot.id);
  });
  if (!allDefined(snapshots)) return;
  const missing = [...rosterIds].filter((id) => !seen.has(id));
  if (missing.length > 0) errors.add(path, `missing roster units: ${missing.map((id) => JSON.stringify(id)).join(", ")}`);
}

function readMove(value: unknown, path: string, errors: Errors): Move | undefined {
  const obj = ObjectReader.of(value, path, errors, ["kind", "to"]);
  if (obj === undefined) return undefined;
  const kind = obj.oneOf("kind", MOVE_KINDS);
  const to = readPosition(obj.object("to", ["lat", "lon"]));
  if (kind === undefined || to === undefined) return undefined;
  return { kind, to };
}
