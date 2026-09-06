/**
 * Runtime validator for the battle file (schema.md section 2).
 *
 * Checks every shape rule (types, required fields, enums, ranges, unknown keys
 * rejected at every level) and the seventeen cross-field rules of schema.md
 * 2.10. Never throws on bad data; collects every error with a JSON-pointer path.
 *
 * Each `read*` function checks one table of the spec and returns the typed
 * value only when every field read cleanly, recording errors otherwise. The
 * cross-field checks run over whatever did read cleanly, so one malformed
 * unit never hides an unrelated ordering error.
 */
import { ARMS } from "./arms.ts";
import { treeDepth, unitsAtLevel } from "./hierarchy.ts";
import { readAttribution, readLicense } from "./licenseFields.ts";
import { classOf, ranksAbove, type LicenseId } from "./licenses.ts";
import { instantMinutes, isBattleTime } from "./time.ts";
import type {
  Battle,
  BattleTime,
  Day,
  Extent,
  Move,
  Phase,
  Position,
  Reference,
  SortDate,
  Source,
  Unit,
  UnitSnapshot,
  Wind,
} from "./types.ts";
import {
  allDefined,
  allEntriesDefined,
  appendPointer,
  type ArrayField,
  DAY_BOUNDS,
  Errors,
  LAT_BOUNDS,
  LON_BOUNDS,
  ObjectReader,
  type RecordField,
  type ValidationError,
  withoutUndefined,
} from "./validation.ts";

export type BattleValidation = { ok: true; battle: Battle } | { ok: false; errors: ValidationError[] };

const SCALE_UNITS = ["nmi", "km"] as const;
const WIND_FORCES = ["calm", "light", "moderate", "fresh", "gale"] as const;
const FORMATIONS = ["column", "line", "mass"] as const;
const STATES = ["intact", "engaged", "broken", "destroyed"] as const;
const MOVE_KINDS = ["detachment", "intent"] as const;

/** Degrees true: `0 <= x < 360`. */
const ANGLE = { min: 0, max: 360, exclusiveMax: true };
/** What disqualifies a map name (rule 13): a path separator or an extension. */
const NOT_A_BARE_NAME = /[\/\\.]/;
/** Rule 17: the label placement proof's break point, made a rule (ADR-0017). */
const MAX_UNITS_PER_LEVEL = 16;

/** What a phase needs from the rest of the file to check its own cross-references (rules 7 and 8). */
interface PhaseContext {
  /** Every roster id, or `undefined` when the roster did not read cleanly and rule 7 cannot be judged. */
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
    "summary",
    "dates",
    "sort_date",
    "extent",
    "scale_unit",
    "map",
    "end",
    "end_day",
    "license",
    "attribution",
    "sources",
    "levels",
    "units",
    "phases",
  ]);
  if (obj === undefined) return undefined;

  const schemaVersion = readSchemaVersion(obj);
  const title = obj.string("title");
  const summary = obj.string("summary");
  const dates = obj.array("dates", (value, path) => readStringItem(value, path, errors), { nonEmpty: true });
  const sortDate = readSortDate(obj.object("sort_date", ["year", "month", "day"]));
  const extent = readExtent(obj.object("extent", ["north", "south", "east", "west"]));
  const scaleUnit = obj.oneOf("scale_unit", SCALE_UNITS);
  const map = readMapName(obj);
  const end = readBattleTime(obj, "end");
  const endDay = obj.number("end_day", DAY_BOUNDS, { optional: true });
  const license = readLicense(obj);
  const attribution = readAttribution(obj, license);
  const sources = obj.record("sources", (value, path) => readSource(value, path, errors));
  if (sources !== undefined && license !== undefined) checkSourceRanks(sources, license, errors);
  const levels = obj.array("levels", (value, path) => readStringItem(value, path, errors), { optional: true });
  const units = obj.array("units", (value, path) => readUnit(value, path, errors), { nonEmpty: true });
  if (units !== undefined) {
    checkUniqueIds(units, errors);
    checkParents(units, errors);
    if (allDefined(units.items)) {
      checkLevels(units.items, levels === undefined ? undefined : levels.items, obj, errors);
    }
  }
  const context: PhaseContext = {
    rosterIds: units !== undefined && allDefined(units.items) ? new Set(units.items.map((unit) => unit.id)) : undefined,
    // A key whose entry failed to read is still a key, so a reference to it is not dangling.
    sourceIds: sources === undefined ? undefined : new Set(Object.keys(sources.entries)),
  };
  const phases = obj.array("phases", (value, path) => readPhase(value, path, errors, context), { nonEmpty: true });
  if (phases !== undefined) {
    checkUniqueIds(phases, errors);
    const lastDay = checkPhaseOrder(phases, end, endDay, obj.has("end_day"), obj, errors);
    checkWindAllOrNothing(phases, errors);
    if (dates !== undefined) checkDates(dates, lastDay, endDay, obj, errors);
  }

  if (
    schemaVersion === undefined ||
    title === undefined ||
    summary === undefined ||
    dates === undefined ||
    !allDefined(dates.items) ||
    sortDate === undefined ||
    extent === undefined ||
    scaleUnit === undefined ||
    end === undefined ||
    license === undefined ||
    sources === undefined ||
    !allEntriesDefined(sources.entries) ||
    (levels !== undefined && !allDefined(levels.items)) ||
    units === undefined ||
    !allDefined(units.items) ||
    phases === undefined ||
    !allDefined(phases.items)
  ) {
    return undefined;
  }

  return withoutUndefined({
    schema_version: schemaVersion,
    title,
    summary,
    dates: dates.items,
    sort_date: sortDate,
    extent,
    scale_unit: scaleUnit,
    map,
    end,
    end_day: endDay,
    license,
    attribution,
    sources: sources.entries,
    levels: levels === undefined ? undefined : (levels.items as string[]),
    units: units.items,
    phases: phases.items,
  });
}

