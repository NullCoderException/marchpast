# The library shows a still, rendered by the build from the phase a battle marks

*Amended 2026-09-07: the conditional below on #153 is closed in the negative — no battle names a view (ADR-0014, amended), so the still and the card are drawn in the default view; #150 happened as [ADR-0028](0028-a-battle-is-a-page-at-its-own-path-and-its-card-is-its-own-still.md): the social card is the same still at 1200 × 630 with the band kept, at `data/cards/<name>.png`; the plate box was set to 760 by #151 and folded into the text below (#164). Everything else here stands.*

ADR-0011 left thumbnails in the fog with a reason and a condition: "A rendered still needs the renderer at build time and a decided view to render." Both arrived. [#126](https://github.com/NullCoderException/marchpast/issues/126) drove the real renderer through `@napi-rs/canvas` and measured it, and ADR-0014 and ADR-0021 decided the views. [#134](https://github.com/NullCoderException/marchpast/issues/134) came back to the clause and answered it.

**A battle's entry in the library shows a still: the picture of one phase of that battle, drawn by the build with the same renderer the player uses, cropped to the plate.** The phase is the one the battle marks. The view is the one the battle opens in. The placement is cold. Decided on [#134](https://github.com/NullCoderException/marchpast/issues/134).

## Which phase, and why a battle marks it

The obvious rule is the opening phase, and the data kills it. Counting engaged units per phase across the four battles in the library:

| | engaged units, phase by phase |
| --- | --- |
| Cannae | 0, 0, 4, 5, **7**, 6, 5, 5 |
| Copenhagen | 0, 0, 2, 2, 2, 1, 1, 1 |
| the Nile | 0, 0, 0, 2, **4**, 4, 4, 3, 4, 4, 3 |
| Trafalgar | 0, 0, 0, 5, **7**, 7, 7, 6 |

Every battle opens pre-contact. The opening frame is two fleets seven miles apart at Trafalgar, Nelson's twelve at anchor off Draco Point at Copenhagen, the enemy sighted from the *Zealous* at the Nile. A rule that puts the moment before the battle on the front door of a site about battles is the wrong rule, and it is wrong in every file we have.

A metric rule — the first phase at the battle's engaged maximum — does better and still is not enough. It picks Trafalgar's phase 4, *the succeeding ships break through in all parts astern of the enemy's centre*, which **is** the picture of Trafalgar, and Cannae's phase 4. But it ties three ways at Copenhagen and five ways at the Nile, so it picks by accident there; and it can never pick the Nile's phase 7, *L'Orient blows up with a most tremendous explosion*, because only three units are engaged in it. The one frame of the Nile that everybody knows is the frame the metric discards. That is the argument for authorship, and it is the same argument `summary` already won: the battle file is where a battle describes itself.

So **a phase may carry `still: true`, at most one per battle**, and the four files carry it now:

| battle | phase | |
| --- | --- | --- |
| Cannae | 4 | *The Roman maniples cut their way into the thin Celtic line* |
| Copenhagen | 3 | *Before half past eleven the battle is general, the two lines within a cable's length* |
| the Nile | 7 | *About ten o'clock L'Orient blows up with a most tremendous explosion* |
| Trafalgar | 4 | *The succeeding ships break through in all parts astern of the enemy's centre* |

The flag rides its phase rather than naming an index, so inserting a phase before the marked one cannot silently change the picture. When no phase carries it the build falls back to the metric rule — the earliest phase whose count of `engaged` units, over the battle's whole roster rather than any drawn level, is the battle's maximum — silently, because it is a defined rule and not a failure. The level is the coarsest, which is where the player opens (ADR-0017) and what [#127](https://github.com/NullCoderException/marchpast/issues/127) called honesty.

## Which view, and why the still is cold

The library has one look, the brand's, and does not follow the view. That rules out the still following the **viewer's** remembered choice: the front door's pictures would change with a setting the front door does not offer. What it does not rule out is the still following the **battle**. So the rule is written one level up: **the still is drawn in the view the battle opens in, as the build knows it.** Today that is the default view for every battle. If [#153](https://github.com/NullCoderException/marchpast/issues/153) lets a battle suggest a view, the Nile's still becomes a night plate on its own, and this ADR does not need reopening either way.

The placement is **cold**: the still's phase is drawn on a fresh renderer, with no earlier phase drawn first. The label placer is sticky (#39), so a warmed render puts labels where a viewer who stepped forward from phase 0 would see them — which #126 reproduced against Chrome exactly. Both are correct pictures. Cold wins because a warmed still bakes in *the path taken*: scrub backwards from the end and the placement differs again, so there is no single warmed answer, only the one produced by walking forward. Cold is the only placement that is a pure function of `(battle, map, phase, view, level, size)`, which is also what keeps a still diffable — this project proves plates unchanged by pixel diff.

## The frame and the size

The still is **the plate alone**. The renderer draws the whole canvas, caption band included, and the band is 74 to 100 pixels of a 630-pixel frame at desktop; at thumbnail scale its text is unreadable, and it is the one element identical on every entry, so keeping it spends an eighth of every picture on the only part that distinguishes nothing. `layoutCaption` is exported, so the build measures the band, renders at `height + band` and keeps the top: no renderer change, and no distortion, because the projection fits the plate rect that survives the crop.

The crop is **per use, not per render**. [#150](https://github.com/NullCoderException/marchpast/issues/150)'s per-battle social card, if it happens, is the same call at 1200 × 630 with the band kept — at that size the caption is readable and it is the battle's own words.

The size is **1200 CSS pixels wide at a device pixel ratio of 0.5**, giving a 600-pixel file. Width picks the layout mode: a canvas 560 CSS pixels or narrower draws in phone mode (`PHONE_MAX_WIDTH`), furniture collapsed and labels at the phone floor, so a thumbnail must never simply be a small canvas. A wide canvas at a low DPR keeps the desktop composition the design was tuned for and `fitBackingStore` already does it.

The plate box's height was left to [#151](https://github.com/NullCoderException/marchpast/issues/151) to set against its drawing, starting from 630. **It is 760.** A 1200 × 630 box is 1.90 : 1 and not one of the seven v0.3 extents is that wide — the widest, the Nile, is 1.62, the four shipped files run from Trafalgar's 1.15 up to it, and Alesia's box is 1.35 (ADR-0026) — so at 630 every battle in the library is *height*-fitted and the width the box does not use is letterbox on its flanks. Some flank letterbox is unavoidable, since no box holds every aspect at once, so the number to find is the one where every battle is still gaining: the plate rect inside `PLATE_MARGIN` at 760 is 1160 × 720, an aspect of 1.61, and 760 is therefore the last height at which all seven are height-fitted and every extra pixel of box goes into the drawn map one for one. Above it the Nile has reached its full width and begins paying letterbox at the head and foot instead, Cannae follows at about 830, and by 900 the still governs a card whose text is about 150 pixels. The glyph is a plate constant (ADR-0016), so a taller box never draws the battle bigger relative to its ground — it draws more ground.

The thumbnail is therefore **288 × 182** in the library's card rather than 288 × 151, which is 31 pixels a card and 217 down a page of seven. This number is where the widest extent *the library holds* sits, not a promise about extents in general: a future battle wider than 1.61 is letterboxed at the head and foot, which is the ordinary condition of a fixed frame and not a reason to re-cut the box.

## Considered options

- **No thumbnails at all**, the library staying seven text entries on parchment. Rejected, but not lightly: it is the only option that costs the front door nothing, and four map stills in one view may read as four grey rectangles. It loses because the pictures are what the site is, and a front door for a battle player that shows no battle is a list of essays.
- **Hand-made and committed**, as `docs/screenshots/` is today. Rejected: staleness is structural, not a matter of diligence. ADR-0011's rule is that a battle joins the library by existing, and a committed still breaks it in the small — a new battle has no picture until somebody makes one, and the label placer moved four times inside v0.2 (#102, #111, #117, #118, #119), which would have left every committed still showing the old plate with nothing to catch it.
- **Rendered in the visitor's browser on the library page.** Rejected on cost and on capability: the library today fetches `index.json` alone, and this would fetch every battle file and every map — about 300 kB at four battles, half a megabyte at seven — to draw plates on the visitor's device. It also cannot produce a file, so it forecloses #150 entirely, since an Open Graph image must be a URL.
- **A headless browser (Playwright) in the Actions job.** Rejected as the routine route, kept in reserve. It is the only thing that can photograph the *page*, but it needs a served page, a driver and a browser install or cache step, and its own documentation promises no pixel stability across images. Nothing today needs the browser.
- **`node-canvas`.** Rejected on two verified blockers: it cannot parse the bundled woff2, and its `letterSpacing` is inert, so the map's work labels would draw untracked and silently wrong.
- **The opening phase as the rule.** Rejected on the table above.
- **The metric rule alone, with no field.** Rejected on the Nile: the frame everybody knows is the one it cannot reach. Kept as the fallback, where a tie is harmless because a battle that has not chosen has expressed no preference to violate.
- **A battle-level `still_phase` index** rather than a flag on the phase. Rejected: an index drifts when a phase is inserted before it, and it drifts silently — the picture changes and nothing says so. A flag rides its phase.
- **The still following the viewer's remembered view**, with one file per battle per view. Rejected: cheap enough to render, but it would make the front door's pictures answer to a control the front door does not have, against the settled rule that the library keeps one look.
- **Keeping the caption band.** Rejected for the thumbnail and kept for the card. The tension is real: [#127](https://github.com/NullCoderException/marchpast/issues/127) restated that the canvas is the whole picture, and a cropped still is less than the canvas. That clause is about the *surface* — the strip, the panel, the page ground — staying out of a still, not about the band, and the crop is a property of where a still is shown rather than of what the renderer draws.
- **720 CSS pixels at DPR 1**, buying crisp one-to-one strokes instead of hairlines at half a device pixel. Rejected: furniture is canvas-space anchored, so a narrower canvas gives the rose, the title and the legend proportionally more of the plate, and the composition matters more than the sharpness at a size where nothing is read.
- **Warmed label placement.** Above.
- **A `still` field in `index.json`** carrying the URL. Rejected: `paths.ts` already turns a bare name into a URL three times, `data/` files are copied rather than hashed so there is no cache-busting to encode, and the build emits one still per battle unconditionally, so there is no absence to record.
- **Warn and skip a still that will not render.** Rejected on `readLibrary`'s own precedent — *"A battle the site cannot list is a broken build, not a shorter library"* — which reads the same way for pictures. A skip puts a blank box on the front door where nothing checks it.
- **`poster` as the word**, HTML's own name for the picture shown before you press play, which is exactly what a library entry holds. Rejected: three issues already say *still*, and a printed bill is the wrong register for an engraved chart.
- **The README's screenshots by the same machinery.** Rejected: they show the page — controls, masthead, a phone frame — which Node cannot draw at all. They stay hand-made over the DevTools protocol.

## Consequences

- **A phase gains an optional `still` boolean**, at most one per battle, which the validator enforces. It is schema matter, locked with everything else at [#141](https://github.com/NullCoderException/marchpast/issues/141), and the four battle files gain it in the v0.3 build.
- **ADR-0011 is amended in two clauses**: "No thumbnails in v0.2" is answered, and "the build emits `data/index.json`" gains a second output. Everything else that ADR decided stands.
- **`paths.ts` gains `stillUrl(name)`** → `data/stills/<name>.png`, a fourth function of the same shape as `battleUrl`, `mapUrl` and `indexUrl`. `index.json` is unchanged.
- **`vite/stills.ts` is added, a sibling of `vite/serve-data.ts`**, doing for the still what that file already does for the library: rendered per request in dev, so a battle file edited while the server runs changes its picture on reload, and emitted into `dist/data/stills/` at build. Being a Vite plugin is what makes the `.woff2` import resolve natively, so #126's `node:module` loader hook is never written.
- **`@napi-rs/canvas` becomes a dev dependency**, one package with no system dependencies. The Pages workflow needs no new step: `npm run build` does it.
- **The renderer must stay a function of a context.** Its two touches of the DOM — `window.devicePixelRatio` and `document.createElement("canvas")` for the engaged cloud's scratch — are the whole contract, and a view that wanted `filter`, `createPattern` or `Path2D` should check the support table in #126's research first.
- **A still that fails to render fails the build.**
- **The front door gains about half a megabyte at seven battles.** The images are `loading="lazy"`, `alt=""` — the entry is already one link named by title, date and summary, and a picture of ground that the summary describes in words adds noise to that name rather than meaning — and each sits in a fixed aspect box, so a still that fails to load leaves the list's rhythm intact.
- **The still function is parameterised** over battle, map, phase, view, level, size, DPR and crop. The thumbnail is one call of it, which is what makes [#150](https://github.com/NullCoderException/marchpast/issues/150) cheap rather than expensive: the same call at 1200 × 630 with the band kept.
- **[#151](https://github.com/NullCoderException/marchpast/issues/151) set the plate box's height to 760** and the card layout around it: a 52rem measure, a 48px gutter for the chronology rail, and the thumbnail at 288 × 182.
- **[#153](https://github.com/NullCoderException/marchpast/issues/153) reaches the front door.** If a battle may suggest a view, its still follows, with nothing here to change.
- **The Picker stays text.** A `<select>` cannot hold a picture, and nothing here argues it should stop being one.
- **Glossary**: **Still** and **Thumbnail** added; **Library** amended to name the still.
