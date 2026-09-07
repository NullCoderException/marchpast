/**
 * The engraved views' furniture (ADR-0005, ADR-0009): the plate's double edge
 * rule, the compass rose with the wind blowing across it, the battle title,
 * the scale bar, the always-on legend, and the map's credit line.
 *
 * The set and the corner each piece anchors to are the anatomy's, and so is
 * the order they are drawn in; every mark here is this aesthetic's (ADR-0021).
 * What the *width* changes is a third question, answered once in `layout.ts`
 * (#86): on a phone the set thins — the title goes to the caption band's date
 * line, the rose becomes a north arrow with the wind sentence beside it, the
 * legend becomes a one-line strip of the sides, and the credit goes to
 * Details. The scale bar is the one piece that never goes.
 *
 * Every piece answers with the **panel** it stands on as well as with ink,
 * because that rectangle is two things at once: the paper a plate with relief
 * under this corner lays first (#62), and the obstacle a label has to clear
 * (#39). One rectangle, so the ink and the obstacle can never disagree — and
 * on a desktop the legend answers with none, because it stands on the scale
 * bar's corner panel and two panels there would show their own seam.
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
import { drawPlateRule, type Point } from "../../primitives.ts";
import type { Rect } from "../../projection.ts";
import { toRadians } from "../../projection.ts";
import { contourInterval } from "../../relief.ts";
import { METRES_PER_UNIT, scaleBarCaption, scaleBarLength } from "../../scaleBar.ts";
import { compassPoint } from "../../text.ts";
import type { Furniture, FurniturePlace, LegendPlace, Palette, ScaleBarPlace } from "../../view.ts";
import { engravedCaption } from "./caption.ts";
import { engravedType, font } from "./type.ts";

/** Feathers on the wind arrow's tail: none at calm, one for light through four for gale (ADR-0008). */
const FEATHERS: Readonly<Record<WindForce, number>> = { calm: 0, light: 1, moderate: 2, fresh: 3, gale: 4 };

const ROSE_RADIUS = 30;
/** Inset of the bottom-left furniture from the frame's edge. */
const MARGIN = 26;
/** Gap between the scale bar's caption and the bar, and between the caption and the legend above it. */
const SCALE_BAR_LABEL_GAP = 8;
const SCALE_BAR_LABEL_HEIGHT = 14;
const LEGEND_GAP = 14;

/** The paper a piece of furniture is given to sit on where relief runs under it: how far the panel stands off the ink. */
const PANEL_PAD = 12;
/** Inset of the rose's panel from the frame's corner, and how deep it stands: the wind arrow's tail reaches past the rose. */
const ROSE_PANEL_INSET = 14;
const ROSE_PANEL_HEIGHT = 128;
/** The rose's panel is never narrower than this, so a calm plate's panel is the same shape as a windy one's. */
const ROSE_PANEL_MIN_WIDTH = 236;
/** Inset of the title's and the credit's panels from the frame's edge: less than the ink's own, so the paper reads as a panel. */
const CORNER_PANEL_INSET = 10;
/** How far a panel stands above and below the line of type it carries. */
const PANEL_LEAD = 6;

/** How wide a line of type runs in a font, without disturbing what the caller had set. */
function textWidth(ctx: CanvasRenderingContext2D, text: string, face: string): number {
  ctx.save();
  ctx.font = face;
  const { width } = ctx.measureText(text);
  ctx.restore();
  return width;
}

/* --------------------------------------------------------------- compass */

/** Where the rose stands, and where the wind sentence starts beside it: the panel and the drawing have to agree. */
const WIND_TEXT_SIZE = 13;
const ROSE_LETTER_SIZE = 13;
const roseCentre = (frame: Rect): Point => ({ x: frame.x + 74, y: frame.y + 78 });
const windTextLeft = (frame: Rect): number => roseCentre(frame).x + ROSE_RADIUS + 34;
const windTextTop = (frame: Rect): number => roseCentre(frame).y - 8;

