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

/** Escapes one JSON-pointer segment (RFC 6901: `~` becomes `~0`, `/` becomes `~1`). */
function escapeSegment(segment: string | number): string {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

/** Appends segments to a JSON pointer: `join("/phases", 3, "units")` is `/phases/3/units`. */
export function join(base: string, ...segments: (string | number)[]): string {
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
  static of(value: unknown, path: string, errors: Errors, allowedKeys: readonly string[]): ObjectReader | undefined {
    if (!isRecord(value)) {
      errors.add(path, "expected a JSON object");
      return undefined;
    }
    for (const key of Object.keys(value)) {
      if (!allowedKeys.includes(key)) errors.add(join(path, key), "unknown key");
    }
    return new ObjectReader(value, path, errors);
  }

  /** The pointer to a field of this object. */
  at(key: string): string {
    return join(this.path, key);
  }

  has(key: string): boolean {
    return this.value[key] !== undefined;
  }

  /** The field's raw value, recording "required" when it is absent and not optional. */
  raw(key: string, options: FieldOptions = {}): unknown {
    const raw = this.value[key];
    if (raw === undefined && !options.optional) this.errors.add(this.at(key), "required");
    return raw;
  }

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
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      this.errors.add(this.at(key), "expected a finite number");
      return undefined;
    }
    const { min, max, exclusiveMin = false, exclusiveMax = false } = bounds;
    const belowMin = min !== undefined && (exclusiveMin ? raw <= min : raw < min);
    const aboveMax = max !== undefined && (exclusiveMax ? raw >= max : raw > max);
    if (belowMin || aboveMax) {
      const low = min === undefined ? "" : `${min} ${exclusiveMin ? "<" : "<="} `;
      const high = max === undefined ? "" : ` ${exclusiveMax ? "<" : "<="} ${max}`;
      this.errors.add(this.at(key), `expected ${low}x${high}, got ${raw}`);
      return undefined;
    }
    return raw;
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
  object(key: string, allowedKeys: readonly string[], options: FieldOptions = {}): ObjectReader | undefined {
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
    return { items: raw.map((item, index) => readItem(item, join(path, index))), path };
  }

  /** An object used as a dictionary: every value is handed to `readEntry` with its pointer. Returns `undefined` when any entry failed. */
  record<T>(
    key: string,
    readEntry: (value: unknown, path: string) => T | undefined,
    options: FieldOptions = {},
  ): Record<string, T> | undefined {
    const raw = this.raw(key, options);
    if (raw === undefined) return undefined;
    const path = this.at(key);
    if (!isRecord(raw)) {
      this.errors.add(path, "expected a JSON object");
      return undefined;
    }
    const entries: Record<string, T> = {};
    let complete = true;
    for (const [id, value] of Object.entries(raw)) {
      const entry = readEntry(value, join(path, id));
      if (entry === undefined) complete = false;
      else entries[id] = entry;
    }
    return complete ? entries : undefined;
  }
}

/** Whether every item read cleanly, narrowing the array. */
export function allDefined<T>(items: (T | undefined)[]): items is T[] {
  return items.every((item) => item !== undefined);
}

/** Drops keys whose value is `undefined`, so optional fields that were absent stay absent in the typed value. */
export function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}
