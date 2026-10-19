import type { ReactNode } from "react";
import type { SiteReadinessView } from "@/application";
import type { Site } from "@/ports";
import { SiteNotFoundError } from "@/ports";
import { getCachedSite, getCachedSiteData } from "../../_lib/cached";
import { loadPage } from "../../_lib/load";
import { actionNeeded } from "@/ui/action-needed";
import { ActionNeeded } from "@/ui/ActionNeeded";
import { AppBar } from "@/ui/AppBar";
import { siteAction } from "@/ui/contacts";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import { formatReference, plannedWorkLine } from "@/ui/format";
import { NAV, readinessBanner } from "@/ui/messages";
import { OperatorRow } from "@/ui/OperatorRow";
import type { PenetrationPlace } from "@/ui/PenetrationGroups";
import styles from "@/ui/primitives.module.css";
import { shortageFacts } from "@/ui/signal";
import { SiteSignal } from "@/ui/SiteSignal";
import { siteChip } from "@/ui/status";

/** The operator's name on the page, so the big signal is described by who it calls. */
const OPERATOR_ID = "site-operator";

export type SiteFrameData =
  | { readonly status: "unavailable" }
  | {
      readonly status: "ready";
      readonly site: Site;
      /** Null when readiness could not be checked: the banner then says so, never clear. */
      readonly readiness: SiteReadinessView | null;
      /** "12 penetrations, 5 solutions": what the check covered. Null when unknown or nothing is planned. */
      readonly plannedWork: string | null;
      /** Every planned penetration. Null when the site's work could not be read. */
      readonly places: readonly PenetrationPlace[] | null;
      /** Nominated-solution material ids per penetration. Empty when the site's work could not be read. */
      readonly penetrationMaterialIds: Readonly<Record<string, readonly string[]>>;
      /** Every material the planned work uses, for the covered list. Null when the site's work could not be read. */
      readonly referencedMaterials: Readonly<Record<string, { readonly name: string; readonly unit: string }>> | null;
    };

/** Loads what the site screen shows above its list: the site, its readiness banner, and the planned work. */
export async function loadSiteFrame(id: string): Promise<SiteFrameData> {
  const siteLoad = await loadPage(async () => {
    const site = await getCachedSite(id);
    if (!site) throw new SiteNotFoundError();
    return site;
  });
  if (siteLoad.status === "unavailable") return { status: "unavailable" };
  const siteDataLoad = await loadPage(() => getCachedSiteData(id));
  const loaded = siteDataLoad.status === "ready" ? siteDataLoad.value : null;
  return {
    status: "ready",
    site: siteLoad.value,
    readiness: loaded ? loaded.readiness : null,
    plannedWork: loaded ? plannedWorkLine(Object.values(loaded.sitePenetrations).map((place) => place.nominatedCode)) : null,
    places: loaded ? Object.entries(loaded.sitePenetrations).map(([penetrationId, place]) => ({ id: penetrationId, ...place })) : null,
    penetrationMaterialIds: loaded ? loaded.penetrationMaterialIds : {},
    referencedMaterials: loaded ? loaded.referencedMaterials : null,
  };
}

/**
 * The site's header, then its signal and the operator row, then the list. The signal replaces the banner (AC 57): a
 * blocked site has no summary banner, because the Needs your decision panel and the rows already say why.
 */
export function SiteFrame({
  frame,
  back = { href: "/sites", name: NAV.sites },
  children,
}: {
  frame: SiteFrameData;
  /** Where back goes. The sites list, unless this screen was opened from a material page. */
  back?: { readonly href: string; readonly name: string };
  children: ReactNode;
}) {
  if (frame.status === "unavailable") {
    return (
      <>
        <AppBar backHref={back.href} backName={back.name} />
        <main>
          <h1>This site</h1>
          <UnavailablePanel status={readinessBanner("unavailable")} />
        </main>
      </>
    );
  }
  const { site, readiness, plannedWork } = frame;
  const crewStatus = readiness ? readiness.crewStatus : "unavailable";
  const shortageCount = readiness ? readiness.shortages.length : 0;
  const dataProblemCount = readiness ? readiness.blockers.length : 0;
  const action = siteAction({
    id: site.id,
    name: site.name,
    reference: site.reference,
    crewStatus,
    shortageCount,
    dataProblemCount,
    shortages: readiness ? shortageFacts(readiness.shortages, readiness.materials, frame.referencedMaterials) : [],
    operator: site.operator,
  });
  return (
    <>
      <AppBar backHref={back.href} backName={back.name} />
      <main>
        <h1>{site.name}</h1>
        <p className={`${styles.muted} ${styles.plannedWork}`}>
          <span>{formatReference(site.reference)}</span>
          {plannedWork ? <span>{plannedWork}</span> : null}
        </p>
        {readiness ? (
          <SiteSignal
            status={crewStatus === "blocked" ? siteChip("blocked", shortageCount, dataProblemCount) : readinessBanner(crewStatus)}
            action={action}
            describedBy={action.operator ? OPERATOR_ID : undefined}
          />
        ) : (
          <UnavailablePanel status={readinessBanner("unavailable")} />
        )}
        {action.operator ? <OperatorRow operator={action.operator} nameId={OPERATOR_ID} /> : null}
        {/* A blocked site opens with what needs a decision (AC 50), right after its signal. */}
        {readiness && readiness.crewStatus === "blocked" ? (
          <ActionNeeded
            siteId={site.id}
            operator={site.operator}
            picker={site.picker}
            view={actionNeeded({
              siteId: site.id,
              siteName: site.name,
              shortages: readiness.shortages,
              blockers: readiness.blockers,
              materials: readiness.materials,
              referenced: frame.referencedMaterials,
            })}
          />
        ) : null}
        {children}
      </main>
    </>
  );
}
