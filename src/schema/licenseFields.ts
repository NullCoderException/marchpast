/**
 * The `license` and `attribution` fields as both file kinds carry them
 * (schema.md 2.1, 2.2 and 3.1): an allowlisted identifier, and a credit line
 * that is required whenever the licence class demands one.
 */
import { attributionRequired, classOf, isLicenseId, type LicenseId } from "./licenses.ts";
import type { ObjectReader } from "./validation.ts";

/** Reads `license`, recording an error when it is missing, not a string, or not in the allowlist. */
export function readLicense(obj: ObjectReader): LicenseId | undefined {
  const raw = obj.string("license");
  if (raw === undefined) return undefined;
  if (!isLicenseId(raw)) {
    obj.errors.add(obj.at("license"), `licence ${JSON.stringify(raw)} is not in the allowlist (src/schema/licenses.ts)`);
    return undefined;
  }
  return raw;
}

/** Reads the optional `attribution`, recording an error when `license` (if it read cleanly) is in a class that requires one. */
export function readAttribution(obj: ObjectReader, license: LicenseId | undefined): string | undefined {
  const attribution = obj.string("attribution", { optional: true });
  if (license !== undefined && !obj.has("attribution") && attributionRequired(license)) {
    obj.errors.add(obj.at("attribution"), `required: ${license} is in the ${classOf(license)} class`);
  }
  return attribution;
}
