/**
 * The staff map's kilometre graticule: which lines there are, where they fall
 * and what each is numbered.
 *
 * It is **ground and not furniture** (ADR-0021, #138): it runs in map space,
 * over the whole picture and under the units, so the ground hand lays it down
 * and no slot is cut for it. What is here is the arithmetic alone — pure, so
 * the line set for an extent is tested rather than judged by eye, while the
 * ink beside it is judged by eye like every other mark.
 *
 * **The pitch is chosen, not authored.** A map file carries no grid (ADR-0012),
 * so the squares are cut at the smallest round number of kilometres that
 * leaves the plate legible: at most `MAX_LINES` across it. Trafalgar's seventy
 * kilometres come out at ten, Cannae's ten at one, and Midway's ocean at a
 * hundred or more.
 *
 * **The numbering runs from the extent's own corner.** A real sheet numbers its
 * squares from a national grid origin; a battle file has none and one may not
 * be invented, so a line is numbered by the kilometres it stands east of the
 * extent's western edge or north of its southern one. Two digits, as a sheet
 * sets them.
 */
import type { Rect } from "../../projection.ts";

/** The round pitches a graticule may be cut at, in kilometres, ascending. */
const PITCHES_KM: readonly number[] = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

/** The most lines either way: past this the squares close up and the ground stops reading. */
const MAX_LINES = 12;

/** One line of the graticule: where it falls on the canvas, and the number it carries at both edges. */
export interface GridLine {
  at: number;
  label: string;
}

/** The whole grid for one extent. `kilometres` is `0` exactly when the plate is left ungridded. */
export interface Graticule {
  kilometres: number;
  columns: GridLine[];
  rows: GridLine[];
}

const NOTHING: Graticule = { kilometres: 0, columns: [], rows: [] };

/**
 * The graticule for a frame at a scale: the meridians west to east and the
 * parallels south to north, each numbered by its own distance from the
 * extent's corner.
 *
 * The frame's own edges carry no line — they are the neat line already — so
 * the count starts at one pitch in.
 */
export function graticule(frame: Rect, metresPerPixel: number): Graticule {
  if (!Number.isFinite(metresPerPixel) || metresPerPixel <= 0 || frame.width <= 0 || frame.height <= 0) return NOTHING;

  const acrossKm = (frame.width * metresPerPixel) / 1000;
  const kilometres = PITCHES_KM.find((pitch) => acrossKm / pitch <= MAX_LINES) ?? PITCHES_KM[PITCHES_KM.length - 1]!;
  const pitch = (kilometres * 1000) / metresPerPixel;
  if (!Number.isFinite(pitch) || pitch <= 0) return NOTHING;

  const columns: GridLine[] = [];
  for (let i = 1; i * pitch < frame.width; i++) columns.push({ at: frame.x + i * pitch, label: numeral(i * kilometres) });
  const rows: GridLine[] = [];
  for (let i = 1; i * pitch < frame.height; i++) rows.push({ at: frame.y + frame.height - i * pitch, label: numeral(i * kilometres) });
  // A field narrower than the finest pitch is left ungridded rather than
  // gridded with no lines in it, so `kilometres` and "there is a grid" are one
  // question and not two.
  if (columns.length === 0 && rows.length === 0) return NOTHING;
  return { kilometres, columns, rows };
}

/** A square's number as a sheet sets it: two digits, and more only when the grid runs past ninety-nine. */
function numeral(kilometres: number): string {
  return String(kilometres).padStart(2, "0");
}
