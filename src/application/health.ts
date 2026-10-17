import { log } from "./log";
import type { Dependencies } from "./types";

export interface HealthView {
  readonly status: "ok";
  /** When the stock feed was last changed (the picker's latest scan). Null when the feed can't be read. */
  readonly stockAsOf: string | null;
}

/**
 * The connection bar's check (AC 48). Answering at all means the phone can reach the server. A stock feed
 * that is down is not a failed check: the bar then shows the picker's last action as unknown, never a time.
 */
export async function checkHealth(deps: Pick<Dependencies, "stock">): Promise<HealthView> {
  try {
    const stock = await deps.stock.getStock([]);
    const asOf = new Date(stock.asOf);
    return { status: "ok", stockAsOf: Number.isNaN(asOf.getTime()) ? null : stock.asOf };
  } catch {
    log("health_stock_unavailable", { code: "stock_unavailable" });
    return { status: "ok", stockAsOf: null };
  }
}
