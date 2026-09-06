/**
 * Shared plumbing for the two validators: the error shape, JSON-pointer paths,
 * an accumulating error list, and a strict object reader that checks types,
 * ranges and enums field by field and rejects unknown keys.
 *
 * Validators never throw on bad data; they collect every error and report each
 * with the path of the offending value.
 */

/** One validation failure: where (a JSON pointer such as `/phases/3/units/1/heading`, `""` for the root) and what. */
export interface ValidationError {
  path: string;
  message: string;
}

/**
 * One error as a line for a person: its JSON-pointer path, `(root)` for a
 * whole-file failure, then the message, indented under the file it was found
 * in. The command line (`scripts/validate.ts`), the page (`src/app/load.ts`)
 * and the build (`vite/library.ts`) all report errors this way, so a battle
 * file reads the same wherever it is rejected.
 */
export function errorLine(error: ValidationError): string {
  return `  ${error.path || "(root)"}: ${error.message}`;
}

/** Escapes one JSON-pointer segment (RFC 6901: `~` becomes `~0`, `/` becomes `~1`). */
function escapeSegment(segment: string | number): string {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

/** Appends segments to a JSON pointer: `appendPointer("/phases", 3, "units")` is `/phases/3/units`. */
export function appendPointer(base: string, ...segments: (string | number)[]): string {
  return segments.reduce<string>((path, segment) => `${path}/${escapeSegment(segment)}`, base);
}

/** Collects errors in the order they are found. */
export class Errors {
  readonly list: ValidationError[] = [];

  add(path: string, message: string): void {
    this.list.push({ path, message });
  }

  get any(): boolean {
    return this.list.length > 0;
  }
}

/** Whether `value` is a plain JSON object: not `null`, not an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Bounds for a numeric field. Inclusive unless the exclusive flag is set. */
export interface NumberBounds {
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  /** Rejects a fraction: for `day`, `end_day` and the parts of `sort_date`. */
  integer?: boolean;
}

/** A non-negative whole number of days from the battle's first day (schema.md 2.10 rule 14). */
export const DAY_BOUNDS: NumberBounds = { min: 0, integer: true };

/** WGS84 latitude, decimal degrees (schema.md section 1). */
export const LAT_BOUNDS: NumberBounds = { min: -90, max: 90 };
/** WGS84 longitude, decimal degrees (schema.md section 1). */
export const LON_BOUNDS: NumberBounds = { min: -180, max: 180 };
/** A contour's height above sea level, metres (schema.md 3.2, ADR-0012). */
export const ELEVATION_BOUNDS: NumberBounds = { min: -500, max: 9000 };

/** A finite number within `bounds`, or `undefined` with the error recorded at `path`. */
export function readNumber(value: unknown, path: string, bounds: NumberBounds, errors: Errors): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.add(path, "expected a finite number");
    return undefined;
  }
  const { min, max, exclusiveMin = false, exclusiveMax = false, integer = false } = bounds;
  if (integer && !Number.isInteger(value)) {
    errors.add(path, `expected a whole number, got ${value}`);
    return undefined;
  }
  const belowMin = min !== undefined && (exclusiveMin ? value <= min : value < min);
  const aboveMax = max !== undefined && (exclusiveMax ? value >= max : value > max);
  if (belowMin || aboveMax) {
    const low = min === undefined ? "" : `${min} ${exclusiveMin ? "<" : "<="} `;
    const high = max === undefined ? "" : ` ${exclusiveMax ? "<" : "<="} ${max}`;
    errors.add(path, `expected ${low}x${high}, got ${value}`);
    return undefined;
  }
  return value;
}

/** Options shared by the field readers: `optional` fields record no error when absent. */
export interface FieldOptions {
  optional?: boolean;
}

/** An array field read item by item: `undefined` marks the items that failed, keeping indices, and `path` points at the array itself. */
export interface ArrayField<T> {
  items: (T | undefined)[];
  path: string;
}

/** A dictionary field read entry by entry: `undefined` marks the entries that failed, and `path` points at the object itself. */
export interface RecordField<T> {
  entries: Record<string, T | undefined>;
  path: string;
}

/** The keys an object may carry, either fixed or chosen from the raw object (for shapes whose keys depend on a discriminator). */
export type AllowedKeys = readonly string[] | ((raw: Record<string, unknown>) => readonly string[]);

/**
 * Reads the fields of one JSON object, recording an error for each that is
 * missing, mistyped, out of range or off the enum. Constructing it via
 * `ObjectReader.of` also rejects any key not in the allowed list.
 *
 * Every reader returns `undefined` when the field is absent or invalid, so a
 * caller can assemble the typed value only when every part read cleanly.
 */
export class ObjectReader {
  private readonly value: Record<string, unknown>;
  readonly path: string;
  readonly errors: Errors;

