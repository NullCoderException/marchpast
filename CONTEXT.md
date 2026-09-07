# Marchpast

A data-driven player that animates famous battles as 2D map sequences. Each battle is a timeline of phases in a JSON file; the renderer knows nothing about any specific battle.

## Language

### Geography

**Position**:
A point on the earth, latitude and longitude, where a unit's centre is at a moment in the battle.
_Avoid_: Location, coordinates, point

**Heading**:
The direction a unit's front faces, in degrees true (0 is north, clockwise, 0 to 360). The front is where the unit's force is directed: its course while it is moving, the way its guns or its line face while it is fighting. So it is not the direction of travel — a unit that retires in good order keeps its heading toward the enemy and its track runs behind it — and a moored fleet's heading is its broadside, not its bows, which are notes matter. A unit fought from both sides still has one front: the side the attack came from.
_Avoid_: Course, bearing, direction, orientation

**Extent**:
The latitude/longitude bounding box a battle plays inside, fixed for the whole playback.
_Avoid_: Viewport, bounds, camera, map box

**Map**:
The static geography a battle plays over, drawn behind the units: land, rivers, shoals, contours, named places and works, in a file the battle points at. One map file is one moment in time, so a modern and a historical coastline are two files; a battle names at most one.
_Avoid_: Basemap, background, terrain, layer, chart

**Place**:
A named point on the map, such as Cadiz or Cape Trafalgar, drawn as a label so captions can refer to it.
_Avoid_: Landmark, POI, city, label

**River**:
A watercourse on the map, drawn as a line. It carries no name and no width; a river that must be labelled gets a Place on it.
_Avoid_: Stream, waterway, creek, channel

**Shoal**:
Water too shallow to fight over, drawn as an outline: the Aboukir shoal, Copenhagen's Middle Ground. It carries no depth, and is neither land nor open sea.
_Avoid_: Bank, reef, shallows, bathymetry

**Work**:
A named built thing on the ground that takes no part as a unit unless the battle file says otherwise: a fort, a battery, a camp. Trekroner, Abu Qir castle, the Roman camps on the Aufidus.
_Avoid_: Fort, fortification, camp, structure, installation

**Contour**:
A line on the map joining ground at one height above sea level, carrying that height in metres. The set of them is how a map holds elevation; the interval between them is an authoring choice, not a fixed one.
_Avoid_: Isoline, relief, terrain, hachure, elevation band

**Track**:
The line a unit's position follows between one phase and the next, derived by the player from the two positions and never written in a battle file.
_Avoid_: Path, route, trail, vector, move

**Furniture**:
What the renderer draws around the picture without any battle authoring it and the viewer cannot operate: the compass rose, the battle's title, the scale bar, the wind indicator, the legend and the map's credit line. Which pieces there are and which corner each sits in are the same in every view; how each is drawn is the view's. Furniture sits in a corner of the canvas, so what is drawn in the map's own coordinates is ground however decorative it is: a graticule is not furniture.
_Avoid_: Chrome, overlay, HUD, widgets, controls

**Legend**:
The furniture box that keys the picture: each side's colour and name, the four state glyphs, the line styles for a track and the two kinds of move, and, when the battle has more than one arm, the sign for each. Always shown.
_Avoid_: Key, guide, symbols

### Weather

**Wind**:
The direction the wind blows from, in degrees true, and its force, authored per phase and holding until the next phase begins. A battle tracks wind in every phase or in none.
_Avoid_: Breeze, weather, direction, wind toward

**Force**:
How hard the wind blows, one of five words: calm, light, moderate, fresh, or gale. Calm has no direction.
_Avoid_: Beaufort, strength, speed, knots

### Time

**Phase**:
The authored picture of every unit at one moment on the battle clock, together with the caption and wind that hold until the next phase begins. The player tweens unit positions and headings between one phase and the next.
_Avoid_: Snapshot, keyframe, frame, step, scene, interval

**Battle clock**:
Historical time of day as the sources read it, running from the start of the battle's first day, and the player's master timeline; every phase is pinned to it. It is a reading, not an instant: it carries no timezone and is never UTC.
_Avoid_: Game time, sim time, timestamp, datetime

**Day**:
Which day of the battle a phase falls on, counted from its first at zero. A battle that never crosses midnight has only day zero.
_Avoid_: Date, offset, session, part

**Sort date**:
The battle's first day written as numbers so the library can order battles by it, its year negative before Christ. It is compared freely, and counted from only for the interval between two battles, never for any duration within one.
_Avoid_: Timestamp, epoch, start date, key

**Playback rate**:
How many battle-clock seconds elapse per real second while a phase plays.
_Avoid_: Speed, time scale, compression, duration

### Units

**Unit**:
A body of force the battle follows as one marker on the map, such as a fleet column, a squadron, or an army wing. Every phase lists every unit, whether or not it has a parent or is drawn at the level shown.
_Avoid_: Marker, force, group, side, formation

**Parent**:
The unit a smaller unit belongs to, named once per battle as part of the smaller unit's identity: a squadron's column, a legion's wing. The parent and its children are all units in their own right, each authored in every phase; nothing about a parent is worked out from its children. A parent's children share its side.
_Avoid_: Group, container, formation, superunit, root

