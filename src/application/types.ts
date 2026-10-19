import type { Catalogue } from "@/domain";
import type { ActionsRepository, NominationsPort, PicksPort, SitesPort, SolutionMaterialsPort, StockPort } from "@/ports";

export interface Dependencies {
  readonly sites: SitesPort;
  readonly nominations: NominationsPort;
  readonly stock: StockPort;
  readonly solutionMaterials: SolutionMaterialsPort;
  /** The warehouse pick lists (AC 61). */
  readonly picks: PicksPort;
  readonly catalogue: Catalogue;
  readonly actions: ActionsRepository;
  readonly now: () => Date;
}

export function uniqueIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
