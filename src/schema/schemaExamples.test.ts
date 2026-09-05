import { describe, expect, it } from "vitest";
import schemaMd from "../../docs/schema.md?raw";
import { validateBattle } from "./validateBattle.ts";
import { validateMap } from "./validateMap.ts";

/** Every fenced ```json block in `docs/schema.md`, parsed, in document order. */
function jsonBlocks(markdown: string): unknown[] {
  return [...markdown.matchAll(/^```json\r?\n([\s\S]*?)^```/gm)].map((match) => JSON.parse(match[1] ?? ""));
}

describe("the examples in docs/schema.md", () => {
  const blocks = jsonBlocks(schemaMd);

  it("are exactly two: the minimal battle (2.11) and the minimal map (3.4)", () => {
    expect(blocks).toHaveLength(2);
  });

  it("battle example validates, so the spec cannot drift from the validator", () => {
    expect(validateBattle(blocks[0])).toMatchObject({ ok: true });
  });

  it("map example validates, so the spec cannot drift from the validator", () => {
    expect(validateMap(blocks[1])).toMatchObject({ ok: true });
  });
});
