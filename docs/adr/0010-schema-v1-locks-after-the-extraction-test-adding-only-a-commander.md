# Schema v1 locks after the extraction test, adding only a commander to the unit roster

The extraction test (two independent Opus 5 runs given Nelson's memorandum, Mahan's chapter XXIII and draft types derived from ADR-0001 to ADR-0008, with no access to the phase-list research) asked whether any field needs restructuring before v1 locks. Both runs produced valid files with every phase cited by verbatim quotes, agreed with each other and with the research on times, headings, states, wind, formation labels and move kinds, and put every estimate in `notes`. The one unreliable field was **position**: both runs dead-reckoned the whole battle from a single Mahan sentence and placed it 9 to 18 nautical miles west of the accepted site while saying so. We decided that **no field is restructured**; the unit roster gains an optional **`commander`**; two definitions are tightened where the two runs read them differently; and caption length stays unbounded. The model's positions are a registration error caused by a missing anchor, not a hallucination, and a future pipeline fixes them with an input, not a schema change.

## Considered options

Both models, unprompted, asked for the same missing fields. Each was weighed against the ADR that already rules on it.

- **Unit length or a polyline** (a five-mile line is not a point): rejected, ADR-0001. Formation is a label and v1 has no length fields. The flagship-versus-centre problem the models raised is an authoring rule: `position` is the unit's centre, and a source's flagship distance is corrected for the unit's depth.
- **Ship counts and composition**: rejected, ADR-0003. Counts are caption matter; `strength` is a fraction.
- **A prize tally**: rejected, ADR-0003. A scoreboard is the simulation feel the schema avoids.
- **Wind speed and swell**: already resolved by ADR-0008 (`force`).
- **A time-confidence field**: rejected, ADR-0006. The spread goes in `notes`.
- **Commander** (accepted): every source and every caption names a unit by its commander ("Collingwood's column"), the player can attribute a unit without parsing its label, and a commander is identity, not state. Recorded once per battle on the roster entry, never per phase; a change of command mid-battle (Villeneuve to Gravina at 14:05) is caption matter.
- **A caption length bound**: rejected. The runs wrote 60 to 120 words per phase; whether that reads is the static-frame prototype's question, and an author trims what it shows. Guideline: about three sentences, not a validator rule.

## Consequences

- **`units[].commander` is an optional string on the battle-level roster.** Display only. A unit with no notable commander leaves it out.
- **`intact` means not yet in action.** A unit that has fought stays `engaged` when the firing stops, as long as cohesion holds. One run flipped the victorious British columns to `intact` at 17:30 on the old wording "not in action"; the glossary now says otherwise.
- **Detached ships or men have left the unit and do not count toward `strength`.** Both runs kept Dumanoir's four escaping ships inside the Combined Fleet's strength while drawing them as a `detachment`; under this rule the fleet ends at 11 of 33. Whether a ship that was never in company (Africa) is in the opening strength at all is the author's call.
- **Positions from a source text are constructed, never read.** An extraction's positions are hand-corrected against a fix the sources do give (Collingwood's dawn bearing to Cape Trafalgar) and the public-domain plans (ADR-0007). A v0.3 pipeline supplies that anchor as input, or asks for bearing and distance from a named place and converts deterministically. This is a pipeline design point, not a schema field.
- **Turns need a phase.** Both runs invented a mid-wear heading for the Combined Fleet (350 in one, 150 in the other). ADR-0002 already says a turn of more than a quarter circle gets an intermediate phase; an extraction prompt states that rule.
- **Formation vocabulary holds.** Both runs wrote `crescent` for the allied line; v1's `formation` is `column` or `line` (per the glossary), so the validator rejects it and the author writes `line`. Wider vocabularies wait for a battle that needs them.
- **Schema v1's field set is closed for this map.** Further additions wait for Cannae (v0.2).
