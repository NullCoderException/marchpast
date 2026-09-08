/**
 * The staff map's furniture: the neat line, the north needle with the phase's
 * wind on a station barb beside it, the battle's title, the block scale bar,
 * the marginal key and the map's credit — every piece of the closed set
 * redrawn in the sheet's hand (#139).
 *
 * The set, the corner each piece anchors to and the order they are drawn in
 * are the anatomy's (ADR-0021); which pieces a narrow plate keeps is
 * `layout.ts`'s (#86). What is here is ink and nothing else.
 *
 * **Every corner of this view stands on paper.** The shared half lays a piece
 * its panel wherever the ground runs under that corner, and the staff map's
 * ground answers that it always does — the graticule runs over the whole
 * extent at every scale (`ground.ts`, #62, #175). So no piece here lays paper
 * of its own, and the key, standing on the scale bar's corner panel, rules
 * itself rather than filling a second one.
 */
import type { Wind, WindForce } from "../../../schema/types.ts";
import { legendArm, legendArms } from "../../glyphs/arms.ts";
import type { HitRegion } from "../../hit.ts";
import {
  drawKeyRowSample,
  KEY_ROW_HEIGHT,
  KEY_SAMPLE_SCALE,
  KEY_SAMPLE_WIDTH,
  keyRowCount,
  keyRowLabel,
  plateKeyRows,
  sideRows,
} from "../../key.ts";
import type { NumeralRow } from "../../labels/index.ts";
import { furnitureFor } from "../../layout.ts";
import type { Plate } from "../../plate.ts";
import type { Rect } from "../../projection.ts";
import { toRadians } from "../../projection.ts";
import { contourInterval } from "../../relief.ts";
import { METRES_PER_UNIT, scaleBarLength, UNIT_LABEL } from "../../scaleBar.ts";
import { compassPoint } from "../../text.ts";
import type {
  Furniture,
  FurniturePlace,
  LegendHand,
  LegendPlace,
  Palette,
  Piece,
  ScaleBarPlace,
  Setting,
} from "../../view.ts";
import { staffCaption } from "./caption.ts";
import { STAFF_GRID } from "./palette.ts";
import { font } from "./type.ts";

/** The neat line: a heavy outer rule and a fine inner one, where the plate cuts two hairlines. */
const NEAT_OUTER = { inset: 1, width: 2 };
const NEAT_INNER = { inset: 6.5, width: 0.7 };

/** A panel's own rule: fine, in the graticule's slate, so the paper reads as a pasted-on box and not a hole. */
const PANEL_RULE = 0.8;

/** Inset of the bottom-left furniture from the frame's edge, and of the corner panels from it. */
const MARGIN = 26;
const CORNER_PANEL_INSET = 10;
/** How far a panel stands off the ink it carries, and above and below a line of type. */
const PANEL_PAD = 12;
const PANEL_LEAD = 6;

/** The weight the credit is set at, which a fitted one keeps. */
const CREDIT_WEIGHT = 400;

/* --------------------------------------------------------------- compass */

/**
 * The rose's corner: where its panel starts, how deep it stands, and the least
 * width it ever takes. The inset is the corner panels' own, because a
 * graticule numeral rides in that same margin and a panel edge inside it would
 * cut one in half rather than cover it (`ground.ts`).
 */
const COMPASS_PANEL = { inset: CORNER_PANEL_INSET, height: 112, minWidth: 176 };
/** The needle, the barb and the wind's words, in the frame's own coordinates. */
const NEEDLE_AT = { x: 52, y: 58 };
const BARB_AT = { x: 120, y: 54 };
const WIND_TEXT_AT = { x: 30, y: 92 };

/** The needle: a stem, a filled point, one flank shaded, and the letter over it. No declination diagram — we have no declination. */
const NEEDLE = { stem: 30, tip: -24, waist: -9, barb: -4, half: 5, letter: -34, width: 1.4 };
const NEEDLE_SHADE = 0.45;
const NEEDLE_LETTER_SIZE = 12;
const NEEDLE_LETTER_TRACKING = "1px";

/**
 * The wind as a meteorological station barb: how many barbs each of the five
 * words is worth. Calm is the bare ring; a half barb, a barb and two barbs
 * climb from it; a gale is the pennant, which is what four barbs are drawn as.
 */
