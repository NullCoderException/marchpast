/**
 * PROTOTYPE (#39) — THROWAWAY. Never merge to main.
 *
 * `?stress=<n>` splits the roster until the battle carries `n` units, each
 * split laid out along the parent's own axis: a column becomes divisions in
 * line ahead, a line becomes squadrons abreast. This is how the unit-count
 * limit is found, and it is the same shape the hierarchy ticket (#50) asks
 * about — Trafalgar at squadron level is `?battle=trafalgar&stress=9`.
 */
import type { Battle, Phase, Unit, UnitSnapshot } from "../schema/types.ts";
import { toRadians } from "../render/projection.ts";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** How far apart two splits of one unit sit, as a fraction of the extent. */
const SPACING = 0.055;

export function stressBattle(battle: Battle, wanted: number): Battle {
  const base = battle.units.length;
  if (wanted <= base) return battle;

  // Round-robin the extra copies over the roster, so the crowding is even.
  const copies = battle.units.map(() => 1);
  for (let i = 0; i < wanted - base; i++) {
    const index = i % base;
    copies[index] = (copies[index] ?? 1) + 1;
  }

  const units: Unit[] = [];
  battle.units.forEach((unit, index) => {
    const count = copies[index] ?? 1;
    for (let part = 0; part < count; part++) {
      units.push(count === 1 ? unit : { ...unit, id: `${unit.id}-${part + 1}`, label: `${unit.label} ${ROMAN[part] ?? part + 1}` });
    }
  });

  const spacingLat = (battle.extent.north - battle.extent.south) * SPACING;
  const spacingLon = (battle.extent.east - battle.extent.west) * SPACING;

  const phases: Phase[] = battle.phases.map((phase) => ({
    ...phase,
    units: phase.units.flatMap((snapshot): UnitSnapshot[] => {
      const index = battle.units.findIndex((unit) => unit.id === snapshot.id);
      const count = copies[index] ?? 1;
      if (count === 1) return [snapshot];
      // A column splits along its heading, a line across it: the way the real unit would divide.
      const axis = toRadians(snapshot.heading + (snapshot.formation === "column" ? 0 : 90));
      return Array.from({ length: count }, (_, part) => {
        const step = part - (count - 1) / 2;
        return {
          ...snapshot,
          id: `${snapshot.id}-${part + 1}`,
          position: {
            lat: snapshot.position.lat + Math.cos(axis) * spacingLat * step,
            lon: snapshot.position.lon + Math.sin(axis) * spacingLon * step,
          },
        };
      });
    }),
  }));

  return { ...battle, units, phases };
}
