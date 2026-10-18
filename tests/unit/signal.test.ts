import { describe, expect, it } from "vitest";
import { MAX_LISTED, shortFacts, shortageFacts, signalView } from "@/ui/signal";

describe("AC 52: a signal has four states, told apart by colour, shape, mark and side", () => {
  it("a clear site is go: green, a circle, the knob on the right, an I", () => {
    expect(signalView("clear")).toEqual({ tone: "go", shape: "circle", knob: "right", mark: "I" });
  });

  it("a blocked site is stop: red, an octagon, the knob on the left, an O", () => {
    expect(signalView("blocked")).toEqual({ tone: "stop", shape: "octagon", knob: "left", mark: "O" });
  });

  it("nothing planned is idle: grey, a dashed ring, the knob on the left", () => {
    expect(signalView("nothing_planned")).toEqual({ tone: "idle", shape: "ring", knob: "left", mark: "O" });
  });

  it("anything else fails closed to amber with a triangle, never to go", () => {
    for (const status of ["unavailable", "", "clear-ish", "CLEAR", " clear", "ready", "ok"]) {
      expect(signalView(status)).toEqual({ tone: "unknown", shape: "triangle", knob: "left", mark: "O" });
    }
  });

  it("no two states share a colour or a shape, and only go has its knob on the right", () => {
    const views = ["clear", "blocked", "unavailable", "nothing_planned"].map(signalView);
    expect(new Set(views.map((view) => view.tone)).size).toBe(4);
    expect(new Set(views.map((view) => view.shape)).size).toBe(4);
    expect(views.filter((view) => view.knob === "right").map((view) => view.tone)).toEqual(["go"]);
    expect(views.filter((view) => view.mark === "I").map((view) => view.tone)).toEqual(["go"]);
  });
});

describe("AC 55, AC 57: the short materials a card and a text name", () => {
  const sealant = { name: "Intumescent sealant, 310 ml cartridge", kind: "short" as const };
  const mastic = { name: "Fire mastic tube", kind: "unknown" as const };

  it("lists up to three names, marks unknown stock, and counts the rest", () => {
    expect(MAX_LISTED).toBe(3);
    expect(shortFacts([])).toEqual({ items: [], more: 0 });
    expect(shortFacts([sealant, mastic])).toEqual({
      items: ["Intumescent sealant, 310 ml cartridge", "Fire mastic tube (stock unknown)"],
      more: 0,
    });
    const five = ["A", "B", "C", "D", "E"].map((name) => ({ name, kind: "short" as const }));
    expect(shortFacts(five)).toEqual({ items: ["A", "B", "C"], more: 2 });
    expect(shortFacts(five, 1)).toEqual({ items: ["A"], more: 4 });
  });

  it("names each shortage from the shortage materials, then from the site's other materials, then by id", () => {
    const facts = shortageFacts(
      [
        { materialId: "MAT-SEALANT", kind: "short" },
        { materialId: "MAT-MASTIC", kind: "unknown" },
        { materialId: "MAT-X", kind: "short" },
      ],
      { "MAT-SEALANT": { name: "Intumescent sealant, 310 ml cartridge" } },
      { "MAT-MASTIC": { name: "Fire mastic tube" } },
    );
    expect(facts).toEqual([
      { name: "Intumescent sealant, 310 ml cartridge", kind: "short" },
      { name: "Fire mastic tube", kind: "unknown" },
      { name: "MAT-X", kind: "short" },
    ]);
    expect(shortageFacts([{ materialId: "MAT-Y", kind: "unknown" }], {}, null)).toEqual([{ name: "MAT-Y", kind: "unknown" }]);
  });
});
