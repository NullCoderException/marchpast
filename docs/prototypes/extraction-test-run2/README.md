# PROTOTYPE: extraction test, run 2 (wayfinder ticket #11)

**Throwaway.** This branch (`prototype/extraction-test-run2`) is a primary source for a decision, not code to merge. It is the second of two independent runs; the first, by a parallel session, is on `prototype/extraction-test`. Findings, including the cross-run comparison, are in `COMPARISON.md`. Nothing here is the schema; the draft types were hand-derived from the ADRs on 2026-09-05 for the purpose of the test.

## Question

Can a model fill schema v1 from a source text? One run, not a pipeline: Nelson's memorandum of 9 October 1805 plus chapter XXIII of Mahan's *Life of Nelson* (1897), together with draft schema v1 types, fed to a model asked for a `trafalgar.json` at three-unit granularity. The draft is compared with the researched phase list (ticket #9, branch `research/trafalgar-phases`), which the model never saw.

The decision this informs: which schema fields a model can populate reliably, which it hallucinates, and whether any field needs restructuring before v1 locks.

## Note on the prototype skill

The prototype skill offers two shapes, a state-model walkthrough or UI variants. This question is neither; the artifact is the one the ticket specified: prompt, raw output, comparison.

## Method

1. `nelson-memorandum.txt` and `mahan-ch23.txt` were cut from Project Gutenberg #16915 (`pg16915.txt`, Mahan vol. II) and Mahan's `[Sidenote: ...]` markers stripped. Chapter XXIII's footnotes are included.
2. `schema-v1-draft.ts` was hand-derived from ADR-0001 to ADR-0006 and `CONTEXT.md`. Wind and licence are marked DRAFT because those tickets (#14, #12) are still open.
3. `prompt.md` = `prompt-instructions.md` + the types + the two texts. The prompt fixes the three unit ids, gives Cape Trafalgar and Cadiz coordinates for dead reckoning (a real pipeline would have the map file's places), and forbids facts from outside the two texts.
4. Run once, with no tools and no repo access, from a scratch directory:

   ```
   claude -p --tools "" --no-session-persistence --setting-sources "" --output-format json --model opus < prompt.md > run1.raw.json
   ```

   `run1.raw.json` is the CLI envelope (model, cost, duration); `run1.output.txt` is the model's answer verbatim.
5. `check.py run1.output.txt` validates the shape against the draft types, checks every `quote` is verbatim from the prompt's texts, and prints the draft beside `ground-truth.json` (distilled from the phase-list research). Output saved as `run1.check.txt`.

## Files

| File | What |
|---|---|
| `prompt-instructions.md` | The task text, without the pasted schema and sources |
| `schema-v1-draft.ts` | Draft types the model was asked to fill |
| `nelson-memorandum.txt`, `mahan-ch23.txt` | The source texts, as fed to the model |
| `prompt.md` | The exact prompt |
| `run1.raw.json`, `run1.output.txt` | CLI envelope and the model's verbatim answer |
| `ground-truth.json` | Times, headings, states and coarse positions from the researched phase list |
| `check.py`, `run1.check.txt` | Comparison script and its output |
| `COMPARISON.md` | The findings, including the comparison with the other session's run |
| `other-session.draft.json` | The other session's model output, copied here so `check.py` can run on both |