/** Rule 1: `schema_version` is exactly `2`, and a v1 file is told what v2 needs (schema.md section 0). */
function readSchemaVersion(obj: ObjectReader): 2 | undefined {
  const version = obj.number("schema_version");
  if (version === undefined) return undefined;
  if (version === 1) {
    obj.errors.add(
      obj.at("schema_version"),
      "schema version 1 is not read by this validator; version 2 needs summary, dates in place of date, sort_date, and arm on every unit",
    );
    return undefined;
  }
  if (version !== 2) {
    obj.errors.add(obj.at("schema_version"), `unsupported schema version ${version}; this validator reads version 2`);
    return undefined;
  }
  return 2;
}

/** One entry of a string array (`dates`, `levels`). */
function readStringItem(value: unknown, path: string, errors: Errors): string | undefined {
  if (typeof value !== "string") {
    errors.add(path, "expected a string");
    return undefined;
  }
  return value;
}

/** A battle-clock time field: `"HH:MM"`, `00:00` to `23:59`. */
function readBattleTime(obj: ObjectReader, key: string): BattleTime | undefined {
  const raw = obj.string(key);
  if (raw === undefined) return undefined;
  if (!isBattleTime(raw)) {
    obj.errors.add(obj.at(key), 'expected a battle-clock time "HH:MM", 00:00 to 23:59');
    return undefined;
  }
  return raw;
}

/** Rule 6: three integers, a real month and day, and no year zero (schema.md 2.1). */
function readSortDate(obj: ObjectReader | undefined): SortDate | undefined {
  if (obj === undefined) return undefined;
  const year = obj.number("year", { integer: true });
  const month = obj.number("month", { min: 1, max: 12, integer: true });
  const day = obj.number("day", { min: 1, max: 31, integer: true });
  if (year === 0) {
    obj.errors.add(obj.at("year"), "expected a year in ordinary historical numbering, which has no year zero");
    return undefined;
  }
  if (year === undefined || month === undefined || day === undefined) return undefined;
  return { year, month, day };
}

/** Rule 13: `map` is a bare name, never a path or a file name. */
function readMapName(obj: ObjectReader): string | undefined {
  const name = obj.string("map", { optional: true });
  if (name === undefined) return undefined;
  if (name === "" || NOT_A_BARE_NAME.test(name)) {
    obj.errors.add(obj.at("map"), `expected a bare map name (no path separators, no extension), got ${JSON.stringify(name)}`);
    return undefined;
  }
  return name;
}

/** Rule 2 lives here beside the range checks: `south < north`, `west < east`. */
function readExtent(obj: ObjectReader | undefined): Extent | undefined {
  if (obj === undefined) return undefined;
  const north = obj.number("north", LAT_BOUNDS);
  const south = obj.number("south", LAT_BOUNDS);
  const east = obj.number("east", LON_BOUNDS);
  const west = obj.number("west", LON_BOUNDS);
  if (north === undefined || south === undefined || east === undefined || west === undefined) return undefined;
  if (south >= north) obj.errors.add(obj.path, `expected south < north, got south ${south} and north ${north}`);
  if (west >= east) obj.errors.add(obj.path, `expected west < east, got west ${west} and east ${east}`);
  return { north, south, east, west };
}