const BARBS: Readonly<Record<WindForce, number>> = { calm: 0, light: 0.5, moderate: 1, fresh: 2, gale: 4 };
/** The pennant's own count: at or above this the barbs become one filled triangle. */
const PENNANT = 4;

/** What a barb is made of at one force: the shaft, the whole feathers on it, the half one, and the pennant. */
export interface Barb {
  shaft: boolean;
  feathers: number;
  half: boolean;
  pennant: boolean;
}

/**
 * The barb one of the five words is drawn as (ADR-0008): calm is the bare ring
 * and nothing else, light a half barb, moderate one, fresh two, and a gale the
 * pennant. Pure, because which feathers a force is worth is the one part of
 * the drawing that is a reading rather than a taste.
 */
export function barbFor(force: WindForce): Barb {
  const count = BARBS[force];
  if (count === 0) return { shaft: false, feathers: 0, half: false, pennant: false };
  if (count >= PENNANT) return { shaft: true, feathers: 0, half: false, pennant: true };
  return { shaft: true, feathers: Math.floor(count), half: count % 1 === 0.5, pennant: false };
}
/** The barb: the ring at the station, the shaft's length, and the feathers along it. */
const BARB = { ring: 3, shaft: 30, width: 1.5, span: 11, rise: 5, pitch: 6, halfSpan: 5.5, halfRise: 2.5 };

/** The phone's compass: the same needle at a smaller scale, with the wind as a sentence beside it. */
const PHONE_COMPASS_PANEL = { inset: 8, top: 4, height: 40, minWidth: 40 };
const PHONE_NEEDLE_AT = { x: 22, y: 26 };
const PHONE_NEEDLE_SCALE = 0.45;
const PHONE_WIND_TEXT_X = 38;

/* ----------------------------------------------------------------- title */

const titleRight = (frame: Rect): number => frame.x + frame.width - 22;
const titleTop = (frame: Rect): number => frame.y + 18;

/* ---------------------------------------------------------------- credit */

const creditRight = (frame: Rect): number => frame.x + frame.width - 14;
const creditBaseline = (frame: Rect): number => frame.y + frame.height - 12;
/** How small the credit may be set to fit the plate, as a share of its own size. */
const CREDIT_MIN_SCALE = 0.7;

/**
 * The credit, fitted to the plate: the map's attribution, the run it is set
 * in, and how wide it comes out.
 *
 * An attribution can run long — Cannae's names two sources and a siting — and
 * this view sets it in **capitals**, which run wider than the engraved plate's
 * lower case at the same size. A line that does not fit is set smaller rather
 * than off the edge of the picture, down to a floor, and the panel and the ink
 * read the one answer so they cannot disagree about where it ends.
 */
function creditRun({ plate, frame }: FurniturePlace): { text: string; setting: Setting; width: number } | undefined {
  const attribution = plate.map?.attribution;
  if (attribution === undefined || attribution === "") return undefined;
  const role = plate.view.type.role("credit", plate.mode);
  const text = role.spell(attribution);
  const room = creditRight(frame) - (frame.x + CORNER_PANEL_INSET) - PANEL_PAD;
  const full = runWidth(plate.ctx, text, role);
  if (full <= room || full <= 0) return { text, setting: role, width: full };

  const size = Math.max(role.size * CREDIT_MIN_SCALE, (role.size * room) / full);
  const setting: Setting = { ...role, font: font(size, CREDIT_WEIGHT), size };
  return { text, setting, width: runWidth(plate.ctx, text, setting) };
}

/* ------------------------------------------------------------- scale bar */

/** The bar as a sheet prints one: alternating filled and hollow blocks, the numerals under the divisions, the unit named at the end. */
const BAR_BLOCK_HEIGHT = 7;
const BAR_BLOCK_RULE = 0.9;
/** How far below the bar's own line the numerals ride, and how deep that row stands. */
const BAR_NUMERAL_DROP = 11;
const BAR_NUMERAL_ROW = 12;
/** The gap between the bar's right end and the unit it is measured in. */
const BAR_UNIT_GAP = 10;
/** The phone's bar sits closer in than a desktop's: the corner it is in is a band, not a margin. */
const PHONE_SCALE_INSET_X = 14;
const PHONE_SCALE_INSET_Y = 17;

/* ---------------------------------------------------------------- legend */