**Level**:
How far down the tree of parents and children the plate is drawing, counted from the units with no parent: at Trafalgar, columns or squadrons. A battle names its levels. A unit that has no children is drawn at every level below its own.
_Avoid_: Resolution, granularity, tier, zoom, depth (in prose)

**State**:
Which of four conditions a unit is in during a phase: intact (not yet in action), engaged (in the action or its aftermath, cohesion held), broken (cohesion lost, no longer acting as one body, whether it flees or fights on in fragments), or destroyed (ceased to exist as a fighting unit, whatever became of its men). A unit that has fought stays engaged when the firing stops. A state says what condition a unit is in and never where it is: a wing that has ridden off the field keeps whatever state its condition earns.
_Avoid_: Status, condition, morale, struck, routed, annihilated

**Strength**:
The fraction, 0 to 1, of a unit's opening fighting strength still fighting as part of the unit during a phase. Damage to ships or men who stay in the fight does not reduce it; ships or men that have struck, fled, or been detached from the unit for the rest of the battle have left it and do. A detachment that returns to the unit never left it and costs nothing; whether it returns is judged inside the battle the file holds, so a ship still aground at the last phase has left the unit whatever became of her afterwards. Never a casualty count: a unit that has run is near zero before any of its men are dead.
_Avoid_: Health, casualties, hit points, size, losses

**Commander**:
The named person commanding a unit, recorded once per battle as part of the unit's identity so labels and captions can name them. A change of command during the battle is caption matter.
_Avoid_: Admiral, general, leader, flag officer, owner

**Arm**:
What a unit is made of, one word from a fixed list, recorded once per battle as part of the unit's identity: infantry, cavalry, or ship in v2. Never changes during a battle; heavy or light, a ship of the line or a frigate, is label and caption matter.
_Avoid_: Type, kind, class, branch, troop type, category

**Infantry**:
The arm of a unit of men who fight on foot: the Roman legions, the Libyan foot.
_Avoid_: Foot (in data), legion, phalanx, troops

**Cavalry**:
The arm of a unit of men who fight mounted: Hasdrubal's Spanish and Gallic horse, the Numidians.
_Avoid_: Horse (in data), mounted, dragoons

**Ship**:
The arm of a unit made of vessels, whatever their rate or whether they are under way or at anchor: a fleet column, a squadron, the Danish line of blockships.
_Avoid_: Naval, fleet, vessel, sail

**Formation**:
The shape a unit's signs are arranged in, one of three words: column (in file along the heading), line (abreast across the heading) or mass (in ranks, four across and two deep). A shape and never a condition, so a fleet at anchor is drawn in the shape it lies in and its anchoring is caption matter; a fleet in line of battle is a line, abreast of its own front, as a line of foot is. A styled label the renderer draws at a fixed size; a battle file never carries the shape's geometry, so a crescent, a wedge or a hollow is caption matter.
_Avoid_: Shape, arrangement, order of sailing, crescent, phalanx, block, depth

**Move**:
An authored arrow from a unit toward a position, showing something the unit's own position cannot: a detachment (part of the unit going where the unit does not) or an intent (what the unit was ordered to do, whether or not it happened).
_Avoid_: Arrow, order, action, track

### Narrative

**Caption**:
The narration text a phase shows, one plain string chosen by the author, holding until the next phase begins.
_Avoid_: Narration, subtitle, alternate, label

**Summary**:
One plain sentence a battle carries to describe itself where the whole battle is named but not played, such as the library.
_Avoid_: Description, blurb, abstract, tagline

**Source**:
A work the battle draws on, listed once per battle with its display label, work details, and licence, whether or not any phase references it.
_Avoid_: Bibliography, citation, reference (for the work itself)

**Licence**:
The terms a battle file, map file, or source may be used under, recorded in data as an SPDX identifier or the word public-domain (the data field is spelled `license`). Licences rank public-domain, then attribution-only, then share-alike; a source never ranks above the file that draws on it.
_Avoid_: License (in prose), rights, copyright, terms

**Attribution**:
The credit line a licence obliges anyone displaying or redistributing a file to show, naming the licensor; required whenever the file's licence demands one.
_Avoid_: Credit, byline, copyright notice, acknowledgement

**Reference**:
A phase's pointer into one source: a locator precise enough to find the passage, and optionally the verbatim quote it supports.
_Avoid_: Citation, footnote, source ref

**Notes**:
The author's per-phase reasoning about the sources, such as which reading of a disputed time was chosen and why; surfaced on demand, never animated.
_Avoid_: Commentary, alternates, uncertainty, confidence

### Player

**View**:
A named whole visual treatment of the picture and the player's surface that the viewer picks: the chart plate (the default), the night plate, or atlas. Every view keeps the anatomy and owns everything about how the picture is drawn — its paper and inks, its type, how the ground is drawn, how each piece of furniture is drawn, and how a unit and its engaged mark are drawn. Remembered from one visit to the next, never authored in a battle file.
_Avoid_: Theme, skin, style, mode, layer, variant

