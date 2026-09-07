# Narrative is one authored caption per phase, with sources in a battle-level table

*Amended 2026-09-07: [ADR-0027](0027-conjecture-is-notes-matter-and-a-battle-authors-one-reading.md) makes `notes` **required** on every phase, so the "optional" in the clause below no longer holds; everything else here stands. It also settles for a position what this ADR settled for a time: the battle authors one reading, names the one it declined in `notes`, and no field marks a position or a state as conjectural (#133).*

Trafalgar's sources disagree by an hour on when *Victory* cut the line and by three ships on the number of prizes, and the concept doc asked whether the player should carry per-source alternate captions. We chose one author-selected **caption** per phase, an optional per-phase **notes** string for the author's reasoning about disputed readings, and **references** into a battle-level **sources** table. Per-source alternates would have turned the player into a source-comparison tool and multiplied what an extraction pipeline must produce; a caption alone left the "why this reading" with no home.

## Considered options

- **One caption, disagreement only in the references**: forces the reasoning into whichever reference is nearest and loses it when references are pruned.
- **Per-source alternate captions**: most faithful to the sources, rejected because it is a different product and multiplies authoring and extraction effort by the number of sources.
- **One caption plus notes** (chosen): one narrative, one place for the editorial argument, nothing animated that was not authored.

## Consequences

- **A phase's `caption` is a plain string.** Whether it quotes or paraphrases is the author's business; the renderer shows it verbatim. The caption may modernise or trim a quotation.
- **`notes` is optional, free text, and never part of the animation.** Whether the player surfaces it on demand is a player-controls decision, not a schema one. It is the one per-phase free-text field beside the caption; there is still no per-unit free text (ADR-0003).
- **Sources are declared once, at battle level**, keyed by a short id. An entry carries a display `label` and `work` (title, author, edition) as required fields, `url` optional, and a required `license` with an optional `license_note`, whose vocabulary and class rule ADR-0007 fixes. Unreferenced entries are allowed: a diagram consulted only for positions is still a source and still needs a licence audit.
- **A reference is `{ source, locator, quote?, note? }`.** `source` must name an entry in the table (a validation error otherwise). `locator` is a free string precise enough for a human to find the passage in the cited edition. `quote` is verbatim from that edition, long-s spellings and all, because its job is checking the caption against the source, not display.
- **Every phase carries at least one reference**, enforced by the validator. Traceable corrections were the reason references exist. A reference vouches for the phase as a whole (time, positions, states, caption); per-fact targeting is deferred with per-ship detail.
- **The player may attribute a caption using the source's `label`**, without parsing prose.
- **No time-uncertainty field.** `t` is the reconciled time the author chose; the spread between sources is notes matter. This keeps the rule from ADR-0001 that the schema carries no uncertainty fields.