/**
 * The phone's compass: a north needle with its letter, and the wind as a
 * sentence beside it rather than an arrow across a rose (#86). The rose's
 * sixteen points and its feathered arrow need room a 390px plate has not got,
 * and what they say — which way is north, where the wind blows from and how
 * hard — these two say in a fifth of the width.
 */
const ARROW_N_SIZE = 10;
const ARROW_TEXT_SIZE = 11;
const arrowCentre = (frame: Rect): Point => ({ x: frame.x + 22, y: frame.y + 34 });
const arrowTextLeft = (frame: Rect): number => frame.x + 36;

/** The wind as the rose writes it, or `undefined` when the battle does not track wind. */
function windText(wind: Wind | undefined): string | undefined {
  if (wind === undefined) return undefined;
  return wind.force === "calm" || wind.from === undefined ? "Wind calm" : `Wind ${compassPoint(wind.from)}, ${wind.force}`;
}

/**
 * Paper behind the rose and its wind sentence. Deep enough for the wind
 * arrow's tail, which reaches further than the rose itself, and wide enough
 * for whatever the sentence says.
 */
function rosePanel({ plate: { ctx, picture }, frame }: FurniturePlace): Rect {
  const x = frame.x + ROSE_PANEL_INSET;
  const y = frame.y + ROSE_PANEL_INSET;
  const text = windText(picture.wind);
  const sentenceRight = text === undefined ? 0 : windTextLeft(frame) + textWidth(ctx, text, font(WIND_TEXT_SIZE, true)) + PANEL_PAD;
  const right = Math.max(x + ROSE_PANEL_MIN_WIDTH, sentenceRight);
  return { x, y, width: right - x, height: ROSE_PANEL_HEIGHT };
}

/** Paper behind the north arrow and its wind sentence, cut to whatever the sentence says. */
function arrowPanel({ plate: { ctx, picture }, frame }: FurniturePlace): Rect {
  const text = windText(picture.wind);
  const x = frame.x + 8;
  const sentenceRight = text === undefined ? 0 : arrowTextLeft(frame) + textWidth(ctx, text, font(ARROW_TEXT_SIZE, true)) + PANEL_PAD;
  const right = Math.max(x + 40, sentenceRight);
  return { x, y: frame.y + 4, width: right - x, height: 40 };
}

function drawCompassRose({ plate, frame }: FurniturePlace): void {
  const { ctx } = plate;
  const wind = plate.picture.wind;
  const ink = plate.view.palette.ink;
  const { x: cx, y: cy } = roseCentre(frame);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, ROSE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(0, -ROSE_RADIUS);
    ctx.lineTo(0, i % 4 === 0 ? -20 : -25);
    ctx.stroke();
    ctx.rotate(Math.PI / 8);
  }
  ctx.restore();
  // The north needle.
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(4, -8);
  ctx.lineTo(0, 0);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();
  ctx.font = font(ROSE_LETTER_SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", 0, -46);

  // The wind as a pen arrow blowing across the rose: it points where the wind goes, so flip `from`.
  if (wind !== undefined && wind.force !== "calm" && wind.from !== undefined) {
    ctx.rotate(toRadians(wind.from + 180));
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    const tail = ROSE_RADIUS + 26;
    const head = -(ROSE_RADIUS + 14);
    ctx.beginPath();
    ctx.moveTo(0, tail);
    ctx.lineTo(0, head);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, head + 8);
    ctx.lineTo(0, head);
    ctx.lineTo(5, head + 8);
    ctx.stroke();
    for (let i = 0; i < FEATHERS[wind.force]; i++) {
      ctx.beginPath();
      ctx.moveTo(0, tail - 2 - i * 6);
      ctx.lineTo(-8, tail + 3 - i * 6);
      ctx.stroke();
    }
  }
  ctx.restore();

  const text = windText(wind);
  if (text !== undefined) {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.font = font(WIND_TEXT_SIZE, true);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, windTextLeft(frame), windTextTop(frame));
    ctx.restore();
  }
}

