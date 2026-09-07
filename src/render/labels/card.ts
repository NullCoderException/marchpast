/**
 * The unit card: the label unfolded (#60, #84). What one card says and the
 * panel those words occupy — both pure, so the placer can put a card on the
 * plate and a test can read one without a canvas.
 *
 * Content, top to bottom and nothing else:
 *
 *   1. the full `label` and, when the roster names one, the `commander`, in
 *      the label's own italic and the label's own side ink;
 *   2. one upright facts line: the arm word, the formation word, the state
 *      word and strength as a percentage;
 *   3. the tree (ADR-0017): `of <parent label>` on a child's card, and a row
 *      per child with its state word on a parent's, so a column's card at
 *      Trafalgar reads as a squadron roll.
 *
 * Never a caption, a move, a count, or a position or heading number: the card
 * shows what the plate draws plus the three things the plate has no room for —
 * the commander, the arm and formation as words, and the tree.
 *
 * The children's state words come from the **picture**, not from the level's
 * slice of it: every roster unit has a snapshot in every phase, drawn or not
 * (schema.md 2.9), which is the whole reason a column's card can name the
 * state of squadrons this level never puts on the plate.
 *
 * The panel is measured from the very point the label hangs from — its first
 * line sits exactly where the label's name would — so opening a card is the
 * label unfolding rather than a second thing appearing.
 */
import type { Unit } from "../../schema/types.ts";
import type { UnitPicture } from "../../timeline/picture.ts";
import type { Point } from "../primitives.ts";
import type { Rect } from "../projection.ts";
import { type Align, type Measure, NAME_RISE, NAME_SIZE } from "./content.ts";
import { boxSetback } from "./geometry.ts";

/** Gap between the panel's rule and the words inside it. */
export const CARD_PAD = 10;
/** The commander, a shade under the name it belongs to. */
const COMMANDER_SIZE = 13;
/** The facts line and the tree: upright, and the label's own detail size. */
const CARD_TEXT_SIZE = 12;
/** Space under a line before the next one's cap. */
const LINE_LEAD = 4;
/** Extra space between the card's three parts, which is all that separates them: a card carries no inner rule. */
const GROUP_GAP = 6;
/**
 * How far the panel's top edge sits above the point the label hangs from. It
 * is the padding plus half the name's own size plus the rise the label's name
 * already takes, so the card's first line lands on the label's first line and
 * the card reads as that label unfolding.
 */
export const CARD_RISE = CARD_PAD + NAME_SIZE / 2 + NAME_RISE;

/** What one card says, in the order it says it. */
export interface CardContent {
  /** The roster id of the unit the card is open on. */
  id: string;
  /** The unit's full `label`. */
  name: string;
  /** The `commander`, when the roster names one. */
  commander?: string;
  /** The upright facts line: arm, formation, state and strength as a percentage. */
  facts: string;
  /** `of <parent>` for a child and a row per child for a parent, in roster order. Empty for a unit with neither. */
  tree: string[];
}

/** One line of the card, with the ink and the face it takes and where it sits inside the panel. */
export interface CardLine {
  text: string;
  size: number;
  italic: boolean;
  /** The unit's own side ink rather than the palette's: the name alone takes it, exactly as the label's does. */
  side: boolean;
  /** The line's middle, measured down from the panel's top edge. */
  y: number;
}

/** The panel one card's content fills, and every line placed inside it. */
export interface CardLayout {
  content: CardContent;
  width: number;
  height: number;
  lines: CardLine[];
}

/**
 * The card for one unit, or nothing when the roster does not hold it or the
 * picture has no snapshot of it. Pure: it reads the roster and the picture and
 * touches neither the canvas nor the level.
 */
export function cardContent(roster: readonly Unit[], units: readonly UnitPicture[], id: string): CardContent | undefined {
  const entry = roster.find((unit) => unit.id === id);
  const snapshot = units.find((unit) => unit.id === id);
  if (entry === undefined || snapshot === undefined) return undefined;

  const content: CardContent = {
    id,
    name: entry.label,
    facts: [entry.arm, snapshot.formation, snapshot.state, `${Math.round(snapshot.strength * 100)}%`].join(" · "),
    tree: treeLines(roster, units, entry),
  };
  if (entry.commander !== undefined) content.commander = entry.commander;
  return content;
}

/**
 * The tree part: the parent named first when the unit has one, then every
 * child with its state word. A unit in the middle of a deeper tree says both,
 * which is the only reading of "its parent or children" that does not lose a
 * fact the card was asked for.
 */
function treeLines(roster: readonly Unit[], units: readonly UnitPicture[], entry: Unit): string[] {
  const lines: string[] = [];
  const parent = entry.parent === undefined ? undefined : roster.find((unit) => unit.id === entry.parent);
  if (parent !== undefined) lines.push(`of ${parent.label}`);

  for (const child of roster.filter((unit) => unit.parent === entry.id)) {
    const state = units.find((unit) => unit.id === child.id)?.state;
    lines.push(state === undefined ? child.label : `${child.label} · ${state}`);
  }
  return lines;
}

/** The panel the content fills and where each line sits in it, measured with the plate's own face. */
export function layoutCard(content: CardContent, measure: Measure): CardLayout {
  const groups: { text: string; size: number; italic: boolean; side: boolean }[][] = [
    [
      { text: content.name, size: NAME_SIZE, italic: true, side: true },
      ...(content.commander === undefined ? [] : [{ text: content.commander, size: COMMANDER_SIZE, italic: true, side: false }]),
    ],
    [{ text: content.facts, size: CARD_TEXT_SIZE, italic: false, side: false }],
    content.tree.map((text) => ({ text, size: CARD_TEXT_SIZE, italic: false, side: false })),
  ];

  const lines: CardLine[] = [];
  let width = 0;
  let y = CARD_PAD;
  for (const group of groups) {
    if (group.length === 0) continue;
    if (lines.length > 0) y += GROUP_GAP;
    for (const line of group) {
      y += line.size / 2;
      lines.push({ ...line, y });
      y += line.size / 2 + LINE_LEAD;
      width = Math.max(width, measure(line.text, line.size, line.italic));
    }
  }

  return { content, width: width + CARD_PAD * 2, height: y - LINE_LEAD + CARD_PAD, lines };
}

/** The panel's box around the point the label hangs from, on whichever side of it the label runs. */
export function cardBox(at: Point, align: Align, layout: CardLayout): Rect {
  return {
    x: align === "left" ? at.x : at.x - layout.width,
    y: at.y - CARD_RISE,
    width: layout.width,
    height: layout.height,
  };
}

/** How much further out the anchor must go for the panel's near edge — not its anchor — to stand its clearance off the glyph. */
export function cardSetback(align: Align, layout: CardLayout, angle: number): number {
  return boxSetback(
    {
      left: align === "left" ? 0 : -layout.width,
      right: align === "left" ? layout.width : 0,
      top: -CARD_RISE,
      bottom: layout.height - CARD_RISE,
    },
    angle,
  );
}
