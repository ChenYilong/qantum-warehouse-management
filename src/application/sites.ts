import type { CrewStatus } from "@/domain";
import { UpstreamError, type Site } from "@/ports";
import { log } from "./log";
import { getSiteReadiness, type SiteReadinessView } from "./readiness";
import type { Dependencies } from "./types";

/** One short material of a blocked site, for the sites list and the text to its operator (AC 56). */
export interface ListedShortage {
  readonly materialId: string;
  readonly name: string;
  readonly unit: string;
  readonly kind: "short" | "unknown";
  readonly requiredQty: number;
  /** Null when the stock is unknown: never a number. */
  readonly shortfallQty: number | null;
}

export interface ListedSite extends Site {
  readonly crewStatus: CrewStatus | "unavailable";
  readonly shortageCount: number;
  readonly dataProblemCount: number;
  /** The short materials, in readiness order. Empty unless the site is blocked; its length is `shortageCount`. */
  readonly shortages: readonly ListedShortage[];
}

function siteCounts(
  readiness: SiteReadinessView,
): Pick<ListedSite, "shortageCount" | "dataProblemCount" | "shortages"> {
  if (readiness.crewStatus !== "blocked") return { shortageCount: 0, dataProblemCount: 0, shortages: [] };
  return {
    shortageCount: readiness.shortages.length,
    dataProblemCount: readiness.blockers.length,
    shortages: readiness.shortages.map((shortage) => {
      const material = readiness.materials[shortage.materialId];
      return {
        materialId: shortage.materialId,
        name: material?.name ?? shortage.materialId,
        unit: material?.unit ?? "",
        kind: shortage.kind,
        requiredQty: shortage.requiredQty,
        shortfallQty: shortage.shortfallQty,
      };
    }),
  };
}

export async function listSites(deps: Dependencies): Promise<{ sites: ListedSite[] }> {
  const sites = await deps.sites.listSites();
  const listed = await Promise.all(
    sites.map(async (site) => {
      try {
        const readiness = await getSiteReadiness(deps, site.id);
        const listedSite: ListedSite = { ...site, crewStatus: readiness.crewStatus, ...siteCounts(readiness) };
        return listedSite;
      } catch (error) {
        if (error instanceof UpstreamError) log("upstream_failed", { code: error.code, system: error.system });
        const unavailable: ListedSite = { ...site, crewStatus: "unavailable", shortageCount: 0, dataProblemCount: 0, shortages: [] };
        return unavailable;
      }
    }),
  );
  return { sites: listed };
}