function drawNorthArrow({ plate, frame }: FurniturePlace): void {
  const { ctx } = plate;
  const wind = plate.picture.wind;
  const ink = plate.view.palette.ink;
  const { x: cx, y: cy } = arrowCentre(frame);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(3, 4);
  ctx.lineTo(0, 0);
  ctx.lineTo(-3, 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = font(ARROW_N_SIZE);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", 0, -16);
  ctx.restore();

  const text = windText(wind);
  if (text === undefined) return;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.font = font(ARROW_TEXT_SIZE, true);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, arrowTextLeft(frame), cy - 2);
  ctx.restore();
}

/* ----------------------------------------------------------------- title */

/** Where the title's right edge sits and where its cap-line starts: the panel and the drawing have to agree. */
const titleRight = (frame: Rect): number => frame.x + frame.width - 22;
const titleTop = (frame: Rect): number => frame.y + 18;

/* ---------------------------------------------------------------- credit */

const creditRight = (frame: Rect): number => frame.x + frame.width - 14;
const creditBaseline = (frame: Rect): number => frame.y + frame.height - 12;

/* ---------------------------------------------------------------- legend */

const LEGEND_WIDTH = 168;
/** Gap between the legend's edge and what it carries. */
const LEGEND_PAD = 12;

/** One row of the numeral key: the numeral the plate showed, and the name it stood in for. */
function numeralRowText(row: NumeralRow): string {
  return `${row.numeral} · ${row.label}`;
}

/** The same in pixels, padding and all: the panel a land plate lays under the legend has to know before either is drawn. */
function legendHeight(plate: Plate, key: readonly NumeralRow[]): number {
  return keyRowCount(plate.colours.size, legendArms(plate.battle.units), key.length) * KEY_ROW_HEIGHT + 16;
}

/** How wide the legend stands: its own width, or wider when the numeral key has a longer name to carry (#39). */
function legendWidth(plate: Plate, key: readonly NumeralRow[]): number {
  const face = engravedType.role("legendLine", "desktop").font;
  const longest = key.reduce((wide, row) => Math.max(wide, textWidth(plate.ctx, numeralRowText(row), face)), 0);
  return Math.max(LEGEND_WIDTH, longest + LEGEND_PAD * 2);
}


/** Where the legend's bottom hangs from: the top of the scale bar's caption, a gap above it. */
function legendBottom(bar: ScaleBarPlace): number {
  return bar.captionTop - LEGEND_GAP;
}

/** The legend's own rectangle on a desktop: what it rules, and what the corner's panel has to cover. */
function legendRect({ plate, frame }: FurniturePlace, { key, bar }: LegendPlace): Rect {
  const height = legendHeight(plate, key);
  return { x: frame.x + MARGIN, y: legendBottom(bar) - height, width: legendWidth(plate, key), height };
}

/**
 * The phone's legend: one line of the sides, bottom right, opposite the scale
 * bar (#86). Everything else the legend keys — the states, the arms, the line
 * styles — is in the Details panel, which is where a reader who wants the
 * whole key goes. The numeral key is not one of those: a numeral on the plate
 * is unreadable without the name it stands for, so its rows stay here, stacked
 * above the sides, and on the frames where no label has collapsed that far the
 * strip is the one line the board draws.
 */
const STRIP_ROW = 18;
const STRIP_KEY_ROW = 14;
const STRIP_SAMPLE = 16;
const STRIP_SCALE = 0.45;
/** Between a side's sample and its name, and between one side's name and the next side's sample. */
const STRIP_SAMPLE_GAP = 4;
const STRIP_SIDE_GAP = 16;
const STRIP_PAD = 6;
/** How far the strip stands off the frame's bottom-right corner. */
const STRIP_INSET_X = 6;
const STRIP_INSET_Y = 12;

/** How wide one side's sample and name run together. */
function stripSideWidth(plate: Plate, side: string): number {
  return STRIP_SAMPLE + STRIP_SAMPLE_GAP + textWidth(plate.ctx, side, engravedType.role("legendLine", "phone").font);
}