/** The marginal key: its least width, the gap round what it carries, and the head that names it. */
const LEGEND_WIDTH = 196;
const LEGEND_PAD = 12;
const LEGEND_GAP = 14;
const LEGEND_RULE = 1;
const LEGEND_HEAD_RULE = 3;
const LEGEND_HEAD_HEIGHT = 28;
const LEGEND_HEAD_BASELINE = 17;
const LEGEND_UNDER_RULE = { at: 26, width: 0.7, alpha: 0.5 };
const LEGEND_FOOT = 10;
const LEGEND_HEAD_WORD = "LEGEND";
/** Where a row's sample starts inside the key, and the gap between it and the word it teaches. */
const LEGEND_SAMPLE_INSET = 14;
const LEGEND_SAMPLE_GAP = 10;

/** The phone's key: one line of the sides, with a row above it for every numeral a label collapsed to. */
const STRIP_ROW = 18;
const STRIP_KEY_ROW = 14;
const STRIP_SAMPLE = 16;
const STRIP_SCALE = 0.45;
const STRIP_SAMPLE_GAP = 4;
const STRIP_SIDE_GAP = 16;
const STRIP_PAD = 6;
const STRIP_INSET_X = 6;
const STRIP_INSET_Y = 12;

/* ------------------------------------------------------------- the paper */

/** The paper a piece stands on: the palette's panel, ruled fine in the graticule's slate. */
function drawPanel(ctx: CanvasRenderingContext2D, box: Rect, palette: Palette): void {
  ctx.save();
  ctx.fillStyle = palette.panel;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  ctx.strokeStyle = STAFF_GRID;
  ctx.lineWidth = PANEL_RULE;
  ctx.strokeRect(box.x + PANEL_RULE / 2, box.y + PANEL_RULE / 2, box.width - PANEL_RULE, box.height - PANEL_RULE);
  ctx.restore();
}

/* ----------------------------------------------------------------- runs */

/** How wide a run of type stands in this view's face, tracking and all, without disturbing what the caller had set. */
function runWidth(ctx: CanvasRenderingContext2D, text: string, setting: Setting): number {
  ctx.save();
  ctx.font = setting.font;
  ctx.letterSpacing = setting.tracking;
  const { width } = ctx.measureText(text);
  ctx.restore();
  ctx.letterSpacing = "0px";
  return width;
}

/** Sets one run of type on the context: the face and the tracking together, so the two can never disagree. */
function setRun(ctx: CanvasRenderingContext2D, setting: Setting): void {
  ctx.font = setting.font;
  ctx.letterSpacing = setting.tracking;
}

/* --------------------------------------------------------------- compass */

/** The wind as this view writes it, in capitals, or `undefined` when the battle does not track wind. */
function windText(wind: Wind | undefined): string | undefined {
  if (wind === undefined) return undefined;
  if (wind.force === "calm" || wind.from === undefined) return "WIND CALM";
  return `WIND ${compassPoint(wind.from)} · ${wind.force.toUpperCase()}`;
}

/** The north needle at the origin: a stem, a filled point with one flank shaded, and the letter over it. */
function drawNeedle(ctx: CanvasRenderingContext2D, ink: string, scale: number, letter: string): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = NEEDLE.width;
  ctx.beginPath();
  ctx.moveTo(0, NEEDLE.stem);
  ctx.lineTo(0, NEEDLE.barb - 4);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, NEEDLE.tip);
  ctx.lineTo(NEEDLE.half, NEEDLE.barb);
  ctx.lineTo(0, NEEDLE.waist);
  ctx.lineTo(-NEEDLE.half, NEEDLE.barb);
  ctx.closePath();
  ctx.fill();
  // One flank shaded, so the needle reads as a solid and not a flat arrow.
  ctx.globalAlpha = NEEDLE_SHADE;
  ctx.beginPath();
  ctx.moveTo(0, NEEDLE.tip);
  ctx.lineTo(NEEDLE.half, NEEDLE.barb);
  ctx.lineTo(0, NEEDLE.waist);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = letter;
  ctx.letterSpacing = NEEDLE_LETTER_TRACKING;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 0, NEEDLE.letter);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

/**
 * The wind as a meteorological station barb, which is what a twentieth-century
 * sheet draws where the plate cuts feathers on to a rose's arrow. The shaft
 * points along the direction the wind blows **from** and carries no head; the
 * feathers sit at its outer end. Calm is the bare ring.
 */
