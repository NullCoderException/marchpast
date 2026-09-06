/**
 * Text helpers the plate draws with: word wrapping for the caption band, the
 * compass point an angle in degrees true is written as, and the battle
 * clock's `HH:MM`. Pure functions; the measurer is injected so they test without a
 * canvas.
 */
import { formatBattleTime } from "../schema/time.ts";
import type { ClockSeconds } from "../timeline/picture.ts";

/** Breaks `text` into lines no wider than `maxWidth` as measured by `measure`. A single word wider than that gets its own line. */
export function wrapText(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (line !== "" && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

const COMPASS_POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;

/** The nearest of the sixteen compass points to an angle in degrees true. Display only; the data stays numeric (ADR-0008). */
export function compassPoint(degreesTrue: number): string {
  const index = Math.round(degreesTrue / 22.5) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index] ?? "N";
}

/** The battle clock as `HH:MM`, whole minutes; seconds are dropped, never rounded up. */
export function formatClock(clock: ClockSeconds): string {
  return formatBattleTime(Math.floor(clock / 60));
}
