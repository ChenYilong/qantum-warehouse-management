import { listSites, type ListedSite } from "@/application";
import { getDependencies } from "@/server/deps";
import { mapboxPublicToken } from "@/server/mapbox";
import { MenuBar } from "@/ui/AppBar";
import { EMPTY, NAV, SITE_FILTER, SITES_UNAVAILABLE } from "@/ui/messages";
import { SiteFilterForm } from "@/ui/SiteFilterForm";
import { filterSites, isFiltered, parseSiteFilters, type SiteFilters } from "@/ui/site-filters";
import { placesOf, ProjectCard } from "@/ui/ProjectCard";
import { operatorCandidates } from "@/ui/site-edits";
import { TravelButton, TravelProvider } from "@/ui/TravelProvider";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import styles from "@/ui/primitives.module.css";
import { loadPage } from "../_lib/load";

export const dynamic = "force-dynamic";
export const metadata = { title: NAV.sites };

type PageProps = { searchParams: Promise<{ status?: string | string[]; q?: string | string[] }> };

export default async function SitesPage({ searchParams }: PageProps) {
  const filters = parseSiteFilters(await searchParams);
  const loaded = await loadPage(() => listSites(getDependencies()));
  const token = mapboxPublicToken();
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
          <TravelProvider token={token} places={placesOf(loaded.value.sites)}>
            {/* At the top of every tab's page, under the picker's line (AC 75, AC 83). */}
            <TravelButton />
            <FilteredSites sites={loaded.value.sites} filters={filters} token={token} />
          </TravelProvider>
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
  // Every project's people, not just the filtered ones: a card can be given to anyone (AC 87).
  const candidates = operatorCandidates(sites);
  return (
    <>
      <SiteFilterForm key={`${filters.status}|${filters.query}`} filters={filters} />
      {shown.length === 0 ? (
        <p>{SITE_FILTER.noMatch}</p>
      ) : (
        <>
          {isFiltered(filters) ? <p className={styles.muted}>{SITE_FILTER.count(shown.length, sites.length)}</p> : null}
          {/* A waterfall: cards keep their own heights and fill the columns top to bottom (one column on a phone). */}
          <ul className={styles.feed} aria-label={SITE_FILTER.list}>
            {shown.map((site) => (
              <li key={site.id}>
                <ProjectCard site={site} token={token} candidates={candidates} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