export function drawWindBarb(ctx: CanvasRenderingContext2D, ink: string, force: WindForce, fromDegrees: number | undefined): void {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = BARB.width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, BARB.ring, 0, Math.PI * 2);
  ctx.stroke();

  const barb = barbFor(force);
  if (!barb.shaft || fromDegrees === undefined) {
    ctx.restore();
    return;
  }

  // The shaft runs out from the station **towards where the wind comes from**,
  // which is what a station barb does and why it carries no head: the plate's
  // rose draws an arrow pointing where the wind goes, and this is the other
  // convention, not the same one drawn differently (ADR-0008).
  ctx.rotate(toRadians(fromDegrees));
  ctx.beginPath();
  ctx.moveTo(0, -BARB.ring);
  ctx.lineTo(0, -BARB.shaft);
  ctx.stroke();

  if (barb.pennant) {
    ctx.beginPath();
    ctx.moveTo(0, -BARB.shaft);
    ctx.lineTo(BARB.span, -BARB.shaft + BARB.rise);
    ctx.lineTo(0, -BARB.shaft + BARB.rise * 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  let y = -BARB.shaft;
  ctx.beginPath();
  for (let i = 0; i < barb.feathers; i++) {
    ctx.moveTo(0, y);
    ctx.lineTo(BARB.span, y + BARB.rise);
    y += BARB.pitch;
  }
  if (barb.half) {
    ctx.moveTo(0, y);
    ctx.lineTo(BARB.halfSpan, y + BARB.halfRise);
  }
  ctx.stroke();
  ctx.restore();
}

function compassPanel({ plate, frame }: FurniturePlace): Rect {
  const text = windText(plate.picture.wind);
  const x = frame.x + COMPASS_PANEL.inset;
  const setting = plate.view.type.role("legendLine", "desktop");
  const wordsRight = text === undefined ? 0 : frame.x + WIND_TEXT_AT.x + runWidth(plate.ctx, text, setting) + PANEL_PAD;
  const right = Math.max(x + COMPASS_PANEL.minWidth, wordsRight);
  return { x, y: frame.y + COMPASS_PANEL.inset, width: right - x, height: COMPASS_PANEL.height };
}

function drawCompass(place: FurniturePlace): void {
  const { plate, frame } = place;
  const { ctx, picture, view } = plate;
  const ink = view.palette.ink;

  ctx.save();
  ctx.translate(frame.x + NEEDLE_AT.x, frame.y + NEEDLE_AT.y);
  drawNeedle(ctx, ink, 1, view.type.run(NEEDLE_LETTER_SIZE, "name").font);
  ctx.restore();

  const wind = picture.wind;
  if (wind !== undefined) {
    ctx.save();
    ctx.translate(frame.x + BARB_AT.x, frame.y + BARB_AT.y);
    drawWindBarb(ctx, ink, wind.force, wind.from);
    ctx.restore();
  }

  const text = windText(wind);
  if (text === undefined) return;
  ctx.save();
  ctx.fillStyle = ink;
  setRun(ctx, view.type.role("legendLine", "desktop"));
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, frame.x + WIND_TEXT_AT.x, frame.y + WIND_TEXT_AT.y);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

function phoneCompassPanel({ plate, frame }: FurniturePlace): Rect {
  const text = windText(plate.picture.wind);
  const x = frame.x + PHONE_COMPASS_PANEL.inset;
  const setting = plate.view.type.role("credit", "phone");
  const wordsRight = text === undefined ? 0 : frame.x + PHONE_WIND_TEXT_X + runWidth(plate.ctx, text, setting) + PANEL_PAD;
  const right = Math.max(x + PHONE_COMPASS_PANEL.minWidth, wordsRight);
  return { x, y: frame.y + PHONE_COMPASS_PANEL.top, width: right - x, height: PHONE_COMPASS_PANEL.height };
}

/** The phone's compass: the same needle at a smaller scale, with the wind as a sentence rather than a barb (#86). */
function drawPhoneCompass(place: FurniturePlace): void {
  const { plate, frame } = place;
  const { ctx, picture, view } = plate;
  const ink = view.palette.ink;

  ctx.save();
  ctx.translate(frame.x + PHONE_NEEDLE_AT.x, frame.y + PHONE_NEEDLE_AT.y);
  drawNeedle(ctx, ink, PHONE_NEEDLE_SCALE, view.type.run(NEEDLE_LETTER_SIZE, "name").font);
  ctx.restore();

  const text = windText(picture.wind);
  if (text === undefined) return;
  ctx.save();
  ctx.fillStyle = ink;
  setRun(ctx, view.type.role("credit", "phone"));
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, frame.x + PHONE_WIND_TEXT_X, frame.y + PHONE_NEEDLE_AT.y);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

const ROSE: Piece = { panel: compassPanel, draw: drawCompass };
const NEEDLE_PIECE: Piece = { panel: phoneCompassPanel, draw: drawPhoneCompass };
const compassFor = (place: FurniturePlace): Piece => (furnitureFor(place.plate.mode).compass === "rose" ? ROSE : NEEDLE_PIECE);

/* ---------------------------------------------------------------- legend */

/** The first side's ink, which a detachment sample is drawn in. */
function firstSideInk(colours: ReadonlyMap<string, string>, palette: Palette): string {
  return colours.values().next().value ?? palette.ink;
}

/** One row of the numeral key: the numeral the plate showed, and the name it stood in for. */
function numeralRowText(row: NumeralRow): string {
  return `${row.numeral} · ${row.label}`;
}

/** How wide the widest numeral row runs: what widens either form of the key (#39). */
function widestNumeral(plate: Plate, key: readonly NumeralRow[], setting: Setting): number {
  return key.reduce((wide, row) => Math.max(wide, runWidth(plate.ctx, numeralRowText(row), setting)), 0);
}

function legendHeight(plate: Plate, key: readonly NumeralRow[]): number {
  return LEGEND_HEAD_HEIGHT + keyRowCount(plate.colours.size, legendArms(plate.battle.units), key.length) * KEY_ROW_HEIGHT + LEGEND_FOOT;
}

function legendWidth(plate: Plate, key: readonly NumeralRow[]): number {
  const longest = widestNumeral(plate, key, plate.view.type.role("legendLine", "desktop"));
  return Math.max(LEGEND_WIDTH, longest + LEGEND_PAD * 2);
}

/** Where the key's bottom hangs from: the top of the scale bar's blocks, a gap above them. */
function legendBottom(bar: ScaleBarPlace): number {
  return bar.captionTop - LEGEND_GAP;
}

function legendRect({ plate, frame }: FurniturePlace, { key, bar }: LegendPlace): Rect {
  const height = legendHeight(plate, key);
  return { x: frame.x + MARGIN, y: legendBottom(bar) - height, width: legendWidth(plate, key), height };
}

/**
 * The marginal key: a heavy head rule with `LEGEND` in capitals under it, then
 * a row for each side, the four states, one per arm the roster keys (ADR-0015)
 * and the three motion styles, each sampling **this view's** own glyph and its
 * own moves, and last a row for every numeral a label showed this frame (#39).
 *
 * Returns the numeral rows' boxes, which are the only rows a click opens
 * anything from (#60).
 */
function drawLegend(place: FurniturePlace, legend: LegendPlace): HitRegion[] {
  const { plate } = place;
  const { ctx, colours, view } = plate;
  const { palette } = view;
  const box = legendRect(place, legend);
  const sample = {
    left: box.x + LEGEND_SAMPLE_INSET,
    width: KEY_SAMPLE_WIDTH,
    scale: KEY_SAMPLE_SCALE,
    arm: legendArm(plate.battle.units),
    firstSide: firstSideInk(colours, palette),
  };

  ctx.save();
  // The corner's paper is the scale bar's, laid once for both (#62); the key
  // adds its own rule and a heavy head over it.
  if (!legend.onPanel) drawPanel(ctx, box, palette);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = LEGEND_RULE;
  ctx.strokeRect(box.x + LEGEND_RULE / 2, box.y + LEGEND_RULE / 2, box.width - LEGEND_RULE, box.height - LEGEND_RULE);
  ctx.lineWidth = LEGEND_HEAD_RULE;
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + LEGEND_HEAD_RULE / 2);
  ctx.lineTo(box.x + box.width, box.y + LEGEND_HEAD_RULE / 2);
  ctx.stroke();

  const line = view.type.role("legendLine", "desktop");
  ctx.fillStyle = palette.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  setRun(ctx, line);
  ctx.fillText(LEGEND_HEAD_WORD, box.x + LEGEND_PAD, box.y + LEGEND_HEAD_BASELINE);

  ctx.save();
  ctx.globalAlpha = LEGEND_UNDER_RULE.alpha;
  ctx.lineWidth = LEGEND_UNDER_RULE.width;
  ctx.beginPath();
  ctx.moveTo(box.x + LEGEND_PAD, box.y + LEGEND_UNDER_RULE.at);
  ctx.lineTo(box.x + box.width - LEGEND_PAD, box.y + LEGEND_UNDER_RULE.at);
  ctx.stroke();
  ctx.restore();

  const textX = sample.left + KEY_SAMPLE_WIDTH + LEGEND_SAMPLE_GAP;
  let rowY = box.y + LEGEND_HEAD_HEIGHT + KEY_ROW_HEIGHT / 2;
  for (const row of [...sideRows(colours), ...plateKeyRows(plate.battle.units)]) {
    drawKeyRowSample(ctx, view, row, { ...sample, centreY: rowY });
    setRun(ctx, line);
    ctx.fillStyle = row.kind === "side" ? row.colour : palette.ink;
    ctx.fillText(line.spell(keyRowLabel(row)), textX, rowY);
    rowY += KEY_ROW_HEIGHT;
  }

  ctx.fillStyle = palette.ink;
  const rows: HitRegion[] = [];
  for (const row of legend.key) {
    setRun(ctx, line);
    ctx.fillText(line.spell(numeralRowText(row)), box.x + LEGEND_PAD, rowY);
    rows.push({ id: row.id, box: { x: box.x, y: rowY - KEY_ROW_HEIGHT / 2, width: box.width, height: KEY_ROW_HEIGHT }, hover: false });
    rowY += KEY_ROW_HEIGHT;
  }
  ctx.letterSpacing = "0px";
  ctx.restore();
  return rows;
}

