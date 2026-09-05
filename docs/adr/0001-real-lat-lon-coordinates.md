# Positions are real latitude/longitude, not abstract map units

Battle files could have used per-battle abstract units (a 0..1000 box with its own "north"), which is simpler to sketch, or real WGS84 latitude/longitude. We chose lat/lon in decimal degrees from day one: the sources already speak in bearings and distances from named places (Cape Trafalgar, Cadiz), heading and wind need a real north regardless, and real coordinates make the coastline, later basemap tiles, and cross-checks against logged positions free. A battle with a disputed site still gets a best-guess lat/lon, so this does not foreclose land battles.

## Consequences

- Each battle declares an **extent**: one lat/lon bounding box, fixed for the whole playback. The renderer fits it to the canvas preserving aspect ratio and letterboxes the rest. Per-phase extents (a moving camera) are not in v1.
- The projection is a renderer implementation detail, never a schema field. The renderer uses Web Mercator so that future basemap tiles line up without reprojection; at battle scale it is visually identical to equirectangular.
- **Heading** is numeric degrees true. No compass-point strings, no radians, no dual representation.
- Schema v1 has no length fields. The only unit-bearing field is a per-battle scale-bar display unit (nautical miles or kilometres). If a later decision needs a length, it is stored in metres and the display unit converts.
- A unit's **position** is a single centre point plus a heading. Formation shape is a label the renderer styles, not geometry (the v1 vocabulary, `column` and `line`, is fixed by ADR-0009). Positions carry no uncertainty field; source disagreements are a caption and references matter (ADR-0006).
