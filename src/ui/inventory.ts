import type { StatusView } from "./status";

/**
 * Solution stock on the material tables (AC 90), worded as on the stock app's shortage page: "Inventory captured" in
 * New Zealand time ("20 Oct 2026, 9:00 am NZDT") and a Status of READY (Quantity available) or SHORTAGE (Insufficient
 * quantity). Pure, so the words and the time are tested here; the time zone is fixed, so server and phone agree.
 */

export interface InventoryInput {
  readonly status: "READY" | "SHORTAGE";
  readonly reason: "SUFFICIENT_QUANTITY" | "INSUFFICIENT_QUANTITY";
  readonly availableQuantity: number | null;
  readonly unit: string | null;
  readonly capturedAt: string | null;
}

export interface InventoryView {
  /** "20 Oct 2026, 9:00 am NZDT", or "Unknown". */
  readonly captured: string;
  /** The raw timestamp for a `time` element; null when unknown. */
  readonly capturedIso: string | null;
  readonly status: StatusView;
  /** "Quantity available" or "Insufficient quantity". */
  readonly reason: string;
  /** "12 install kits counted", or null when there is no count. */
  readonly available: string | null;
  readonly ready: boolean;
}

export const INVENTORY = {
  captured: "Inventory captured",
  status: "Status",
  unknown: "Unknown",
  planNotice: "Selecting a Solution changes the material plan. It does not reserve stock.",
  notInStock: "Not in stock, so this substitute can't be proposed.",
  reasons: { SUFFICIENT_QUANTITY: "Quantity available", INSUFFICIENT_QUANTITY: "Insufficient quantity" },
} as const;

const CAPTURED = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "Pacific/Auckland",
  timeZoneName: "short",
  year: "numeric",
});

/** A timestamp in New Zealand time; anything that is not a real time reads "Unknown". */
export function capturedText(iso: string | null): string {
  if (iso === null) return INVENTORY.unknown;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? INVENTORY.unknown : CAPTURED.format(at);
}

function plural(unit: string, count: number): string {
  return count === 1 || unit.endsWith("s") ? unit : `${unit}s`;
}

export function inventoryView(inventory: InventoryInput): InventoryView {
  const ready = inventory.status === "READY";
  const captured = capturedText(inventory.capturedAt);
  return {
    captured,
    capturedIso: captured === INVENTORY.unknown ? null : inventory.capturedAt,
    status: ready ? { label: "READY", tone: "success", icon: "check" } : { label: "SHORTAGE", tone: "danger", icon: "stop" },
    reason: INVENTORY.reasons[inventory.reason],
    available:
      inventory.availableQuantity === null || inventory.unit === null
        ? null
        : `${inventory.availableQuantity} ${plural(inventory.unit, inventory.availableQuantity)} counted`,
    ready,
  };
}