/** How wide one side's sample and name run together on a phone. */
function stripSideWidth(plate: Plate, side: string, setting: Setting): number {
  return STRIP_SAMPLE + STRIP_SAMPLE_GAP + runWidth(plate.ctx, setting.spell(side), setting);
}

function stripRect({ plate, frame }: FurniturePlace, key: readonly NumeralRow[]): Rect {
  const setting = plate.view.type.role("legendLine", "phone");
  const sides = [...plate.colours.keys()];
  const sidesWidth = sides.reduce((wide, side) => wide + stripSideWidth(plate, side, setting) + STRIP_SIDE_GAP, -STRIP_SIDE_GAP);
  const keyWidth = widestNumeral(plate, key, setting);
  const width = Math.max(sidesWidth, keyWidth) + STRIP_PAD * 2;
  const height = STRIP_ROW + key.length * STRIP_KEY_ROW;
  return {
    x: frame.x + frame.width - STRIP_INSET_X - width,
    y: frame.y + frame.height - STRIP_INSET_Y - height,
    width,
    height,
  };
}

/**
 * The phone's key: one line of the sides, bottom right, opposite the scale bar
 * (#86), with the numeral rows stacked above it — a numeral on the plate is
 * unreadable without the name it stands for, so those stay on the picture.
 */
