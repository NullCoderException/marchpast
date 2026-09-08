/**
 * The staff map's **device**: how it tells a name from a fact without one
 * italic anywhere (#139, ADR-0021).
 *
 * The rank of the eight roles is the anatomy's and `anatomy.test.ts` holds it
 * for every view. What is here is this view's own answer — weight, case,
 * tracking and how hard a run is laid — because it is the part of the ramp a
 * screenshot is a poor witness to and the part that would rot silently.
 */
import { describe, expect, it } from "vitest";
import { TYPE_ROLES } from "../../anatomy.ts";
import { staffType } from "./type.ts";

describe("the staff map's type", () => {
  it("sets nothing in italic, anywhere", () => {
    for (const mode of ["desktop", "phone"] as const) {
      for (const role of TYPE_ROLES) expect(staffType.role(role, mode).font).not.toContain("italic");
    }
    for (const voice of ["name", "fact"] as const) expect(staffType.run(14, voice).font).not.toContain("italic");
  });

  it("tells a name from a fact by weight, case and how hard it is laid", () => {
    const name = staffType.run(14, "name");
    const fact = staffType.run(12, "fact");
    expect(name.font).toContain("600");
    expect(fact.font).toContain("400");
    expect(name.spell("Weather column")).toBe("WEATHER COLUMN");
    expect(fact.spell("engaged · 90%")).toBe("engaged · 90%");
    expect(name.tracking).toBe("0.9px");
    // The fact is quieted to .85 of the plate's ink; the name is laid whole.
    expect(fact.alpha).toBe(0.85);
    expect(name.alpha).toBeUndefined();
  });

  it("sets the label's two lines at whatever size the anatomy asks for", () => {
    // The box is shared by every view and this one fills it (ADR-0016); the
    // ramp's own `unitName` size is what the rank is measured on.
    for (const size of [12, 14, 20]) expect(staffType.run(size, "name").size).toBe(size);
    expect(staffType.run(14, "name").font).toContain("14px");
  });

  it("capitalises and tracks the runs a sheet sets in capitals, and leaves the prose alone", () => {
    for (const role of ["title", "legendLine", "scaleCaption", "credit"] as const) {
      const setting = staffType.role(role, "desktop");
      expect(setting.spell("nautical miles")).toBe("NAUTICAL MILES");
      expect(setting.tracking).not.toBe("0px");
    }
    for (const role of ["clock", "caption"] as const) {
      expect(staffType.role(role, "desktop").spell("The melee")).toBe("The melee");
    }
  });

  it("draws its caret filled, where the engraved views open two strokes", () => {
    const caret = decodeURIComponent(staffType.caret("#2f3134"));
    expect(caret).toContain('fill="#2f3134"');
    expect(caret).not.toContain('fill="none"');
  });
});
