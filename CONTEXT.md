# Sandtable

A data-driven player that animates famous battles as 2D map sequences. Each battle is a timeline of phases in a JSON file; the renderer knows nothing about any specific battle.

## Language

### Geography

**Position**:
A point on the earth, latitude and longitude, where a unit's centre is at a moment in the battle.
_Avoid_: Location, coordinates, point

**Heading**:
The direction a unit's front faces, in degrees true (0 is north, clockwise, 0 to 360).
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
What the renderer draws around the picture without any battle authoring it and the viewer cannot operate: the compass rose, the scale bar, the wind indicator, the map's credit line.
_Avoid_: Chrome, overlay, HUD, widgets, controls

**Legend**:
The furniture box that keys the picture: each side's colour and name, the four state glyphs, and the line styles for a track and the two kinds of move. Always shown.
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
The authored picture of every unit at one battle-clock instant, together with the caption and wind that hold until the next phase begins. The player tweens unit positions and headings between one phase and the next.
_Avoid_: Snapshot, keyframe, frame, step, scene, interval

**Battle clock**:
Historical time of day on the battle's date, and the player's master timeline; every phase is pinned to it.
_Avoid_: Game time, sim time, timestamp

**Playback rate**:
How many battle-clock seconds elapse per real second while a phase plays.
_Avoid_: Speed, time scale, compression, duration

### Units

**Unit**:
A body of force the battle follows as one marker on the map, such as a fleet column, a squadron, or an army wing. Every phase lists every unit.
_Avoid_: Marker, force, group, side, formation

**State**:
Which of four conditions a unit is in during a phase: intact (not yet in action), engaged (in the action or its aftermath, cohesion held), broken (cohesion lost, no longer fighting as a body), or destroyed (ceased to exist as a fighting unit). A unit that has fought stays engaged when the firing stops.
_Avoid_: Status, condition, morale, struck

**Strength**:
The fraction, 0 to 1, of a unit's opening fighting strength still fighting as part of the unit during a phase. Damage to ships or men who stay in the fight does not reduce it; ships or men that have struck, or been detached from the unit, have left it and do.
_Avoid_: Health, casualties, hit points, size, losses

**Commander**:
The named person commanding a unit, recorded once per battle as part of the unit's identity so labels and captions can name them. A change of command during the battle is caption matter.
_Avoid_: Admiral, general, leader, flag officer, owner

**Formation**:
The shape a unit's ships or men are arranged in, one of two words in v1: column (in line ahead along the heading) or line (abreast across the heading). A styled label the renderer draws; a battle file never carries the shape's geometry.
_Avoid_: Shape, arrangement, order of sailing, crescent

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

**Controls**:
What the viewer operates to drive playback: play and pause, the scrubber, the phase-jump buttons, the speed multiplier, the picker, and the toggle for the details panel. Never authored in a battle file.
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

### Site

**Library**:
The collection of every battle the site holds, and the front-door page that lists them oldest first, each by title, date and summary, drawn from the battle files themselves.
_Avoid_: Catalogue, index, list, home page, menu, gallery

**Picker**:
The control in the player's controls that switches to another battle in the library, starting a fresh visit to it.
_Avoid_: Switcher, dropdown, battle select, menu