function drawSideStrip(place: FurniturePlace, legend: LegendPlace): HitRegion[] {
  const { key } = legend;
  const { plate } = place;
  const { ctx, colours, view } = plate;
  const { palette } = view;
  const panel = stripRect(place, key);
  const setting = view.type.role("legendLine", "phone");

  ctx.save();
  if (!legend.onPanel) drawPanel(ctx, panel, palette);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = LEGEND_RULE;
  ctx.strokeRect(panel.x + LEGEND_RULE / 2, panel.y + LEGEND_RULE / 2, panel.width - LEGEND_RULE, panel.height - LEGEND_RULE);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  setRun(ctx, setting);
  ctx.fillStyle = palette.ink;

  const rows: HitRegion[] = [];
  let rowY = panel.y + STRIP_KEY_ROW / 2;
  for (const row of key) {
    ctx.fillText(setting.spell(numeralRowText(row)), panel.x + STRIP_PAD, rowY);
    rows.push({ id: row.id, box: { x: panel.x, y: rowY - STRIP_KEY_ROW / 2, width: panel.width, height: STRIP_KEY_ROW }, hover: false });
    rowY += STRIP_KEY_ROW;
  }

  const sample = {
    width: STRIP_SAMPLE,
    scale: STRIP_SCALE,
    arm: legendArm(plate.battle.units),
    firstSide: firstSideInk(colours, palette),
  };
  let x = panel.x + STRIP_PAD;
  const centreY = panel.y + panel.height - STRIP_ROW / 2;
  for (const row of sideRows(colours)) {
    drawKeyRowSample(ctx, view, row, { ...sample, left: x, centreY });
    setRun(ctx, setting);
    ctx.fillStyle = row.kind === "side" ? row.colour : palette.ink;
    ctx.fillText(setting.spell(keyRowLabel(row)), x + STRIP_SAMPLE + STRIP_SAMPLE_GAP, centreY);
    x += stripSideWidth(plate, keyRowLabel(row), setting) + STRIP_SIDE_GAP;
  }
  ctx.letterSpacing = "0px";
  ctx.restore();
  return rows;
}

