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
