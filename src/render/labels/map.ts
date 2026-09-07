/**
 * The map label placer (#107): where a place's and a work's name stand.
 *
 * Until #107 both were written at a fixed offset to the right of their point
 * with no collision model at all, so any two named points closer than a
 * label's width were drawn one on top of the other — Nelson's Island and its
 * battery, four pixels apart at the Nile's extent, being the case that forced
 * this. The unit labels got a sticky search in #39/#102; this is the same idea
 * at the size a map label needs, and no more.
 *
 * The differences from the unit pass are deliberate. A map label has **no
 * memory**: a named point does not move from frame to frame, so its slot never
 * jitters and there is nothing to be sticky about. It has **no collapse**: a
 * place name is one word of ground truth and there is no shorter form of it in
 * the map file, so a name that can stand nowhere is dropped whole and the dot
 * or plan sign on its point is left to speak for it. And it takes **six slots and no ring**: a name
 * belongs to its point, and a name walked out to 104 px is a name attached to
 * the wrong thing.
 *
 * Pure geometry over boxes — the measuring is done by `drawMap`, which is the
 * only place that knows the faces the two kinds are set in — so the whole
 * search is unit-testable without a canvas.
 */
import { insidePlate, overlaps, touches } from "./geometry.ts";
import type { Point } from "../primitives.ts";
import type { Rect } from "../projection.ts";

/**
 * The two named feature kinds (schema.md 3.5). Carried through so the drawing
 * pass can set the right face. It stays a pair as the map file grows kinds: a
 * rampart is nameless like a river, and one a caption must name gets a `place`
 * on it, so nothing new ever reaches the placer (ADR-0026, #167).
 */
export type MapLabelKind = "place" | "work";

/**
 * The six slots, in the order they are tried: abeam to the right — where every
 * map label has stood since v1, so a plate with nothing in the way is drawn
 * exactly as it was — then abeam to the left, then the four quadrants, right
 * before left and above before below.
 */
export type MapLabelSlot = "E" | "W" | "NE" | "NW" | "SE" | "SW";
export const MAP_LABEL_SLOTS: readonly MapLabelSlot[] = ["E", "W", "NE", "NW", "SE", "SW"];

/** Clearance above or below the footprint for a quadrant slot; abeam, the point's own `gap` is the clearance. */
const QUADRANT_GAP = 3;

/** Which side of the point a slot's words run, and where they sit against it. Said once, so `build` decides nothing. */
const SLOT_SIDES: Readonly<Record<MapLabelSlot, { align: "left" | "right"; from: "abeam" | "above" | "below" }>> = {
  E: { align: "left", from: "abeam" },
  W: { align: "right", from: "abeam" },
  NE: { align: "left", from: "above" },
  NW: { align: "right", from: "above" },
  SE: { align: "left", from: "below" },
  SW: { align: "right", from: "below" },
};

/** One named point as the placer sees it, measured and projected by `drawMap`. */
export interface MapPoint {
  kind: MapLabelKind;
  /** The name as it is drawn: a work's is already in capitals. */
  text: string;
  /** The point itself, in canvas pixels. */
  at: Point;
  /** The box the thing drawn on the point occupies: the place's dot, or the work's plan sign. */
  footprint: Rect;
  /** The name's width in the face it is set in, tracking included. */
  width: number;
  /** The name's height: the box it is judged by, centred on the middle it is drawn on. */
  height: number;
  /** How far the near edge stands off the point in the two abeam slots. */
  gap: number;
}

/** One name, placed. */
export interface MapLabel {
  point: MapPoint;
  slot: MapLabelSlot;
  /** Where the words hang: the align edge, on the middle the name is drawn on. */
  at: Point;
  align: "left" | "right";
  box: Rect;
}

export interface MapLabelOptions {
  /** Every named point, in the map file's own order, which is the priority order. */
  points: readonly MapPoint[];
  /** The plate rectangle; no name may leave it. */
  plate: Rect;
  /** The furniture, and anything else hard that is not a footprint. */
  obstacles: readonly Rect[];
}

/**
 * Every name that could be placed, in the order its point came in. A name with
 * no free slot is left out: the caller draws every point's dot or sign whatever
 * this says, so what a crowded plate loses is the word and never the thing.
 */
export function placeMapLabels({ points, plate, obstacles }: MapLabelOptions): MapLabel[] {
  const footprints = points.map((point) => point.footprint);
  const taken: Rect[] = [];
  const labels: MapLabel[] = [];

  for (const point of points) {
    const free = (box: Rect): boolean => {
      if (!insidePlate(box, plate)) return false;
      // A footprint is the one thing judged without slack, for the reason
      // `touches` gives: a name stands off its own point by less than the pad.
      if (footprints.some((footprint) => touches(box, footprint))) return false;
      if (taken.some((other) => overlaps(box, other))) return false;
      return !obstacles.some((other) => overlaps(box, other));
    };

    const label = MAP_LABEL_SLOTS.map((slot) => build(point, slot)).find(({ box }) => free(box));
    if (label === undefined) continue;
    taken.push(label.box);
    labels.push(label);
  }

  return labels;
}

/** The name as it would stand in one slot. */
function build(point: MapPoint, slot: MapLabelSlot): MapLabel {
  const { at, footprint, width, height, gap } = point;
  const { align, from } = SLOT_SIDES[slot];
  // Abeam, the name hangs off the point by the gap and on its own middle. In a
  // quadrant it starts at the point and clears the footprint above or below,
  // which is what puts two names on one island on two lines rather than one.
  const x = from === "abeam" ? at.x + (align === "left" ? gap : -gap) : at.x;
  const y =
    from === "abeam"
      ? at.y
      : from === "above"
        ? footprint.y - QUADRANT_GAP - height / 2
        : footprint.y + footprint.height + QUADRANT_GAP + height / 2;
  return {
    point,
    slot,
    at: { x, y },
    align,
    box: { x: align === "left" ? x : x - width, y: y - height / 2, width, height },
  };
}