/** A `{ lat, lon }` object in WGS84 range. */
function readPosition(obj: ObjectReader | undefined): Position | undefined {
  if (obj === undefined) return undefined;
  const lat = obj.number("lat", LAT_BOUNDS);
  const lon = obj.number("lon", LON_BOUNDS);
  if (lat === undefined || lon === undefined) return undefined;
  return { lat, lon };
}

/** One entry of `sources` (schema.md 2.2). */
function readSource(value: unknown, path: string, errors: Errors): Source | undefined {
  const obj = ObjectReader.of(value, path, errors, ["label", "work", "url", "license", "license_note"]);
  if (obj === undefined) return undefined;
  const label = obj.string("label");
  const work = obj.string("work");
  const url = obj.string("url", { optional: true });
  const license = readLicense(obj);
  const licenseNote = obj.string("license_note", { optional: true });
  if (label === undefined || work === undefined || license === undefined) return undefined;
  return withoutUndefined({ label, work, url, license, license_note: licenseNote });
}

/** Rule 12, second half: no source's licence class ranks above the file's. */
function checkSourceRanks(sources: RecordField<Source>, fileLicense: LicenseId, errors: Errors): void {
  for (const [id, source] of Object.entries(sources.entries)) {
    if (source !== undefined && ranksAbove(source.license, fileLicense)) {
      errors.add(
        appendPointer(sources.path, id, "license"),
        `${source.license} (${classOf(source.license)}) ranks above the file's ${fileLicense} (${classOf(fileLicense)})`,
      );
    }
  }
}

/** One roster entry (schema.md 2.3). Rule 15 is the `arm` enum. */
function readUnit(value: unknown, path: string, errors: Errors): Unit | undefined {
  const obj = ObjectReader.of(value, path, errors, ["id", "side", "label", "short_label", "commander", "arm", "parent"]);
  if (obj === undefined) return undefined;
  const id = obj.string("id");
  const side = obj.string("side");
  const label = obj.string("label");
  const shortLabel = obj.string("short_label", { optional: true });
  const commander = obj.string("commander", { optional: true });
  const arm = obj.oneOf("arm", ARMS);
  const parent = obj.string("parent", { optional: true });
  if (id === undefined || side === undefined || label === undefined || arm === undefined) return undefined;
  return withoutUndefined({ id, side, label, short_label: shortLabel, commander, arm, parent });
}

/** Rule 16: `parent` names an earlier roster entry on the same side, which is what makes a cycle impossible. */
function checkParents(units: ArrayField<Unit>, errors: Errors): void {
  const earlier = new Map<string, Unit>();
  // A unit that failed to read has an id nobody can see, so from there on an
  // unresolved parent may name it; only the side check stays reportable.
  let anyEarlierFailed = false;
  units.items.forEach((unit, index) => {
    if (unit === undefined) {
      anyEarlierFailed = true;
      return;
    }
    if (unit.parent !== undefined) {
      const path = appendPointer(units.path, index, "parent");
      const parent = earlier.get(unit.parent);
      if (parent === undefined) {
        if (!anyEarlierFailed) errors.add(path, `${JSON.stringify(unit.parent)} is not a roster unit listed before this one`);
      } else if (parent.side !== unit.side) {
        errors.add(
          path,
          `parent ${JSON.stringify(unit.parent)} is on side ${JSON.stringify(parent.side)}, not ${JSON.stringify(unit.side)}`,
        );
      }
    }
    earlier.set(unit.id, unit);
  });
}

/** Rule 17: `levels` present exactly when the roster is a tree, one name per level, and no level over sixteen units. */
function checkLevels(units: Unit[], levels: (string | undefined)[] | undefined, root: ObjectReader, errors: Errors): void {
  const isTree = units.some((unit) => unit.parent !== undefined);
  if (isTree && levels === undefined) {
    errors.add(root.at("levels"), "required: a unit has a parent, so every level of the tree needs a name");
  } else if (!isTree && levels !== undefined) {
    errors.add(root.at("levels"), "forbidden: no unit has a parent, so the battle has one level and no Level chooser");
  }

  const depth = treeDepth(units);
  if (isTree && levels !== undefined && levels.length !== depth) {
    errors.add(root.at("levels"), `expected ${depth} names, one per level of the unit tree, got ${levels.length}`);
  }

  for (let level = 0; level < depth; level += 1) {
    const drawn = unitsAtLevel(units, level).length;
    if (drawn > MAX_UNITS_PER_LEVEL) {
      const name = levels?.[level];
      const which = name === undefined ? `level ${level}` : `level ${level} (${JSON.stringify(name)})`;
      errors.add(root.at("units"), `${which} draws ${drawn} units; no level draws more than ${MAX_UNITS_PER_LEVEL}`);
    }
  }
}

