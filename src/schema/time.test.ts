import { describe, expect, it } from "vitest";
import { formatBattleTime, isBattleTime, parseBattleTime } from "./time.ts";

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

  it("refuses to format a time off the day", () => {
    expect(() => formatBattleTime(1440)).toThrow(RangeError);
    expect(() => formatBattleTime(-1)).toThrow(RangeError);
    expect(() => formatBattleTime(12.5)).toThrow(RangeError);
  });
});