  // Explicit fields rather than parameter properties: Node's strip-only TypeScript mode, which runs `scripts/validate.ts`, has no support for the latter.
  private constructor(value: Record<string, unknown>, path: string, errors: Errors) {
    this.value = value;
    this.path = path;
    this.errors = errors;
  }

  /** Checks `value` is an object with no key outside `allowedKeys`; `undefined` (with an error recorded) when it is not an object. */
  static of(value: unknown, path: string, errors: Errors, allowedKeys: AllowedKeys): ObjectReader | undefined {
    if (!isRecord(value)) {
      errors.add(path, "expected a JSON object");
      return undefined;
    }
    const allowed = typeof allowedKeys === "function" ? allowedKeys(value) : allowedKeys;
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) errors.add(appendPointer(path, key), "unknown key");
    }
    return new ObjectReader(value, path, errors);
  }

  /** The pointer to a field of this object. */
  at(key: string): string {
    return appendPointer(this.path, key);
  }

  /** Whether the field is present (JSON has no `undefined`, so present means not `undefined`). */
  has(key: string): boolean {
    return this.value[key] !== undefined;
  }

  /** The field's raw value, recording "required" when it is absent and not optional. */
  raw(key: string, options: FieldOptions = {}): unknown {
    const raw = this.value[key];
    if (raw === undefined && !options.optional) this.errors.add(this.at(key), "required");
    return raw;
  }

  /** A string field. */
  string(key: string, options: FieldOptions = {}): string | undefined {
    const raw = this.raw(key, options);
    if (raw === undefined) return undefined;
    if (typeof raw !== "string") {
      this.errors.add(this.at(key), "expected a string");
      return undefined;
    }
    return raw;
  }

  /** A finite number within `bounds`. */
  number(key: string, bounds: NumberBounds = {}, options: FieldOptions = {}): number | undefined {
    const raw = this.raw(key, options);
    if (raw === undefined) return undefined;
    return readNumber(raw, this.at(key), bounds, this.errors);
  }

  /** One of a fixed set of string values. */
  oneOf<T extends string>(key: string, values: readonly T[], options: FieldOptions = {}): T | undefined {
    const raw = this.raw(key, options);
    if (raw === undefined) return undefined;
    if (typeof raw !== "string" || !(values as readonly string[]).includes(raw)) {
      this.errors.add(this.at(key), `expected one of ${values.map((v) => JSON.stringify(v)).join(", ")}`);
      return undefined;
    }
    return raw as T;
  }

  /** A nested object, itself checked against `allowedKeys`. */
  object(key: string, allowedKeys: AllowedKeys, options: FieldOptions = {}): ObjectReader | undefined {
    const raw = this.raw(key, options);
    if (raw === undefined) return undefined;
    return ObjectReader.of(raw, this.at(key), this.errors, allowedKeys);
  }

  /** An array field, each item handed to `readItem` with its pointer. `undefined` when the field itself is missing or not an array. */
  array<T>(
    key: string,
    readItem: (value: unknown, path: string) => T | undefined,
    options: FieldOptions & { nonEmpty?: boolean } = {},
  ): ArrayField<T> | undefined {
    const raw = this.raw(key, options);
    if (raw === undefined) return undefined;
    const path = this.at(key);
    if (!Array.isArray(raw)) {
      this.errors.add(path, "expected an array");
      return undefined;
    }
    if (options.nonEmpty && raw.length === 0) {
      this.errors.add(path, "expected at least one item");
      return undefined;
    }
    return { items: raw.map((item, index) => readItem(item, appendPointer(path, index))), path };
  }

  /** An object used as a dictionary, each value handed to `readEntry` with its pointer. `undefined` when the field itself is missing or not an object. */
  record<T>(
    key: string,
    readEntry: (value: unknown, path: string) => T | undefined,
    options: FieldOptions = {},
  ): RecordField<T> | undefined {
    const raw = this.raw(key, options);
    if (raw === undefined) return undefined;
    const path = this.at(key);
    if (!isRecord(raw)) {
      this.errors.add(path, "expected a JSON object");
      return undefined;
    }
    const entries: Record<string, T | undefined> = {};
    for (const [id, value] of Object.entries(raw)) entries[id] = readEntry(value, appendPointer(path, id));
    return { entries, path };
  }
}

/** Whether every item read cleanly, narrowing the array. */
export function allDefined<T>(items: (T | undefined)[]): items is T[] {
  return items.every((item) => item !== undefined);
}

/** Whether every entry read cleanly, narrowing the record. */
export function allEntriesDefined<T>(entries: Record<string, T | undefined>): entries is Record<string, T> {
  return allDefined(Object.values(entries));
}

/** Drops keys whose value is `undefined`, so optional fields that were absent stay absent in the typed value. */
export function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
