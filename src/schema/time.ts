/**
 * Battle-clock time (ADR-0002, ADR-0013): a 24-hour `"HH:MM"` string, `00:00`
 * to `23:59`, nothing finer, read on the day its `day` names. This module
 * converts between that reading and minutes; it knows nothing about phases or
 * tweening.
 *
 * There are two minute counts here and they are not the same. `parseBattleTime`
 * gives the time of day, `0` to `1439`. `instantMinutes` gives the instant on
 * the battle's clock, counting from midnight of the first day, so a battle that
 * crosses midnight stays monotonic and phases order on plain numbers.
 * `formatBattleTime` goes the other way from either, because every readout is
 * the time of day.
 */
import type { BattleTime } from "./types.ts";

const BATTLE_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes in a day: the step from one `day` to the next. */
const MINUTES_PER_DAY = 24 * 60;

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

/**
 * The `"HH:MM"` time of day for a non-negative whole number of minutes. A count
 * past the first midnight formats as the time of day it falls on, so day `1` at
 * `05:05` (minute `1745`) reads `"05:05"` (ADR-0013).
 */
export function formatBattleTime(minutes: number): BattleTime {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new RangeError(`Not a non-negative whole number of minutes: ${minutes}`);
  }
  const withinDay = minutes % MINUTES_PER_DAY;
  const hh = String(Math.floor(withinDay / 60)).padStart(2, "0");
  const mm = String(withinDay % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * The instant `t` on `day` as minutes from midnight of the battle's first day:
 * `day * 1440 + parseBattleTime(t)`. This is the number phases order on
 * (schema.md 2.10 rule 4). Throws `RangeError` on a time that is not `"HH:MM"`.
 */
export function instantMinutes(day: number, t: string): number {
  return day * MINUTES_PER_DAY + parseBattleTime(t);
}
