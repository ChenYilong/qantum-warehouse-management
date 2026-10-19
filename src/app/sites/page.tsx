import { listSites, type ListedSite } from "@/application";
import { getDependencies } from "@/server/deps";
import { MenuBar } from "@/ui/AppBar";
import { EMPTY, NAV, SITE_FILTER, SITES_UNAVAILABLE } from "@/ui/messages";
import { SiteCard } from "@/ui/SiteCard";
import { SiteFilterForm } from "@/ui/SiteFilterForm";
import { filterSites, isFiltered, parseSiteFilters, type SiteFilters } from "@/ui/site-filters";
import { siteChip } from "@/ui/status";
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
          <FilteredSites sites={loaded.value.sites} filters={filters} />
        )}
      </main>
    </>
  );
}

/** The filter (AC 72, 73), then the projects it keeps, or why there are none. */
function FilteredSites({ sites, filters }: { sites: readonly ListedSite[]; filters: SiteFilters }) {
  const shown = filterSites(sites, filters);
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
                <SiteCard site={site} status={siteChip(site.crewStatus, site.shortageCount, site.dataProblemCount)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