/** Both forms of the key lay their own paper, so neither answers the shared half with a panel of its own to fill. */
const FULL_LEGEND: LegendHand = { panel: () => undefined, draw: drawLegend };
const SIDE_STRIP: LegendHand = { panel: (place, legend) => stripRect(place, legend.key), draw: drawSideStrip };
const keyFor = (place: FurniturePlace): LegendHand => (furnitureFor(place.plate.mode).legend === "full" ? FULL_LEGEND : SIDE_STRIP);

/* ------------------------------------------------------------- the whole */

export const staffFurniture: Furniture = {
  /** The neat line: a heavy outer rule with a fine inner one inside it. */
  border(ctx, frame, palette) {
    ctx.save();
    ctx.strokeStyle = palette.ink;
    ctx.lineJoin = "miter";
    for (const { inset, width } of [NEAT_OUTER, NEAT_INNER]) {
      ctx.lineWidth = width;
      ctx.strokeRect(frame.x + inset, frame.y + inset, frame.width - inset * 2, frame.height - inset * 2);
    }
    ctx.restore();
  },

  panel: drawPanel,

  compass: {
    panel: (place) => compassFor(place).panel(place),
    draw: (place) => compassFor(place).draw(place),
  },

  title: {
    /** Paper behind the title, cut to the title's own tracked width. */
    panel({ plate, frame }) {
      const setting = plate.view.type.role("title", plate.mode);
      const width = runWidth(plate.ctx, setting.spell(plate.battle.title), setting) + PANEL_PAD * 2;
      const right = frame.x + frame.width - CORNER_PANEL_INSET;
      return { x: right - width, y: titleTop(frame) - PANEL_LEAD, width, height: setting.size + PANEL_LEAD * 2 };
    },
    /** The battle's title, top right, in tracked capitals. */
    draw(place) {
      const { plate, frame } = place;
      const { ctx, battle, view, mode } = plate;
      ctx.save();
      ctx.fillStyle = view.palette.ink;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      const setting = view.type.role("title", mode);
      setRun(ctx, setting);
      ctx.fillText(setting.spell(battle.title), titleRight(frame), titleTop(frame));
      ctx.letterSpacing = "0px";
      ctx.restore();
    },
  },

  scaleBar: {
    layout({ plate, frame }) {
      const phone = plate.mode === "phone";
      const unit = plate.battle.scale_unit;
      const pixelsPerUnit = METRES_PER_UNIT[unit] * plate.pixelsPerMetre;
      const bar = scaleBarLength({ pixelsPerUnit, maxPixels: Math.max(40, Math.min(180, frame.width / 4)) });
      // The numerals ride *under* this bar, where the engraved caption stands
      // above it, so the bar's own line is lifted clear of the frame's foot.
      const y = frame.y + frame.height - (phone ? PHONE_SCALE_INSET_Y : MARGIN) - BAR_NUMERAL_ROW;
      const setting = plate.view.type.role("scaleCaption", plate.mode);
      // The caption stands at the bar's *end* rather than above it, so on a
      // phone it runs straight into the sides' strip in the opposite corner:
      // there the bar names its unit and the contour interval goes to Details
      // with the rest of the key (#86).
      const interval = phone ? undefined : contourInterval(plate.contourLevels);
      const caption = setting.spell(
        interval === undefined ? UNIT_LABEL[unit].many : `${UNIT_LABEL[unit].many} · contours at ${interval} m`,
      );
      return {
        x: frame.x + (phone ? PHONE_SCALE_INSET_X : MARGIN),
        y,
        bar,
        caption,
        // The topmost ink of the whole assembly: the blocks, which is what the key hangs above.
        captionTop: y - BAR_BLOCK_HEIGHT,
        captionWidth: runWidth(plate.ctx, caption, setting),
      };
    },

    /**
     * One panel behind the key and the bar together on a desktop: they stand in
     * the same corner, and two panels there would show their own seam. A phone's
     * bar stands alone, the sides' strip being in the other corner.
     */
    panel(place, legend) {
      const { plate, frame } = place;
      const { bar, key } = legend;
      const assembly = bar.bar.pixels + BAR_UNIT_GAP + bar.captionWidth;
      if (plate.mode === "phone") {
        const x = frame.x + CORNER_PANEL_INSET;
        const top = bar.captionTop - PANEL_LEAD / 2;
        return { x, y: top, width: bar.x + assembly + PANEL_PAD / 2 - x, height: bar.y + BAR_NUMERAL_ROW + PANEL_LEAD - top };
      }
      const widest = Math.max(legendWidth(plate, key), assembly);
      // The corner panel's own edge, not the bar's inset: a graticule numeral
      // rides in this margin, and a panel that stopped between its digits
      // would cut it in half (`ground.ts`).
      const x = frame.x + CORNER_PANEL_INSET;
      const top = legendBottom(bar) - legendHeight(plate, key) - PANEL_LEAD;
      const cornerBottom = frame.y + frame.height - CORNER_PANEL_INSET;
      return { x, y: top, width: bar.x + widest + PANEL_PAD - x, height: cornerBottom - top };
    },

    /** Alternating filled and hollow blocks, the numerals under the divisions, the unit named at the end. */
    draw(place, { x, y, bar, caption }) {
      const { plate } = place;
      const { ctx, mode, view } = plate;
      const ink = view.palette.ink;

      // A bar of 2 units divides into halves; 1 and 5 divide into fifths.
      const divisions = bar.mantissa === 2 ? 4 : 5;
      const step = bar.pixels / divisions;

      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = BAR_BLOCK_RULE;
      ctx.lineJoin = "miter";
      for (let i = 0; i < divisions; i++) {
        const left = x + i * step;
        if (i % 2 === 0) {
          ctx.fillStyle = ink;
          ctx.fillRect(left, y - BAR_BLOCK_HEIGHT, step, BAR_BLOCK_HEIGHT);
        }
        ctx.strokeRect(left, y - BAR_BLOCK_HEIGHT, step, BAR_BLOCK_HEIGHT);
      }

      const setting = view.type.role("scaleCaption", mode);
      setRun(ctx, setting);
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= divisions; i++) {
        const shown = Number(((bar.units * i) / divisions).toPrecision(12));
        ctx.fillText(String(shown), x + i * step, y + BAR_NUMERAL_DROP);
      }
      ctx.textAlign = "left";
      ctx.fillText(caption, x + bar.pixels + BAR_UNIT_GAP, y - BAR_BLOCK_HEIGHT / 2);
      ctx.letterSpacing = "0px";
      ctx.restore();
    },
  },

  legend: {
    panel: (place, legend) => keyFor(place).panel(place, legend),
    draw: (place, legend) => keyFor(place).draw(place, legend),
  },

  credit: {
    /** Paper behind the credit line, cut to the run it is actually set in, or nothing when the map carries no credit. */
    panel(place) {
      const run = creditRun(place);
      if (run === undefined) return undefined;
      const { frame } = place;
      const width = run.width + PANEL_PAD;
      const right = frame.x + frame.width - CORNER_PANEL_INSET;
      const baseline = creditBaseline(frame);
      return { x: right - width, y: baseline - run.setting.size - 2, width, height: run.setting.size + PANEL_LEAD };
    },
    /** The map file's attribution, bottom right, in capitals (ADR-0007). */
    draw(place) {
      const run = creditRun(place);
      if (run === undefined) return;
      const { ctx, view } = place.plate;
      ctx.save();
      ctx.fillStyle = view.palette.ink;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      setRun(ctx, run.setting);
      ctx.fillText(run.text, creditRight(place.frame), creditBaseline(place.frame));
      ctx.letterSpacing = "0px";
      ctx.restore();
    },
  },

  caption: staffCaption,
};
