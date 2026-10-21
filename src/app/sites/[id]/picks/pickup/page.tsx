import type { Metadata } from "next";
import Link from "next/link";
import { listSites } from "@/application";
import { getDependencies } from "@/server/deps";
import { mapboxPublicToken } from "@/server/mapbox";
import { getCachedPickCheck, getCachedSite } from "../../../../_lib/cached";
import { loadPage } from "../../../../_lib/load";
import { AppBar } from "@/ui/AppBar";
import { sitePath } from "@/ui/format";
import { EMPTY, SITES_UNAVAILABLE } from "@/ui/messages";
import { PickupChooser } from "@/ui/PickupChooser";
import { panelSites, PICKUP } from "@/ui/pickups";
import { placesOf, ProjectCard } from "@/ui/ProjectCard";
import { operatorCandidates } from "@/ui/site-edits";
import { feedSites, parseSiteFilters } from "@/ui/site-filters";
import { TravelButton, TravelProvider } from "@/ui/TravelProvider";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import styles from "@/ui/primitives.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: PICKUP.title };

type Param = string | string[] | undefined;
type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ line?: Param; status?: Param; q?: Param; pick?: Param }> };

/**
 * Pick up from other sites (AC 93): one pick line of a blocked site, then the projects list exactly as Projects shows
 * it (Use my location, the filter, the cards), without this site and with a tick on the left of each card. A ticked
 * site reads Blocked at once; Confirm keeps the move on this device (AC 94).
 */
export default async function PickupPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const load = await loadPage(() => getCachedPickCheck(id));
  const lineId = typeof query.line === "string" ? query.line : undefined;
  const checked = load.status === "ready" && lineId ? load.value.check.lines.find((item) => item.line.id === lineId) : undefined;
  if (load.status === "unavailable" || !checked) {
    const site = load.status === "ready" ? null : await loadPage(() => getCachedSite(id));
    const name = load.status === "ready" ? load.value.siteName : site?.status === "ready" && site.value ? site.value.name : "Site";
    return (
      <>
        <AppBar backHref={sitePath(id)} backName={name} />
        <main>
          <h1>{PICKUP.title}</h1>
          {load.status === "unavailable" ? (
            <UnavailablePanel status={{ label: PICKUP.noPicks, tone: "warning", icon: "warning" }} />
          ) : (
            <p>{PICKUP.noLine}</p>
          )}
          <Link className={`${styles.button} ${styles.fullWidth}`} href={sitePath(id)}>
            {PICKUP.backToSite(name)}
          </Link>
        </main>
      </>
    );
  }

  const view = load.value;
  const listed = await loadPage(() => listSites(getDependencies()));
  const others = listed.status === "ready" ? listed.value.sites.filter((site) => site.id !== id) : [];
  const self = listed.status === "ready" ? listed.value.sites.find((site) => site.id === id) : undefined;
  // Each other site's pick list, to say what it holds of this material. One that can't be read gives nothing.
  const lenders = await Promise.all(
    others.map(async (site) => {
      const picks = await loadPage(() => getCachedPickCheck(site.id));
      return { siteId: site.id, name: site.name, lines: picks.status === "ready" ? picks.value.check.lines.map((item) => item.line) : null };
    }),
  );
  const token = mapboxPublicToken();
  const candidates = listed.status === "ready" ? operatorCandidates(listed.value.sites) : [];
  const cards = Object.fromEntries(
    others.map((site) => [site.id, <ProjectCard key={site.id} site={site} token={token} idPrefix="pickup-card" candidates={candidates} />]),
  );
  const pick = (Array.isArray(query.pick) ? query.pick : typeof query.pick === "string" ? [query.pick] : []).filter((siteId) =>
    others.some((site) => site.id === siteId),
  );
  return (
    <TravelProvider token={token} places={placesOf(others)}>
      <PickupChooser
        target={{
          siteId: id,
          siteName: view.siteName,
          lineId: checked.line.id,
          lines: view.check.lines.map((item) => item.line),
          site: self ? panelSites([self])[0] : undefined,
        }}
        lenders={lenders}
        sites={feedSites(others)}
        cards={cards}
        filters={parseSiteFilters(query)}
        initialChosen={[...new Set(pick)]}
        travel={<TravelButton />}
      >
        {listed.status === "unavailable" ? (
          <UnavailablePanel status={{ label: SITES_UNAVAILABLE, tone: "warning", icon: "warning" }} />
        ) : others.length === 0 ? (
          <p>{EMPTY.sites}</p>
        ) : null}
      </PickupChooser>
    </TravelProvider>
  );
}
