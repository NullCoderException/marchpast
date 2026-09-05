/**
 * Battle-clock time (ADR-0002): a 24-hour `"HH:MM"` string on the battle's
 * date, `00:00` to `23:59`, nothing finer. This module converts between that
 * string and minutes since midnight; it knows nothing about phases or tweening.
 */
import type { BattleTime } from "./types.ts";

const BATTLE_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Whether `value` is a well-formed battle-clock time string. */
export function isBattleTime(value: unknown): value is BattleTime {
  return typeof value === "string" && BATTLE_TIME.test(value);
}

/** Minutes since midnight for an `"HH:MM"` string. Throws `RangeError` on anything else. */
export function parseBattleTime(time: string): number {
  const match = BATTLE_TIME.exec(time);
  if (match === null) throw new RangeError(`Not a battle-clock time (expected "HH:MM", 00:00 to 23:59): ${JSON.stringify(time)}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** The `"HH:MM"` string for a whole number of minutes since midnight, `0` to `1439`. */
export function formatBattleTime(minutes: number): BattleTime {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 24 * 60) {
    throw new RangeError(`Not a whole number of minutes within the day: ${minutes}`);
  }
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
