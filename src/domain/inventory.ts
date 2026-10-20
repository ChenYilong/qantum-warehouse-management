/**
 * Solution-level stock (AC 90): whether one more install of a catalogue solution is on hand, from a count of complete
 * install kits per Internal Code. Two states only, as on the shortage page this follows: READY when at least the
 * required number of kits is counted, SHORTAGE otherwise. No count, a count that is not a finite number, or a negative
 * one is SHORTAGE: fail closed, never "available".
 */

export type InventoryStatus = "READY" | "SHORTAGE";
export type InventoryReason = "SUFFICIENT_QUANTITY" | "INSUFFICIENT_QUANTITY";

export interface SolutionStockCount {
  readonly internalCode: string;
  readonly availableQuantity: number;
  readonly unit: string;
  readonly capturedAt: string;
}

export interface SolutionInventory {
  readonly internalCode: string;
  readonly status: InventoryStatus;
  readonly reason: InventoryReason;
  /** Kits counted, or null when there is no usable count. */
  readonly availableQuantity: number | null;
  readonly unit: string | null;
  /** When the count was taken; null when there is none. */
  readonly capturedAt: string | null;
}

export function solutionInventory(internalCode: string, count: SolutionStockCount | undefined, required = 1): SolutionInventory {
  const usable = count !== undefined && Number.isFinite(count.availableQuantity) && count.availableQuantity >= 0;
  const ready = usable && Number.isFinite(required) && required > 0 && count.availableQuantity >= required;
  return {
    internalCode,
    status: ready ? "READY" : "SHORTAGE",
    reason: ready ? "SUFFICIENT_QUANTITY" : "INSUFFICIENT_QUANTITY",
    availableQuantity: usable ? count.availableQuantity : null,
    unit: count?.unit ?? null,
    capturedAt: count?.capturedAt ?? null,
  };
}