**Anatomy**:
What every view keeps: which facts the picture shows, where each one sits, and what it means. North up and one projection; the extent and its letterbox; which pieces of furniture there are and the corner each sits in; the caption band full width below the picture with the clock at the left; a label's two lines, the flank it sits on and the order it collapses in; the four states; three motion styles that stay tellable apart; each side's ink taken by roster order; a glyph's fixed length. A reader who has learned to read one view has learned to read them all.
_Avoid_: Layout, chrome, template, skeleton, base theme, invariants

**Aesthetic**:
The idiom a view is drawn in. The chart plate, the night plate and atlas share the engraved one; a view may also be drawn in an idiom of its own. Not something the viewer picks and not something the app counts: two views in one aesthetic simply resemble each other, and the view chooser offers views, never aesthetics.
_Avoid_: Theme, style, look, family, skin, design language

**View chooser**:
The control in the player's controls that switches the picture and the surface to another view, taking effect at once without interrupting playback, and remembered so the next visit opens in the view it was left on.
_Avoid_: Theme switcher, view toggle, style menu, mode

**Level chooser**:
The control in the player's controls that switches the picture to another level, present only when a battle has more than one, taking effect at once without interrupting playback and lasting only the current visit. Every visit opens on the coarsest level.
_Avoid_: Resolution switch, zoom, detail toggle, drill-down

**Glyph**:
How a view draws one unit: the chart plate's ship-ticks, atlas's block. Drawn in two parts, the mark its state puts on the plate around it and the unit itself, so that every unit's mark is laid down before any unit's body and a melee does not erase itself.
_Avoid_: Icon, symbol, marker, sprite, token

**Sign**:
The shape by which a view tells one arm from another inside a glyph: the chart plate's chevron tick for a ship, its rank bar for foot and barred rank bar for horse, atlas's diagonal across a cavalry block. Every view has a sign for every arm.
_Avoid_: Mark (the state's), icon, symbol, tick (except for the ship sign), badge

**Surface**:
The player's page around the plate — the control strip, the details panel and the ground they sit on — drawn as a page rather than on the canvas, and drawn in the current view's inks and face. It is what a view reaches beyond the picture; the library is not part of it and never follows a view.
_Avoid_: Chrome, UI, shell, skin, theme, frame

**Controls**:
What the viewer operates to drive playback: play and pause, the scrubber, the phase-jump buttons, the speed multiplier, the view chooser, the level chooser, the picker, and the toggle for the details panel. Drawn in the current view's language, on the surface. Never authored in a battle file.
_Avoid_: Furniture, UI, transport, toolbar

**Scrubber**:
The bar the viewer drags to move through the battle, one segment per phase sized by that phase's playback duration, with the battle clock shown as a readout beside it rather than as a scale on the bar.
_Avoid_: Timeline, seek bar, slider, progress bar

**Speed multiplier**:
A viewer-chosen factor applied uniformly to every phase's playback rate, held only by the player for the current visit.
_Avoid_: Speed, playback rate (the authored per-phase value), time scale

**Details panel**:
The on-demand view that shows the current phase's notes and references, then the battle's attribution and sources table. Hidden by default and never pauses playback.
_Avoid_: Sidebar, drawer, info box, credits screen

**Unit card**:
The unit's label unfolded: a panel the renderer draws beside a unit's glyph, in the label's own place, giving its full name and commander, its arm, formation, state and strength, and its parent or children. Shown while the pointer rests on the unit and held open by a click or tap, one at a time, and never pauses playback. Viewer-opened, never authored in a battle file.
_Avoid_: Tooltip, popup, popover, info box, unit panel

### Site

**Library**:
The collection of every battle the site holds, and the front-door page that lists them oldest first, each by its still, title, date, sides and summary, drawn from the battle files themselves. It is never grouped.
_Avoid_: Catalogue, index, list, home page, menu, gallery

**Still**:
The picture of one phase of a battle, drawn by the build with the renderer the player uses, at a size and a view the build chooses rather than a viewer. The phase a battle marks for it is its **still phase**; a battle that marks none has one picked by rule.
_Avoid_: Snapshot, screenshot, render, image, poster, preview

**Thumbnail**:
Where a still is shown: the small picture on a battle's entry in the library. A still is the picture; the thumbnail is the slot it fills, so a still shown at another size for another purpose is not one.
_Avoid_: Thumb, tile, cover, card image

**Chronology rail**:
The line down the library's left gutter that gives the list its spine: a bare node beside each battle, and between two battles the years that passed, in words. Its spacing is even and means nothing; the interval is written rather than drawn, because the library spans two millennia and no scale holds both a gap of eighteen centuries and a gap of two years.
_Avoid_: Timeline, axis, scrubber, spine

**Picker**:
The control in the player's controls that switches to another battle in the library, starting a fresh visit to it.
_Avoid_: Switcher, dropdown, battle select, menu

**Fixture**:
Something battle-shaped that exists to exercise the code rather than to be watched: invented positions, a summary that says so, held to nothing but the schema. It lives in the source rather than among the battle files, is never fetched and never in the library, and it goes once a real battle covers what it stood in for.
_Avoid_: Example, sample, demo, test battle, illustrative battle
