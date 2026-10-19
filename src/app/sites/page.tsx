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
import { buildCalendar } from "@/ui/calendar";
import { CalendarPanel } from "@/ui/CalendarPanel";
import { deadlineOf } from "@/ui/deadline";
import { buildToday, TODAY } from "@/ui/today";
import { TodayPanel } from "@/ui/TodayPanel";
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
  const sites = loaded.status === "unavailable" ? [] : loaded.value.sites;
  const token = mapboxPublicToken();
  // With today's panel leading the page, the h1 stays first in main for structure but is not shown (AC 77).
  return (
    <>
      <MenuBar current="sites" />
      <main>
        <h1 className={sites.length > 0 ? styles.srOnly : undefined}>{NAV.sites}</h1>
        {loaded.status === "unavailable" ? (
          <UnavailablePanel status={{ label: SITES_UNAVAILABLE, tone: "warning", icon: "warning" }} />
        ) : sites.length === 0 ? (
          <p>{EMPTY.sites}</p>
        ) : (
          // One trip provider for the panels' cards and the list's, so the same project says the same thing in each.
          <TravelProvider token={token} places={placesOf(sites)}>
            <CalendarPanel
              calendar={buildCalendar(sites)}
              cards={Object.fromEntries(sites.map((site) => [site.id, <ProjectCard key={site.id} site={site} token={token} idPrefix="calendar-card" />]))}
            />
            <TodayPanel
              today={buildToday(sites)}
              token={token}
              cards={Object.fromEntries(sites.map((site) => [site.id, <ProjectCard key={site.id} site={site} token={token} idPrefix="today-card" />]))}
            />
            <h2 className={styles.allProjects}>{TODAY.allProjects}</h2>
            <FilteredSites sites={sites} filters={filters} token={token} />
          </TravelProvider>
        )}
      </main>
    </>
  );
}

/** Every project with a valid point, for the drive to it (AC 75). */
function placesOf(sites: readonly ListedSite[]): Place[] {
  return sites.flatMap((site) => {
    const location = validLocation(site.location);
    return location ? [{ id: site.id, location }] : [];
  });
}

/**
 * One project's card, exactly as the list shows it (AC 49, 74, 80): the deadline calendar and today's panel show the
 * same card under the calendar and the map (AC 79, 81), each with its own ids.
 */
function ProjectCard({ site, token, idPrefix }: { site: ListedSite; token: string; idPrefix?: string }) {
  const location = validLocation(site.location);
  return (
    <SiteCard
      site={site}
      status={siteChip(site.crewStatus, site.shortageCount, site.dataProblemCount)}
      place={location ? { location, token, colour: markerColour(site.crewStatus) } : undefined}
      idPrefix={idPrefix}
      deadline={deadlineOf(site.date)}
    />
  );
}

/**
 * The filter (AC 72, 73), then the projects it keeps, or why there are none. Each project with a location shows its
 * map (with a public Mapbox token) and Directions, and the drive to all of them is one tap away (AC 74, 75).
 */
function FilteredSites({ sites, filters, token }: { sites: readonly ListedSite[]; filters: SiteFilters; token: string }) {
  const shown = filterSites(sites, filters);
  const places = placesOf(shown);
  return (
    <>
      <SiteFilterForm key={`${filters.status}|${filters.query}`} filters={filters} />
      {shown.length === 0 ? (
        <p>{SITE_FILTER.noMatch}</p>
      ) : (
        <>
          {isFiltered(filters) ? <p className={styles.muted}>{SITE_FILTER.count(shown.length, sites.length)}</p> : null}
          {places.length > 0 ? <TravelButton /> : null}
          {/* A waterfall: cards keep their own heights and fill the columns top to bottom (one column on a phone). */}
          <ul className={styles.feed} aria-label={SITE_FILTER.list}>
            {shown.map((site) => (
              <li key={site.id}>
                <ProjectCard site={site} token={token} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
