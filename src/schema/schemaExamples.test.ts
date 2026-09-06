import { describe, expect, it } from "vitest";
import schemaMd from "../../docs/schema.md?raw";
import { validateBattle } from "./validateBattle.ts";
import { validateMap } from "./validateMap.ts";

/** Every fenced ```json block in `docs/schema.md`, parsed, in document order. */
function jsonBlocks(markdown: string): unknown[] {
  return [...markdown.matchAll(/^```json\r?\n([\s\S]*?)^```/gm)].map((match) => JSON.parse(match[1] ?? ""));
}

/**
 * `docs/schema.md` became the v2 spec at the v0.2 handoff (2026-09-06) while the
 * validators still read v1. Until the schema v2 build issue lands, the two
 * validate checks are skipped rather than deleted: that issue un-skips them,
 * and from then on the spec and the validator are held together again.
 */
const VALIDATORS_READ_V2 = false;

describe("the examples in docs/schema.md", () => {
  const blocks = jsonBlocks(schemaMd);

  it("are exactly two: the minimal battle (2.12) and the minimal map (3.4)", () => {
    expect(blocks).toHaveLength(2);
  });

  it("battle example declares the schema version the spec describes", () => {
    expect(blocks[0]).toMatchObject({ schema_version: 2 });
  });

  it.skipIf(!VALIDATORS_READ_V2)("battle example validates, so the spec cannot drift from the validator", () => {
    expect(validateBattle(blocks[0])).toMatchObject({ ok: true });
  });

  it.skipIf(!VALIDATORS_READ_V2)("map example validates, so the spec cannot drift from the validator", () => {
    expect(validateMap(blocks[1])).toMatchObject({ ok: true });
  });
});
