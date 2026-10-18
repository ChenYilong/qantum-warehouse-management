/**
 * The site signal (AC 52): a big switch in the style of an I/O toggle. The state is told by colour, by the knob's
 * shape and mark, and by the knob's side together, so it reads in sunlight, with gloves and in greyscale.
 * Pure, so the mapping and the short-material wording are tested without a browser.
 */

export type SignalTone = "go" | "stop" | "unknown" | "idle";
export type KnobShape = "circle" | "octagon" | "triangle" | "ring";

export interface SignalView {
  readonly tone: SignalTone;
  /** A circle with a tick, a stop sign, a warning triangle, a dashed ring: the icons of the status chips, enlarged. */
  readonly shape: KnobShape;
  /** Right is on and left is off, like the switch it imitates. */
  readonly knob: "left" | "right";
  /** The mark at the other end of the track: I for on, O for off. */
  readonly mark: "I" | "O";
}

/**
 * Only the literal "clear" is go. Anything the app does not know, including "unavailable", is amber: a status that
 * cannot be read never turns the switch green.
 */
export function signalView(crewStatus: string): SignalView {
  switch (crewStatus) {
    case "clear":
      return { tone: "go", shape: "circle", knob: "right", mark: "I" };
    case "blocked":
      return { tone: "stop", shape: "octagon", knob: "left", mark: "O" };
    case "nothing_planned":
      return { tone: "idle", shape: "ring", knob: "left", mark: "O" };
    default:
      return { tone: "unknown", shape: "triangle", knob: "left", mark: "O" };
  }
}

/** A site card and a text name this many short materials; the rest are counted. */
export const MAX_LISTED = 3;

export interface ShortageFact {
  readonly name: string;
  readonly kind: "short" | "unknown";
}

export interface ShortFacts {
  /** "Pipe collar for 25 mm pipe", or "Fire mastic tube (stock unknown)": unknown stock is never a number. */
  readonly items: readonly string[];
  readonly more: number;
}

export function shortFacts(shortages: readonly ShortageFact[], max: number = MAX_LISTED): ShortFacts {
  const items = shortages.slice(0, max).map((shortage) => (shortage.kind === "unknown" ? `${shortage.name} (stock unknown)` : shortage.name));
  return { items, more: Math.max(0, shortages.length - max) };
}

/** A site's shortages by material name: from its shortage materials first, then the rest of its work, then the id. */
export function shortageFacts(
  shortages: readonly { readonly materialId: string; readonly kind: "short" | "unknown" }[],
  materials: Readonly<Record<string, { readonly name: string }>>,
  referenced: Readonly<Record<string, { readonly name: string }>> | null,
): ShortageFact[] {
  return shortages.map((shortage) => ({
    name: materials[shortage.materialId]?.name ?? referenced?.[shortage.materialId]?.name ?? shortage.materialId,
    kind: shortage.kind,
  }));
}