/** Rule 3: ids unique within an array; the later duplicate is the one reported. */
function checkUniqueIds(field: ArrayField<{ id: string }>, errors: Errors): void {
  const seen = new Set<string>();
  field.items.forEach((item, index) => {
    if (item === undefined) return;
    if (seen.has(item.id)) errors.add(appendPointer(field.path, index, "id"), `duplicate id ${JSON.stringify(item.id)}`);
    seen.add(item.id);
  });
}

/** One phase (schema.md 2.4), with rules 7 and 8 checked against `context`. */
function readPhase(value: unknown, path: string, errors: Errors, context: PhaseContext): Phase | undefined {
  const obj = ObjectReader.of(value, path, errors, [
    "id",
    "label",
    "day",
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
  const dayPresent = obj.has("day");
  const day = obj.number("day", DAY_BOUNDS, { optional: true });
  const t = readBattleTime(obj, "t");
  const playbackRate = obj.number("playback_rate", { min: 0, exclusiveMin: true });
  const windPresent = obj.has("wind");
  const wind = readWind(obj.object("wind", ["from", "force"], { optional: true }));
  const caption = obj.string("caption");
  const notes = obj.string("notes", { optional: true });
  const references = obj.array("references", (item, itemPath) => readReference(item, itemPath, errors), {
    nonEmpty: true,
  });
  if (references !== undefined) checkReferencesResolve(references, context.sourceIds, errors);
  const units = obj.array("units", (item, itemPath) => readSnapshot(item, itemPath, errors));
  if (units !== undefined) checkRosterCovered(units, context.rosterIds, errors);

  if (
    id === undefined ||
    label === undefined ||
    (dayPresent && day === undefined) ||
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
  return withoutUndefined({
    id,
    label,
    day,
    t,
    playback_rate: playbackRate,
    wind,
    caption,
    notes,
    references: references.items,
    units: units.items,
  });
}

/** An instant as the error messages name it: the time of day, and the day when it is not the first. */
function describeInstant(day: Day, t: BattleTime): string {
  return day === 0 ? t : `${t} on day ${day}`;
}

/**
 * Rule 4: phases strictly increase on (`day`, `t`), the first is on day `0`,
 * `end_day` is not before the last phase's day, and (`end_day`, `end`) is later
 * than the last phase. Returns the last cleanly-read phase's day, which rule 5
 * counts `dates` against.
 */
function checkPhaseOrder(
  phases: ArrayField<Phase>,
  end: BattleTime | undefined,
  endDay: Day | undefined,
  endDayPresent: boolean,
  root: ObjectReader,
  errors: Errors,
): Day | undefined {
  let previous: { day: Day; t: BattleTime; minutes: number; index: number } | undefined;
  phases.items.forEach((phase, index) => {
    if (phase === undefined) return;
    const day = phase.day ?? 0;
    const minutes = instantMinutes(day, phase.t);
    if (index === 0 && day !== 0) {
      errors.add(appendPointer(phases.path, 0, "day"), `expected the first phase on day 0, got day ${day}`);
    }
    if (previous !== undefined && minutes <= previous.minutes) {
      errors.add(
        appendPointer(phases.path, index, "t"),
        `expected later than phase ${previous.index} at ${describeInstant(previous.day, previous.t)}, got ${describeInstant(day, phase.t)}`,
      );
    }
    previous = { day, t: phase.t, minutes, index };
  });
  if (previous === undefined) return undefined;

  const lastDay = previous.day;
  if (endDayPresent && endDay !== undefined && endDay < lastDay) {
    // `end` is unjudgeable until `end_day` is right, so this is the only error.
    errors.add(root.at("end_day"), `expected not less than the last phase's day ${lastDay}, got ${endDay}`);
    return lastDay;
  }
  const resolvedEndDay = endDay ?? lastDay;
  if (end !== undefined && instantMinutes(resolvedEndDay, end) <= previous.minutes) {
    errors.add(
      root.at("end"),
      `expected later than the last phase at ${describeInstant(previous.day, previous.t)}, got ${describeInstant(resolvedEndDay, end)}`,
    );
  }
  return lastDay;
}

/** Rule 5: one `dates` entry per day the battle spans, so no `day` points past it and no entry goes unused. */
function checkDates(
  dates: ArrayField<string>,
  lastPhaseDay: Day | undefined,
  endDay: Day | undefined,
  root: ObjectReader,
  errors: Errors,
): void {
  if (lastPhaseDay === undefined) return;
  const days = Math.max(lastPhaseDay, endDay ?? lastPhaseDay) + 1;
  if (dates.items.length !== days) {
    errors.add(root.at("dates"), `expected ${days} ${days === 1 ? "entry" : "entries"}, one per day of the battle, got ${dates.items.length}`);
  }
}

/** Rule 9: either every phase has `wind` or none does. Reported on each phase that lacks it. */
function checkWindAllOrNothing(phases: ArrayField<Phase>, errors: Errors): void {
  const read = phases.items.filter((phase) => phase !== undefined);
  const some = read.some((phase) => phase.wind !== undefined);
  const all = read.every((phase) => phase.wind !== undefined);
  if (!some || all) return;
  phases.items.forEach((phase, index) => {
    if (phase !== undefined && phase.wind === undefined) {
      errors.add(appendPointer(phases.path, index, "wind"), "required: wind is all or nothing, and other phases have it");
    }
  });
}

/** Rule 10: `from` is present if and only if `force` is not `calm`. */
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
  return withoutUndefined({ from, force });
}

/** One pointer into `sources` (schema.md 2.6). */
function readReference(value: unknown, path: string, errors: Errors): Reference | undefined {
  const obj = ObjectReader.of(value, path, errors, ["source", "locator", "quote", "note"]);
  if (obj === undefined) return undefined;
  const source = obj.string("source");
  const locator = obj.string("locator");
  const quote = obj.string("quote", { optional: true });
  const note = obj.string("note", { optional: true });
  if (source === undefined || locator === undefined) return undefined;
  return withoutUndefined({ source, locator, quote, note });
}

/** Rule 8, second half: every reference points at a key of `sources`. */
function checkReferencesResolve(references: ArrayField<Reference>, sourceIds: Set<string> | undefined, errors: Errors): void {
  if (sourceIds === undefined) return;
  references.items.forEach((reference, index) => {
    if (reference !== undefined && !sourceIds.has(reference.source)) {
      errors.add(appendPointer(references.path, index, "source"), `${JSON.stringify(reference.source)} is not a key of sources`);
    }
  });
}

/** One unit's picture at the phase instant (schema.md 2.7). */
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
  return withoutUndefined({ id, position, heading, formation, state, strength, moves: moveList });
}

/** Rule 7: a phase lists every roster unit exactly once and no id off the roster. */
function checkRosterCovered(snapshots: ArrayField<UnitSnapshot>, rosterIds: Set<string> | undefined, errors: Errors): void {
  if (rosterIds === undefined) return;
  const seen = new Set<string>();
  snapshots.items.forEach((snapshot, index) => {
    if (snapshot === undefined) return;
    if (!rosterIds.has(snapshot.id)) {
      errors.add(appendPointer(snapshots.path, index, "id"), `${JSON.stringify(snapshot.id)} is not on the roster`);
    } else if (seen.has(snapshot.id)) {
      errors.add(appendPointer(snapshots.path, index, "id"), `${JSON.stringify(snapshot.id)} is listed more than once in this phase`);
    }
    seen.add(snapshot.id);
  });
  if (!allDefined(snapshots.items)) return;
  const missing = [...rosterIds].filter((id) => !seen.has(id));
  if (missing.length > 0) {
    errors.add(snapshots.path, `missing roster units: ${missing.map((id) => JSON.stringify(id)).join(", ")}`);
  }
}

/** One authored arrow (schema.md 2.8). */
function readMove(value: unknown, path: string, errors: Errors): Move | undefined {
  const obj = ObjectReader.of(value, path, errors, ["kind", "to"]);
  if (obj === undefined) return undefined;
  const kind = obj.oneOf("kind", MOVE_KINDS);
  const to = readPosition(obj.object("to", ["lat", "lon"]));
  if (kind === undefined || to === undefined) return undefined;
  return { kind, to };
}
