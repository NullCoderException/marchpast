import { describe, expect, it } from "vitest";
import { formatBattleTime, instantMinutes, isBattleTime, parseBattleTime } from "./time.ts";

describe("battle-clock time", () => {
  it("parses HH:MM to minutes since midnight", () => {
    expect(parseBattleTime("00:00")).toBe(0);
    expect(parseBattleTime("05:40")).toBe(340);
    expect(parseBattleTime("17:30")).toBe(1050);
    expect(parseBattleTime("23:59")).toBe(1439);
  });

  it("rejects anything that is not two digits, a colon, two digits in range", () => {
    for (const bad of ["24:00", "12:60", "5:40", "05:4", "0540", "05.40", " 05:40", "05:40:00", "", "noon"]) {
      expect(() => parseBattleTime(bad), bad).toThrow(RangeError);
      expect(isBattleTime(bad), bad).toBe(false);
    }
    expect(isBattleTime(340)).toBe(false);
    expect(isBattleTime("05:40")).toBe(true);
  });

  it("formats minutes since midnight back to HH:MM", () => {
    expect(formatBattleTime(0)).toBe("00:00");
    expect(formatBattleTime(340)).toBe("05:40");
    expect(formatBattleTime(1439)).toBe("23:59");
  });

  it("formats an instant past the first midnight as the time of day it falls on", () => {
    // ADR-0013: the clock runs from midnight of the battle's first day, and
    // every readout is the time of day. The Nile's daybreak is day 1 at 05:05.
    expect(formatBattleTime(1745)).toBe("05:05");
    expect(formatBattleTime(1440)).toBe("00:00");
    expect(formatBattleTime(1440 * 3 + 1439)).toBe("23:59");
  });

  it("refuses to format anything but a non-negative whole number of minutes", () => {
    expect(() => formatBattleTime(-1)).toThrow(RangeError);
    expect(() => formatBattleTime(12.5)).toThrow(RangeError);
  });
});

describe("instantMinutes", () => {
  it("counts minutes from midnight of the battle's first day", () => {
    expect(instantMinutes(0, "00:00")).toBe(0);
    expect(instantMinutes(0, "05:40")).toBe(340);
    expect(instantMinutes(1, "05:05")).toBe(1745);
    expect(instantMinutes(2, "00:00")).toBe(2880);
  });

  it("orders a later day above an earlier one whatever the times say", () => {
    expect(instantMinutes(1, "00:01")).toBeGreaterThan(instantMinutes(0, "23:59"));
  });

  it("rejects a time that is not HH:MM", () => {
    expect(() => instantMinutes(0, "5:40")).toThrow(RangeError);
  });
});
