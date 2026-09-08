/**
 * The views table: the shape every view has to hold, checked once for all of
 * them, plus the fallback an unknown id takes. What each view *looks* like is
 * checked by eye against the design canvas (ADR-0014), and what every view
 * *keeps* is `anatomy.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { TYPE_ROLES } from "./anatomy.ts";
import { DEFAULT_VIEW, VIEWS, viewById } from "./views.ts";

describe("the views there are", () => {
  it("offers the three v0.2 views and the staff map under unique ids, the default first", () => {
    expect(VIEWS.map((view) => view.id)).toEqual(["plate", "night", "atlas", "staff"]);
    expect(VIEWS.map((view) => view.name)).toEqual(["Chart plate", "Night plate", "Atlas", "Staff map"]);
    expect(VIEWS[0]).toBe(DEFAULT_VIEW);
  });

  it("gives every view a sea, and only the staff map one that is not its paper", () => {
    // The engraved three answer for the value and set it to the paper they are
    // printed on; the staff map's is a body of water with a colour (#175).
    for (const view of VIEWS) expect(view.palette.water).toMatch(/^#[0-9a-f]{6}$/);
    expect(VIEWS.filter((view) => view.palette.water !== view.palette.paper).map((view) => view.id)).toEqual(["staff"]);
  });

  it("asks every ground whether it runs under the furniture's corners", () => {
    // The engraved views put contours there and nothing else, so a plate
    // without them needs no paper laid; the staff map's graticule is there at
    // every extent (#62, #175).
    for (const view of VIEWS) expect(view.ground.underFurniture([10, 20, 30])).toBe(true);
    expect(VIEWS.filter((view) => view.ground.underFurniture([])).map((view) => view.id)).toEqual(["staff"]);
  });

  it("gives every view a full side palette, so the sixth side is never the ink", () => {
    for (const view of VIEWS) {
      expect(view.palette.sides).toHaveLength(6);
      expect(new Set(view.palette.sides).size).toBe(6);
    }
  });

  it("gives every pen a positive width, so no motion style is invisible", () => {
    for (const view of VIEWS) {
      for (const pen of [view.pens.track, view.pens.intent, view.pens.detachment]) {
        expect(pen.width).toBeGreaterThan(0);
        expect(pen.headSize).toBeGreaterThan(0);
      }
    }
  });

  it("supplies all five hands, so no view is half a treatment", () => {
    // A view that cannot draw a scale bar is broken, not degraded — the same
    // rule ADR-0015 sets for arms, and the reason these are required members
    // rather than optional ones (ADR-0021).
    for (const view of VIEWS) {
      expect(typeof view.glyph.body).toBe("function");
      expect(typeof view.type.role).toBe("function");
      expect(typeof view.ground.land).toBe("function");
      expect(typeof view.furniture.scaleBar.draw).toBe("function");
      expect(typeof view.moves.detachment).toBe("function");
    }
  });

  it("names every piece of the furniture set and the caption band with it", () => {
    for (const { furniture } of VIEWS) {
      for (const piece of [furniture.compass, furniture.title, furniture.credit]) {
        expect(typeof piece.panel).toBe("function");
        expect(typeof piece.draw).toBe("function");
      }
      expect(typeof furniture.scaleBar.layout).toBe("function");
      expect(typeof furniture.legend.draw).toBe("function");
      expect(typeof furniture.caption.measure).toBe("function");
      expect(typeof furniture.border).toBe("function");
      expect(typeof furniture.panel).toBe("function");
    }
  });

  it("names all eight type roles, in both modes, and a face to set them in", () => {
    for (const view of VIEWS) {
      expect(view.type.face).toBeTruthy();
      for (const mode of ["desktop", "phone"] as const) {
        for (const role of TYPE_ROLES) {
          const setting = view.type.role(role, mode);
          expect(setting.size).toBeGreaterThan(0);
          expect(setting.font).toContain("px");
          expect(setting.spell("Weather column")).toBeTruthy();
        }
      }
    }
  });

  it("sets the label's two lines itself, in both voices, spelling and tracking them", () => {
    // The label pass measures and draws through this one answer, so a view
    // whose name is capitalised cannot measure it uncapitalised (ADR-0021).
    for (const view of VIEWS) {
      for (const voice of ["name", "fact"] as const) {
        const run = view.type.run(14, voice);
        expect(run.size).toBe(14);
        expect(run.font).toContain("14px");
        expect(run.tracking).toMatch(/px$/);
        expect(run.spell("Weather column")).toBeTruthy();
      }
      // The two voices are told apart by *something* — a slope, a weight, a
      // case or a tracking — or a fact reads as a name.
      const name = view.type.run(14, "name");
      const fact = view.type.run(14, "fact");
      expect(name.font !== fact.font || name.tracking !== fact.tracking || name.spell("Lee") !== fact.spell("Lee")).toBe(true);
    }
  });

  it("draws every named point's mark and names it in a face of its own", () => {
    for (const { ground } of VIEWS) {
      for (const kind of ["place", "work"] as const) {
        const naming = ground.naming(kind);
        expect(naming.size).toBeGreaterThan(0);
        expect(naming.gap).toBeGreaterThan(0);
        expect(naming.half).toBeGreaterThan(0);
        expect(naming.font).toContain("px");
      }
      expect(ground.naming("work").spell("camp")).toBe("CAMP");
      expect(ground.naming("place").spell("Cannae")).toBe("Cannae");
    }
  });
});

describe("viewById", () => {
  it("finds a view by its id", () => {
    expect(viewById("night").id).toBe("night");
    expect(viewById("atlas").id).toBe("atlas");
    expect(viewById("staff").id).toBe("staff");
  });

  it("falls back to the default for an id no view carries", () => {
    expect(viewById("nonsense")).toBe(DEFAULT_VIEW);
    expect(viewById(undefined)).toBe(DEFAULT_VIEW);
  });
});
