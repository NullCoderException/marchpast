/**
 * The unit card's content and its panel (#60, #84): the three parts it
 * carries, in order, and nothing else; and the box those lines occupy around
 * the very point the label hangs from, so opening a card is the label
 * unfolding rather than a second thing appearing.
 */
import { describe, expect, it } from "vitest";
import { cardBox, cardContent, CARD_PAD, CARD_RISE, layoutCard } from "./card.ts";
import { NAME_RISE } from "./content.ts";
import type { Measure } from "./content.ts";
import type { Unit } from "../../schema/types.ts";
import type { UnitPicture } from "../../timeline/picture.ts";

/** A measurer with no canvas: every glyph a half of its point size wide. */
const measure: Measure = (text, size) => text.length * size * 0.5;

/** A column with two squadrons under it, and a root with none: a parent, two children and a unit with neither. */
const ROSTER: Unit[] = [
  { id: "weather", side: "British", label: "Weather column", commander: "Nelson", arm: "ship" },
  { id: "weather-van", side: "British", label: "Van of the weather column", arm: "ship", parent: "weather" },
  { id: "weather-rear", side: "British", label: "Rear of the weather column", arm: "ship", parent: "weather" },
  { id: "combined", side: "Combined Fleet", label: "Combined Fleet", commander: "Villeneuve", arm: "ship" },
];

function snapshot(id: string, over: Partial<UnitPicture> = {}): UnitPicture {
  return { id, position: { lat: 0, lon: 0 }, heading: 0, formation: "column", state: "intact", strength: 1, moves: [], ...over };
}

const PICTURE: UnitPicture[] = [
  snapshot("weather", { formation: "line", state: "engaged" }),
  snapshot("weather-van", { state: "engaged" }),
  snapshot("weather-rear", { state: "broken", strength: 0.4 }),
  snapshot("combined", { formation: "line", state: "engaged", strength: 0.33 }),
];

/** The card for one unit of the fixture above. */
function card(id: string) {
  const content = cardContent(ROSTER, PICTURE, id);
  if (content === undefined) throw new Error(`no card for ${id}`);
  return content;
}

describe("cardContent", () => {
  it("carries the full label and the commander", () => {
    expect(card("weather").name).toBe("Weather column");
    expect(card("weather").commander).toBe("Nelson");
  });

  it("leaves the commander out when the roster names none", () => {
    expect(card("weather-van").commander).toBeUndefined();
  });

  it("says the arm, the formation, the state and the strength at full strength", () => {
    expect(card("weather").facts).toBe("ship · line · engaged · 100%");
  });

  it("says the strength as a whole percentage below full strength", () => {
    expect(card("combined").facts).toBe("ship · line · engaged · 33%");
  });

  it("names the parent on a child's card", () => {
    expect(card("weather-van").tree).toEqual(["of Weather column"]);
  });

  it("lists the children with their state words on a parent's card", () => {
    expect(card("weather").tree).toEqual([
      "Van of the weather column · engaged",
      "Rear of the weather column · broken",
    ]);
  });

  it("carries no tree at all for a unit with neither parent nor children", () => {
    expect(card("combined").tree).toEqual([]);
  });

  it("answers nothing for an id the roster does not hold", () => {
    expect(cardContent(ROSTER, PICTURE, "nobody")).toBeUndefined();
  });

  it("answers nothing for a unit the picture has no snapshot of", () => {
    expect(cardContent(ROSTER, [], "weather")).toBeUndefined();
  });

  it("leaves an absent child off its parent's card, because it is not there to have a state", () => {
    const withoutRear = PICTURE.filter((unit) => unit.id !== "weather-rear");
    expect(cardContent(ROSTER, withoutRear, "weather")?.tree).toEqual(["Van of the weather column · engaged"]);
  });
});

describe("layoutCard", () => {
  it("puts its first line where the label's name would have sat", () => {
    const layout = layoutCard(card("weather"), measure);
    const box = cardBox({ x: 100, y: 200 }, "left", layout);
    expect(box.y + (layout.lines[0]?.y ?? 0)).toBe(200 - NAME_RISE);
  });

  it("draws the name in the side ink and everything beneath it in the palette's", () => {
    const layout = layoutCard(card("weather"), measure);
    expect(layout.lines.map((line) => line.side)).toEqual([true, ...layout.lines.slice(1).map(() => false)]);
  });

  it("stands as wide as its widest line, padded on both sides", () => {
    const content = card("weather");
    const layout = layoutCard(content, measure);
    const widest = Math.max(...layout.lines.map((line) => measure(line.text, line.size, line.voice)));
    expect(layout.width).toBeCloseTo(widest + CARD_PAD * 2);
  });

  it("grows taller with every line the tree adds", () => {
    const parent = layoutCard(card("weather"), measure);
    const alone = layoutCard(card("combined"), measure);
    expect(parent.height).toBeGreaterThan(alone.height);
    expect(parent.lines).toHaveLength(5);
    expect(alone.lines).toHaveLength(3);
  });
});

describe("cardBox", () => {
  it("hangs to the right of the anchor when the label runs left to right", () => {
    const layout = layoutCard(card("weather"), measure);
    const box = cardBox({ x: 100, y: 200 }, "left", layout);
    expect(box.x).toBe(100);
    expect(box.y).toBe(200 - CARD_RISE);
  });

  it("puts its right edge on the anchor when the label runs the other way", () => {
    const layout = layoutCard(card("weather"), measure);
    const box = cardBox({ x: 100, y: 200 }, "right", layout);
    expect(box.x + box.width).toBe(100);
  });
});