/** The strip's own rectangle, which is both the paper it is drawn on and the obstacle a label clears. */
function stripRect({ plate, frame }: FurniturePlace, key: readonly NumeralRow[]): Rect {
  const face = engravedType.role("legendLine", "phone").font;
  const sides = [...plate.colours.keys()];
  const sidesWidth = sides.reduce((wide, side) => wide + stripSideWidth(plate, side) + STRIP_SIDE_GAP, -STRIP_SIDE_GAP);
  const keyWidth = key.reduce((wide, row) => Math.max(wide, textWidth(plate.ctx, numeralRowText(row), face)), 0);
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
 * The always-on legend: each side's colour and name, the four state glyphs, one
 * row per arm when the roster has two or more (ADR-0015), the three line
 * styles, and a row for every numeral a label showed this frame (#39).
 *
 * `onPanel` says a land plate has already laid paper under this corner, so the
 * legend draws its rule and not a second ground: the panel is the paper at .92
 * once, not twice over (#62).
 *
 * Returns the numeral rows' boxes, which are the only rows a click opens
 * anything from: the side, state, arm and line rows do nothing (#60).
 */
function drawLegend(place: FurniturePlace, legend: LegendPlace): HitRegion[] {
  const { plate, frame } = place;
  const { ctx, colours, view } = plate;
  const { palette } = view;
  const { key, onPanel } = legend;
  const sample = {
    left: frame.x + MARGIN + 12,
    width: KEY_SAMPLE_WIDTH,
    scale: KEY_SAMPLE_SCALE,
    // Trafalgar is all ships, so it keys no arm and its legend is unchanged.
    arm: legendArm(plate.battle.units),
    firstSide: colours.values().next().value ?? palette.ink,
  };
  const { x, y, width, height } = legendRect(place, legend);

  ctx.save();
  if (!onPanel) {
    ctx.fillStyle = palette.panel;
    ctx.fillRect(x, y, width, height);
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = engravedType.role("legendLine", "desktop").font;
  const textX = x + 12 + KEY_SAMPLE_WIDTH + 10;
  let rowY = y + 8 + KEY_ROW_HEIGHT / 2;

  for (const row of [...sideRows(colours), ...plateKeyRows(plate.battle.units)]) {
    drawKeyRowSample(ctx, view, row, { ...sample, centreY: rowY });
    ctx.fillStyle = row.kind === "side" ? row.colour : palette.ink;
    ctx.fillText(keyRowLabel(row), textX, rowY);
    rowY += KEY_ROW_HEIGHT;
  }

  // The numeral key: what a label that has collapsed all the way stands for.
  // Nothing is drawn when no label showed a numeral this frame (#39).
  ctx.fillStyle = palette.ink;
  const rows: HitRegion[] = [];
  for (const row of key) {
    ctx.fillText(numeralRowText(row), x + LEGEND_PAD, rowY);
    rows.push({ id: row.id, box: { x, y: rowY - KEY_ROW_HEIGHT / 2, width, height: KEY_ROW_HEIGHT }, hover: false });
    rowY += KEY_ROW_HEIGHT;
  }
  ctx.restore();
  return rows;
}

/**
 * The phone's strip. Returns its numeral rows' boxes, as the desktop legend
 * returns its own: a click on one opens that unit's card, which is what
 * rescues a label that has collapsed all the way (#60), and a phone collapses
 * that far far more often.
 */
function drawSideStrip(place: FurniturePlace, { key, onPanel }: LegendPlace): HitRegion[] {
  const { plate } = place;
  const { ctx, colours, view } = plate;
  const { palette } = view;
  const panel = stripRect(place, key);

  ctx.save();
  if (!onPanel) {
    ctx.fillStyle = palette.panel;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  }
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.width - 1, panel.height - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = engravedType.role("legendLine", "phone").font;

  // The numeral key first, stacked above the sides: the strip grows upward, so
  // the line of sides stays where it is however many numerals a frame shows.
  ctx.fillStyle = palette.ink;
  const rows: HitRegion[] = [];
  let rowY = panel.y + STRIP_KEY_ROW / 2;
  for (const row of key) {
    ctx.fillText(numeralRowText(row), panel.x + STRIP_PAD, rowY);
    rows.push({ id: row.id, box: { x: panel.x, y: rowY - STRIP_KEY_ROW / 2, width: panel.width, height: STRIP_KEY_ROW }, hover: false });
    rowY += STRIP_KEY_ROW;
  }

  const sample = {
    width: STRIP_SAMPLE,
    scale: STRIP_SCALE,
    arm: legendArm(plate.battle.units),
    firstSide: colours.values().next().value ?? palette.ink,
  };
  let x = panel.x + STRIP_PAD;
  const centreY = panel.y + panel.height - STRIP_ROW / 2;
  for (const row of sideRows(colours)) {
    drawKeyRowSample(ctx, view, row, { ...sample, left: x, centreY });
    ctx.fillStyle = row.kind === "side" ? row.colour : palette.ink;
    ctx.fillText(keyRowLabel(row), x + STRIP_SAMPLE + STRIP_SAMPLE_GAP, centreY);
    x += stripSideWidth(plate, keyRowLabel(row)) + STRIP_SIDE_GAP;
  }
  ctx.restore();
  return rows;
}

/* ------------------------------------------------------------- scale bar */

/** The phone's scale bar sits closer in than a desktop's: the corner it is in is a band, not a margin. */
const PHONE_SCALE_INSET_X = 14;
const PHONE_SCALE_INSET_Y = 17;

/* ------------------------------------------------------------- the whole */

export const engravedFurniture: Furniture = {
  /**
   * A double rule at the frame's edge. On a desktop that is the extent's edge,
   * where the letterbox begins; on a phone it is the plate area, so the rule
   * encloses the furniture that stands in the letterbox beside the picture.
   */
  border(ctx, frame, palette) {
    drawPlateRule(ctx, frame, palette.ink);
  },

  /** Paper under a piece the ground runs beneath. Filled and never ruled (#62). */
  panel(ctx, box, palette: Palette) {
    ctx.save();
    ctx.fillStyle = palette.panel;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.restore();
  },

  compass: {
    panel: (place) => (furnitureFor(place.plate.mode).compass === "rose" ? rosePanel(place) : arrowPanel(place)),
    draw: (place) => {
      if (furnitureFor(place.plate.mode).compass === "rose") drawCompassRose(place);
      else drawNorthArrow(place);
    },
  },

  title: {
    /** Paper behind the title, cut to the title's own width. */
    panel({ plate, frame }) {
      const { font: face, size } = engravedType.role("title", plate.mode);
      const width = textWidth(plate.ctx, plate.battle.title, face) + PANEL_PAD * 2;
      const right = frame.x + frame.width - CORNER_PANEL_INSET;
      return { x: right - width, y: titleTop(frame) - PANEL_LEAD, width, height: size + PANEL_LEAD * 2 };
    },
    /** The battle's title, top right, as the plate's cartouche. */
    draw({ plate: { ctx, battle, view, mode }, frame }) {
      ctx.save();
      ctx.fillStyle = view.palette.ink;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.font = engravedType.role("title", mode).font;
      ctx.fillText(battle.title, titleRight(frame), titleTop(frame));
      ctx.restore();
    },
  },

  scaleBar: {
    layout({ plate, frame }) {
      const phone = plate.mode === "phone";
      const unit = plate.battle.scale_unit;
      const pixelsPerUnit = METRES_PER_UNIT[unit] * plate.pixelsPerMetre;
      const bar = scaleBarLength({ pixelsPerUnit, maxPixels: Math.max(40, Math.min(180, frame.width / 4)) });
      const y = frame.y + frame.height - (phone ? PHONE_SCALE_INSET_Y : MARGIN);
      const { font: face, size } = engravedType.role("scaleCaption", plate.mode);
      const caption = scaleBarCaption({ units: bar.units, unit, contourInterval: contourInterval(plate.contourLevels) });
      return {
        x: frame.x + (phone ? PHONE_SCALE_INSET_X : MARGIN),
        y,
        bar,
        caption,
        captionTop: y - SCALE_BAR_LABEL_GAP - (phone ? size + 2 : SCALE_BAR_LABEL_HEIGHT),
        captionWidth: textWidth(plate.ctx, caption, face),
      };
    },

    /**
     * One panel behind the legend and the scale bar together on a desktop: they
     * stand in the same corner, and two panels there would show their own seam.
     * A phone's bar stands alone, the sides' strip being in the other corner.
     */
    panel(place, legend) {
      const { plate, frame } = place;
      const { bar, key } = legend;
      if (plate.mode === "phone") {
        const widest = Math.max(bar.bar.pixels, bar.captionWidth);
        const x = bar.x - PANEL_PAD / 2;
        const top = bar.captionTop - PANEL_LEAD / 2;
        return { x, y: top, width: bar.x + widest + PANEL_PAD / 2 - x, height: bar.y + 7 - top };
      }
      const widest = Math.max(legendWidth(plate, key), bar.bar.pixels, bar.captionWidth);
      const x = bar.x - PANEL_PAD;
      const top = legendBottom(bar) - legendHeight(plate, key) - PANEL_LEAD;
      // Down to the same corner inset the title's and the credit's panels take, which clears the bar's end ticks.
      const cornerBottom = frame.y + frame.height - CORNER_PANEL_INSET;
      return { x, y: top, width: bar.x + widest + PANEL_PAD - x, height: cornerBottom - top };
    },

    /** The bar, bottom left, in the battle's unit, captioned with the contour interval when the map has relief. */
    draw({ plate }, { x, y, bar, caption }) {
      const { ctx, mode } = plate;
      const ink = plate.view.palette.ink;

      ctx.save();
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + bar.pixels, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.moveTo(x + bar.pixels, y - 5);
      ctx.lineTo(x + bar.pixels, y + 5);
      ctx.stroke();
      // A bar of 2 units divides into halves; 1 and 5 divide into fifths.
      const divisions = bar.mantissa === 2 ? 4 : 5;
      for (let i = 1; i < divisions; i++) {
        const tx = x + (bar.pixels * i) / divisions;
        ctx.beginPath();
        ctx.moveTo(tx, y - 3);
        ctx.lineTo(tx, y + 3);
        ctx.stroke();
      }
      ctx.font = engravedType.role("scaleCaption", mode).font;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(caption, x, y - SCALE_BAR_LABEL_GAP);
      ctx.restore();
    },
  },

  legend: {
    /** A phone's strip lays its own paper; a desktop's legend stands on the scale bar's corner panel. */
    panel(place, legend) {
      return furnitureFor(place.plate.mode).legend === "full" ? undefined : stripRect(place, legend.key);
    },
    draw(place, legend) {
      return furnitureFor(place.plate.mode).legend === "full" ? drawLegend(place, legend) : drawSideStrip(place, legend);
    },
  },

  credit: {
    /** Paper behind the credit line, or nothing when the map carries no credit to draw. */
    panel({ plate, frame }) {
      const credit = plate.map?.attribution;
      if (credit === undefined || credit === "") return undefined;
      const { font: face, size } = engravedType.role("credit", plate.mode);
      const width = textWidth(plate.ctx, credit, face) + PANEL_PAD;
      const right = frame.x + frame.width - CORNER_PANEL_INSET;
      const baseline = creditBaseline(frame);
      // The credit sits on its baseline, so its panel hangs from the cap-line above it.
      return { x: right - width, y: baseline - size - 2, width, height: size + PANEL_LEAD };
    },
    /** The map file's attribution, bottom right, whenever a map is loaded and has one (ADR-0007). */
    draw({ plate: { ctx, map, view, mode }, frame }) {
      const credit = map?.attribution;
      if (credit === undefined || credit === "") return;
      ctx.save();
      ctx.fillStyle = view.palette.ink;
      ctx.font = engravedType.role("credit", mode).font;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(credit, creditRight(frame), creditBaseline(frame));
      ctx.restore();
    },
  },

  caption: engravedCaption,
};
