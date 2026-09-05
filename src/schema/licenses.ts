/**
 * The licence allowlist (ADR-0007, schema.md 1.1): identifier to class.
 *
 * Adding an identifier is a code change here with a class assignment, not a
 * data change. An identifier not in the table is a validation error.
 */

/** Ranked: `public-domain` < `attribution` < `share-alike`. A source never ranks above the file that draws on it. */
export type LicenseClass = "public-domain" | "attribution" | "share-alike";

/** An SPDX identifier from the allowlist, or the literal `public-domain`. */
export type LicenseId = keyof typeof LICENSE_CLASSES;

export const LICENSE_CLASSES = {
  "public-domain": "public-domain",
  "CC0-1.0": "public-domain",
  "CC-BY-4.0": "attribution",
  "OGL-UK-3.0": "attribution",
  "CC-BY-SA-3.0": "share-alike",
  "CC-BY-SA-4.0": "share-alike",
  "ODbL-1.0": "share-alike",
  "LGPL-3.0-or-later": "share-alike",
} as const satisfies Record<string, LicenseClass>;

const RANK: Record<LicenseClass, number> = { "public-domain": 0, attribution: 1, "share-alike": 2 };

/** Whether `id` is on the allowlist. Case-sensitive, as SPDX identifiers are. */
export function isLicenseId(id: string): id is LicenseId {
  return Object.hasOwn(LICENSE_CLASSES, id);
}

/** The class of an allowlisted identifier, or `undefined` for anything not in the table. */
export function classOf(id: string): LicenseClass | undefined {
  return isLicenseId(id) ? LICENSE_CLASSES[id] : undefined;
}

/** Whether a file under `id` must carry an `attribution` line: true for the attribution and share-alike classes. */
export function attributionRequired(id: LicenseId): boolean {
  return LICENSE_CLASSES[id] !== "public-domain";
}

/** Numeric rank of a class, ordered `public-domain` < `attribution` < `share-alike`. */
export function rankOf(licenseClass: LicenseClass): number {
  return RANK[licenseClass];
}

/** Whether `source`'s class ranks strictly above `file`'s, which makes it an illegal source for that file. */
export function ranksAbove(source: LicenseId, file: LicenseId): boolean {
  return rankOf(LICENSE_CLASSES[source]) > rankOf(LICENSE_CLASSES[file]);
}
