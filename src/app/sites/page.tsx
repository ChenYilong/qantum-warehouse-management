import { listSites, type ListedSite } from "@/application";
import { getDependencies } from "@/server/deps";
import { mapboxPublicToken } from "@/server/mapbox";
import { MenuBar } from "@/ui/AppBar";
import { EMPTY, NAV, SITE_FILTER, SITES_UNAVAILABLE } from "@/ui/messages";
import { SiteCard } from "@/ui/SiteCard";
import { SiteFilterForm } from "@/ui/SiteFilterForm";
import { filterSites, isFiltered, parseSiteFilters, type SiteFilters } from "@/ui/site-filters";
import { siteChip } from "@/ui/status";
import { markerColour, validLocation } from "@/ui/travel";
import { TravelButton, TravelProvider, type Place } from "@/ui/TravelProvider";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import styles from "@/ui/primitives.module.css";
import { loadPage } from "../_lib/load";

export const dynamic = "force-dynamic";
export const metadata = { title: NAV.sites };

type PageProps = { searchParams: Promise<{ status?: string | string[]; q?: string | string[] }> };

export default async function SitesPage({ searchParams }: PageProps) {
  const filters = parseSiteFilters(await searchParams);
  const loaded = await loadPage(() => listSites(getDependencies()));
  return (
    <>
      <MenuBar current="sites" />
      <main>
        <h1>{NAV.sites}</h1>
        {loaded.status === "unavailable" ? (
          <UnavailablePanel status={{ label: SITES_UNAVAILABLE, tone: "warning", icon: "warning" }} />
        ) : loaded.value.sites.length === 0 ? (
          <p>{EMPTY.sites}</p>
        ) : (
          <FilteredSites sites={loaded.value.sites} filters={filters} token={mapboxPublicToken()} />
        )}
      </main>
    </>
  );
}

/**
 * The filter (AC 72, 73), then the projects it keeps, or why there are none. Each project with a location shows its
 * map (with a public Mapbox token) and Directions, and the drive to all of them is one tap away (AC 74, 75).
 */
function FilteredSites({ sites, filters, token }: { sites: readonly ListedSite[]; filters: SiteFilters; token: string }) {
  const shown = filterSites(sites, filters);
  const places: Place[] = shown.flatMap((site) => {
    const location = validLocation(site.location);
    return location ? [{ id: site.id, location }] : [];
  });
  return (
    <>
      <SiteFilterForm key={`${filters.status}|${filters.query}`} filters={filters} />
      {shown.length === 0 ? (
        <p>{SITE_FILTER.noMatch}</p>
      ) : (
        <>
          {isFiltered(filters) ? <p className={styles.muted}>{SITE_FILTER.count(shown.length, sites.length)}</p> : null}
          <TravelProvider token={token} places={places}>
            {places.length > 0 ? <TravelButton /> : null}
            {/* A waterfall: cards keep their own heights and fill the columns top to bottom (one column on a phone). */}
            <ul className={styles.feed} aria-label={SITE_FILTER.list}>
              {shown.map((site) => {
                const location = validLocation(site.location);
                return (
                  <li key={site.id}>
                    <SiteCard
                      site={site}
                      status={siteChip(site.crewStatus, site.shortageCount, site.dataProblemCount)}
                      place={location ? { location, token, colour: markerColour(site.crewStatus) } : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </TravelProvider>
        </>
      )}
    </>
  );
}
